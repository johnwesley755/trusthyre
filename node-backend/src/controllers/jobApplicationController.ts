import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { formatJob } from './jobController';

const extractTransitMode = (coverLetter?: string | null): string | null => {
  if (!coverLetter || typeof coverLetter !== 'string') return null;
  const match = coverLetter.match(/\[Transit:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : null;
};

const formatApplication = (app: any) => {
  if (!app) return app;
  const rawJob = app.jobs || app.job;
  const formattedJob = rawJob ? formatJob(rawJob) : undefined;
  const transitMode = (app as any).transit_mode_preferred ||
                      (app as any).transitModePreferred ||
                      extractTransitMode(app.cover_letter || app.coverLetter);

  return {
    ...app,
    jobId: app.job_id || app.jobId,
    workerId: app.worker_id || app.workerId,
    appliedAt: app.applied_at || app.appliedAt,
    coverLetter: app.cover_letter || app.coverLetter,
    transitModePreferred: transitMode,
    transit_mode_preferred: transitMode,
    job: formattedJob || app.job,
    jobs: formattedJob || app.jobs,
    jobTitle: formattedJob?.title || app.jobTitle || rawJob?.title,
    jobBudget: formattedJob?.budget ?? rawJob?.budget,
    jobLocation: formattedJob?.location || rawJob?.location || formattedJob?.city || rawJob?.city,
  };
};

export const applyForJob = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const workerId = authUser?.sub;
    if (!workerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    // Defect fix 1.9: Only WORKER role can apply for jobs
    if (authUser.role !== 'WORKER' && authUser.role !== 'ADMIN') {
      return c.json(ApiResponse.error("Forbidden: Only worker accounts can apply for jobs."), 403 as any);
    }

    const { jobId, coverLetter, transitModePreferred } = (await c.req.json());
    if (!jobId) return c.json(ApiResponse.error("Job ID is required"), 400 as any);

    const job = await prisma.jobs.findUnique({ where: { id: jobId } });
    if (!job) return c.json(ApiResponse.error("Job not found"), 404 as any);

    // Validate that job is not expired
    const effectiveExpiry = job.expires_at 
      ? new Date(job.expires_at) 
      : (job.created_at ? new Date(new Date(job.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
    const isJobExpired = Boolean(
      job.status === 'EXPIRED' ||
      job.status === 'CLOSED' ||
      (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
    );

    if (isJobExpired) {
      if (job.status === 'OPEN') {
        await prisma.jobs.update({
          where: { id: jobId },
          data: { status: 'EXPIRED', updated_at: new Date() }
        }).catch(() => {});
      }
      return c.json(ApiResponse.error("Cannot apply: This job posting has expired."), 400 as any);
    }

    // Validate that job is OPEN
    if (job.status !== 'OPEN') {
      return c.json(ApiResponse.error(`Cannot apply: This job is currently ${(job.status || 'closed').toLowerCase()}.`), 400 as any);
    }

    const existing = await prisma.job_applications.findFirst({
      where: { job_id: jobId, worker_id: workerId }
    });

    if (existing) {
      return c.json(ApiResponse.error("You have already applied for this job"), 400 as any);
    }

    const application = await prisma.job_applications.create({
      data: {
        id: uuidv4(),
        job_id: jobId,
        worker_id: workerId,
        status: 'PENDING',
        cover_letter: coverLetter ? (transitModePreferred ? `${coverLetter} [Transit: ${transitModePreferred}]` : coverLetter) : (transitModePreferred ? `[Transit: ${transitModePreferred}]` : null),
        applied_at: new Date()
      } as any
    });

    // Dispatch Synchronized Notification for Employer (In-App + FCM Push)
    await NotificationDispatcher.dispatch({
      userId: job.employer_id,
      title: "New Job Applicant! 📋",
      message: `A verified worker has applied for your job: "${job.title}". Tap to review candidate.`,
      type: "NEW_APPLICATION",
      link: `/jobs/${jobId}/applicants`,
      data: { jobId: String(jobId), workerId: String(workerId) }
    });

    // Dispatch Synchronized Notification for Worker (In-App + FCM Push)
    await NotificationDispatcher.dispatch({
      userId: workerId,
      title: "Application Submitted Successfully ✅",
      message: `Your application for "${job.title}" has been submitted to the employer.`,
      type: "APPLICATION_SUBMITTED",
      link: "/applied-jobs",
      data: { jobId: String(jobId) }
    });

    return c.json(ApiResponse.ok("Application submitted successfully", formatApplication(application)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const dispatchOffer = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const { jobId, workerId, coverLetter } = (await c.req.json());
    if (!jobId || !workerId) return c.json(ApiResponse.error("Job ID and Worker ID are required"), 400 as any);

    const employerProfile = await prisma.employer_profiles.findFirst({
      where: { user_id: employerId }
    });

    const job = await prisma.jobs.findUnique({ where: { id: jobId } });
    if (!job) return c.json(ApiResponse.error("Job not found"), 404 as any);

    const isOwner = job.employer_id === employerId || (employerProfile && job.employer_id === employerProfile.id) || authUser.role === 'ADMIN';
    if (!isOwner) {
      return c.json(ApiResponse.error("Unauthorized: You do not own this job"), 403 as any);
    }

    // Resolve canonical worker user ID
    const workerProfile = await prisma.worker_profiles.findFirst({
      where: {
        OR: [
          { user_id: workerId },
          { id: workerId }
        ]
      }
    });

    const canonicalWorkerId = workerProfile?.user_id || workerId;
    const allMatchingWorkerIds = Array.from(new Set([
      workerId,
      canonicalWorkerId,
      ...(workerProfile?.id ? [workerProfile.id] : [])
    ]));

    // Check if duplicate offer / application already exists for this job
    const existing = await prisma.job_applications.findFirst({
      where: {
        job_id: jobId,
        worker_id: { in: allMatchingWorkerIds }
      }
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        const updated = await prisma.job_applications.update({
          where: { id: existing.id },
          data: { status: 'OFFER_SENT' }
        });

        // Dispatch Synchronized Notification for Worker (Job Offer)
        await NotificationDispatcher.dispatch({
          userId: canonicalWorkerId,
          title: "Direct Job Offer Received 📜",
          message: `You received a direct job offer for "${job.title}". Tap to review and accept.`,
          type: "JOB_OFFER",
          link: "/applied-jobs",
          data: { jobId: String(jobId), applicationId: String(existing.id) }
        }).catch(() => {});

        return c.json(ApiResponse.ok("Offer dispatched successfully by updating applicant status", formatApplication(updated)));
      }
      if (existing.status === 'OFFER_SENT') {
        return c.json(ApiResponse.error("Offer has already been dispatched to this candidate for this job."), 400 as any);
      }
      if (existing.status === 'ACCEPTED' || existing.status === 'APPROVED') {
        return c.json(ApiResponse.error("This candidate has already been approved / hired for this job."), 400 as any);
      }
      if (existing.status === 'REJECTED' || existing.status === 'DECLINED') {
        return c.json(ApiResponse.error("The offer for this job was previously declined."), 400 as any);
      }
      return c.json(ApiResponse.error(`An application already exists with status: ${existing.status}`), 400 as any);
    }

    const application = await prisma.job_applications.create({
      data: {
        id: uuidv4(),
        job_id: jobId,
        worker_id: canonicalWorkerId,
        status: 'OFFER_SENT',
        cover_letter: coverLetter || "Offer Dispatched",
        applied_at: new Date()
      }
    });

    // Dispatch Synchronized Notification for Worker (Job Offer)
    await NotificationDispatcher.dispatch({
      userId: canonicalWorkerId,
      title: "Congratulations! Job Offer Received 🎉",
      message: `You have received a direct job offer for: "${job.title}". Tap to view offer and start details.`,
      type: "APPLICATION_ACCEPTED",
      link: "/applied-jobs",
      data: { jobId: String(jobId) }
    });

    return c.json(ApiResponse.ok("Offer dispatched successfully", formatApplication(application)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getEmployerWorkerStatus = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const workerId = c.req.param('workerId') as string;
    if (!workerId) return c.json(ApiResponse.error("Worker ID required"), 400 as any);

    const employerProfile = await prisma.employer_profiles.findFirst({
      where: { user_id: employerId }
    });

    const employerJobs = await prisma.jobs.findMany({
      where: {
        OR: [
          { employer_id: employerId },
          ...(employerProfile ? [{ employer_id: employerProfile.id }] : [])
        ]
      },
      select: { id: true, title: true, status: true, budget: true, location: true, city: true }
    });

    const jobIds = employerJobs.map(j => j.id);
    if (jobIds.length === 0) {
      return c.json(ApiResponse.ok({ applications: [], jobs: [] }));
    }

    // Resolve worker id/user_id
    const workerProfile = await prisma.worker_profiles.findFirst({
      where: {
        OR: [
          { user_id: workerId },
          { id: workerId }
        ]
      }
    });

    const targetWorkerIds = Array.from(new Set([
      workerId,
      ...(workerProfile?.user_id ? [workerProfile.user_id] : []),
      ...(workerProfile?.id ? [workerProfile.id] : [])
    ]));

    const applications = await prisma.job_applications.findMany({
      where: {
        job_id: { in: jobIds },
        worker_id: { in: targetWorkerIds }
      },
      include: {
        jobs: {
          select: { id: true, title: true, status: true }
        }
      },
      orderBy: { applied_at: 'desc' }
    });

    return c.json(ApiResponse.ok({
      applications: applications.map(formatApplication),
      jobs: employerJobs
    }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateApplicationStatus = async (c: Context) => {
  try {
    const applicationId = c.req.param('applicationId') as string;
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const body = (await c.req.json().catch(() => ({}))) || {};
    const query = c.req.query();
    const status = (body.status || query.status) as string;

    const application = await prisma.job_applications.findUnique({
      where: { id: applicationId },
      include: { jobs: true }
    });

    if (!application) return c.json(ApiResponse.error("Application not found"), 404 as any);

    // Authorization ownership validation (supporting user ID and profile ID mappings)
    const employerProfile = await prisma.employer_profiles.findFirst({
      where: {
        OR: [
          { user_id: authUser.sub },
          { id: authUser.sub }
        ]
      }
    });

    const isEmployerOwner = application.jobs?.employer_id === authUser.sub ||
      Boolean(employerProfile && (application.jobs?.employer_id === employerProfile.id || application.jobs?.employer_id === employerProfile.user_id));
    const isApplicant = application.worker_id === authUser.sub;
    const isAdmin = authUser.role === 'ADMIN';

    if (!isEmployerOwner && !isApplicant && !isAdmin) {
      return c.json(ApiResponse.error("Forbidden: You are not authorized to modify this application."), 403 as any);
    }

    let normalizedStatus = status.toUpperCase();

    // Security Gate: Restrict role-based status transitions
    if (!isAdmin) {
      if (isApplicant && !isEmployerOwner) {
        // Applicant transitions
        if (application.status === 'OFFER_SENT') {
          // Normalize candidate decline response (accept either DECLINED or REJECTED)
          if (normalizedStatus === 'REJECTED') {
            normalizedStatus = 'DECLINED';
          }
          if (!['ACCEPTED', 'DECLINED'].includes(normalizedStatus)) {
            return c.json(ApiResponse.error("Invalid status: You may only accept or decline an active offer."), 400 as any);
          }
        } else {
          // Pending or reviewing: applicant can only withdraw
          if (!['WITHDRAWN', 'DECLINED', 'REJECTED'].includes(normalizedStatus)) {
            return c.json(ApiResponse.error("Forbidden: Candidates cannot approve or accept their own pending applications."), 403 as any);
          }
        }
      } else if (isEmployerOwner) {
        // Employer transitions
        const allowedEmployerStatuses = ['REVIEWING', 'OFFER_SENT', 'ACCEPTED', 'APPROVED', 'REJECTED', 'COMPLETED'];
        if (!allowedEmployerStatuses.includes(normalizedStatus)) {
          return c.json(ApiResponse.error(`Invalid status: Must be one of ${allowedEmployerStatuses.join(', ')}`), 400 as any);
        }
      }
    }

    const updated = await prisma.job_applications.update({
      where: { id: applicationId },
      data: { status: normalizedStatus }
    });

    // Resolve canonical target user ID for notification delivery
    let targetUserId = isEmployerOwner ? application.worker_id : (application.jobs?.employer_id || '');
    if (isEmployerOwner) {
      // Employer sent offer/update -> Target is candidate
      const workerProfile = await prisma.worker_profiles.findFirst({
        where: {
          OR: [
            { id: application.worker_id },
            { user_id: application.worker_id }
          ]
        }
      });
      if (workerProfile?.user_id) {
        targetUserId = workerProfile.user_id;
      }
    } else {
      // Candidate responded -> Target is employer
      const empProfile = await prisma.employer_profiles.findFirst({
        where: {
          OR: [
            { id: application.jobs?.employer_id },
            { user_id: application.jobs?.employer_id }
          ]
        }
      });
      if (empProfile?.user_id) {
        targetUserId = empProfile.user_id;
      }
    }

    if (targetUserId) {
      const statusUpper = normalizedStatus.toUpperCase();
      const jobTitle = application.jobs?.title || 'Shift';
      let title = "Application Status Updated";
      let message = `Your application for "${jobTitle}" has been updated to ${statusUpper}.`;
      let type = "APPLICATION_UPDATE";

      if (isEmployerOwner) {
        // Employer changed status -> Worker receives notification
        if (statusUpper === 'ACCEPTED' || statusUpper === 'APPROVED' || statusUpper === 'HIRED') {
          title = "Congratulations! You're Hired 🎉";
          message = `You have been selected and hired for "${jobTitle}". Get ready for your shift!`;
          type = "APPLICATION_ACCEPTED";
        } else if (statusUpper === 'SHORTLISTED') {
          title = "Application Shortlisted! 🌟";
          message = `Great news! You have been shortlisted for "${jobTitle}". Keep your notifications on.`;
          type = "APPLICATION_SHORTLISTED";
        } else if (statusUpper === 'OFFER_SENT') {
          title = "Direct Job Offer Received 📜";
          message = `You received a direct job offer for "${jobTitle}". Tap to review and accept.`;
          type = "JOB_OFFER";
        } else if (statusUpper === 'REVIEWING') {
          title = "Application Viewed 👁️";
          message = `The employer is currently reviewing your application for "${jobTitle}".`;
          type = "APPLICATION_UPDATE";
        } else if (statusUpper === 'REJECTED') {
          title = "Application Status Update";
          message = `Your application status for "${jobTitle}" has been updated. Explore other open roles.`;
          type = "APPLICATION_REJECTED";
        }
      } else {
        // Worker responded to offer -> Employer receives notification
        if (statusUpper === 'ACCEPTED') {
          title = "Job Offer Accepted! 🤝";
          message = `A candidate has accepted your job offer for "${jobTitle}". You can now coordinate start details.`;
          type = "APPLICATION_ACCEPTED";
        } else if (statusUpper === 'DECLINED' || statusUpper === 'REJECTED') {
          title = "Job Offer Declined ❌";
          message = `A candidate has declined your offer for "${jobTitle}".`;
          type = "APPLICATION_UPDATE";
        }
      }

      const targetLink = isEmployerOwner ? "/applied-jobs" : `/jobs/${application.job_id}/applicants`;
      await NotificationDispatcher.dispatch({
        userId: targetUserId,
        title,
        message,
        type,
        link: targetLink,
        data: { applicationId: String(applicationId), status: statusUpper, jobId: String(application.job_id) }
      }).catch((err: any) => {
        console.warn('[updateApplicationStatus] Notification dispatch notice:', err?.message);
      });
    }

    return c.json(ApiResponse.ok("Status updated", formatApplication(updated)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getMyApplications = async (c: Context) => {
  try {
    const workerId = c.get('user')?.sub;
    if (!workerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const applications = await prisma.job_applications.findMany({
      where: { worker_id: workerId },
      include: { jobs: true },
      orderBy: { applied_at: 'desc' }
    });
    return c.json(ApiResponse.ok("My applications fetched", applications.map(formatApplication)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getJobApplications = async (c: Context) => {
  try {
    const jobId = c.req.param('jobId') as string;
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const job = await prisma.jobs.findUnique({ where: { id: jobId } });
    if (!job) return c.json(ApiResponse.error("Job not found"), 404 as any);

    // Defect fix 1.8: Ensure requesting user owns the job or is ADMIN
    if (job.employer_id !== authUser.sub && authUser.role !== 'ADMIN') {
      return c.json(ApiResponse.error("Forbidden: You do not own this job posting."), 403 as any);
    }

    const applications = await prisma.job_applications.findMany({
      where: { job_id: jobId },
      orderBy: { applied_at: 'desc' }
    });
    return c.json(ApiResponse.ok("Job applications fetched", applications.map(formatApplication)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getApplicationsByJobs = async (c: Context) => {
  try {
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const body = (await c.req.json().catch(() => ({}))) || {};
    let jobIds: string[] = [];
    if (Array.isArray(body)) {
      jobIds = body;
    } else if (body && Array.isArray(body.jobIds)) {
      jobIds = body.jobIds;
    } else if (body && Array.isArray(body.job_ids)) {
      jobIds = body.job_ids;
    }

    // Default to all jobs owned by employer
    if (jobIds.length === 0) {
      const employerJobs = await prisma.jobs.findMany({
        where: { employer_id: authUser.sub },
        select: { id: true }
      });
      jobIds = employerJobs.map(j => j.id);
    } else if (authUser.role !== 'ADMIN') {
      // Defect fix 1.8: Filter jobIds to only those owned by the employer
      const ownedJobs = await prisma.jobs.findMany({
        where: { id: { in: jobIds }, employer_id: authUser.sub },
        select: { id: true }
      });
      jobIds = ownedJobs.map(j => j.id);
    }

    if (jobIds.length === 0) {
      return c.json(ApiResponse.ok("Applications for jobs fetched", []));
    }

    const applications = await prisma.job_applications.findMany({
      where: { job_id: { in: jobIds } },
      include: { jobs: true },
      orderBy: { applied_at: 'desc' }
    });
    return c.json(ApiResponse.ok("Applications for jobs fetched", applications.map(formatApplication)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

