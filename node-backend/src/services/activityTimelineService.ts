import prisma from '../config/prisma';

export type ActivityEventType =
  | 'APPLICATION_RECEIVED'
  | 'STAGE_CHANGED'
  | 'CANDIDATE_SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_ACCEPTED'
  | 'INTERVIEW_DECLINED'
  | 'INTERVIEW_RESCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'INTERNAL_NOTE_ADDED'
  | 'FOLLOW_UP_SCHEDULED'
  | 'FOLLOW_UP_COMPLETED'
  | 'WORK_ORDER_CREATED';

export interface RecordEventInput {
  applicationId: string;
  eventType: ActivityEventType;
  actorId: string;
  actorType?: 'EMPLOYER' | 'WORKER' | 'SYSTEM';
  metadata?: Record<string, any>;
}

export const activityTimelineService = {
  /**
   * Atomically records a candidate hiring activity event.
   */
  async recordEvent(input: RecordEventInput, dbClient: any = prisma) {
    try {
      return await dbClient.application_activity_events.create({
        data: {
          application_id: input.applicationId,
          event_type: input.eventType,
          actor_id: input.actorId,
          actor_type: input.actorType || 'EMPLOYER',
          metadata: input.metadata || {},
        }
      });
    } catch (err: any) {
      console.error('[activityTimelineService.recordEvent] Failed to record event:', err.message);
      return null;
    }
  },

  /**
   * Fetches unified chronological timeline for a specific application:
   * Merges activity events, internal notes, interview logs, and follow-ups.
   */
  async getApplicationTimeline(applicationId: string) {
    const [events, notes, followUps, interviews] = await Promise.all([
      prisma.application_activity_events.findMany({
        where: { application_id: applicationId },
        orderBy: { created_at: 'desc' }
      }),
      prisma.application_notes.findMany({
        where: { application_id: applicationId },
        orderBy: { created_at: 'desc' }
      }),
      prisma.application_follow_ups.findMany({
        where: { application_id: applicationId },
        orderBy: { due_at: 'asc' }
      }),
      prisma.interviews.findMany({
        where: { application_id: applicationId },
        orderBy: { scheduled_at: 'desc' }
      })
    ]);

    // Format all items into unified timeline entries
    const timelineItems = [
      ...events.map((e: any) => ({
        id: e.id,
        type: 'ACTIVITY',
        eventType: e.event_type,
        actorId: e.actor_id,
        actorType: e.actor_type,
        metadata: e.metadata,
        timestamp: e.created_at,
      })),
      ...notes.map((n: any) => ({
        id: n.id,
        type: 'NOTE',
        eventType: 'INTERNAL_NOTE_ADDED',
        actorId: n.author_id,
        actorType: 'EMPLOYER',
        content: n.content,
        timestamp: n.created_at,
        updatedAt: n.updated_at,
      })),
      ...followUps.map((f: any) => ({
        id: f.id,
        type: 'FOLLOW_UP',
        eventType: f.status === 'COMPLETED' ? 'FOLLOW_UP_COMPLETED' : 'FOLLOW_UP_SCHEDULED',
        title: f.title,
        status: f.status,
        note: f.note,
        dueAt: f.due_at,
        completedAt: f.completed_at,
        actorId: f.creator_id,
        actorType: 'EMPLOYER',
        timestamp: f.created_at,
      }))
    ];

    timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      applicationId,
      timeline: timelineItems,
      notes,
      followUps,
      interviews
    };
  },

  /**
   * Adds an internal employer note to an application.
   */
  async addNote(applicationId: string, authorId: string, content: string) {
    const note = await prisma.application_notes.create({
      data: {
        application_id: applicationId,
        author_id: authorId,
        content: content.trim()
      }
    });

    await this.recordEvent({
      applicationId,
      eventType: 'INTERNAL_NOTE_ADDED',
      actorId: authorId,
      actorType: 'EMPLOYER',
      metadata: { noteId: note.id, preview: content.slice(0, 100) }
    });

    return note;
  },

  /**
   * Schedules a follow-up action for a candidate.
   */
  async createFollowUp(applicationId: string, creatorId: string, data: { title: string; dueAt: Date | string; note?: string }) {
    const followUp = await prisma.application_follow_ups.create({
      data: {
        application_id: applicationId,
        creator_id: creatorId,
        title: data.title.trim(),
        due_at: new Date(data.dueAt),
        note: data.note ? data.note.trim() : null,
        status: 'PENDING'
      }
    });

    await this.recordEvent({
      applicationId,
      eventType: 'FOLLOW_UP_SCHEDULED',
      actorId: creatorId,
      actorType: 'EMPLOYER',
      metadata: { followUpId: followUp.id, title: followUp.title, dueAt: followUp.due_at }
    });

    return followUp;
  },

  /**
   * Updates or completes an existing follow-up.
   */
  async updateFollowUp(followUpId: string, updaterId: string, data: { status?: 'PENDING' | 'COMPLETED' | 'CANCELLED'; dueAt?: Date | string; note?: string }) {
    const isCompleting = data.status === 'COMPLETED';
    const updated = await prisma.application_follow_ups.update({
      where: { id: followUpId },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.dueAt ? { due_at: new Date(data.dueAt) } : {}),
        ...(data.note !== undefined ? { note: data.note?.trim() || null } : {}),
        ...(isCompleting ? { completed_at: new Date() } : {})
      }
    });

    if (isCompleting) {
      await this.recordEvent({
        applicationId: updated.application_id,
        eventType: 'FOLLOW_UP_COMPLETED',
        actorId: updaterId,
        actorType: 'EMPLOYER',
        metadata: { followUpId: updated.id, title: updated.title }
      });
    }

    return updated;
  },

  /**
   * Calculates follow-up metrics for an employer across all applications of a job.
   */
  async getFollowUpSummary(jobId: string, employerId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const followUps = await prisma.application_follow_ups.findMany({
      where: {
        status: 'PENDING',
        job_applications: {
          job_id: jobId,
          jobs: { employer_id: employerId }
        }
      },
      include: {
        job_applications: {
          select: {
            id: true,
            worker_id: true,
            status: true
          }
        }
      }
    });

    let overdue = 0;
    let dueToday = 0;
    let upcoming7Days = 0;

    followUps.forEach((f: any) => {
      const due = new Date(f.due_at);
      if (due < startOfToday) {
        overdue++;
      } else if (due <= endOfToday) {
        dueToday++;
      } else if (due <= in7Days) {
        upcoming7Days++;
      }
    });

    return {
      overdue,
      dueToday,
      upcoming7Days,
      totalPending: followUps.length,
      items: followUps
    };
  }
};
