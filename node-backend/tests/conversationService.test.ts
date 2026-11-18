import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { ConversationService } from '../src/services/conversationService';
import { prisma } from '../src/config/prisma';

describe('TrustHyre Conversation Center Unit & Integration Tests', () => {
  const testWorkerId = 'c0000000-0000-4000-a000-000000000001';
  const testEmployerId = 'c0000000-0000-4000-a000-000000000002';
  const testThirdPartyId = 'c0000000-0000-4000-a000-000000000003';

  let testJobId: string;
  let testApplicationId: string;
  let createdConversationId: string;

  beforeAll(async () => {
    // 1. Seed user_metadata for participants
    await prisma.user_metadata.upsert({
      where: { id: testWorkerId },
      update: { first_name: 'Murugan', last_name: 'Electrician', email: 'worker.chat@trusthyre.test', role: 'WORKER' },
      create: { id: testWorkerId, first_name: 'Murugan', last_name: 'Electrician', email: 'worker.chat@trusthyre.test', role: 'WORKER' }
    });

    await prisma.user_metadata.upsert({
      where: { id: testEmployerId },
      update: { first_name: 'Metro', last_name: 'Builds', email: 'employer.chat@trusthyre.test', role: 'EMPLOYER' },
      create: { id: testEmployerId, first_name: 'Metro', last_name: 'Builds', email: 'employer.chat@trusthyre.test', role: 'EMPLOYER' }
    });

    await prisma.user_metadata.upsert({
      where: { id: testThirdPartyId },
      update: { first_name: 'Sneaky', last_name: 'Intruder', email: 'intruder.chat@trusthyre.test', role: 'WORKER' },
      create: { id: testThirdPartyId, first_name: 'Sneaky', last_name: 'Intruder', email: 'intruder.chat@trusthyre.test', role: 'WORKER' }
    });

    // 2. Seed worker profile
    await prisma.worker_profiles.upsert({
      where: { user_id: testWorkerId },
      update: { full_name: 'Murugan Electrician', skills: 'Industrial Wiring, Switchgear' },
      create: {
        user_id: testWorkerId,
        full_name: 'Murugan Electrician',
        city: 'Chennai',
        skills: 'Industrial Wiring, Switchgear'
      }
    });

    // 3. Seed employer profile
    await prisma.employer_profiles.upsert({
      where: { user_id: testEmployerId },
      update: { company_name: 'Metro Construction Ltd' },
      create: {
        user_id: testEmployerId,
        company_name: 'Metro Construction Ltd',
        city: 'Chennai'
      }
    });

    // 4. Seed job
    const job = await prisma.jobs.create({
      data: {
        employer_id: testEmployerId,
        employer_name: 'Metro Construction Ltd',
        title: 'Master Electrician for Commercial Mall',
        description: 'Need certified commercial electrician for immediate shift rollout',
        city: 'Chennai',
        location: 'Guindy',
        budget: 35000,
        status: 'OPEN'
      }
    });
    testJobId = job.id;

    // 5. Seed job application
    const application = await prisma.job_applications.create({
      data: {
        job_id: testJobId,
        worker_id: testWorkerId,
        status: 'PENDING'
      }
    });
    testApplicationId = application.id;
  });

  afterAll(async () => {
    // Clean up created resources in reverse dependency order
    if (createdConversationId) {
      await prisma.conversation_reports.deleteMany({ where: { conversation_id: createdConversationId } }).catch(() => {});
      await prisma.conversation_messages.deleteMany({ where: { conversation_id: createdConversationId } }).catch(() => {});
      await prisma.conversation_participants.deleteMany({ where: { conversation_id: createdConversationId } }).catch(() => {});
      await prisma.conversations.deleteMany({ where: { id: createdConversationId } }).catch(() => {});
    }

    await prisma.work_orders.deleteMany({ where: { employer_id: testEmployerId } }).catch(() => {});

    if (testApplicationId) {
      await prisma.job_applications.deleteMany({ where: { id: testApplicationId } }).catch(() => {});
    }

    if (testJobId) {
      await prisma.jobs.deleteMany({ where: { id: testJobId } }).catch(() => {});
    }

    await prisma.worker_profiles.deleteMany({ where: { user_id: testWorkerId } }).catch(() => {});
    await prisma.employer_profiles.deleteMany({ where: { user_id: testEmployerId } }).catch(() => {});
    await prisma.user_metadata.deleteMany({ where: { id: { in: [testWorkerId, testEmployerId, testThirdPartyId] } } }).catch(() => {});
  });

  test('1. Create or get conversation: Worker opens conversation for application', async () => {
    const convo = await ConversationService.getOrCreateConversation(testApplicationId, testWorkerId);

    expect(convo).toBeDefined();
    createdConversationId = convo.id;

    expect(convo.application_id).toBe(testApplicationId);
    expect(convo.employer_user_id).toBe(testEmployerId);
    expect(convo.worker_user_id).toBe(testWorkerId);
    expect(convo.status).toBe('OPEN');

    // Verify both participants were created
    const participants = await prisma.conversation_participants.findMany({
      where: { conversation_id: convo.id }
    });
    expect(participants.length).toBe(2);
    const participantIds = participants.map(p => p.user_id);
    expect(participantIds).toContain(testWorkerId);
    expect(participantIds).toContain(testEmployerId);
  });

  test('2. Idempotent create-or-get: Employer opening conversation returns identical conversation record', async () => {
    const convo = await ConversationService.getOrCreateConversation(testApplicationId, testEmployerId);
    expect(convo.id).toBe(createdConversationId);
  });

  test('3. Security check: Third party cannot open or join private conversation', async () => {
    expect(async () => {
      await ConversationService.getOrCreateConversation(testApplicationId, testThirdPartyId);
    }).toThrow(/Forbidden/);
  });

  test('4. Message sending: Worker sends text message successfully', async () => {
    const clientMsgId = 'client-uuid-001';
    const message = await ConversationService.sendMessage(createdConversationId, testWorkerId, {
      body: 'Hello sir, I have 8 years experience in industrial wire harness and commercial switchboards.',
      clientMessageId: clientMsgId
    });

    expect(message).toBeDefined();
    expect(message.body).toContain('industrial wire harness');
    expect(message.sender_user_id).toBe(testWorkerId);
    expect(message.client_message_id).toBe(clientMsgId);

    // Verify conversation last_message_at was updated
    const convo = await prisma.conversations.findUnique({
      where: { id: createdConversationId }
    });
    expect(convo?.last_message_at).toBeDefined();
  });

  test('5. Message idempotency: Resending same clientMessageId returns original without creating duplicate', async () => {
    const clientMsgId = 'client-uuid-001';
    const resend = await ConversationService.sendMessage(createdConversationId, testWorkerId, {
      body: 'Different body that should be ignored because clientMessageId already exists',
      clientMessageId: clientMsgId
    });

    expect(resend.client_message_id).toBe(clientMsgId);
    expect(resend.body).toContain('industrial wire harness');

    // 1 system initialization message + 1 text message
    const totalMessages = await prisma.conversation_messages.count({
      where: { conversation_id: createdConversationId }
    });
    expect(totalMessages).toBe(2);

    const userMessages = await prisma.conversation_messages.count({
      where: { conversation_id: createdConversationId, message_type: 'TEXT' }
    });
    expect(userMessages).toBe(1);
  });

  test('6. Validation bounds: Rejects empty messages and messages exceeding 2000 characters', async () => {
    // Empty body
    expect(async () => {
      await ConversationService.sendMessage(createdConversationId, testWorkerId, {
        body: '   '
      });
    }).toThrow(/Message body cannot be empty/);

    // Oversized body (>2000 chars)
    const longBody = 'A'.repeat(2005);
    expect(async () => {
      await ConversationService.sendMessage(createdConversationId, testWorkerId, {
        body: longBody
      });
    }).toThrow(/Message exceeds the maximum permitted length/);
  });

  test('7. Unread counts and read cursors: Employer marks conversation as read', async () => {
    // Employer should have 1 unread message
    const unreadBefore = await ConversationService.getUnreadCount(testEmployerId);
    expect(unreadBefore).toBeGreaterThanOrEqual(1);

    // Employer marks as read
    const markResult = await ConversationService.markAsRead(createdConversationId, testEmployerId);
    expect(markResult.success).toBe(true);

    const unreadAfter = await ConversationService.getUnreadCount(testEmployerId);
    expect(unreadAfter).toBe(0);
  });

  test('8. Employer reply & Thread retrieval in chronological order', async () => {
    const reply = await ConversationService.sendMessage(createdConversationId, testEmployerId, {
      body: 'Can you bring your safety shoes and tools for a site walkthrough tomorrow at 9 AM?'
    });
    expect(reply.body).toContain('safety shoes');

    // Retrieve thread as worker
    const thread = await ConversationService.getConversationMessages(createdConversationId, testWorkerId);
    expect(thread.conversation.id).toBe(createdConversationId);
    expect(thread.conversation.jobTitle).toContain('Master Electrician');
    expect(thread.conversation.counterpart.role).toBe('EMPLOYER');
    expect(thread.messages.length).toBe(3); // 1 system + 1 worker + 1 employer reply
    // Messages must be chronological
    const textMessages = thread.messages.filter(m => m.message_type === 'TEXT');
    expect(textMessages.length).toBe(2);
    expect(textMessages[0].sender_user_id).toBe(testWorkerId);
    expect(textMessages[1].sender_user_id).toBe(testEmployerId);
  });

  test('9. Third party cannot read conversation messages', async () => {
    expect(async () => {
      await ConversationService.getConversationMessages(createdConversationId, testThirdPartyId);
    }).toThrow(/Forbidden/);
  });

  test('10. Inbox listing: Counterpart details and preview correctly formatted', async () => {
    const inbox = await ConversationService.getUserInbox(testWorkerId);
    expect(inbox.conversations.length).toBeGreaterThanOrEqual(1);

    const entry = inbox.conversations.find(c => c.id === createdConversationId);
    expect(entry).toBeDefined();
    expect(entry?.jobTitle).toContain('Master Electrician');
    expect(entry?.otherParty.role).toBe('Employer');
    expect(entry?.unreadCount).toBe(1); // Worker has not yet marked the employer's reply as read
  });

  test('11. Mute/Unmute conversation toggle', async () => {
    const muted = await ConversationService.muteConversation(createdConversationId, testWorkerId, true);
    expect(muted.isMuted).toBe(true);

    const unmuted = await ConversationService.muteConversation(createdConversationId, testWorkerId, false);
    expect(unmuted.isMuted).toBe(false);
  });

  test('12. Abuse reporting: Worker reports conversation for suspicious terms', async () => {
    const report = await ConversationService.reportConversation(createdConversationId, testWorkerId, {
      reason: 'SPAM_OR_OFF_PLATFORM',
      details: 'Employer asking to do unrecorded cash payments outside the verified work order system.'
    });

    expect(report).toBeDefined();
    expect(report.reporter_user_id).toBe(testWorkerId);
    expect(report.status).toBe('PENDING');

    const inDb = await prisma.conversation_reports.findFirst({
      where: { conversation_id: createdConversationId }
    });
    expect(inDb?.reason).toBe('SPAM_OR_OFF_PLATFORM');
  });

  test('13. Connected Work Order: getOrCreateConversationByWorkOrder connects to existing canonical thread', async () => {
    // Create a work order for this worker and job
    const workOrder = await prisma.work_orders.create({
      data: {
        order_number: `WO-TEST-${Date.now()}`,
        job_id: testJobId,
        application_id: testApplicationId,
        employer_id: testEmployerId,
        worker_id: testWorkerId,
        job_title: 'Master Electrician for Commercial Mall',
        worksite_name: 'Metro Mall Phase 2',
        worksite_address: 'Guindy Industrial Estate, Chennai',
        city: 'Chennai',
        start_date: new Date(),
        shift_timing: '09:00 - 18:00',
        daily_working_hours: 8,
        wage_amount: 1200,
        wage_frequency: 'DAILY',
        status: 'SENT'
      }
    });

    // Opening conversation by work order should resolve to the same canonical conversation
    const convoFromWO = await ConversationService.getOrCreateConversationByWorkOrder(workOrder.id, testEmployerId);
    expect(convoFromWO.id).toBe(createdConversationId);
    expect(convoFromWO.work_order_id).toBe(workOrder.id);

    // Verify messages retrieval returns linked hiring context with work order details
    const thread = await ConversationService.getConversationMessages(createdConversationId, testWorkerId);
    expect(thread.conversation.linkedHiringContext).toBeDefined();
    expect(thread.conversation.linkedHiringContext?.workOrder).toBeDefined();
    expect(thread.conversation.linkedHiringContext?.workOrder?.id).toBe(workOrder.id);
    expect(thread.conversation.linkedHiringContext?.workOrder?.orderNumber).toBe(workOrder.order_number);
    expect(thread.conversation.linkedHiringContext?.workOrder?.wageAmount).toBe(1200);
    expect(thread.conversation.linkedHiringContext?.workOrder?.wageFrequency).toBe('DAILY');
  });

  test('14. Work Order message tagging: Send message referencing work order', async () => {
    const wo = await prisma.work_orders.findFirst({
      where: { employer_id: testEmployerId }
    });
    expect(wo).toBeDefined();

    const msg = await ConversationService.sendMessage(createdConversationId, testEmployerId, {
      body: 'I have attached the formal digital work order with ₹1,200/day terms. Please confirm.',
      workOrderId: wo!.id
    });

    expect(msg.work_order_id).toBe(wo!.id);
    expect(msg.body).toContain('formal digital work order');
  });
});
