import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { formatJob } from './jobController';
import { isAppAdmin } from '../utils/roles';
import { calculateCandidateJobMatch } from '../services/matchScoreService';
import { recommendationEngineService } from '../services/recommendationEngineService';

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
    voiceNoteUrl: app.voice_note_url || (app as any).voiceNoteUrl || null,
    voice_note_url: app.voice_note_url || (app as any).voiceNoteUrl || null,
    job: formattedJob || app.job,
    jobs: formattedJob || app.jobs,
    jobTitle: formattedJob?.title || app.jobTitle || rawJob?.title,
    jobBudget: formattedJob?.budget ?? rawJob?.budget,
    jobLocation: formattedJob?.location || rawJob?.location || formattedJob?.city || rawJob?.city,
  };
};

const enrichApplicationsWithMatchScore = async (applications: any[], initialJobMap?: Map<string, any>) => {
  if (!applications || applications.length === 0) return applications;

  const workerIds = Array.from(new Set(applications.map(a => a.worker_id || a.workerId).filter(Boolean)));
  const jobIds = Array.from(new Set(applications.map(a => a.job_id || a.jobId).filter(Boolean)));

  const [workerProfiles, userMetas, testResults, dbJobs] = await Promise.all([
    workerIds.length > 0
      ? prisma.worker_profiles.findMany({
          where: {
            OR: [
              { user_id: { in: workerIds } },
              { id: { in: workerIds } }
            ]
          }
        })
      : [],
    workerIds.length > 0
      ? prisma.user_metadata.findMany({
          where: { id: { in: workerIds } },
          select: { id: true, email_verified: true }
        })
      : [],
    workerIds.length > 0
      ? prisma.skill_test_results.findMany({
          where: { worker_id: { in: workerIds } },
          include: { skill_tests: { select: { title: true } } }
        })
      : [],
    (!initialJobMap && jobIds.length > 0)
      ? prisma.jobs.findMany({ where: { id: { in: jobIds } } })
      : []
  ]);

  const profileMap = new Map<string, any>();
  workerProfiles.forEach(p => {
    if (p.user_id) profileMap.set(p.user_id, p);
    if (p.id) profileMap.set(p.id, p);
  });

  const metaMap = new Map<string, any>();
  userMetas.forEach(m => metaMap.set(m.id, m));

  const testsByWorker = new Map<string, any[]>();
  testResults.forEach(t => {
    const list = testsByWorker.get(t.worker_id) || [];
    list.push({
      score: t.score,
      passed: t.passed,
      testTitle: t.skill_tests?.title
    });
    testsByWorker.set(t.worker_id, list);
  });

  const jobMap = initialJobMap || new Map<string, any>();
  if (!initialJobMap) {
    dbJobs.forEach(j => jobMap.set(j.id, j));
  }

  return applications.map(app => {
    const formatted = formatApplication(app);
    const workerId = app.worker_id || app.workerId;
    const jobId = app.job_id || app.jobId;

    const workerProfile = profileMap.get(workerId);
    const userMeta = metaMap.get(workerId);
    const workerTests = testsByWorker.get(workerId) || [];
    const job = jobMap.get(jobId) || app.jobs || app.job;

    if (job) {
      const matchResult = calculateCandidateJobMatch(
        {
          id: job.id,
          title: job.title,
          industry: job.industry,
          requiredSkills: (job as any).required_skills || (job as any).requiredSkills || (job as any).skills,
          experienceYearsRequired: job.experience_years_required ?? (job as any).experienceYearsRequired,
          city: job.city,
          location: job.location,
          description: job.description
        },
        {
          userId: workerId,
          skills: workerProfile?.skills,
          preferredRoles: workerProfile?.preferred_roles || (workerProfile as any)?.preferredRoles,
          experienceYears: workerProfile?.experience_years ?? (workerProfile as any)?.experienceYears,
          city: workerProfile?.city,
          location: workerProfile?.location,
          preferredCities: workerProfile?.preferred_cities || (workerProfile as any)?.preferredCities,
          willingToRelocate: workerProfile?.willing_to_relocate ?? (workerProfile as any)?.willingToRelocate,
          isVerified: Boolean(userMeta?.email_verified || (workerProfile as any)?.is_verified || (workerProfile as any)?.isVerified),
          bio: workerProfile?.bio,
          highestEducation: workerProfile?.highest_education,
          degree: workerProfile?.degree,
          specialization: workerProfile?.specialization,
          skillTestResults: workerTests
        }
      );

      formatted.matchAnalysis = matchResult;
      formatted.matchScore = matchResult.overallScore;
      formatted.match_score = matchResult.overallScore;
      formatted.scoreBand = matchResult.scoreBand;
      formatted.matchingSkills = matchResult.matchingSkills;
      formatted.missingSkills = matchResult.missingSkills;
      formatted.matchBreakdown = matchResult.breakdown;
    }

    return formatted;
  });
};

export const applyForJob = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const workerId = authUser?.sub;
    if (!workerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    // Defect fix 1.9: Only WORKER role or ADMIN can apply for jobs
    if (authUser.role !== 'WORKER' && !isAppAdmin(authUser.role)) {
      return c.json(ApiResponse.error("Forbidden: Only worker accounts can apply for jobs."), 403 as any);
    }

    const { jobId, coverLetter, transitModePreferred, voiceNoteUrl, voice_note_url } = (await c.req.json());
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

    const effectiveVoiceNote = voiceNoteUrl || voice_note_url || null;

    const application = await prisma.job_applications.create({
      data: {
        id: uuidv4(),
        job_id: jobId,
        worker_id: workerId,
        status: 'PENDING',
        cover_letter: coverLetter ? (transitModePreferred ? `${coverLetter} [Transit: ${transitModePreferred}]` : coverLetter) : (transitModePreferred ? `[Transit: ${transitModePreferred}]` : null),
        voice_note_url: effectiveVoiceNote,
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

    // Record server-verified recommendation conversion telemetry
    try {
      await recommendationEngineService.recordInteraction({
        userId: workerId,
        interactionType: 'APPLY',
        itemType: 'JOB',
        itemId: jobId,
        isServerVerified: true,
        metadata: { source: 'job_application_submission', applicationId: application.id }
      });
    } catch (telemetryErr) {
      console.warn('[jobApplicationController] Telemetry recording warning:', telemetryErr);
    }

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
        // Atomic CAS update: only update if status is still PENDING
        const updateResult = await prisma.job_applications.updateMany({
          where: {
            id: existing.id,
            status: 'PENDING'
          },
          data: { status: 'OFFER_SENT' }
        });

        if (updateResult.count === 0) {
          return c.json(ApiResponse.error("Offer has already been dispatched or application status was modified concurrently."), 409 as any);
        }

        const updated = await prisma.job_applications.findUniqueOrThrow({
          where: { id: existing.id }
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

        // Server-side verified INVITE telemetry recording
        try {
          await recommendationEngineService.recordInteraction({
            userId: employerId,
            interactionType: 'INVITE',
            itemType: 'WORKER',
            itemId: canonicalWorkerId,
            isServerVerified: true,
            metadata: { source: 'dispatch_offer', jobId, applicationId: existing.id }
          });
        } catch (telemetryErr) {
          console.warn('[dispatchOffer] Telemetry recording warning:', telemetryErr);
        }

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

    // Server-side verified INVITE telemetry recording
    try {
      await recommendationEngineService.recordInteraction({
        userId: employerId,
        interactionType: 'INVITE',
        itemType: 'WORKER',
        itemId: canonicalWorkerId,
        isServerVerified: true,
        metadata: { source: 'dispatch_offer', jobId, applicationId: application.id }
      });
    } catch (telemetryErr) {
      console.warn('[dispatchOffer] Telemetry recording warning:', telemetryErr);
    }

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
    const isAdmin = isAppAdmin(authUser.role);

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
    const enriched = await enrichApplicationsWithMatchScore(applications);
    return c.json(ApiResponse.ok("My applications fetched", enriched));
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

    const employerProfile = await prisma.employer_profiles.findFirst({
      where: {
        OR: [
          { user_id: authUser.sub },
          { id: authUser.sub }
        ]
      }
    });

    const isEmployerOwner = job.employer_id === authUser.sub ||
      Boolean(employerProfile && (job.employer_id === employerProfile.id || job.employer_id === employerProfile.user_id));

    // Defect fix 1.8: Ensure requesting user owns the job or is ADMIN / SUPER_ADMIN
    if (!isEmployerOwner && !isAppAdmin(authUser.role)) {
      return c.json(ApiResponse.error("Forbidden: You do not own this job posting."), 403 as any);
    }

    const applications = await prisma.job_applications.findMany({
      where: { job_id: jobId },
      orderBy: { applied_at: 'desc' }
    });
    const jobMap = new Map<string, any>([[job.id, job]]);
    const enriched = await enrichApplicationsWithMatchScore(applications, jobMap);
    return c.json(ApiResponse.ok("Job applications fetched", enriched));
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

    const employerProfile = await prisma.employer_profiles.findFirst({
      where: {
        OR: [
          { user_id: authUser.sub },
          { id: authUser.sub }
        ]
      }
    });

    const employerOwnerIds = Array.from(new Set([
      authUser.sub,
      ...(employerProfile?.id ? [employerProfile.id] : []),
      ...(employerProfile?.user_id ? [employerProfile.user_id] : [])
    ]));

    // Default to all jobs owned by employer
    if (jobIds.length === 0) {
      const employerJobs = await prisma.jobs.findMany({
        where: { employer_id: { in: employerOwnerIds } },
        select: { id: true }
      });
      jobIds = employerJobs.map(j => j.id);
    } else if (!isAppAdmin(authUser.role)) {
      // Defect fix 1.8: Filter jobIds to only those owned by the employer
      const ownedJobs = await prisma.jobs.findMany({
        where: { id: { in: jobIds }, employer_id: { in: employerOwnerIds } },
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
    const enriched = await enrichApplicationsWithMatchScore(applications);
    return c.json(ApiResponse.ok("Applications for jobs fetched", enriched));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getCandidateJobMatch = async (c: Context) => {
  try {
    const jobId = c.req.param('jobId');
    const paramWorkerId = c.req.param('workerId');
    const authUser = c.get('user');
    const workerId = paramWorkerId || authUser?.sub;

    if (!jobId || !workerId) {
      return c.json(ApiResponse.error("Job ID and Worker ID are required"), 400 as any);
    }

    const [job, workerProfile, userMeta, testResults] = await Promise.all([
      prisma.jobs.findUnique({ where: { id: jobId } }),
      prisma.worker_profiles.findFirst({
        where: {
          OR: [
            { user_id: workerId },
            { id: workerId }
          ]
        }
      }),
      prisma.user_metadata.findUnique({
        where: { id: workerId },
        select: { id: true, email_verified: true }
      }),
      prisma.skill_test_results.findMany({
        where: { worker_id: workerId },
        include: { skill_tests: { select: { title: true } } }
      })
    ]);

    if (!job) return c.json(ApiResponse.error("Job not found"), 404 as any);

    const matchResult = calculateCandidateJobMatch(
      {
        id: job.id,
        title: job.title,
        industry: job.industry,
        requiredSkills: (job as any).required_skills || (job as any).requiredSkills || (job as any).skills,
        experienceYearsRequired: job.experience_years_required,
        city: job.city,
        location: job.location,
        description: job.description
      },
      {
        userId: workerId,
        skills: workerProfile?.skills,
        preferredRoles: workerProfile?.preferred_roles || (workerProfile as any)?.preferredRoles,
        experienceYears: workerProfile?.experience_years ?? (workerProfile as any)?.experienceYears,
        city: workerProfile?.city,
        location: workerProfile?.location,
        preferredCities: workerProfile?.preferred_cities || (workerProfile as any)?.preferredCities,
        willingToRelocate: workerProfile?.willing_to_relocate ?? (workerProfile as any)?.willingToRelocate,
        isVerified: Boolean(userMeta?.email_verified || (workerProfile as any)?.is_verified || (workerProfile as any)?.isVerified),
        bio: workerProfile?.bio,
        highestEducation: workerProfile?.highest_education,
        degree: workerProfile?.degree,
        specialization: workerProfile?.specialization,
        skillTestResults: testResults.map(t => ({
          score: t.score,
          passed: t.passed,
          testTitle: t.skill_tests?.title
        }))
      }
    );

    return c.json(ApiResponse.ok("Match score calculated", matchResult));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

