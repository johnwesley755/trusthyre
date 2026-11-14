import crypto from 'crypto';
import prisma from '../config/prisma';
import { NotificationDispatcher } from './notificationDispatcher';

// Enforce that QR_SIGNING_SECRET is strictly provided in production
function getQrSigningSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.QR_SIGNING_SECRET;
  if (!secret) {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET or QR_SIGNING_SECRET is not configured. Server must fail closed.");
  }
  return secret;
}

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
  method: 'QR_CODE' | 'ONE_TIME_PIN';
  token?: string; // HMAC token for QR
  otp?: string;   // 6-digit PIN
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface AttendanceCheckOutInput {
  shiftId: string;
  method: 'QR_CODE' | 'ONE_TIME_PIN';
  token?: string;
  otp?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ManualSupervisorAttendanceInput {
  shiftId: string;
  workerId: string;
  action: 'CHECK_IN' | 'CHECK_OUT';
  manualReason: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface AttendanceCorrectionInput {
  proposedCheckIn?: string;
  proposedCheckOut?: string;
  reason: string;
}

export interface ResolveCorrectionInput {
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}

export const ShiftAttendanceService = {

  // ==========================================================================
  // 1. SHIFT SCHEDULING (EMPLOYER)
  // ==========================================================================

  createShifts: async (employerUserId: string, input: CreateShiftInput) => {
    // 1. Validate time format HH:mm
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(input.startTime) || !timeRegex.test(input.endTime)) {
      throw new Error("Invalid time format. startTime and endTime must be HH:mm (24-hour format).");
    }

    const breakDuration = input.breakDurationMinutes !== undefined ? input.breakDurationMinutes : 60;
    if (breakDuration < 0) {
      throw new Error("breakDurationMinutes cannot be negative.");
    }

    // 2. Verify Work Order exists and is in ACCEPTED or IN_PROGRESS state
    const workOrder = await prisma.work_orders.findUnique({
      where: { id: input.workOrderId }
    });

    if (!workOrder) {
      throw new Error("Work order not found");
    }

    if (workOrder.employer_id !== employerUserId) {
      throw new Error("Forbidden: You do not own this work order");
    }

    if (!['ACCEPTED', 'IN_PROGRESS'].includes(workOrder.status)) {
      throw new Error(`Cannot schedule shifts for work order with status: ${workOrder.status}. Must be ACCEPTED or IN_PROGRESS.`);
    }

    const workerId = workOrder.worker_id;
    const baseDate = new Date(input.shiftDate);
    if (isNaN(baseDate.getTime())) {
      throw new Error("Invalid shiftDate format. Use YYYY-MM-DD.");
    }

    const worksiteName = input.worksiteName || workOrder.worksite_name;
    const worksiteAddress = input.worksiteAddress || workOrder.worksite_address;
    const city = input.city || workOrder.city;

    const daysCount = Math.max(1, Math.min(input.recurringDays || 1, 30));
    const createdShifts: any[] = [];

    // 3. Atomically generate shifts and attendance shells inside a Prisma transaction
    await prisma.$transaction(async (tx) => {
      let currentDayOffset = 0;
      let scheduledCount = 0;

      while (scheduledCount < daysCount && currentDayOffset < 60) {
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + currentDayOffset);
        currentDayOffset += 1;

        if (input.recurrenceRule === 'WEEKDAYS') {
          const dayOfWeek = targetDate.getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        } else if (input.recurrenceRule === 'WEEKLY') {
          if ((currentDayOffset - 1) % 7 !== 0) continue;
        }

        // Verify shift date falls within work order bounds if expected_end_date is defined
        if (workOrder.expected_end_date && targetDate > new Date(workOrder.expected_end_date)) {
          break;
        }

        // Check for duplicate shift on same date and start time for worker
        const existing = await tx.shifts.findFirst({
          where: {
            work_order_id: workOrder.id,
            worker_id: workerId,
            shift_date: targetDate,
            start_time: input.startTime,
            status: { not: 'CANCELLED' }
          }
        });

        if (existing) {
          continue; // Skip duplicate shift
        }

        const shift = await tx.shifts.create({
          data: {
            work_order_id: workOrder.id,
            employer_id: employerUserId,
            worker_id: workerId,
            supervisor_id: input.supervisorId || null,
            shift_date: targetDate,
            start_time: input.startTime,
            end_time: input.endTime,
            break_duration_minutes: breakDuration,
            worksite_name: worksiteName,
            worksite_address: worksiteAddress,
            city: city,
            status: 'SCHEDULED',
            recurrence_rule: input.recurrenceRule || 'DAILY',
            notes: input.notes || null
          }
        });

        // Create atomic attendance shell
        await tx.shift_attendances.create({
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
            events: []
          }
        });

        createdShifts.push(shift);
        scheduledCount += 1;
      }
    });

    // Notify Worker
    try {
      await NotificationDispatcher.dispatch({
        userId: workerId,
        type: 'SYSTEM_ANNOUNCEMENT',
        title: 'New Shifts Scheduled 📅',
        message: `${createdShifts.length} shift(s) scheduled for "${workOrder.job_title}" starting ${input.shiftDate}. View details in shifts tab.`,
        link: '/shifts'
      });
    } catch (err) {
      console.warn("[ShiftAttendanceService] Notification warning:", err);
    }

    return createdShifts;
  },

  getEmployerShifts: async (employerUserId: string, filters: { date?: string; status?: string }) => {
    const where: any = { employer_id: employerUserId };

    if (filters.date) {
      where.shift_date = new Date(filters.date);
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    return prisma.shifts.findMany({
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
  },

  getWorkerShifts: async (workerUserId: string, filters: { date?: string; status?: string }) => {
    const where: any = { worker_id: workerUserId };

    if (filters.date) {
      where.shift_date = new Date(filters.date);
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    return prisma.shifts.findMany({
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
  },

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
  // 2. CREDENTIAL ISSUANCE & VERIFICATION (DATABASE-PERSISTED & RATE-LIMITED)
  // ==========================================================================

  /**
   * Helper: verify issuer owns the shift or is explicitly assigned supervisor
   */
  assertIssuerAuthorized: async (issuerUserId: string, shiftId: string) => {
    const shift = await prisma.shifts.findUnique({
      where: { id: shiftId },
      include: { work_orders: true }
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    if (shift.status === 'CANCELLED') {
      throw new Error("Cannot issue credentials for a cancelled shift");
    }

    if (shift.work_orders.status === 'CANCELLED') {
      throw new Error("Cannot issue credentials for a cancelled work order");
    }

    const isEmployer = shift.employer_id === issuerUserId;
    const isSupervisor = shift.supervisor_id === issuerUserId;

    if (!isEmployer && !isSupervisor) {
      throw new Error("Forbidden: Only the employer or assigned supervisor can generate attendance credentials");
    }

    return shift;
  },

  /**
   * Generate short-lived HMAC-SHA256 signed QR code token with nonce persisted in attendance_challenges
   */
  generateQrToken: async (issuerUserId: string, shiftId: string, action: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN') => {
    const shift = await ShiftAttendanceService.assertIssuerAuthorized(issuerUserId, shiftId);
    const secret = getQrSigningSecret();

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 60; // 60-second sliding window
    const nonce = crypto.randomBytes(16).toString('hex');
    const payload = `${shift.id}:${issuerUserId}:${action}:${nonce}:${expiresAt}`;
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Hash secret payload for database challenge storage
    const hashedSecret = crypto.createHash('sha256').update(signature).digest('hex');

    await prisma.attendance_challenges.create({
      data: {
        shift_id: shift.id,
        challenge_type: 'QR_CODE',
        intended_action: action,
        hashed_secret: hashedSecret,
        nonce: nonce,
        issuer_user_id: issuerUserId,
        expires_at: new Date(expiresAt * 1000)
      }
    });

    const token = Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
    return { token, expiresAt };
  },

  /**
   * Helper: accurately calculate gross and net work minutes, accounting for active breaks
   */
  calculateNetWorkMinutes: (checkInTime: Date, checkOutTime: Date, totalBreakMinutes: number, currentStatus: string, lastBreakStart?: Date | null): { grossMinutes: number; totalBreakMinutes: number; netWorkMinutes: number } => {
    let accumulatedBreak = totalBreakMinutes || 0;
    if (currentStatus === 'ON_BREAK' && lastBreakStart) {
      const activeBreakMins = Math.max(0, Math.round((checkOutTime.getTime() - new Date(lastBreakStart).getTime()) / 60000));
      accumulatedBreak += activeBreakMins;
    }
    const checkInMs = new Date(checkInTime).getTime();
    const grossMinutes = Math.max(0, Math.round((checkOutTime.getTime() - checkInMs) / 60000));
    const netWorkMinutes = Math.max(0, grossMinutes - accumulatedBreak);
    return { grossMinutes, totalBreakMinutes: accumulatedBreak, netWorkMinutes };
  },

  /**
   * Verify HMAC QR token with timing-safe check and atomic single-use nonce consumption.
   * Can run within an existing Prisma transaction client (tx) or standard prisma client.
   */
  verifyAndConsumeQrToken: async (token: string, expectedShiftId: string, action: 'CHECK_IN' | 'CHECK_OUT', txClient?: any): Promise<boolean> => {
    try {
      const db = txClient || prisma;
      const secret = getQrSigningSecret();
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      const { payload, signature } = decoded;

      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Timing-safe signature comparison
      const sigBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        return false;
      }

      const [shiftId, issuerId, payloadAction, nonce, expiresAtStr] = payload.split(':');
      if (shiftId !== expectedShiftId || payloadAction !== action) return false;

      const expiresAt = parseInt(expiresAtStr, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now > expiresAt) return false;

      // Verify issuer is still authorized for this shift (employer or assigned supervisor)
      const shift = await db.shifts.findUnique({
        where: { id: expectedShiftId },
        select: { employer_id: true, supervisor_id: true }
      });
      if (!shift || (shift.employer_id !== issuerId && shift.supervisor_id !== issuerId)) {
        return false;
      }

      // Hash signature to compare with stored challenge hash
      const hashedSignature = crypto.createHash('sha256').update(signature).digest('hex');

      // Atomic single-step conditional updateMany: protects against double consumption & concurrency races
      const updateResult = await db.attendance_challenges.updateMany({
        where: {
          nonce: nonce,
          consumed_at: null,
          expires_at: { gt: new Date() },
          shift_id: expectedShiftId,
          intended_action: action,
          challenge_type: 'QR_CODE',
          issuer_user_id: issuerId,
          hashed_secret: hashedSignature
        },
        data: {
          consumed_at: new Date()
        }
      });

      return updateResult.count > 0;
    } catch {
      return false;
    }
  },

  /**
   * Generate 6-digit cryptographic PIN persisted in attendance_challenges table
   */
  generateOtpPin: async (issuerUserId: string, shiftId: string, action: 'CHECK_IN' | 'CHECK_OUT' = 'CHECK_IN') => {
    const shift = await ShiftAttendanceService.assertIssuerAuthorized(issuerUserId, shiftId);

    // Cryptographically secure 6-digit PIN
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes TTL
    const nonce = crypto.randomBytes(16).toString('hex');

    // SHA-256 hash of OTP
    const hashedSecret = crypto.createHash('sha256').update(otp).digest('hex');

    await prisma.attendance_challenges.create({
      data: {
        shift_id: shift.id,
        challenge_type: 'ONE_TIME_PIN',
        intended_action: action,
        hashed_secret: hashedSecret,
        nonce: nonce,
        issuer_user_id: issuerUserId,
        expires_at: expiresAt,
        max_attempts: 3
      }
    });

    return { otp, expiresAt: expiresAt.getTime() };
  },

  /**
   * Verify and atomically consume OTP PIN from database.
   * Atomically increments attempt_count and enforces attempt_count < max_attempts.
   * IMPORTANT: The attempt counter increment is executed on root prisma client, ensuring
   * it persists across database transactions even if the calling checkIn/checkOut rolls back.
   */
  verifyAndConsumeOtpPin: async (shiftId: string, enteredOtp: string, action: 'CHECK_IN' | 'CHECK_OUT', txClient?: any): Promise<boolean> => {
    const db = txClient || prisma;
    const hashedInput = crypto.createHash('sha256').update(enteredOtp.trim()).digest('hex');
    const now = new Date();

    // 1. Atomically consume if hash matches and attempt_count < max_attempts
    const updateResult = await db.attendance_challenges.updateMany({
      where: {
        shift_id: shiftId,
        challenge_type: 'ONE_TIME_PIN',
        intended_action: action,
        consumed_at: null,
        expires_at: { gt: now },
        attempt_count: { lt: 3 },
        hashed_secret: hashedInput
      },
      data: {
        consumed_at: now
      }
    });

    if (updateResult.count > 0) {
      return true;
    }

    // 2. If no matching challenge was consumed, atomically increment attempt_count on active PINs
    // Must execute on ROOT prisma client so that when caller throws and rolls back txClient,
    // the recorded failed attempt count still persists in PostgreSQL!
    await prisma.attendance_challenges.updateMany({
      where: {
        shift_id: shiftId,
        challenge_type: 'ONE_TIME_PIN',
        intended_action: action,
        consumed_at: null,
        expires_at: { gt: now }
      },
      data: {
        attempt_count: { increment: 1 }
      }
    });

    return false;
  },

  // ==========================================================================
  // 3. ATTENDANCE WORKFLOW (CHECK-IN, BREAK, CHECK-OUT, MANUAL RECORDING)
  // ==========================================================================

  checkIn: async (workerUserId: string, input: AttendanceCheckInInput) => {
    // 1. Strict runtime method validation
    if (!['QR_CODE', 'ONE_TIME_PIN'].includes(input.method)) {
      throw new Error(`Unsupported check-in method: "${input.method}". Workers can only check in using QR_CODE or ONE_TIME_PIN.`);
    }

    const shift = await prisma.shifts.findUnique({
      where: { id: input.shiftId },
      include: { work_orders: true }
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    if (shift.status === 'CANCELLED') {
      throw new Error("Cannot check in to a cancelled shift");
    }

    if (!['ACCEPTED', 'IN_PROGRESS'].includes(shift.work_orders.status)) {
      throw new Error(`Cannot check in. Work order status is: ${shift.work_orders.status}`);
    }

    if (shift.worker_id !== workerUserId) {
      throw new Error("Forbidden: You are not assigned to this shift");
    }

    // Execute within a single atomic transaction: credential check + conditional state update + event audit
    return prisma.$transaction(async (tx) => {
      // 2. Verify and atomically consume credential inside transaction
      if (input.method === 'QR_CODE') {
        if (!input.token) throw new Error("QR token required for QR check-in");
        const valid = await ShiftAttendanceService.verifyAndConsumeQrToken(input.token, shift.id, 'CHECK_IN', tx);
        if (!valid) throw new Error("Invalid, expired, or already used QR code. Please scan the current supervisor QR code.");
      } else if (input.method === 'ONE_TIME_PIN') {
        if (!input.otp) throw new Error("PIN required for PIN check-in");
        const valid = await ShiftAttendanceService.verifyAndConsumeOtpPin(shift.id, input.otp, 'CHECK_IN', tx);
        if (!valid) throw new Error("Invalid, expired, or locked one-time PIN. Ask supervisor for an active code.");
      }

      const now = new Date();
      const eventAudit = {
        event: 'CHECKED_IN',
        method: input.method,
        timestamp: now.toISOString(),
        lat: input.latitude || null,
        lng: input.longitude || null,
        notes: input.notes || null
      };

      // 3. Conditional Compare-and-Set (CAS) State Update
      // Ensure row exists and status is strictly NOT_STARTED; if no row exists, create it
      const existingAttendance = await tx.shift_attendances.findUnique({
        where: {
          shift_id_worker_id: {
            shift_id: shift.id,
            worker_id: workerUserId
          }
        }
      });

      let updatedId = existingAttendance?.id;

      if (existingAttendance) {
        const updateResult = await tx.shift_attendances.updateMany({
          where: {
            id: existingAttendance.id,
            status: 'NOT_STARTED' // CAS: only succeed if status hasn't moved
          },
          data: {
            status: 'CHECKED_IN',
            verification_method: input.method,
            check_in_time: now,
            check_in_lat: input.latitude || null,
            check_in_lng: input.longitude || null,
            check_in_notes: input.notes || null,
            events: ([...(existingAttendance.events as any[]), eventAudit] as any)
          }
        });

        if (updateResult.count === 0) {
          throw new Error("Conflict: Shift has already been checked in by a concurrent request.");
        }
      } else {
        const created = await tx.shift_attendances.create({
          data: {
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
            events: [eventAudit] as any
          }
        });
        updatedId = created.id;
      }

      const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: updatedId! } });

      // Write to immutable attendance_events log
      await tx.attendance_events.create({
        data: {
          attendance_id: updated.id,
          event_type: 'CHECKED_IN',
          actor_user_id: workerUserId,
          actor_role: 'WORKER',
          verification_method: input.method,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          notes: input.notes || null,
          event_data: eventAudit as any
        }
      });

      // Auto-transition work order from ACCEPTED to IN_PROGRESS on first shift check-in
      if (shift.work_orders.status === 'ACCEPTED') {
        await tx.work_orders.update({
          where: { id: shift.work_order_id },
          data: { status: 'IN_PROGRESS' }
        });
      }

      return updated;
    });
  },

  recordBreak: async (workerUserId: string, shiftId: string, action: 'START' | 'END') => {
    return prisma.$transaction(async (tx) => {
      const attendance = await tx.shift_attendances.findUnique({
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
        const breakStart = attendance.last_break_start || attendance.break_start_time;
        if (breakStart) {
          const breakMins = Math.max(0, Math.round((now.getTime() - new Date(breakStart).getTime()) / 60000));
          totalBreak += breakMins;
        }
      }

      const eventAudit = {
        event: action === 'START' ? 'BREAK_STARTED' : 'BREAK_ENDED',
        timestamp: now.toISOString()
      };

      // CAS update: condition on current status
      const updateResult = await tx.shift_attendances.updateMany({
        where: {
          id: attendance.id,
          status: action === 'START' ? 'CHECKED_IN' : 'ON_BREAK'
        },
        data: {
          status: nextStatus,
          break_start_time: action === 'START' ? now : attendance.break_start_time,
          last_break_start: action === 'START' ? now : null,
          break_end_time: action === 'END' ? now : attendance.break_end_time,
          total_break_minutes: totalBreak,
          events: [...(attendance.events as any[]), eventAudit] as any
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Conflict: Break state has been modified by a concurrent request.");
      }

      const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendance.id } });

      await tx.attendance_events.create({
        data: {
          attendance_id: attendance.id,
          event_type: action === 'START' ? 'BREAK_STARTED' : 'BREAK_ENDED',
          actor_user_id: workerUserId,
          actor_role: 'WORKER',
          event_data: eventAudit as any
        }
      });

      return updated;
    });
  },

  checkOut: async (workerUserId: string, input: AttendanceCheckOutInput) => {
    // 1. Strict runtime method validation
    if (!['QR_CODE', 'ONE_TIME_PIN'].includes(input.method)) {
      throw new Error(`Unsupported check-out method: "${input.method}". Workers can only check out using QR_CODE or ONE_TIME_PIN.`);
    }

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

    return prisma.$transaction(async (tx) => {
      // 2. Load attendance inside transaction to avoid stale status races
      const attendance = await tx.shift_attendances.findUnique({
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

      // 3. Atomically verify & consume credential inside the transaction
      if (input.method === 'QR_CODE') {
        if (!input.token) throw new Error("QR token required for QR check-out");
        const valid = await ShiftAttendanceService.verifyAndConsumeQrToken(input.token, shift.id, 'CHECK_OUT', tx);
        if (!valid) throw new Error("Invalid, expired, or already used QR code token. Please scan the current supervisor QR code.");
      } else if (input.method === 'ONE_TIME_PIN') {
        if (!input.otp) throw new Error("PIN required for PIN check-out");
        const valid = await ShiftAttendanceService.verifyAndConsumeOtpPin(shift.id, input.otp, 'CHECK_OUT', tx);
        if (!valid) throw new Error("Invalid, expired, or locked one-time PIN. Ask supervisor for an active code.");
      }

      const now = new Date();
      const { grossMinutes, totalBreakMinutes: accumulatedBreakMinutes, netWorkMinutes } = ShiftAttendanceService.calculateNetWorkMinutes(
        attendance.check_in_time || now,
        now,
        attendance.total_break_minutes,
        attendance.status,
        attendance.last_break_start
      );

      const eventAudit = {
        event: 'CHECKED_OUT',
        method: input.method,
        timestamp: now.toISOString(),
        lat: input.latitude || null,
        lng: input.longitude || null,
        netWorkMinutes: netWorkMinutes,
        totalBreakMinutes: accumulatedBreakMinutes,
        notes: input.notes || null
      };

      // CAS update: condition on current status in CHECKED_IN or ON_BREAK
      const updateResult = await tx.shift_attendances.updateMany({
        where: {
          id: attendance.id,
          status: { in: ['CHECKED_IN', 'ON_BREAK'] }
        },
        data: {
          status: 'PENDING_APPROVAL',
          check_out_time: now,
          check_out_lat: input.latitude || null,
          check_out_lng: input.longitude || null,
          check_out_notes: input.notes || null,
          total_break_minutes: accumulatedBreakMinutes,
          total_work_minutes: netWorkMinutes,
          last_break_start: null,
          events: [...(attendance.events as any[]), eventAudit] as any
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Conflict: Shift has already been checked out by a concurrent request.");
      }

      const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendance.id } });

      await tx.attendance_events.create({
        data: {
          attendance_id: attendance.id,
          event_type: 'CHECKED_OUT',
          actor_user_id: workerUserId,
          actor_role: 'WORKER',
          verification_method: input.method,
          latitude: input.latitude || null,
          longitude: input.longitude || null,
          notes: input.notes || null,
          event_data: eventAudit as any
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
    });
  },

  /**
   * Dedicated supervisor manual attendance recording with mandatory justification
   */
  recordManualAttendance: async (supervisorUserId: string, input: ManualSupervisorAttendanceInput) => {
    // 1. Strict Action Validation
    if (input.action !== 'CHECK_IN' && input.action !== 'CHECK_OUT') {
      throw new Error(`Invalid manual attendance action: "${input.action}". Must be either CHECK_IN or CHECK_OUT.`);
    }

    if (!input.manualReason || input.manualReason.trim().length < 10) {
      throw new Error("Mandatory reason required for supervisor manual attendance (min 10 characters).");
    }

    // 2. Strict Timestamp Validation
    const now = input.timestamp ? new Date(input.timestamp) : new Date();
    if (isNaN(now.getTime())) {
      throw new Error("Invalid attendance timestamp format.");
    }
    // Allow at most 60s future clock skew
    if (now.getTime() > Date.now() + 60000) {
      throw new Error("Attendance timestamp cannot be in the future.");
    }

    const shift = await prisma.shifts.findUnique({
      where: { id: input.shiftId },
      include: { work_orders: true }
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    // Cancellation check on shift and associated work order
    if (shift.status === 'CANCELLED') {
      throw new Error("Cannot record attendance for a cancelled shift.");
    }
    if (shift.work_orders?.status === 'CANCELLED') {
      throw new Error("Cannot record attendance for a cancelled work order.");
    }

    const isEmployer = shift.employer_id === supervisorUserId;
    const isSupervisor = shift.supervisor_id === supervisorUserId;
    if (!isEmployer && !isSupervisor) {
      throw new Error("Forbidden: You are not authorized to manually record attendance for this shift");
    }

    if (shift.worker_id !== input.workerId) {
      throw new Error("Worker is not assigned to this shift");
    }

    return prisma.$transaction(async (tx) => {
      // Recheck active status within transaction to eliminate concurrent cancellation race
      const activeShift = await tx.shifts.findUnique({
        where: { id: shift.id },
        include: { work_orders: true }
      });
      if (!activeShift || activeShift.status === 'CANCELLED' || activeShift.work_orders?.status === 'CANCELLED') {
        throw new Error("Conflict: Shift or associated work order was cancelled.");
      }

      let attendance = await tx.shift_attendances.findUnique({
        where: {
          shift_id_worker_id: {
            shift_id: shift.id,
            worker_id: input.workerId
          }
        }
      });

      // 3. For CHECK_OUT, verify chronological order
      if (input.action === 'CHECK_OUT') {
        if (!attendance || !['CHECKED_IN', 'ON_BREAK'].includes(attendance.status)) {
          throw new Error(`Cannot manual check-out without prior active check-in (current status: ${attendance?.status || 'NONE'}).`);
        }
        if (attendance.check_in_time && now.getTime() < new Date(attendance.check_in_time).getTime()) {
          throw new Error("Check-out timestamp cannot be earlier than check-in time.");
        }
      }

      const eventAudit = {
        event: input.action === 'CHECK_IN' ? 'SUPERVISOR_MANUAL_CHECK_IN' : 'SUPERVISOR_MANUAL_CHECK_OUT',
        method: 'MANUAL_SUPERVISOR',
        recordedBy: supervisorUserId,
        reason: input.manualReason,
        timestamp: now.toISOString(),
        notes: input.notes || null
      };

      if (input.action === 'CHECK_IN') {
        let updatedId = attendance?.id;
        if (attendance) {
          const updateResult = await tx.shift_attendances.updateMany({
            where: {
              id: attendance.id,
              status: 'NOT_STARTED'
            },
            data: {
              status: 'CHECKED_IN',
              verification_method: 'MANUAL_SUPERVISOR',
              check_in_time: now,
              manual_reason: input.manualReason,
              events: ([...(attendance.events as any[]), eventAudit] as any)
            }
          });
          if (updateResult.count === 0) {
            throw new Error("Conflict: Worker was already checked in by a concurrent request.");
          }
        } else {
          const created = await tx.shift_attendances.create({
            data: {
              shift_id: shift.id,
              work_order_id: shift.work_order_id,
              worker_id: input.workerId,
              employer_id: shift.employer_id,
              supervisor_id: supervisorUserId,
              status: 'CHECKED_IN',
              verification_method: 'MANUAL_SUPERVISOR',
              check_in_time: now,
              manual_reason: input.manualReason,
              events: [eventAudit] as any
            }
          });
          updatedId = created.id;
        }
        attendance = await tx.shift_attendances.findUniqueOrThrow({ where: { id: updatedId! } });
      } else {
        if (!attendance || !['CHECKED_IN', 'ON_BREAK'].includes(attendance.status)) {
          throw new Error(`Cannot manual check-out without prior active check-in (current status: ${attendance?.status || 'NONE'}).`);
        }

        const { grossMinutes, totalBreakMinutes: accumulatedBreakMinutes, netWorkMinutes } = ShiftAttendanceService.calculateNetWorkMinutes(
          attendance.check_in_time || now,
          now,
          attendance.total_break_minutes,
          attendance.status,
          attendance.last_break_start
        );

        const updateResult = await tx.shift_attendances.updateMany({
          where: {
            id: attendance.id,
            status: { in: ['CHECKED_IN', 'ON_BREAK'] }
          },
          data: {
            status: 'APPROVED',
            check_out_time: now,
            total_break_minutes: accumulatedBreakMinutes,
            total_work_minutes: netWorkMinutes,
            last_break_start: null,
            approved_by: supervisorUserId,
            approved_at: now,
            manual_reason: input.manualReason,
            events: [...(attendance.events as any[]), eventAudit] as any
          }
        });

        if (updateResult.count === 0) {
          throw new Error("Conflict: Shift has already been checked out by a concurrent request.");
        }

        attendance = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendance.id } });
      }

      await tx.attendance_events.create({
        data: {
          attendance_id: attendance.id,
          event_type: eventAudit.event,
          actor_user_id: supervisorUserId,
          actor_role: isEmployer ? 'EMPLOYER' : 'SUPERVISOR',
          verification_method: 'MANUAL_SUPERVISOR',
          notes: input.manualReason,
          event_data: eventAudit as any
        }
      });

      return attendance;
    });
  },

  // ==========================================================================
  // 4. APPROVALS, CORRECTIONS & REGISTER
  // ==========================================================================

  approveAttendance: async (employerUserId: string, attendanceId: string) => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: { id: attendanceId },
      include: { shifts: true, work_orders: true }
    });

    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    const isEmployer = attendance.employer_id === employerUserId;
    const isSupervisor = attendance.supervisor_id === employerUserId;
    if (!isEmployer && !isSupervisor) {
      throw new Error("Forbidden: You do not own or supervise this work order shift");
    }

    if (!['CHECKED_OUT', 'PENDING_APPROVAL'].includes(attendance.status)) {
      throw new Error(`Cannot approve attendance in status: ${attendance.status}`);
    }

    const now = new Date();
    const eventAudit = {
      event: 'APPROVED',
      approvedBy: employerUserId,
      timestamp: now.toISOString()
    };

    return prisma.$transaction(async (tx) => {
      const updateResult = await tx.shift_attendances.updateMany({
        where: {
          id: attendanceId,
          status: { in: ['CHECKED_OUT', 'PENDING_APPROVAL'] }
        },
        data: {
          status: 'APPROVED',
          approved_by: employerUserId,
          approved_at: now,
          events: [...(attendance.events as any[]), eventAudit] as any
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Conflict: Attendance record has already been approved or modified by another request.");
      }

      const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendanceId } });

      await tx.attendance_events.create({
        data: {
          attendance_id: attendanceId,
          event_type: 'APPROVED',
          actor_user_id: employerUserId,
          actor_role: isEmployer ? 'EMPLOYER' : 'SUPERVISOR',
          event_data: eventAudit as any
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
    });
  },

  /**
   * Worker requests attendance time correction
   * Only allowed for completed, checked-out, or pending approval records.
   * Atomic CAS prevents overwriting approved records or racing requests.
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

    const eligibleStatuses = ['CHECKED_OUT', 'COMPLETED', 'PENDING_APPROVAL'];
    if (!eligibleStatuses.includes(attendance.status)) {
      if (attendance.status === 'NOT_STARTED') {
        throw new Error("Cannot request correction for an unstarted shift");
      }
      if (attendance.status === 'CORRECTION_REQUESTED') {
        throw new Error("A correction request is already pending for this shift.");
      }
      if (attendance.status === 'APPROVED') {
        throw new Error("Cannot request correction for an already approved attendance record.");
      }
      throw new Error(`Cannot request correction for attendance in "${attendance.status}" status.`);
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

    return prisma.$transaction(async (tx) => {
      const updateResult = await tx.shift_attendances.updateMany({
        where: {
          id: attendanceId,
          worker_id: workerUserId,
          status: { in: eligibleStatuses }
        },
        data: {
          status: 'CORRECTION_REQUESTED',
          correction_reason: input.reason,
          correction_requested_time: now,
          correction_proposed_check_in: input.proposedCheckIn ? new Date(input.proposedCheckIn) : null,
          correction_proposed_check_out: input.proposedCheckOut ? new Date(input.proposedCheckOut) : null,
          events: ([...(attendance.events as any[]), eventAudit] as any)
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Conflict: Attendance record cannot be corrected from its current state or was modified concurrently.");
      }

      const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendanceId } });

      await tx.attendance_events.create({
        data: {
          attendance_id: attendanceId,
          event_type: 'CORRECTION_REQUESTED',
          actor_user_id: workerUserId,
          actor_role: 'WORKER',
          notes: input.reason,
          event_data: eventAudit as any
        }
      });

      return updated;
    });
  },

  /**
   * Supervisor resolves correction: updates timestamps and recalculates work minutes
   */
  resolveCorrection: async (supervisorUserId: string, attendanceId: string, input: ResolveCorrectionInput) => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: { id: attendanceId },
      include: { shifts: true }
    });

    if (!attendance) {
      throw new Error("Attendance record not found");
    }

    const isEmployer = attendance.employer_id === supervisorUserId;
    const isSupervisor = attendance.supervisor_id === supervisorUserId;
    if (!isEmployer && !isSupervisor) {
      throw new Error("Forbidden: You do not own or supervise this work order shift");
    }

    if (attendance.status !== 'CORRECTION_REQUESTED') {
      throw new Error(`Cannot resolve correction. Record status is: ${attendance.status}`);
    }

    const now = new Date();

    if (input.decision !== 'APPROVED' && input.decision !== 'REJECTED') {
      throw new Error(`Invalid decision: "${input.decision}". Must be APPROVED or REJECTED.`);
    }

    if (input.decision === 'REJECTED') {
      const eventAudit = {
        event: 'CORRECTION_REJECTED',
        resolvedBy: supervisorUserId,
        notes: input.notes || null,
        timestamp: now.toISOString()
      };

      return prisma.$transaction(async (tx) => {
        const updateResult = await tx.shift_attendances.updateMany({
          where: {
            id: attendanceId,
            status: 'CORRECTION_REQUESTED'
          },
          data: {
            status: 'PENDING_APPROVAL', // revert to pending approval
            correction_resolved_by: supervisorUserId,
            correction_resolved_at: now,
            correction_resolution_notes: input.notes || null,
            events: [...(attendance.events as any[]), eventAudit] as any
          }
        });

        if (updateResult.count === 0) {
          throw new Error("Conflict: Correction request was already resolved by another request.");
        }

        const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendanceId } });

        await tx.attendance_events.create({
          data: {
            attendance_id: attendanceId,
            event_type: 'CORRECTION_REJECTED',
            actor_user_id: supervisorUserId,
            actor_role: isEmployer ? 'EMPLOYER' : 'SUPERVISOR',
            notes: input.notes || null,
            event_data: eventAudit as any
          }
        });

        return updated;
      });
    }

    // APPROVE decision: Must have at least one meaningful proposed correction
    if (!attendance.correction_proposed_check_in && !attendance.correction_proposed_check_out) {
      throw new Error("Cannot approve correction: Worker did not provide proposed check-in or check-out times.");
    }

    const appliedCheckIn = attendance.correction_proposed_check_in || attendance.check_in_time;
    const appliedCheckOut = attendance.correction_proposed_check_out || attendance.check_out_time;

    if (!appliedCheckIn || !appliedCheckOut) {
      throw new Error("Incomplete correction: Both check-in and check-out timestamps must be established.");
    }

    if (new Date(appliedCheckOut) <= new Date(appliedCheckIn)) {
      throw new Error("Invalid timestamps: Corrected check-out time must follow check-in time.");
    }

    const { grossMinutes, totalBreakMinutes: accumulatedBreakMinutes, netWorkMinutes: recalculatedWorkMinutes } = ShiftAttendanceService.calculateNetWorkMinutes(
      new Date(appliedCheckIn),
      new Date(appliedCheckOut),
      attendance.total_break_minutes,
      'CHECKED_OUT' // treat as checked out
    );

    const eventAudit = {
      event: 'CORRECTION_APPROVED',
      resolvedBy: supervisorUserId,
      oldCheckIn: attendance.check_in_time,
      oldCheckOut: attendance.check_out_time,
      newCheckIn: appliedCheckIn,
      newCheckOut: appliedCheckOut,
      recalculatedWorkMinutes,
      notes: input.notes || null,
      timestamp: now.toISOString()
    };

    return prisma.$transaction(async (tx) => {
      const updateResult = await tx.shift_attendances.updateMany({
        where: {
          id: attendanceId,
          status: 'CORRECTION_REQUESTED'
        },
        data: {
          status: 'APPROVED',
          check_in_time: appliedCheckIn,
          check_out_time: appliedCheckOut,
          total_work_minutes: recalculatedWorkMinutes,
          approved_by: supervisorUserId,
          approved_at: now,
          correction_resolved_by: supervisorUserId,
          correction_resolved_at: now,
          correction_resolution_notes: input.notes || null,
          events: [...(attendance.events as any[]), eventAudit] as any
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Conflict: Correction request was already resolved by another request.");
      }

      const updated = await tx.shift_attendances.findUniqueOrThrow({ where: { id: attendanceId } });

      await tx.attendance_events.create({
        data: {
          attendance_id: attendanceId,
          event_type: 'CORRECTION_APPROVED',
          actor_user_id: supervisorUserId,
          actor_role: isEmployer ? 'EMPLOYER' : 'SUPERVISOR',
          notes: input.notes || null,
          event_data: eventAudit as any
        }
      });

      return updated;
    });
  },

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
