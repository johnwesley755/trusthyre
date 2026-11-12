import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { NotificationDispatcher } from '../services/notificationDispatcher';

export const scheduleInterview = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const {
      applicationId,
      scheduledAt,
      interviewType = 'IN_PERSON',
      locationAddress,
      latitude,
      longitude,
      contactPerson,
      contactPhone,
      instructions
    } = await c.req.json();

    if (!applicationId || !scheduledAt) {
      return c.json(ApiResponse.error("Application ID and scheduled date/time are required"), 400 as any);
    }

    const application = await prisma.job_applications.findUnique({
      where: { id: applicationId },
      include: { jobs: true }
    });

    if (!application) {
      return c.json(ApiResponse.error("Job application not found"), 404 as any);
    }

    const job = application.jobs;
    const employerProfile = await prisma.employer_profiles.findFirst({
      where: { user_id: employerId }
    });

    const isOwner = job.employer_id === employerId || 
                    (employerProfile && job.employer_id === employerProfile.id) || 
                    authUser.role === 'ADMIN';

    if (!isOwner) {
      return c.json(ApiResponse.error("Forbidden: You do not have permission to schedule interviews for this job"), 403 as any);
    }

    const interviewDate = new Date(scheduledAt);
    if (isNaN(interviewDate.getTime())) {
      return c.json(ApiResponse.error("Invalid scheduled date format"), 400 as any);
    }

    // Cancel or supersede any existing active interview for this application
    await prisma.interviews.updateMany({
      where: {
        application_id: applicationId,
        status: { in: ['PROPOSED', 'RESCHEDULE_REQUESTED'] }
      },
      data: { status: 'CANCELLED', updated_at: new Date() }
    });

    const interview = await prisma.interviews.create({
      data: {
        id: uuidv4(),
        application_id: applicationId,
        job_id: application.job_id,
        employer_id: employerId,
        worker_id: application.worker_id,
        scheduled_at: interviewDate,
        interview_type: interviewType,
        location_address: locationAddress || job.address || job.location,
        latitude: latitude ?? job.latitude ?? null,
        longitude: longitude ?? job.longitude ?? null,
        contact_person: contactPerson || employerProfile?.company_name || 'Hiring Manager',
        contact_phone: contactPhone || null,
        instructions: instructions || null,
        status: 'PROPOSED',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Update job application status
    await prisma.job_applications.update({
      where: { id: applicationId },
      data: { status: 'INTERVIEW_SCHEDULED' }
    });

    // Dispatch real-time push & in-app notification to worker
    const dateFormatted = interviewDate.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    await NotificationDispatcher.dispatch({
      userId: application.worker_id,
      title: "Interview Invitation Received! 📅",
      message: `You have been invited for a ${interviewType.replace('_', ' ').toLowerCase()} interview for "${job.title}" on ${dateFormatted}. Tap to accept or reschedule.`,
      type: "INTERVIEW_SCHEDULED",
      link: "/applied-jobs",
      data: {
        interviewId: interview.id,
        applicationId: String(applicationId),
        jobId: String(job.id)
      }
    });

    return c.json(ApiResponse.ok("Interview scheduled successfully", interview));
  } catch (err: any) {
    console.error('[InterviewController] Error scheduling interview:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getInterviewByApplication = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const applicationId = c.req.param('applicationId');
    if (!applicationId) return c.json(ApiResponse.error("Application ID required"), 400 as any);

    const interview = await prisma.interviews.findFirst({
      where: { application_id: applicationId },
      orderBy: { created_at: 'desc' }
    });

    if (!interview) {
      return c.json(ApiResponse.ok(null));
    }

    const hasAccess = interview.employer_id === userId || 
                      interview.worker_id === userId || 
                      authUser.role === 'ADMIN';

    if (!hasAccess) {
      return c.json(ApiResponse.error("Forbidden: You do not have access to this interview record"), 403 as any);
    }

    return c.json(ApiResponse.ok(interview));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getMyInterviews = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const isEmployer = authUser.role === 'EMPLOYER';

    const interviews = await prisma.interviews.findMany({
      where: isEmployer ? { employer_id: userId } : { worker_id: userId },
      include: {
        jobs: {
          select: { id: true, title: true, location: true, city: true, budget: true, employer_name: true }
        },
        job_applications: {
          select: { id: true, status: true, applied_at: true }
        }
      },
      orderBy: { scheduled_at: 'desc' },
      take: 50
    });

    return c.json(ApiResponse.ok(interviews));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const respondToInterview = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const workerId = authUser?.sub;
    if (!workerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const interviewId = c.req.param('id');
    const { action, rescheduleNote } = await c.req.json();

    if (!interviewId || !action) {
      return c.json(ApiResponse.error("Interview ID and response action are required"), 400 as any);
    }

    const interview = await prisma.interviews.findUnique({
      where: { id: interviewId },
      include: { jobs: true }
    });

    if (!interview) {
      return c.json(ApiResponse.error("Interview not found"), 404 as any);
    }

    const hasAccess = interview.worker_id === workerId || authUser.role === 'ADMIN';
    if (!hasAccess) {
      return c.json(ApiResponse.error("Forbidden: Only the invited candidate can respond to this interview"), 403 as any);
    }

    let newStatus: string;
    let appStatus: string;
    let notifTitle: string;
    let notifMessage: string;

    if (action === 'ACCEPT') {
      newStatus = 'ACCEPTED';
      appStatus = 'INTERVIEW_ACCEPTED';
      notifTitle = "Interview Confirmed! ✅";
      notifMessage = `Candidate accepted the interview invitation for "${interview.jobs.title}".`;
    } else if (action === 'DECLINE') {
      newStatus = 'DECLINED';
      appStatus = 'INTERVIEW_DECLINED';
      notifTitle = "Interview Declined";
      notifMessage = `Candidate was unable to accept the interview for "${interview.jobs.title}".`;
    } else if (action === 'RESCHEDULE') {
      newStatus = 'RESCHEDULE_REQUESTED';
      appStatus = 'INTERVIEW_RESCHEDULE';
      notifTitle = "Interview Reschedule Requested 🔄";
      notifMessage = `Candidate requested to reschedule interview for "${interview.jobs.title}": ${rescheduleNote || 'No specific note provided'}`;
    } else {
      return c.json(ApiResponse.error("Invalid response action. Expected ACCEPT, DECLINE, or RESCHEDULE"), 400 as any);
    }

    const updated = await prisma.interviews.update({
      where: { id: interviewId },
      data: {
        status: newStatus,
        reschedule_note: rescheduleNote || null,
        updated_at: new Date()
      }
    });

    await prisma.job_applications.update({
      where: { id: interview.application_id },
      data: { status: appStatus }
    });

    // Notify Employer
    await NotificationDispatcher.dispatch({
      userId: interview.employer_id,
      title: notifTitle,
      message: notifMessage,
      type: "INTERVIEW_UPDATE",
      link: `/jobs/${interview.job_id}/applicants`,
      data: {
        interviewId: interview.id,
        applicationId: interview.application_id,
        status: newStatus
      }
    });

    return c.json(ApiResponse.ok(`Interview response recorded: ${newStatus}`, updated));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateInterviewStatus = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const interviewId = c.req.param('id');
    const { status, scheduledAt, instructions } = await c.req.json();

    const interview = await prisma.interviews.findUnique({
      where: { id: interviewId },
      include: { jobs: true }
    });

    if (!interview) {
      return c.json(ApiResponse.error("Interview not found"), 404 as any);
    }

    const isEmployer = interview.employer_id === userId || authUser.role === 'ADMIN';
    if (!isEmployer) {
      return c.json(ApiResponse.error("Forbidden: Only the employer can update interview details"), 403 as any);
    }

    const updateData: any = { updated_at: new Date() };
    if (status) updateData.status = status;
    if (scheduledAt) updateData.scheduled_at = new Date(scheduledAt);
    if (instructions !== undefined) updateData.instructions = instructions;

    const updated = await prisma.interviews.update({
      where: { id: interviewId },
      data: updateData
    });

    if (status === 'COMPLETED') {
      await prisma.job_applications.update({
        where: { id: interview.application_id },
        data: { status: 'INTERVIEW_COMPLETED' }
      });
    } else if (status === 'CANCELLED') {
      await prisma.job_applications.update({
        where: { id: interview.application_id },
        data: { status: 'PENDING' }
      });

      await NotificationDispatcher.dispatch({
        userId: interview.worker_id,
        title: "Interview Cancelled",
        message: `Your interview for "${interview.jobs.title}" was cancelled by the employer.`,
        type: "INTERVIEW_UPDATE",
        link: "/applied-jobs",
        data: { interviewId: interview.id }
      });
    }

    return c.json(ApiResponse.ok("Interview updated successfully", updated));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

