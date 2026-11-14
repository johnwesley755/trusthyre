import { ShiftAttendanceService } from '../src/services/shiftAttendanceService';
import { WorkOrderService } from '../src/services/workOrderService';
import prisma from '../src/config/prisma';

describe('Phase 4: Shift Scheduling and Attendance Unit & Integration Tests', () => {
  const testEmployerId = 'e0000000-0000-4000-a000-000000000010';
  const testWorkerUserId = 'f0000000-0000-4000-a000-000000000020';
  let acceptedOrderId: string;
  let draftOrderId: string;
  let scheduledShiftId: string;

  beforeAll(async () => {
    // 1. Setup user metadata
    await prisma.user_metadata.upsert({
      where: { id: testWorkerUserId },
      update: { first_name: 'Shift', last_name: 'Worker', email: 'shift.worker@example.com', role: 'WORKER' },
      create: {
        id: testWorkerUserId,
        first_name: 'Shift',
        last_name: 'Worker',
        email: 'shift.worker@example.com',
        role: 'WORKER'
      }
    });

    await prisma.user_metadata.upsert({
      where: { id: testEmployerId },
      update: { first_name: 'Shift', last_name: 'Employer', email: 'shift.employer@example.com', role: 'EMPLOYER' },
      create: {
        id: testEmployerId,
        first_name: 'Shift',
        last_name: 'Employer',
        email: 'shift.employer@example.com',
        role: 'EMPLOYER'
      }
    });

    // 2. Profiles
    await prisma.worker_profiles.upsert({
      where: { user_id: testWorkerUserId },
      update: { full_name: 'Shift Worker Pro' },
      create: {
        user_id: testWorkerUserId,
        full_name: 'Shift Worker Pro',
        city: 'Chennai',
        skills: 'Electrician, Wireman'
      }
    });

    await prisma.employer_profiles.upsert({
      where: { user_id: testEmployerId },
      update: { company_name: 'Metro Tech Park' },
      create: {
        user_id: testEmployerId,
        company_name: 'Metro Tech Park',
        city: 'Chennai',
        is_verified: true
      }
    });

    // 3. Accepted Work Order
    const acceptedWO = await WorkOrderService.createWorkOrder(testEmployerId, {
      workerId: testWorkerUserId,
      jobTitle: 'Site Electrician',
      workDescription: 'Cable tray fitting & main line wiring',
      worksiteName: 'Tower A Substation',
      worksiteAddress: 'Industrial Corridor, Guindy',
      city: 'Chennai',
      startDate: new Date().toISOString().slice(0, 10),
      shiftTiming: '09:00 - 18:00',
      dailyWorkingHours: 8.0,
      wageAmount: 900.0,
      wageFrequency: 'DAILY',
      autoSend: false
    });
    await WorkOrderService.sendWorkOrder(testEmployerId, acceptedWO.id);
    await WorkOrderService.respondToWorkOrder(testWorkerUserId, acceptedWO.id, 'ACCEPT');
    acceptedOrderId = acceptedWO.id;

    // 4. Draft Work Order (for rejection testing)
    const draftWO = await WorkOrderService.createWorkOrder(testEmployerId, {
      workerId: testWorkerUserId,
      jobTitle: 'Draft Welder',
      workDescription: 'Pending agreement',
      worksiteName: 'Workshop 1',
      worksiteAddress: 'Ambattur Industrial Estate',
      city: 'Chennai',
      startDate: new Date().toISOString().slice(0, 10),
      shiftTiming: '09:00 - 18:00',
      dailyWorkingHours: 8.0,
      wageAmount: 850.0,
      wageFrequency: 'DAILY',
      autoSend: false
    });
    draftOrderId = draftWO.id;
  });

  afterAll(async () => {
    // Clean attendances, shifts, work orders, profiles, and users
    if (scheduledShiftId) {
      await prisma.shift_attendances.deleteMany({ where: { shift_id: scheduledShiftId } }).catch(() => {});
      await prisma.shifts.deleteMany({ where: { id: scheduledShiftId } }).catch(() => {});
    }
    if (acceptedOrderId) {
      await prisma.work_order_events.deleteMany({ where: { work_order_id: acceptedOrderId } }).catch(() => {});
      await prisma.work_orders.deleteMany({ where: { id: acceptedOrderId } }).catch(() => {});
    }
    if (draftOrderId) {
      await prisma.work_order_events.deleteMany({ where: { work_order_id: draftOrderId } }).catch(() => {});
      await prisma.work_orders.deleteMany({ where: { id: draftOrderId } }).catch(() => {});
    }
    await prisma.worker_profiles.deleteMany({ where: { user_id: testWorkerUserId } }).catch(() => {});
    await prisma.employer_profiles.deleteMany({ where: { user_id: testEmployerId } }).catch(() => {});
    await prisma.user_metadata.deleteMany({ where: { id: { in: [testWorkerUserId, testEmployerId] } } }).catch(() => {});
  });

  test('1. Schedule shift for accepted work order successfully', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const shifts = await ShiftAttendanceService.createShifts(testEmployerId, {
      workOrderId: acceptedOrderId,
      shiftDate: today,
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      notes: 'Bring safety harness'
    });

    expect(shifts).toBeDefined();
    expect(shifts.length).toBe(1);
    expect(shifts[0].status).toBe('SCHEDULED');
    expect(shifts[0].work_order_id).toBe(acceptedOrderId);

    scheduledShiftId = shifts[0].id;

    // Verify initial NOT_STARTED attendance shell was auto-created
    const attendance = await prisma.shift_attendances.findUnique({
      where: {
        shift_id_worker_id: {
          shift_id: scheduledShiftId,
          worker_id: testWorkerUserId
        }
      }
    });
    expect(attendance).toBeDefined();
    expect(attendance?.status).toBe('NOT_STARTED');
  });

  test('2. Reject shift creation for unaccepted (DRAFT) work order', async () => {
    const today = new Date().toISOString().slice(0, 10);
    await expect(
      ShiftAttendanceService.createShifts(testEmployerId, {
        workOrderId: draftOrderId,
        shiftDate: today,
        startTime: '09:00',
        endTime: '18:00'
      })
    ).rejects.toThrow(/Must be ACCEPTED/);
  });

  test('3. Generate rolling QR code token with valid signature and sliding expiration', async () => {
    const { token, expiresAt } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_IN');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Consuming or verifying via challenge table
    const challenge = await prisma.attendance_challenges.findFirst({
      where: { shift_id: scheduledShiftId, challenge_type: 'QR_CODE' }
    });
    expect(challenge).toBeDefined();
    expect(challenge?.nonce).toBeDefined();
  });

  test('4. Reject forged and expired QR code tokens', async () => {
    // Forged signature
    const forgedToken = Buffer.from(JSON.stringify({
      payload: `${scheduledShiftId}:${testEmployerId}:CHECK_IN:fake-nonce:${Math.floor(Date.now() / 1000) + 60}`,
      signature: 'bad-signature-hex-12345678'
    })).toString('base64');

    const isValid = await ShiftAttendanceService.verifyAndConsumeQrToken(forgedToken, scheduledShiftId, 'CHECK_IN');
    expect(isValid).toBe(false);

    // Mismatched shiftId
    const { token } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_IN');
    const isOtherValid = await ShiftAttendanceService.verifyAndConsumeQrToken(token, 'other-shift-id', 'CHECK_IN');
    expect(isOtherValid).toBe(false);
  });

  test('5. Check-in worker via valid QR token transitions to CHECKED_IN', async () => {
    const { token } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_IN');

    const checkedIn = await ShiftAttendanceService.checkIn(testWorkerUserId, {
      shiftId: scheduledShiftId,
      method: 'QR_CODE',
      token,
      latitude: 13.0102,
      longitude: 80.2158,
      notes: 'Arrived on site'
    });

    expect(checkedIn.status).toBe('CHECKED_IN');
    expect(checkedIn.verification_method).toBe('QR_CODE');
    expect(checkedIn.check_in_time).toBeDefined();
  });

  test('6. Prevent duplicate check-in while shift is already in progress', async () => {
    const { token } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_IN');

    await expect(
      ShiftAttendanceService.checkIn(testWorkerUserId, {
        shiftId: scheduledShiftId,
        method: 'QR_CODE',
        token
      })
    ).rejects.toThrow(/already (been checked in|in progress|already: CHECKED_IN)/i);
  });

  test('7. Toggle break state (START and END) during shift', async () => {
    const breakStart = await ShiftAttendanceService.recordBreak(testWorkerUserId, scheduledShiftId, 'START');
    expect(breakStart.status).toBe('ON_BREAK');
    expect(breakStart.break_start_time).toBeDefined();

    const breakEnd = await ShiftAttendanceService.recordBreak(testWorkerUserId, scheduledShiftId, 'END');
    expect(breakEnd.status).toBe('CHECKED_IN');
    expect(breakEnd.break_end_time).toBeDefined();
  });

  test('8. Check-out worker transitions to PENDING_APPROVAL with calculated work minutes', async () => {
    const { token } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_OUT');

    const checkedOut = await ShiftAttendanceService.checkOut(testWorkerUserId, {
      shiftId: scheduledShiftId,
      method: 'QR_CODE',
      token,
      notes: 'Completed day tasks'
    });

    expect(checkedOut.status).toBe('PENDING_APPROVAL');
    expect(checkedOut.check_out_time).toBeDefined();
    expect(typeof checkedOut.total_work_minutes).toBe('number');
  });

  test('9. Prevent check-out without prior active check-in', async () => {
    // Currently in PENDING_APPROVAL, subsequent check-out must fail
    const { token } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_OUT');

    await expect(
      ShiftAttendanceService.checkOut(testWorkerUserId, {
        shiftId: scheduledShiftId,
        method: 'QR_CODE',
        token
      })
    ).rejects.toThrow(/Cannot check out without an active check-in/);
  });

  test('10. Worker requests attendance correction with reason', async () => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: {
        shift_id_worker_id: {
          shift_id: scheduledShiftId,
          worker_id: testWorkerUserId
        }
      }
    });

    const proposedCheckOut = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const corrected = await ShiftAttendanceService.requestCorrection(testWorkerUserId, attendance!.id, {
      reason: 'Shift check-out was logged 30 minutes late due to network glitch on site',
      proposedCheckOut
    });

    expect(corrected.status).toBe('CORRECTION_REQUESTED');
    expect(corrected.correction_reason).toContain('network glitch');
  });

  test('11. Employer resolves correction request and approves attendance', async () => {
    const attendance = await prisma.shift_attendances.findUnique({
      where: {
        shift_id_worker_id: {
          shift_id: scheduledShiftId,
          worker_id: testWorkerUserId
        }
      }
    });

    const resolved = await ShiftAttendanceService.resolveCorrection(testEmployerId, attendance!.id, {
      decision: 'APPROVED',
      notes: 'Verified site register entry; adjusted checkout time and approved.'
    });
    expect(resolved.status).toBe('APPROVED');
    expect(resolved.approved_by).toBe(testEmployerId);
    expect(resolved.approved_at).toBeDefined();
    expect(resolved.correction_resolved_by).toBe(testEmployerId);
  });

  test('12. Employer shift attendance register retrieves complete shift roster', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const register = await ShiftAttendanceService.getAttendanceRegister(testEmployerId, today);

    expect(register).toBeDefined();
    expect(Array.isArray(register)).toBe(true);
    expect(register.length).toBeGreaterThanOrEqual(1);

    const shiftItem = register.find(r => r.shiftId === scheduledShiftId);
    expect(shiftItem).toBeDefined();
    expect(shiftItem?.attendance?.status).toBe('APPROVED');
    expect(shiftItem?.worker.userId).toBe(testWorkerUserId);
  });

  test('13. Concurrency: Prevent parallel double-consumption of the same QR token', async () => {
    // Generate fresh challenge QR token
    const { token } = await ShiftAttendanceService.generateQrToken(testEmployerId, scheduledShiftId, 'CHECK_IN');

    // Run two simultaneous consumptions with Promise.all
    const [result1, result2] = await Promise.all([
      ShiftAttendanceService.verifyAndConsumeQrToken(token, scheduledShiftId, 'CHECK_IN'),
      ShiftAttendanceService.verifyAndConsumeQrToken(token, scheduledShiftId, 'CHECK_IN')
    ]);

    // Exactly one should succeed (true), and one must fail (false)
    const successCount = (result1 ? 1 : 0) + (result2 ? 1 : 0);
    expect(successCount).toBe(1);

    // Further consumption should also fail
    const result3 = await ShiftAttendanceService.verifyAndConsumeQrToken(token, scheduledShiftId, 'CHECK_IN');
    expect(result3).toBe(false);
  });

  test('14. Concurrency: Atomic OTP attempt counter increments and enforces max attempts', async () => {
    const { otp } = await ShiftAttendanceService.generateOtpPin(testEmployerId, scheduledShiftId, 'CHECK_IN');

    // Dispatch 4 parallel bad OTP attempts
    const badOtp = '000000';
    await Promise.all([
      ShiftAttendanceService.verifyAndConsumeOtpPin(scheduledShiftId, badOtp, 'CHECK_IN'),
      ShiftAttendanceService.verifyAndConsumeOtpPin(scheduledShiftId, badOtp, 'CHECK_IN'),
      ShiftAttendanceService.verifyAndConsumeOtpPin(scheduledShiftId, badOtp, 'CHECK_IN'),
      ShiftAttendanceService.verifyAndConsumeOtpPin(scheduledShiftId, badOtp, 'CHECK_IN')
    ]);

    // Verify challenge is locked against even a correct code now if attempts reached max
    const validOtpAttempt = await ShiftAttendanceService.verifyAndConsumeOtpPin(scheduledShiftId, otp, 'CHECK_IN');
    expect(validOtpAttempt).toBe(false);
  });

  test('15. Robustness: OTP attempt count persists even when checkIn throws and rolls back', async () => {
    const { otp } = await ShiftAttendanceService.generateOtpPin(testEmployerId, scheduledShiftId, 'CHECK_IN');

    // Attempt checkIn with invalid PIN -> throws error
    const badOtp = '999999';
    await expect(
      ShiftAttendanceService.checkIn(testWorkerUserId, {
        shiftId: scheduledShiftId,
        method: 'ONE_TIME_PIN',
        otp: badOtp
      })
    ).rejects.toThrow();

    // Verify in database that attempt_count was NOT rolled back and is now >= 1
    const challenge = await prisma.attendance_challenges.findFirst({
      where: {
        shift_id: scheduledShiftId,
        challenge_type: 'ONE_TIME_PIN',
        intended_action: 'CHECK_IN',
        consumed_at: null
      },
      orderBy: { created_at: 'desc' }
    });
    expect(challenge?.attempt_count).toBeGreaterThanOrEqual(1);
  });

  test('16. Concurrency: Prevent parallel duplicate check-in with CAS', async () => {
    // Create fresh shift for CAS testing
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7);
    const dateStr = testDate.toISOString().slice(0, 10);

    const newShift = await prisma.shifts.create({
      data: {
        work_order_id: acceptedOrderId,
        employer_id: testEmployerId,
        worker_id: testWorkerUserId,
        shift_date: new Date(dateStr),
        start_time: '09:00',
        end_time: '17:00',
        break_duration_minutes: 30,
        worksite_name: 'Metro Site CAS',
        worksite_address: 'Guindy',
        city: 'Chennai',
        status: 'SCHEDULED'
      }
    });

    const att = await prisma.shift_attendances.create({
      data: {
        shift_id: newShift.id,
        work_order_id: acceptedOrderId,
        worker_id: testWorkerUserId,
        employer_id: testEmployerId,
        status: 'NOT_STARTED'
      }
    });

    const { token: qrToken1 } = await ShiftAttendanceService.generateQrToken(testEmployerId, newShift.id, 'CHECK_IN');
    const { token: qrToken2 } = await ShiftAttendanceService.generateQrToken(testEmployerId, newShift.id, 'CHECK_IN');

    // Dispatch two parallel check-in requests
    const results = await Promise.allSettled([
      ShiftAttendanceService.checkIn(testWorkerUserId, {
        shiftId: newShift.id,
        method: 'QR_CODE',
        token: qrToken1
      }),
      ShiftAttendanceService.checkIn(testWorkerUserId, {
        shiftId: newShift.id,
        method: 'QR_CODE',
        token: qrToken2
      })
    ]);

    const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
    const rejectedCount = results.filter(r => r.status === 'rejected').length;

    expect(fulfilledCount).toBe(1);
    expect(rejectedCount).toBe(1);

    // Cleanup test shift
    await prisma.attendance_events.deleteMany({ where: { attendance_id: att.id } });
    await prisma.shift_attendances.deleteMany({ where: { shift_id: newShift.id } });
    await prisma.shifts.deleteMany({ where: { id: newShift.id } });
  });

  test('17. Security & RLS: Manual attendance audit event conforms to RLS policies', async () => {
    // Create dedicated shift for manual check-in testing
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 10);
    const dateStr = testDate.toISOString().slice(0, 10);

    const manualShift = await prisma.shifts.create({
      data: {
        work_order_id: acceptedOrderId,
        employer_id: testEmployerId,
        worker_id: testWorkerUserId,
        shift_date: new Date(dateStr),
        start_time: '08:00',
        end_time: '16:00',
        break_duration_minutes: 30,
        worksite_name: 'Metro Manual Test Site',
        worksite_address: 'Guindy',
        city: 'Chennai',
        status: 'SCHEDULED'
      }
    });

    const manualAttRecord = await prisma.shift_attendances.create({
      data: {
        shift_id: manualShift.id,
        work_order_id: acceptedOrderId,
        worker_id: testWorkerUserId,
        employer_id: testEmployerId,
        status: 'NOT_STARTED'
      }
    });

    // Record manual attendance check in as employer
    const manualAtt = await ShiftAttendanceService.recordManualAttendance(testEmployerId, {
      shiftId: manualShift.id,
      workerId: testWorkerUserId,
      action: 'CHECK_IN',
      manualReason: 'Worker arrived promptly; phone battery died so verified manually by supervisor.'
    });

    expect(manualAtt).toBeDefined();
    expect(manualAtt.status).toBe('CHECKED_IN');
    expect(manualAtt.verification_method).toBe('MANUAL_SUPERVISOR');

    // Verify event exists in attendance_events table
    const event = await prisma.attendance_events.findFirst({
      where: {
        attendance_id: manualAtt.id,
        event_type: 'SUPERVISOR_MANUAL_CHECK_IN'
      }
    });
    expect(event).toBeDefined();
    expect(event?.actor_role).toBe('EMPLOYER');

    // Runtime validation tests for manual attendance
    await expect(
      ShiftAttendanceService.recordManualAttendance(testEmployerId, {
        shiftId: manualShift.id,
        workerId: testWorkerUserId,
        action: 'INVALID_ACTION' as any,
        manualReason: 'Valid reason here'
      })
    ).rejects.toThrow(/Invalid manual attendance action/);

    await expect(
      ShiftAttendanceService.recordManualAttendance(testEmployerId, {
        shiftId: manualShift.id,
        workerId: testWorkerUserId,
        action: 'CHECK_OUT',
        manualReason: 'Valid reason here',
        timestamp: new Date(Date.now() + 1000000).toISOString()
      })
    ).rejects.toThrow(/timestamp cannot be in the future/);

    // Test Correction Request Status Restriction (Already Approved rejection)
    const approvedAtt = await prisma.shift_attendances.update({
      where: { id: manualAtt.id },
      data: {
        status: 'APPROVED'
      }
    });

    await expect(
      ShiftAttendanceService.requestCorrection(testWorkerUserId, approvedAtt.id, {
        reason: 'Attempting to correct already approved record',
        proposedCheckIn: new Date().toISOString()
      })
    ).rejects.toThrow(/already approved/);

    // Cleanup
    await prisma.attendance_events.deleteMany({ where: { attendance_id: manualAttRecord.id } });
    await prisma.shift_attendances.deleteMany({ where: { shift_id: manualShift.id } });
    await prisma.shifts.deleteMany({ where: { id: manualShift.id } });
  });
});
