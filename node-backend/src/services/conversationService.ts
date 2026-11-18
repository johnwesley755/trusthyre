import prisma from '../config/prisma';
import { NotificationDispatcher } from './notificationDispatcher';

export interface SendMessageInput {
  body: string;
  clientMessageId?: string;
  metadata?: Record<string, any>;
  workOrderId?: string;
  interviewId?: string;
}

export interface ConversationPaginationOptions {
  cursor?: string;
  limit?: number;
}

export const ConversationService = {
  /**
   * Alias for getOrCreateConversationByApplication.
   */
  getOrCreateConversation: async (
    applicationId: string,
    callerUserId: string,
    callerRole?: string
  ) => {
    return ConversationService.getOrCreateConversationByApplication(applicationId, callerUserId, callerRole);
  },

  /**
   * Idempotently get or create a conversation for a specific job application.
   * Only the worker who applied or the employer who owns the job can access/create it.
   */
  getOrCreateConversationByApplication: async (
    applicationId: string,
    callerUserId: string,
    callerRole?: string
  ) => {
    if (!applicationId) {
      throw new Error("Application ID is required.");
    }

    // 1. Fetch application with job details
    const application = await prisma.job_applications.findUnique({
      where: { id: applicationId },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            employer_id: true,
            employer_name: true,
            city: true,
            status: true
          }
        }
      }
    });

    if (!application) {
      throw new Error("Job application not found.");
    }

    const workerUserId = application.worker_id;
    const employerUserId = application.jobs.employer_id;
    const isAdmin = callerRole === 'ADMIN' || callerRole === 'SUPER_ADMIN';

    // 2. Strict authorization: Caller must be the applicant worker or the hiring employer
    if (!isAdmin && callerUserId !== workerUserId && callerUserId !== employerUserId) {
      throw new Error("Forbidden: You are not an authorized participant in this application.");
    }

    // 3. Find existing canonical conversation
    let conversation = await prisma.conversations.findFirst({
      where: {
        OR: [
          { application_id: applicationId },
          {
            job_id: application.job_id,
            employer_user_id: employerUserId,
            worker_user_id: workerUserId
          }
        ]
      },
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            employer_name: true,
            city: true
          }
        },
        participants: true
      }
    });

    // Check if there is an active work order for this worker and job/application
    const matchingWorkOrder = await prisma.work_orders.findFirst({
      where: {
        OR: [
          { application_id: applicationId },
          {
            job_id: application.job_id,
            worker_id: workerUserId,
            employer_id: employerUserId
          }
        ]
      },
      orderBy: { created_at: 'desc' }
    });

    if (conversation) {
      // Backfill application_id or work_order_id if missing
      const convRecord = conversation as any;
      const needsApp = !convRecord.application_id;
      const needsWorkOrder = matchingWorkOrder && !convRecord.work_order_id;
      if (needsApp || needsWorkOrder) {
        conversation = await prisma.conversations.update({
          where: { id: conversation.id },
          data: {
            ...(needsApp ? { application_id: applicationId } : {}),
            ...(needsWorkOrder ? { work_order_id: matchingWorkOrder.id } : {})
          } as any,
          include: {
            jobs: {
              select: {
                id: true,
                title: true,
                employer_name: true,
                city: true
              }
            },
            participants: true
          }
        });
      }
      return conversation;
    }

    // 4. Create conversation if none exists
    conversation = await prisma.$transaction(async (tx) => {
      const created = await tx.conversations.create({
        data: {
          application_id: applicationId,
          work_order_id: matchingWorkOrder?.id || null,
          job_id: application.job_id,
          employer_user_id: employerUserId,
          worker_user_id: workerUserId,
          status: 'OPEN',
          last_message_at: new Date()
        } as any
      });

      // Create both participants
      await tx.conversation_participants.createMany({
        data: [
          {
            conversation_id: created.id,
            user_id: employerUserId,
            role: 'EMPLOYER',
            last_read_at: callerUserId === employerUserId ? new Date() : null
          },
          {
            conversation_id: created.id,
            user_id: workerUserId,
            role: 'WORKER',
            last_read_at: callerUserId === workerUserId ? new Date() : null
          }
        ]
      });

      // Add initial system timeline event
      await tx.conversation_messages.create({
        data: {
          conversation_id: created.id,
          sender_user_id: 'SYSTEM',
          message_type: 'SYSTEM',
          body: `Conversation started regarding "${application.jobs.title}". Keep messaging professional and focused on the hiring process.`,
          metadata: {
            event: 'CONVERSATION_INITIALIZED',
            applicationId,
            jobId: application.job_id,
            workOrderId: matchingWorkOrder?.id || null
          }
        } as any
      });

      return await tx.conversations.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          jobs: {
            select: {
              id: true,
              title: true,
              employer_name: true,
              city: true
            }
          },
          participants: true
        }
      });
    });

    return conversation;
  },

  /**
   * Idempotently get or create a canonical conversation for a specific work order.
   * Connects the hiring relationship between employer and worker.
   */
  getOrCreateConversationByWorkOrder: async (
    workOrderId: string,
    callerUserId: string,
    callerRole?: string
  ) => {
    if (!workOrderId) {
      throw new Error("Work order ID is required.");
    }

    // 1. Fetch work order
    const workOrder = await prisma.work_orders.findUnique({
      where: { id: workOrderId }
    });

    if (!workOrder) {
      throw new Error("Work order not found.");
    }

    const workerUserId = workOrder.worker_id;
    const employerUserId = workOrder.employer_id;
    const isAdmin = callerRole === 'ADMIN' || callerRole === 'SUPER_ADMIN';

    // 2. Strict authorization: Caller must be the assigned worker or hiring employer
    if (!isAdmin && callerUserId !== workerUserId && callerUserId !== employerUserId) {
      throw new Error("Forbidden: You are not an authorized participant on this work order.");
    }

    // 3. Resolve target job_id
    let targetJobId = workOrder.job_id;
    if (!targetJobId && workOrder.application_id) {
      const app = await prisma.job_applications.findUnique({
        where: { id: workOrder.application_id },
        select: { job_id: true }
      });
      if (app?.job_id) {
        targetJobId = app.job_id;
        await prisma.work_orders.update({
          where: { id: workOrder.id },
          data: { job_id: targetJobId }
        });
      }
    }

    if (!targetJobId) {
      let existingJob = await prisma.jobs.findFirst({
        where: {
          employer_id: employerUserId,
          title: workOrder.job_title
        }
      });

      if (!existingJob) {
        const employerProfile = await prisma.employer_profiles.findFirst({
          where: { user_id: employerUserId }
        });
        existingJob = await prisma.jobs.create({
          data: {
            title: workOrder.job_title,
            description: workOrder.work_description || `Direct work order engagement for ${workOrder.job_title}`,
            employer_id: employerUserId,
            employer_name: employerProfile?.company_name || 'Hiring Employer',
            city: workOrder.city,
            location: workOrder.worksite_address,
            budget: workOrder.wage_amount ? Number(workOrder.wage_amount) : 0,
            status: 'OPEN'
          }
        });
      }

      targetJobId = existingJob.id;
      await prisma.work_orders.update({
        where: { id: workOrder.id },
        data: { job_id: targetJobId }
      });
    }

    // 4. Find existing canonical conversation
    let conversation = await prisma.conversations.findFirst({
      where: {
        OR: [
          { work_order_id: workOrderId } as any,
          {
            job_id: targetJobId,
            employer_user_id: employerUserId,
            worker_user_id: workerUserId
          }
        ]
      } as any,
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            employer_name: true,
            city: true
          }
        },
        participants: true
      }
    });

    if (conversation) {
      // Ensure work_order_id and application_id are linked
      const convRecord = conversation as any;
      const needsWorkOrder = convRecord.work_order_id !== workOrderId;
      const needsApp = workOrder.application_id && convRecord.application_id !== workOrder.application_id;
      if (needsWorkOrder || needsApp) {
        conversation = await prisma.conversations.update({
          where: { id: conversation.id },
          data: {
            work_order_id: workOrderId,
            ...(needsApp ? { application_id: workOrder.application_id } : {})
          } as any,
          include: {
            jobs: { select: { id: true, title: true, employer_name: true, city: true } },
            participants: true
          }
        });
      }
      return conversation;
    }

    // 5. Create new conversation
    return await prisma.$transaction(async (tx) => {
      const created = await tx.conversations.create({
        data: {
          job_id: targetJobId!,
          application_id: workOrder.application_id || null,
          work_order_id: workOrderId,
          employer_user_id: employerUserId,
          worker_user_id: workerUserId,
          status: 'OPEN',
          last_message_at: new Date()
        } as any
      });

      await tx.conversation_participants.createMany({
        data: [
          {
            conversation_id: created.id,
            user_id: employerUserId,
            role: 'EMPLOYER',
            last_read_at: callerUserId === employerUserId ? new Date() : null
          },
          {
            conversation_id: created.id,
            user_id: workerUserId,
            role: 'WORKER',
            last_read_at: callerUserId === workerUserId ? new Date() : null
          }
        ]
      });

      // System message linking work order
      await tx.conversation_messages.create({
        data: {
          conversation_id: created.id,
          sender_user_id: 'SYSTEM',
          message_type: 'SYSTEM',
          work_order_id: workOrderId,
          body: `Conversation opened regarding Work Order #${workOrder.order_number} (${workOrder.job_title}).`,
          metadata: {
            event: 'WORK_ORDER_CONVERSATION_OPENED',
            workOrderId,
            orderNumber: workOrder.order_number,
            wageAmount: Number(workOrder.wage_amount),
            wageFrequency: workOrder.wage_frequency,
            status: workOrder.status
          }
        } as any
      });

      return await tx.conversations.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          jobs: { select: { id: true, title: true, employer_name: true, city: true } },
          participants: true
        }
      });
    });
  },

  /**
   * Retrieves hired workers and shortlisted candidates for an employer to start or resume messaging.
   */
  getEmployerContacts: async (employerUserId: string) => {
    // 1. Fetch work orders for this employer
    const workOrders = await prisma.work_orders.findMany({
      where: {
        employer_id: employerUserId,
        status: { notIn: ['CANCELLED', 'DECLINED'] }
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        order_number: true,
        job_id: true,
        application_id: true,
        worker_id: true,
        job_title: true,
        status: true,
        wage_amount: true,
        wage_frequency: true,
        start_date: true,
        worksite_name: true,
        city: true,
        created_at: true
      }
    });

    // 2. Fetch jobs posted by this employer
    const employerJobs = await prisma.jobs.findMany({
      where: { employer_id: employerUserId },
      select: { id: true, title: true }
    });
    const employerJobIds = employerJobs.map(j => j.id);

    // 3. Fetch applications for these jobs (focus on active / shortlisted)
    const applications = employerJobIds.length > 0 ? await prisma.job_applications.findMany({
      where: {
        job_id: { in: employerJobIds },
        status: { notIn: ['REJECTED', 'DECLINED', 'WITHDRAWN'] }
      },
      orderBy: { applied_at: 'desc' },
      select: {
        id: true,
        job_id: true,
        worker_id: true,
        status: true,
        applied_at: true,
        jobs: { select: { id: true, title: true } }
      }
    }) : [];

    // 4. Fetch existing conversations to find active thread IDs
    const existingConversations = await prisma.conversations.findMany({
      where: { employer_user_id: employerUserId },
      select: {
        id: true,
        job_id: true,
        worker_user_id: true,
        application_id: true
      }
    });

    const conversationByApp = new Map<string, string>();
    const conversationByWorkerAndJob = new Map<string, string>();

    for (const c of existingConversations) {
      if (c.application_id) conversationByApp.set(c.application_id, c.id);
      conversationByWorkerAndJob.set(`${c.worker_user_id}_${c.job_id}`, c.id);
    }

    // 5. Collect all worker user IDs for profile enrichment
    const allWorkerUserIds = Array.from(new Set([
      ...workOrders.map(wo => wo.worker_id),
      ...applications.map(app => app.worker_id)
    ]));

    const [workerProfiles, userMetas] = await Promise.all([
      prisma.worker_profiles.findMany({
        where: { user_id: { in: allWorkerUserIds } },
        select: { user_id: true, full_name: true, profile_image_url: true, skills: true, city: true }
      }).catch(() => []),
      prisma.user_metadata.findMany({
        where: { id: { in: allWorkerUserIds } },
        select: { id: true, first_name: true, last_name: true, role: true }
      }).catch(() => [])
    ]);

    const workerProfileMap = new Map(workerProfiles.map(w => [w.user_id, w]));
    const userMetaMap = new Map(userMetas.map(m => [m.id, m]));

    // Format Hired Workers
    const hired = workOrders.map(wo => {
      const profile = workerProfileMap.get(wo.worker_id);
      const meta = userMetaMap.get(wo.worker_id);
      const name = profile?.full_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || 'Hired Worker';
      const conversationId = (wo.job_id ? conversationByWorkerAndJob.get(`${wo.worker_id}_${wo.job_id}`) : null) ||
                            (wo.application_id ? conversationByApp.get(wo.application_id) : null) || null;

      return {
        type: 'HIRED_WORKER' as const,
        workerId: wo.worker_id,
        workerName: name,
        photoUrl: profile?.profile_image_url || null,
        city: wo.city || profile?.city || '',
        jobTitle: wo.job_title,
        jobId: wo.job_id,
        workOrderId: wo.id,
        orderNumber: wo.order_number,
        workOrderStatus: wo.status,
        wageAmount: Number(wo.wage_amount),
        wageFrequency: wo.wage_frequency,
        startDate: wo.start_date,
        conversationId
      };
    });

    // Format Shortlisted Candidates & Applicants
    const shortlisted: any[] = [];
    const otherApplicants: any[] = [];

    // Track which (worker_id, job_id) pairs already have work orders so we don't duplicate
    const workOrderWorkerJobSet = new Set(workOrders.filter(w => w.job_id).map(w => `${w.worker_id}_${w.job_id}`));

    for (const app of applications) {
      if (workOrderWorkerJobSet.has(`${app.worker_id}_${app.job_id}`)) {
        continue;
      }

      const profile = workerProfileMap.get(app.worker_id);
      const meta = userMetaMap.get(app.worker_id);
      const name = profile?.full_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || 'Candidate';
      const conversationId = conversationByApp.get(app.id) ||
                            conversationByWorkerAndJob.get(`${app.worker_id}_${app.job_id}`) || null;

      const item = {
        type: 'APPLICANT' as const,
        workerId: app.worker_id,
        workerName: name,
        photoUrl: profile?.profile_image_url || null,
        city: profile?.city || '',
        skills: profile?.skills || '',
        jobTitle: app.jobs.title,
        jobId: app.job_id,
        applicationId: app.id,
        applicationStatus: app.status,
        appliedAt: app.applied_at,
        conversationId
      };

      if (['SHORTLISTED', 'INTERVIEWING', 'ACCEPTED'].includes(app.status?.toUpperCase() || '')) {
        shortlisted.push(item);
      } else {
        otherApplicants.push(item);
      }
    }

    return {
      hired,
      shortlisted,
      applicants: otherApplicants,
      totalCount: hired.length + shortlisted.length + otherApplicants.length
    };
  },

  /**
   * Retrieves the caller's conversation inbox with participant details and unread counts.
   */
  getUserInbox: async (userId: string, options?: ConversationPaginationOptions) => {
    const limit = Math.min(Math.max(options?.limit || 20, 1), 50);

    const conversations = await prisma.conversations.findMany({
      where: {
        OR: [
          { employer_user_id: userId },
          { worker_user_id: userId }
        ]
      },
      orderBy: [
        { last_message_at: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit + 1,
      include: {
        jobs: {
          select: {
            id: true,
            title: true,
            employer_name: true,
            city: true
          }
        },
        participants: true,
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });

    const hasMore = conversations.length > limit;
    const items = hasMore ? conversations.slice(0, limit) : conversations;

    // Collect all counterpart user IDs to enrich with names and photos
    const otherUserIds = Array.from(new Set(items.map(c => 
      c.employer_user_id === userId ? c.worker_user_id : c.employer_user_id
    )));

    const [userMetas, workerProfiles, employerProfiles] = await Promise.all([
      prisma.user_metadata.findMany({
        where: { id: { in: otherUserIds } },
        select: { id: true, first_name: true, last_name: true, role: true }
      }).catch(() => []),
      prisma.worker_profiles.findMany({
        where: { user_id: { in: otherUserIds } },
        select: { user_id: true, full_name: true, profile_image_url: true, skills: true }
      }).catch(() => []),
      prisma.employer_profiles.findMany({
        where: { user_id: { in: otherUserIds } },
        select: { user_id: true, company_name: true }
      }).catch(() => [])
    ]);

    const metaMap = new Map(userMetas.map(m => [m.id, m]));
    const workerMap = new Map(workerProfiles.map(w => [w.user_id, w]));
    const employerMap = new Map(employerProfiles.map(e => [e.user_id, e]));

    // Fetch linked work orders and applications for inbox badge enrichment
    const workOrderIds = items.map(c => (c as any).work_order_id).filter((id): id is string => Boolean(id));
    const appIds = items.map(c => c.application_id).filter((id): id is string => Boolean(id));

    const [inboxWorkOrders, inboxApps] = await Promise.all([
      workOrderIds.length > 0 ? prisma.work_orders.findMany({
        where: { id: { in: workOrderIds } },
        select: { id: true, status: true, order_number: true }
      }).catch(() => []) : [],
      appIds.length > 0 ? prisma.job_applications.findMany({
        where: { id: { in: appIds } },
        select: { id: true, status: true }
      }).catch(() => []) : []
    ]);

    const woMap = new Map(inboxWorkOrders.map(w => [w.id, w]));
    const appMap = new Map(inboxApps.map(a => [a.id, a]));

    // Calculate unread count and attach counterpart summary for each conversation
    const enrichedConversations = await Promise.all(items.map(async (c) => {
      const isCallerEmployer = c.employer_user_id === userId;
      const otherUserId = isCallerEmployer ? c.worker_user_id : c.employer_user_id;

      const myParticipant = c.participants.find(p => p.user_id === userId);
      const lastReadAt = myParticipant?.last_read_at || new Date(0);

      // Count unread messages received after last_read_at from the other party
      const unreadCount = await prisma.conversation_messages.count({
        where: {
          conversation_id: c.id,
          created_at: { gt: lastReadAt },
          sender_user_id: { not: userId }
        }
      });

      const meta = metaMap.get(otherUserId);
      const worker = workerMap.get(otherUserId);
      const employer = employerMap.get(otherUserId);

      let otherPartyName = 'TrustHyre User';
      let otherPartyPhoto: string | null = null;
      let otherPartyRole = isCallerEmployer ? 'Candidate' : 'Employer';

      if (isCallerEmployer) {
        otherPartyName = worker?.full_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || 'Candidate';
        otherPartyPhoto = worker?.profile_image_url || null;
      } else {
        otherPartyName = employer?.company_name || c.jobs?.employer_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || 'Employer';
        otherPartyPhoto = null;
      }

      const wo = (c as any).work_order_id ? woMap.get((c as any).work_order_id) : null;
      const app = c.application_id ? appMap.get(c.application_id) : null;

      let hiringStage: 'HIRED' | 'WORK_ORDER_SENT' | 'SHORTLISTED' | 'INTERVIEWING' | 'APPLIED' = 'APPLIED';
      if (wo?.status === 'ACCEPTED') {
        hiringStage = 'HIRED';
      } else if (wo?.status === 'SENT') {
        hiringStage = 'WORK_ORDER_SENT';
      } else if (app?.status === 'SHORTLISTED') {
        hiringStage = 'SHORTLISTED';
      } else if (app?.status === 'INTERVIEWING') {
        hiringStage = 'INTERVIEWING';
      }

      return {
        id: c.id,
        applicationId: c.application_id,
        workOrderId: (c as any).work_order_id || null,
        hiringStage,
        jobId: c.job_id,
        jobTitle: c.jobs?.title || 'Job Opening',
        status: c.status,
        lastMessageAt: c.last_message_at,
        unreadCount,
        isMuted: Boolean(myParticipant?.muted_at),
        otherParty: {
          userId: otherUserId,
          name: otherPartyName,
          photoUrl: otherPartyPhoto,
          role: otherPartyRole
        },
        lastMessage: c.messages[0] ? {
          id: c.messages[0].id,
          senderId: c.messages[0].sender_user_id,
          body: c.messages[0].body,
          messageType: c.messages[0].message_type,
          createdAt: c.messages[0].created_at
        } : null
      };
    }));

    return {
      conversations: enrichedConversations,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null
    };
  },

  /**
   * Retrieves messages for a specific conversation with cursor pagination.
   */
  getConversationMessages: async (
    conversationId: string,
    callerUserId: string,
    options?: ConversationPaginationOptions
  ) => {
    // Verify caller participation
    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId },
      include: {
        jobs: {
          select: { id: true, title: true, employer_name: true, city: true }
        },
        participants: true
      }
    });

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const isParticipant = conversation.employer_user_id === callerUserId || 
                          conversation.worker_user_id === callerUserId;
    if (!isParticipant) {
      throw new Error("Forbidden: You are not a participant in this conversation.");
    }

    const limit = Math.min(Math.max(options?.limit || 30, 1), 100);

    const messages = await prisma.conversation_messages.findMany({
      where: {
        conversation_id: conversationId,
        ...(options?.cursor ? {
          created_at: { lt: new Date(options.cursor) }
        } : {})
      },
      orderBy: { created_at: 'desc' },
      take: limit + 1
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // Determine counterpart
    const isEmployer = conversation.employer_user_id === callerUserId;
    const counterpartId = isEmployer ? conversation.worker_user_id : conversation.employer_user_id;

    const [userMeta, workerProfile, employerProfile] = await Promise.all([
      prisma.user_metadata.findUnique({ where: { id: counterpartId } }),
      prisma.worker_profiles.findFirst({ where: { user_id: counterpartId } }),
      prisma.employer_profiles.findFirst({ where: { user_id: counterpartId } })
    ]);

    const counterpartName = isEmployer
      ? (workerProfile?.full_name || `${userMeta?.first_name || ''} ${userMeta?.last_name || ''}`.trim() || 'Candidate')
      : (employerProfile?.company_name || conversation.jobs.employer_name || `${userMeta?.first_name || ''} ${userMeta?.last_name || ''}`.trim() || 'Employer');

    // Fetch linked application, work order, and interview context
    const convRecord = conversation as any;
    const [linkedApp, linkedWorkOrder, linkedInterview] = await Promise.all([
      conversation.application_id
        ? prisma.job_applications.findUnique({
            where: { id: conversation.application_id },
            select: { id: true, status: true, applied_at: true }
          })
        : null,
      convRecord.work_order_id
        ? prisma.work_orders.findUnique({
            where: { id: convRecord.work_order_id },
            select: {
              id: true,
              order_number: true,
              status: true,
              wage_amount: true,
              wage_frequency: true,
              start_date: true,
              worksite_name: true,
              worksite_address: true
            }
          })
        : prisma.work_orders.findFirst({
            where: {
              job_id: conversation.job_id,
              worker_id: conversation.worker_user_id,
              employer_id: conversation.employer_user_id,
              status: { notIn: ['CANCELLED', 'DECLINED'] }
            },
            orderBy: { created_at: 'desc' },
            select: {
              id: true,
              order_number: true,
              status: true,
              wage_amount: true,
              wage_frequency: true,
              start_date: true,
              worksite_name: true,
              worksite_address: true
            }
          }),
      prisma.interviews.findFirst({
        where: {
          OR: [
            conversation.application_id ? { application_id: conversation.application_id } : {},
            {
              job_id: conversation.job_id,
              worker_id: conversation.worker_user_id,
              employer_id: conversation.employer_user_id
            }
          ]
        },
        orderBy: { scheduled_at: 'desc' },
        select: {
          id: true,
          interview_type: true,
          scheduled_at: true,
          status: true,
          location_address: true,
          instructions: true
        }
      })
    ]);

    // Backfill work_order_id if discovered
    if (linkedWorkOrder && !convRecord.work_order_id) {
      prisma.conversations.update({
        where: { id: conversation.id },
        data: { work_order_id: linkedWorkOrder.id } as any
      }).catch(err => console.warn('[ConversationService] Failed to auto-link work order:', err.message));
    }

    return {
      conversation: {
        id: conversation.id,
        applicationId: conversation.application_id,
        workOrderId: convRecord.work_order_id || linkedWorkOrder?.id || null,
        jobId: conversation.job_id,
        jobTitle: conversation.jobs.title,
        status: conversation.status,
        counterpart: {
          userId: counterpartId,
          name: counterpartName,
          photoUrl: isEmployer ? workerProfile?.profile_image_url : null,
          role: isEmployer ? 'WORKER' : 'EMPLOYER'
        },
        linkedHiringContext: {
          application: linkedApp ? {
            id: linkedApp.id,
            status: linkedApp.status,
            appliedAt: linkedApp.applied_at
          } : null,
          workOrder: linkedWorkOrder ? {
            id: linkedWorkOrder.id,
            orderNumber: linkedWorkOrder.order_number,
            status: linkedWorkOrder.status,
            wageAmount: Number(linkedWorkOrder.wage_amount),
            wageFrequency: linkedWorkOrder.wage_frequency,
            startDate: linkedWorkOrder.start_date,
            worksiteName: linkedWorkOrder.worksite_name,
            worksiteAddress: linkedWorkOrder.worksite_address
          } : null,
          interview: linkedInterview ? {
            id: linkedInterview.id,
            type: linkedInterview.interview_type,
            scheduledAt: linkedInterview.scheduled_at,
            status: linkedInterview.status,
            locationAddress: linkedInterview.location_address,
            instructions: linkedInterview.instructions
          } : null
        }
      },
      messages: items.reverse(), // Send in chronological order to the frontend
      hasMore,
      nextCursor: hasMore ? items[0]?.created_at?.toISOString() : null
    };
  },

  /**
   * Sends a text message inside a conversation with idempotency protection.
   */
  sendMessage: async (
    conversationId: string,
    senderUserId: string,
    input: SendMessageInput
  ) => {
    const rawBody = input.body ? input.body.trim() : '';
    if (!rawBody) {
      throw new Error("Message body cannot be empty.");
    }
    if (rawBody.length > 2000) {
      throw new Error("Message exceeds the maximum permitted length of 2,000 characters.");
    }

    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId },
      include: {
        jobs: {
          select: { id: true, title: true }
        },
        participants: true
      }
    });

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const isParticipant = conversation.employer_user_id === senderUserId || 
                          conversation.worker_user_id === senderUserId;
    if (!isParticipant) {
      throw new Error("Forbidden: You are not authorized to send messages in this conversation.");
    }

    if (conversation.status !== 'OPEN') {
      throw new Error(`Cannot send message. This conversation is ${conversation.status.toLowerCase()}.`);
    }

    // Check clientMessageId for idempotency / duplicate retry prevention
    if (input.clientMessageId) {
      const existing = await prisma.conversation_messages.findFirst({
        where: {
          sender_user_id: senderUserId,
          client_message_id: input.clientMessageId
        }
      });
      if (existing) {
        return existing;
      }
    }

    const now = new Date();

    const [createdMessage] = await prisma.$transaction([
      prisma.conversation_messages.create({
        data: {
          conversation_id: conversationId,
          sender_user_id: senderUserId,
          message_type: 'TEXT',
          body: rawBody,
          client_message_id: input.clientMessageId || null,
          work_order_id: input.workOrderId || null,
          interview_id: input.interviewId || null,
          metadata: (input.metadata as any) ?? undefined,
          created_at: now
        } as any
      }),
      prisma.conversations.update({
        where: { id: conversationId },
        data: {
          last_message_at: now,
          updated_at: now
        }
      }),
      prisma.conversation_participants.updateMany({
        where: {
          conversation_id: conversationId,
          user_id: senderUserId
        },
        data: {
          last_read_at: now
        }
      })
    ]);

    // Asynchronously dispatch in-app and push notification to the counterpart (lock-screen safe)
    const recipientUserId = conversation.employer_user_id === senderUserId
      ? conversation.worker_user_id
      : conversation.employer_user_id;

    // Fetch sender display name
    const senderMeta = await prisma.user_metadata.findUnique({
      where: { id: senderUserId },
      select: { first_name: true, last_name: true }
    }).catch(() => null);

    const senderName = `${senderMeta?.first_name || ''} ${senderMeta?.last_name || ''}`.trim() || 'A TrustHyre user';

    // Privacy-preserving notification copy (no raw message text on lock screen)
    NotificationDispatcher.dispatch({
      userId: recipientUserId,
      title: `New message about ${conversation.jobs.title}`,
      message: `${senderName} sent you a message regarding your application.`,
      type: 'STATUS_UPDATE',
      link: `/messages/${conversation.id}`
    }).catch(err => {
      console.warn('[ConversationService:Notify] Push notification warning:', err.message);
    });

    return createdMessage;
  },

  /**
   * Updates caller's read cursor in a conversation.
   */
  markConversationAsRead: async (
    conversationId: string,
    userId: string,
    lastReadMessageId?: string
  ) => {
    const now = new Date();
    await prisma.conversation_participants.updateMany({
      where: {
        conversation_id: conversationId,
        user_id: userId
      },
      data: {
        last_read_at: now,
        last_read_message_id: lastReadMessageId || null
      }
    });

    return { success: true, lastReadAt: now };
  },

  markAsRead: async (
    conversationId: string,
    userId: string,
    lastReadMessageId?: string
  ) => {
    return ConversationService.markConversationAsRead(conversationId, userId, lastReadMessageId);
  },

  /**
   * Fast global count of total unread messages across all active conversations.
   */
  getTotalUnreadCount: async (userId: string): Promise<number> => {
    const participants = await prisma.conversation_participants.findMany({
      where: { user_id: userId },
      select: {
        conversation_id: true,
        last_read_at: true,
        created_at: true
      }
    });

    if (!participants || participants.length === 0) return 0;

    let totalUnread = 0;
    for (const p of participants) {
      const cutoff = p.last_read_at || p.created_at;
      const count = await prisma.conversation_messages.count({
        where: {
          conversation_id: p.conversation_id,
          created_at: { gt: cutoff },
          sender_user_id: { not: userId }
        }
      });
      totalUnread += count;
    }

    return totalUnread;
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    return ConversationService.getTotalUnreadCount(userId);
  },

  /**
   * Mute or unmute notifications for a conversation.
   */
  muteConversation: async (
    conversationId: string,
    userId: string,
    mute: boolean
  ) => {
    await prisma.conversation_participants.updateMany({
      where: {
        conversation_id: conversationId,
        user_id: userId
      },
      data: {
        muted_at: mute ? new Date() : null
      }
    });

    return { success: true, isMuted: mute };
  },

  /**
   * Submits a moderation report for a conversation.
   */
  reportConversation: async (
    conversationId: string,
    reporterUserId: string,
    input: { reason: string; details?: string; notes?: string }
  ) => {
    const conversation = await prisma.conversations.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      throw new Error("Conversation not found.");
    }

    const reportedUserId = conversation.employer_user_id === reporterUserId
      ? conversation.worker_user_id
      : conversation.employer_user_id;

    const reportNotes = input.details || input.notes;

    return await prisma.conversation_reports.create({
      data: {
        conversation_id: conversationId,
        reporter_user_id: reporterUserId,
        reported_user_id: reportedUserId,
        reason: input.reason.slice(0, 100),
        notes: reportNotes ? reportNotes.slice(0, 1000) : null,
        status: 'PENDING'
      }
    });
  }
};
