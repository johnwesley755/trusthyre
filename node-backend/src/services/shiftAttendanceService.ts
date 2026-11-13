import crypto from 'crypto';
import prisma from '../config/prisma';
import { NotificationDispatcher } from './notificationDispatcher';

// In-memory OTP cache with sliding expiration
interface OtpEntry {
  otp: string;
  shiftId: string;
  employerId: string;
  createdAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

// Secret key for HMAC QR tokens
const QR_SIGNING_SECRET = process.env.JWT_SECRET || 'trusthyre-attendance-qr-secret-key-2026';

export interface CreateShiftInput {
  workOrderId: string;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakDurationMinutes?: number;
  worksiteName?: string;
  worksiteAddress?: string;
  city?: string;
  supervisorId?: string;
  notes?: string;
  recurringDays?: number; // e.g. 1 to 30 days
  recurrenceRule?: 'DAILY' | 'WEEKDAYS' | 'WEEKLY';
}

export interface AttendanceCheckInInput {
  shiftId: string;
  method: 'QR_CODE' | 'ONE_TIME_PIN' | 'MANUAL_SUPERVISOR';
  token?: string; // HMAC token for QR
  otp?: string;   // 6-digit PIN
  latitude?: number;
  longitude?: number;
  notes?: string;
  manualReason?: string; // Required if method is MANUAL_SUPERVISOR
}

export interface AttendanceCheckOutInput {
  shiftId: string;
  method: 'QR_CODE' | 'ONE_TIME_PIN' | 'MANUAL_SUPERVISOR';
  token?: string;
  otp?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  manualReason?: string;
}

export interface AttendanceCorrectionInput {
  proposedCheckIn?: string;
  proposedCheckOut?: string;
  reason: string;
}

export const ShiftAttendanceService = {

  // ==========================================================================
  // 1. SHIFT SCHEDULING (EMPLOYER)
  // ==========================================================================

  /**
   * Schedule one or more shifts for an accepted work order
   */
  createShifts: async (employerUserId: string, input: CreateShiftInput) => {
    // 1. Verify Work Order exists and is ACCEPTED
    const workOrder = await prisma.work_orders.findUnique({
      where: { id: input.workOrderId }
    });

    if (!workOrder) {
      throw new Error("Work order not found");
    }

    if (workOrder.employer_id !== employerUserId) {
      throw new Error("Forbidden: You do not own this work order");
    }

    if (workOrder.status !== 'ACCEPTED') {
      throw new Error(`Cannot schedule shifts for work order with status: ${workOrder.status}. Must be ACCEPTED.`);
    }

    const workerId = workOrder.worker_id;
    const baseDate = new Date(input.shiftDate);
    if (isNaN(baseDate.getTime())) {
      throw new Error("Invalid shiftDate format. Use YYYY-MM-DD.");
    }

    const worksiteName = input.worksiteName || workOrder.worksite_name;
    const worksiteAddress = input.worksiteAddress || workOrder.worksite_address;
    const city = input.city || workOrder.city;
    const breakDuration = input.breakDurationMinutes !== undefined ? input.breakDurationMinutes : 60;

    const daysCount = Math.max(1, Math.min(input.recurringDays || 1, 30));
    const createdShifts = [];

    for (let i = 0; i < daysCount; i++) {
      const currentShiftDate = new Date(baseDate);
      currentShiftDate.setDate(baseDate.getDate() + i);

      // Check recurrence rule filter
      if (input.recurrenceRule === 'WEEKDAYS') {
        const dayOfWeek = currentShiftDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip Saturday and Sunday
      } else if (input.recurrenceRule === 'WEEKLY' && i > 0) {
        currentShiftDate.setDate(baseDate.getDate() + (i * 7));
      }

      const shift = await prisma.shifts.create({
        data: {
          work_order_id: workOrder.id,
          employer_id: employerUserId,
          worker_id: workerId,
          supervisor_id: input.supervisorId || null,
          shift_date: currentShiftDate,
          start_time: input.startTime,
          end_time: input.endTime,
          break_duration_minutes: breakDuration,
          worksite_name: worksiteName,
          worksite_address: worksiteAddress,
          city: city,
          status: 'SCHEDULED',
          recurrence_rule: input.recurrenceRule || null,
          notes: input.notes || null,
        }
      });

      // Auto-create initial NOT_STARTED attendance shell
      await prisma.shift_attendances.create({
        data: {
          shift_id: shift.id,
          work_order_id: workOrder.id,
          worker_id: workerId,
          employer_id: employerUserId,
          supervisor_id: input.supervisorId || null,
          status: 'NOT_STARTED',
          verification_method: 'QR_CODE',
          total_work_minutes: 0,
          total_break_minutes: 0,
          events: [
            {
              event: 'SHIFT_SCHEDULED',
              actor_id: employerUserId,
              timestamp: new Date().toISOString()
            }
          ] as any
        }
      });

      createdShifts.push(shift);
    }

    // Notify worker about shift schedule
    try {
      await NotificationDispatcher.dispatch({
        userId: workerId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'New Shift Scheduled 📅',
        message: `${daysCount} shift(s) scheduled for "${workOrder.job_title}" starting ${input.shiftDate} at ${worksiteName}.`,
        link: '/shifts'
      });
    } catch (err) {
      console.warn("[ShiftAttendanceService] Notification warning:", err);
    }

    return createdShifts;
  },

  /**
   * List shifts for employer with optional date/status filters
   */
  getEmployerShifts: async (employerUserId: string, filters: { date?: string; status?: string; workOrderId?: string }) => {
    const where: any = { employer_id: employerUserId };

    if (filters.date) {
      where.shift_date = new Date(filters.date);
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters.workOrderId) {
      where.work_order_id = filters.workOrderId;
    }

    const shifts = await prisma.shifts.findMany({
      where,
      include: {
        work_orders: {
          select: {
            order_number: true,
            job_title: true,
            wage_amount: true,
            wage_frequency: true
          }
        },
        attendances: true
      },
      orderBy: [{ shift_date: 'desc' }, { start_time: 'asc' }]
    });

    return shifts;
  },

  /**
   * List shifts for worker
   */
  getWorkerShifts: async (workerUserId: string, filters: { date?: string; status?: string }) => {
    const where: any = { worker_id: workerUserId };

    if (filters.date) {
      where.shift_date = new Date(filters.date);
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    const shifts = await prisma.shifts.findMany({
      where,
      include: {
        work_orders: {
          select: {
            order_number: true,
            job_title: true,
            wage_amount: true,
            wage_frequency: true,
            worksite_name: true,
            worksite_address: true,
            city: true
          }
        },
        attendances: true
      },
      orderBy: [{ shift_date: 'desc' }, { start_time: 'asc' }]
    });

    return shifts;
  },

  /**
   * Get single shift with attendance details
   */
  getShiftById: async (userId: string, role: string, shiftId: string) => {
    const shift = await prisma.shifts.findUnique({
      where: { id: shiftId },
      include: {
        work_orders: true,
        attendances: true
      }
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role?.toUpperCase());
    if (!isAdmin && shift.employer_id !== userId && shift.worker_id !== userId && shift.supervisor_id !== userId) {
      throw new Error("Forbidden: You do not have permission to view this shift");
    }

    return shift;
  },

  // ==========================================================================
  // 2. CRYPTOGRAPHIC CREDENTIALS: QR TOKEN & OTP PIN
  // ==========================================================================

  /**
   * Generate short-lived HMAC-SHA256 signed QR code token (valid 60 seconds)
   */
  generateQrToken: (employerUserId: string, shiftId: string): { token: string; expiresAt: number } => {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 60; // 60-second window
    const payload = `${shiftId}:${employerUserId}:${expiresAt}`;
    
    const signature = crypto
      .createHmac('sha256', QR_SIGNING_SECRET)
      .update(payload)
      .digest('hex');

    const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
    return { token, expiresAt };
  },

  /**
   * Verify HMAC QR token
   */
  verifyQrToken: (token: string, expectedShiftId: string): boolean => {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      const { payload, signature } = decoded;

      const expectedSig = crypto
        .createHmac('sha256', QR_SIGNING_SECRET)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSig) return false;

      const [shiftId, , expiresAtStr] = payload.split(':');
      if (shiftId !== expectedShiftId) return false;

      const expiresAt = parseInt(expiresAtStr, 10);
      const now = Math.floor(Date.now() / 1000);
      return now <= expiresAt;
    } catch {
      return false;
    }
  },

  /**
   * Generate 6-digit one-time PIN (valid 10 minutes)
   */
  generateOtpPin: (employerUserId: string, shiftId: string): { otp: string; expiresAt: number } => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(shiftId, {
      otp,
      shiftId,
      employerId: employerUserId,
      createdAt: Date.now(),
      attempts: 0
    });

    return { otp, expiresAt };
  },

  /**
   * Verify 6-digit PIN with rate-limiting
   */
  verifyOtpPin: (shiftId: string, enteredOtp: string): boolean => {
    const entry = otpStore.get(shiftId);
    if (!entry) return false;

    // 10-minute expiry check
    if (Date.now() - entry.createdAt > 10 * 60 * 1000) {
      otpStore.delete(shiftId);
      return false;
    }

    // Rate-limiting check (max 3 failed attempts)
    if (entry.attempts >= 3) {
      otpStore.delete(shiftId);
      throw new Error("PIN locked due to too many failed attempts. Request a new PIN from your supervisor.");
    }

    if (entry.otp === enteredOtp.trim()) {
      return true;
    } else {
      entry.attempts += 1;
      return false;
    }
  },

  // ==========================================================================
  // 3. ATTENDANCE ACTIONS: CHECK-IN, BREAK, CHECK-OUT
  // ==========================================================================

  /**
   * Check In worker to shift
   */
  checkIn: async (workerUserId: string, input: AttendanceCheckInInput) => {
    const shift = await prisma.shifts.findUnique({
      where: { id: input.shiftId },
      include: { work_orders: true }
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    // Ensure worker is assigned
    if (shift.worker_id !== workerUserId) {
      throw new Error("Forbidden: You are not assigned to this shift");
    }

    // Verify verification credential
    if (input.method === 'QR_CODE') {
      if (!input.token || !ShiftAttendanceService.verifyQrToken(input.token, shift.id)) {
        throw new Error("Invalid or expired QR code token. Please scan the current supervisor QR code.");
      }
    } else if (input.method === 'ONE_TIME_PIN') {
      if (!input.otp || !ShiftAttendanceService.verifyOtpPin(shift.id, input.otp)) {
        throw new Error("Invalid or expired one-time PIN. Please ask your supervisor for the active code.");
      }
    } else if (input.method === 'MANUAL_SUPERVISOR') {
      if (!input.manualReason || input.manualReason.trim().length < 5) {
        throw new Error("Mandatory reason required for manual attendance check-in (min 5 characters).");
      }
    }

    // Fetch existing attendance record
    let attendance = await prisma.shift_attendances.findUnique({
      where: {
        shift_id_worker_id: {
          shift_id: shift.id,
          worker_id: workerUserId
        }
      }
    });

    if (attendance && attendance.status !== 'NOT_STARTED') {
      throw new Error(`Cannot check in. Current attendance status is already: ${attendance.status}`);
    }

    const now = new Date();
    const eventAudit = {
      event: 'CHECKED_IN',
      method: input.method,
      timestamp: now.toISOString(),
      lat: input.latitude || null,
      lng: input.longitude || null,
      notes: input.notes || null,
      manualReason: input.manualReason || null
    };

    const updated = await prisma.shift_attendances.upsert({
      where: {
        shift_id_worker_id: {
          shift_id: shift.id,
          worker_id: workerUserId
        }
      },
      update: {
        status: 'CHECKED_IN',
        verification_method: input.method,
        check_in_time: now,
        check_in_lat: input.latitude || null,
        check_in_lng: input.longitude || null,
        check_in_notes: input.notes || null,
        manual_reason: input.manualReason || null,
        events: attendance ? ([...(attendance.events as any[]), eventAudit] as any) : ([eventAudit] as any)
      },
      create: {
        shift_id: shift.id,
        work_order_id: shift.work_order_id,
        worker_id: workerUserId,
        employer_id: shift.employer_id,
        supervisor_id: shift.supervisor_id,
        status: 'CHECKED_IN',
        verification_method: input.method,
        check_in_time: now,
        check_in_lat: input.latitude || null,
        check_in_lng: input.longitude || null,
        check_in_notes: input.notes || null,
        manual_reason: input.manualReason || null,
        events: [eventAudit] as any
      }
    });

    return updated;
  },

  /**
   * Start or End break during shift
   */
  recordBreak: async (workerUserId: string, shiftId: string, action: 'START' | 'END') => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: {
        shift_id_worker_id: {
          shift_id: shiftId,
          worker_id: workerUserId
        }
      }
    });

    if (!attendance) {
      throw new Error("Attendance record not found for this shift");
    }

    const now = new Date();
    let nextStatus = attendance.status;
    let totalBreak = attendance.total_break_minutes;

    if (action === 'START') {
      if (attendance.status !== 'CHECKED_IN') {
        throw new Error(`Cannot start break while in status: ${attendance.status}`);
      }
      nextStatus = 'ON_BREAK';
    } else {
      if (attendance.status !== 'ON_BREAK') {
        throw new Error(`Cannot end break while in status: ${attendance.status}`);
      }
      nextStatus = 'CHECKED_IN';
      if (attendance.break_start_time) {
        const breakMins = Math.max(0, Math.round((now.getTime() - new Date(attendance.break_start_time).getTime()) / 60000));
        totalBreak += breakMins;
      }
    }

    const eventAudit = {
      event: action === 'START' ? 'BREAK_STARTED' : 'BREAK_ENDED',
      timestamp: now.toISOString()
    };

    const updated = await prisma.shift_attendances.update({
      where: { id: attendance.id },
      data: {
        status: nextStatus,
        break_start_time: action === 'START' ? now : attendance.break_start_time,
        break_end_time: action === 'END' ? now : attendance.break_end_time,
        total_break_minutes: totalBreak,
        events: [...(attendance.events as any[]), eventAudit] as any
      }
    });

    return updated;
  },

  /**
   * Check Out worker from shift
   */
  checkOut: async (workerUserId: string, input: AttendanceCheckOutInput) => {
    const shift = await prisma.shifts.findUnique({
      where: { id: input.shiftId },
      include: { work_orders: true }
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    if (shift.worker_id !== workerUserId) {
      throw new Error("Forbidden: You are not assigned to this shift");
    }

    const attendance = await prisma.shift_attendances.findUnique({
      where: {
        shift_id_worker_id: {
          shift_id: shift.id,
          worker_id: workerUserId
        }
      }
    });

    if (!attendance || !['CHECKED_IN', 'ON_BREAK'].includes(attendance.status)) {
      throw new Error(`Cannot check out without an active check-in (current status: ${attendance?.status || 'NONE'}).`);
    }

    // Verify verification credential
    if (input.method === 'QR_CODE') {
      if (!input.token || !ShiftAttendanceService.verifyQrToken(input.token, shift.id)) {
        throw new Error("Invalid or expired QR code token. Please scan the current supervisor QR code.");
      }
    } else if (input.method === 'ONE_TIME_PIN') {
      if (!input.otp || !ShiftAttendanceService.verifyOtpPin(shift.id, input.otp)) {
        throw new Error("Invalid or expired one-time PIN. Please ask your supervisor for the active code.");
      }
    } else if (input.method === 'MANUAL_SUPERVISOR') {
      if (!input.manualReason || input.manualReason.trim().length < 5) {
        throw new Error("Mandatory reason required for manual attendance check-out (min 5 characters).");
      }
    }

    const now = new Date();
    const checkInMs = attendance.check_in_time ? new Date(attendance.check_in_time).getTime() : now.getTime();
    const grossMinutes = Math.max(0, Math.round((now.getTime() - checkInMs) / 60000));
    const netWorkMinutes = Math.max(0, grossMinutes - attendance.total_break_minutes);

    const eventAudit = {
      event: 'CHECKED_OUT',
      method: input.method,
      timestamp: now.toISOString(),
      lat: input.latitude || null,
      lng: input.longitude || null,
      netWorkMinutes: netWorkMinutes,
      notes: input.notes || null
    };

    const updated = await prisma.shift_attendances.update({
      where: { id: attendance.id },
      data: {
        status: 'PENDING_APPROVAL',
        check_out_time: now,
        check_out_lat: input.latitude || null,
        check_out_lng: input.longitude || null,
        check_out_notes: input.notes || null,
        total_work_minutes: netWorkMinutes,
        events: [...(attendance.events as any[]), eventAudit] as any
      }
    });

    // Notify Employer for approval
    try {
      await NotificationDispatcher.dispatch({
        userId: shift.employer_id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Shift Attendance Pending Approval ⏱️',
        message: `Worker check-out recorded for "${shift.work_orders.job_title}" (${netWorkMinutes} mins). Review and approve in shift register.`,
        link: '/attendance'
      });
    } catch (err) {
      console.warn("[ShiftAttendanceService] Notification warning:", err);
    }

    return updated;
  },

  // ==========================================================================
  // 4. APPROVALS, CORRECTIONS & REGISTER
  // ==========================================================================

  /**
   * Employer approves verified attendance
   */
  approveAttendance: async (employerUserId: string, attendanceId: string) => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: { id: attendanceId },
      include: { shifts: true, work_orders: true }
    });

    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    if (attendance.employer_id !== employerUserId) {
      throw new Error("Forbidden: You do not own this work order shift");
    }

    if (!['CHECKED_OUT', 'PENDING_APPROVAL', 'CORRECTION_REQUESTED'].includes(attendance.status)) {
      throw new Error(`Cannot approve attendance in status: ${attendance.status}`);
    }

    const now = new Date();
    const eventAudit = {
      event: 'APPROVED',
      approvedBy: employerUserId,
      timestamp: now.toISOString()
    };

    const updated = await prisma.shift_attendances.update({
      where: { id: attendanceId },
      data: {
        status: 'APPROVED',
        approved_by: employerUserId,
        approved_at: now,
        events: [...(attendance.events as any[]), eventAudit] as any
      }
    });

    // Notify Worker
    try {
      await NotificationDispatcher.dispatch({
        userId: attendance.worker_id,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'Shift Attendance Approved ✅',
        message: `Your shift attendance on ${new Date(attendance.shifts.shift_date).toLocaleDateString('en-IN')} has been approved (${attendance.total_work_minutes} work minutes).`,
        link: '/shifts'
      });
    } catch (err) {
      console.warn("[ShiftAttendanceService] Notification warning:", err);
    }

    return updated;
  },

  /**
   * Worker requests attendance time correction
   */
  requestCorrection: async (workerUserId: string, attendanceId: string, input: AttendanceCorrectionInput) => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: { id: attendanceId },
      include: { shifts: true }
    });

    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    if (attendance.worker_id !== workerUserId) {
      throw new Error("Forbidden: You are not the worker on this record");
    }

    if (!input.reason || input.reason.trim().length < 5) {
      throw new Error("Correction reason is required (min 5 characters)");
    }

    const now = new Date();
    const eventAudit = {
      event: 'CORRECTION_REQUESTED',
      proposedCheckIn: input.proposedCheckIn || null,
      proposedCheckOut: input.proposedCheckOut || null,
      reason: input.reason,
      timestamp: now.toISOString()
    };

    const updated = await prisma.shift_attendances.update({
      where: { id: attendanceId },
      data: {
        status: 'CORRECTION_REQUESTED',
        correction_reason: input.reason,
        correction_requested_time: now,
        correction_proposed_check_in: input.proposedCheckIn ? new Date(input.proposedCheckIn) : null,
        correction_proposed_check_out: input.proposedCheckOut ? new Date(input.proposedCheckOut) : null,
        events: [...(attendance.events as any[]), eventAudit] as any
      }
    });

    return updated;
  },

  /**
   * Shift Attendance Register for employer (Daily or Range summary)
   */
  getAttendanceRegister: async (employerUserId: string, dateStr?: string) => {
    const date = dateStr ? new Date(dateStr) : new Date();

    const shifts = await prisma.shifts.findMany({
      where: {
        employer_id: employerUserId,
        shift_date: date
      },
      include: {
        work_orders: {
          select: {
            order_number: true,
            job_title: true,
            wage_amount: true,
            wage_frequency: true
          }
        },
        attendances: true
      },
      orderBy: { start_time: 'asc' }
    });

    // Fetch worker metadata for friendly display names
    const workerIds = shifts.map(s => s.worker_id);
    const workerProfiles = await prisma.worker_profiles.findMany({
      where: { user_id: { in: workerIds } },
      select: { user_id: true, full_name: true, phone_number: true, profile_image_url: true }
    });

    const workerMap = new Map(workerProfiles.map(w => [w.user_id, w]));

    return shifts.map(s => {
      const attendance = s.attendances[0] || null;
      const worker = workerMap.get(s.worker_id);

      return {
        shiftId: s.id,
        shiftDate: s.shift_date,
        startTime: s.start_time,
        endTime: s.end_time,
        worksiteName: s.worksite_name,
        workOrderId: s.work_order_id,
        orderNumber: s.work_orders.order_number,
        jobTitle: s.work_orders.job_title,
        wageAmount: s.work_orders.wage_amount,
        wageFrequency: s.work_orders.wage_frequency,
        worker: {
          userId: s.worker_id,
          name: worker?.full_name || 'Assigned Worker',
          phone: worker?.phone_number || '',
          photo: worker?.profile_image_url || ''
        },
        attendance: attendance
          ? {
              id: attendance.id,
              status: attendance.status,
              verificationMethod: attendance.verification_method,
              checkInTime: attendance.check_in_time,
              checkOutTime: attendance.check_out_time,
              totalWorkMinutes: attendance.total_work_minutes,
              totalBreakMinutes: attendance.total_break_minutes,
              approvedAt: attendance.approved_at,
              correctionReason: attendance.correction_reason
            }
          : null
      };
    });
  }
};
