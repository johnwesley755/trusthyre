import { WorkOrderService } from '../src/services/workOrderService';
import prisma from '../src/config/prisma';

describe('Digital Work Order Foundation Unit & Workflow Tests', () => {
  const testEmployerId = 'e0000000-0000-4000-a000-000000000001';
  const testWorkerUserId = 'f0000000-0000-4000-a000-000000000002';
  let createdOrderId: string;

  beforeAll(async () => {
    // Ensure test users exist in user_metadata for notifications & joins
    await prisma.user_metadata.upsert({
      where: { id: testWorkerUserId },
      update: { first_name: 'Test', last_name: 'Worker', email: 'test.worker.wo@example.com', role: 'WORKER' },
      create: {
        id: testWorkerUserId,
        first_name: 'Test',
        last_name: 'Worker',
        email: 'test.worker.wo@example.com',
        role: 'WORKER'
      }
    });

    await prisma.user_metadata.upsert({
      where: { id: testEmployerId },
      update: { first_name: 'Test', last_name: 'Employer', email: 'test.employer.wo@example.com', role: 'EMPLOYER' },
      create: {
        id: testEmployerId,
        first_name: 'Test',
        last_name: 'Employer',
        email: 'test.employer.wo@example.com',
        role: 'EMPLOYER'
      }
    });

    // Ensure test worker exists
    await prisma.worker_profiles.upsert({
      where: { user_id: testWorkerUserId },
      update: { full_name: 'Test Worker For WO' },
      create: {
        user_id: testWorkerUserId,
        full_name: 'Test Worker For WO',
        city: 'Chennai',
        skills: 'Mason, Carpenter'
      }
    });

    // Ensure test employer exists
    await prisma.employer_profiles.upsert({
      where: { user_id: testEmployerId },
      update: { company_name: 'Alpha Infra Projects' },
      create: {
        user_id: testEmployerId,
        company_name: 'Alpha Infra Projects',
        city: 'Chennai',
        is_verified: true
      }
    });
  });

  afterAll(async () => {
    if (createdOrderId) {
      await prisma.work_order_events.deleteMany({
        where: { work_order_id: createdOrderId }
      }).catch(() => {});
      await prisma.work_orders.deleteMany({
        where: { id: createdOrderId }
      }).catch(() => {});
    }
    await prisma.worker_profiles.deleteMany({
      where: { user_id: testWorkerUserId }
    }).catch(() => {});
    await prisma.employer_profiles.deleteMany({
      where: { user_id: testEmployerId }
    }).catch(() => {});
    await prisma.user_metadata.deleteMany({
      where: { id: { in: [testWorkerUserId, testEmployerId] } }
    }).catch(() => {});
  });

  test('1. Create DRAFT work order successfully with valid terms', async () => {
    const order = await WorkOrderService.createWorkOrder(testEmployerId, {
      workerId: testWorkerUserId,
      jobTitle: 'Senior Commercial Mason',
      workDescription: 'Laying concrete blocks and masonry finishing',
      worksiteName: 'Metro Phase II Site',
      worksiteAddress: 'Block 4, OMR IT Highway, Sholinganallur',
      city: 'Chennai',
      district: 'Kanchipuram',
      startDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      shiftTiming: '08:30 - 17:30',
      weeklyRestDay: 'SUNDAY',
      dailyWorkingHours: 8.0,
      overtimeTerms: '1.5x regular wage beyond 8 hours',
      wageAmount: 950.0,
      wageFrequency: 'DAILY',
      foodProvided: true,
      transportProvided: true,
      autoSend: false
    });

    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    expect(order.order_number).toMatch(/^WO-\d{8}-\d{4}-[A-Z0-9]{4}$/);
    expect(order.status).toBe('DRAFT');
    expect(Number(order.wage_amount)).toBe(950);
    expect(Number(order.daily_working_hours)).toBe(8);
    expect(order.food_provided).toBe(true);

    createdOrderId = order.id;
  });

  test('2. Employer sends work order to candidate', async () => {
    const sent = await WorkOrderService.sendWorkOrder(testEmployerId, createdOrderId);
    expect(sent.status).toBe('SENT');

    // Verify audit event
    const events = await prisma.work_order_events.findMany({
      where: { work_order_id: createdOrderId }
    });
    expect(events.some(e => e.event_type === 'SENT')).toBe(true);
  });

  test('3. Unauthorized worker cannot respond or access work order', async () => {
    await expect(
      WorkOrderService.respondToWorkOrder('unauthorized-worker-id', createdOrderId, 'ACCEPT')
    ).rejects.toThrow(/Forbidden/);
  });

  test('4. Worker requests clarification', async () => {
    const clarified = await WorkOrderService.respondToWorkOrder(
      testWorkerUserId,
      createdOrderId,
      'CLARIFY',
      'Is safety helmet provided on site?'
    );

    expect(clarified.status).toBe('DRAFT');
    expect(clarified.worker_response_notes).toBe('Is safety helmet provided on site?');
  });

  test('5. Employer modifies terms and re-sends', async () => {
    const updated = await WorkOrderService.updateTerms(testEmployerId, createdOrderId, {
      otherBenefits: 'Safety helmet and high-vis jacket provided on-site',
      wageAmount: 1000.0
    });

    expect(Number(updated.wage_amount)).toBe(1000);
    expect(updated.other_benefits).toContain('Safety helmet');

    const reSent = await WorkOrderService.sendWorkOrder(testEmployerId, createdOrderId);
    expect(reSent.status).toBe('SENT');
  });

  test('6. Assigned worker accepts work order', async () => {
    const accepted = await WorkOrderService.respondToWorkOrder(
      testWorkerUserId,
      createdOrderId,
      'ACCEPT',
      'Agreed with updated conditions'
    );

    expect(accepted.status).toBe('ACCEPTED');
    expect(accepted.accepted_at).toBeDefined();
  });

  test('7. Material changes to accepted order force re-acceptance', async () => {
    const amended = await WorkOrderService.updateTerms(testEmployerId, createdOrderId, {
      wageAmount: 1100.0 // Material wage increase
    });

    expect(amended.status).toBe('SENT'); // Reset from ACCEPTED to SENT
    expect(amended.accepted_at).toBeNull();
  });
});

