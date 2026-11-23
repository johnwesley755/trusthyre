import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import prisma, { withSystemContext } from '../src/config/prisma';
import { activityTimelineService } from '../src/services/activityTimelineService';
import { STATUS_TO_STAGE_MAP, STAGE_TO_STATUS_MAP } from '../src/controllers/jobApplicationController';
import { v4 as uuidv4 } from 'uuid';

describe('Candidate Activity Timeline & Follow-up Manager Tests', () => {
  let testEmployerId: string;
  let testWorkerId: string;
  let testJobId: string;
  let testAppId: string;

  beforeAll(async () => {
    testEmployerId = uuidv4();
    testWorkerId = uuidv4();

    await withSystemContext(prisma, async (tx: any) => {
      // 1. Create Employer User & Profile
      await tx.user_metadata.create({
        data: {
          id: testEmployerId,
          email: `${testEmployerId}@trusthyre.test`,
          role: 'EMPLOYER',
          first_name: 'Timeline',
          last_name: 'Employer'
        }
      });
      await tx.employer_profiles.create({
        data: {
          id: uuidv4(),
          user_id: testEmployerId,
          company_name: 'Timeline Testing Corp'
        }
      });

      // 2. Create Worker User & Profile
      await tx.user_metadata.create({
        data: {
          id: testWorkerId,
          email: `${testWorkerId}@trusthyre.test`,
          role: 'WORKER',
          first_name: 'Timeline',
          last_name: 'Worker'
        }
      });
      await tx.worker_profiles.create({
        data: {
          id: uuidv4(),
          user_id: testWorkerId,
          skills: 'Electrical Wiring, Safety Auditing'
        }
      });

      // 3. Create Job
      const job = await tx.jobs.create({
        data: {
          employer_id: testEmployerId,
          title: 'Senior Electrician',
          industry: 'Electrical',
          status: 'ACTIVE'
        }
      });
      testJobId = job.id;

      // 4. Create Job Application
      const app = await tx.job_applications.create({
        data: {
          job_id: testJobId,
          worker_id: testWorkerId,
          status: 'PENDING'
        }
      });
      testAppId = app.id;
    });
  });

  afterAll(async () => {
    await withSystemContext(prisma, async (tx: any) => {
      await tx.application_follow_ups.deleteMany({ where: { application_id: testAppId } });
      await tx.application_notes.deleteMany({ where: { application_id: testAppId } });
      await tx.application_activity_events.deleteMany({ where: { application_id: testAppId } });
      await tx.job_applications.deleteMany({ where: { id: testAppId } });
      await tx.jobs.deleteMany({ where: { id: testJobId } });
      await tx.worker_profiles.deleteMany({ where: { user_id: testWorkerId } });
      await tx.employer_profiles.deleteMany({ where: { user_id: testEmployerId } });
      await tx.user_metadata.deleteMany({ where: { id: { in: [testEmployerId, testWorkerId] } } });
    });
  });

  it('1. Status Mapping: Interview response statuses map correctly to pipeline stages', () => {
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_PROPOSED']).toBe('INTERVIEW');
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_SCHEDULED']).toBe('INTERVIEW');
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_ACCEPTED']).toBe('INTERVIEW');
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_RESCHEDULE']).toBe('INTERVIEW');
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_RESCHEDULED']).toBe('INTERVIEW');
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_COMPLETED']).toBe('SHORTLISTED');
    expect(STATUS_TO_STAGE_MAP['INTERVIEW_DECLINED']).toBe('SHORTLISTED');
    expect(STATUS_TO_STAGE_MAP['PENDING']).toBe('NEW');
    expect(STATUS_TO_STAGE_MAP['OFFER_SENT']).toBe('OFFER_SENT');
  });

  it('2. Activity Timeline: Records events and returns chronological unified timeline', async () => {
    // Record stage transition
    await activityTimelineService.recordEvent({
      applicationId: testAppId,
      eventType: 'STAGE_CHANGED',
      actorId: testEmployerId,
      actorType: 'EMPLOYER',
      metadata: { fromStatus: 'PENDING', toStatus: 'REVIEWING', stage: 'SHORTLISTED' }
    });

    const res = await activityTimelineService.getApplicationTimeline(testAppId);
    expect(res.applicationId).toBe(testAppId);
    expect(res.timeline.length).toBeGreaterThanOrEqual(1);
    expect(res.timeline[0].eventType).toBe('STAGE_CHANGED');
    expect(res.timeline[0].actorId).toBe(testEmployerId);
  });

  it('3. Employer Notes: Adds private note and records activity event', async () => {
    const noteText = 'Candidate has 5+ years of factory electrical experience.';
    const note = await activityTimelineService.addNote(testAppId, testEmployerId, noteText);

    expect(note).toBeDefined();
    expect(note.content).toBe(noteText);
    expect(note.author_id).toBe(testEmployerId);

    const res = await activityTimelineService.getApplicationTimeline(testAppId);
    expect(res.notes.some((n: any) => n.content === noteText)).toBe(true);
    expect(res.timeline.some((t: any) => t.type === 'NOTE' && t.content === noteText)).toBe(true);
  });

  it('4. Follow-up Management: Schedules, summarizes, and completes candidate follow-ups', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const followUp = await activityTimelineService.createFollowUp(testAppId, testEmployerId, {
      title: 'Call to confirm shift start time',
      dueAt: tomorrow,
      note: 'Confirm transit arrangement'
    });

    expect(followUp.status).toBe('PENDING');
    expect(followUp.title).toBe('Call to confirm shift start time');

    // Summary verification
    const summary = await activityTimelineService.getFollowUpSummary(testJobId, testEmployerId);
    expect(summary.totalPending).toBeGreaterThanOrEqual(1);
    expect(summary.upcoming7Days).toBeGreaterThanOrEqual(1);

    // Complete follow-up
    const completed = await activityTimelineService.updateFollowUp(followUp.id, testEmployerId, {
      status: 'COMPLETED'
    });
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completed_at).toBeDefined();

    const timeline = await activityTimelineService.getApplicationTimeline(testAppId);
    expect(timeline.timeline.some((t: any) => t.eventType === 'FOLLOW_UP_COMPLETED')).toBe(true);
  });
});
