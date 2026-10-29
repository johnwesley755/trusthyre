import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { SearchAlertService } from '../services/searchAlertService';

const ALLOWED_JOB_STATUSES = ['OPEN', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'CLOSED'];

const formatJob = (job: any) => {
  if (!job) return job;
  const effectiveExpiry = job.expires_at 
    ? new Date(job.expires_at) 
    : (job.created_at ? new Date(new Date(job.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
  const isExpired = Boolean(
    job.status === 'EXPIRED' ||
    job.status === 'CLOSED' ||
    (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
  );
  const effectiveStatus = isExpired && (job.status === 'OPEN' || job.status === 'ACTIVE')
    ? 'EXPIRED'
    : (job.status || 'OPEN');

  const appCount = typeof job._count?.job_applications === 'number'
    ? job._count.job_applications
    : (Array.isArray(job.job_applications)
      ? job.job_applications.length
      : (typeof job.application_count === 'number'
        ? job.application_count
        : (typeof job.applicationCount === 'number' ? job.applicationCount : 0)));

  return {
    ...job,
    coverImageUrl: job.cover_image_url || job.coverImageUrl || null,
    cover_image_url: job.cover_image_url || job.coverImageUrl || null,
    status: effectiveStatus,
    isExpired,
    applicationCount: appCount,
    applicantCount: appCount,
    employerId: job.employer_id,
    employerName: job.employer_name,
    experienceYearsRequired: job.experience_years_required != null ? Number(job.experience_years_required) : 0,
    requiredSkills: typeof job.required_skills === 'string' 
      ? job.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean) 
      : (Array.isArray(job.required_skills) ? job.required_skills : []),
    budget: job.budget != null ? Number(job.budget) : 0,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    expiresAt: (job.expires_at || effectiveExpiry)?.toISOString(),
  };
};

export const createJob = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    // Security fix 1.6: Only EMPLOYER (or ADMIN) accounts can create jobs
    if (authUser.role !== 'EMPLOYER' && authUser.role !== 'ADMIN') {
      return c.json(ApiResponse.error("Forbidden: Only registered employer accounts can post jobs."), 403 as any);
    }

    const data = (await c.req.json());

    const employer = await prisma.employer_profiles.findUnique({ where: { user_id: employerId } });
    const userMeta = await prisma.user_metadata.findUnique({ where: { id: employerId } });
    const employerName = employer?.company_name || `${userMeta?.first_name || ''} ${userMeta?.last_name || ''}`.trim() || 'Employer';

    const requiredSkillsStr = Array.isArray(data.requiredSkills) 
      ? data.requiredSkills.join(', ') 
      : (typeof data.requiredSkills === 'string' ? data.requiredSkills : '');

    // Auto-expiry: Persist provided date or default to 30 days from now
    let expiresAt: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const rawExpiry = data.expiresAt || data.expires_at;
    if (rawExpiry && typeof rawExpiry === 'string' && rawExpiry.trim() !== '') {
      const parsed = new Date(rawExpiry);
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed;
      }
    }

    const job = await prisma.jobs.create({
      data: {
        id: uuidv4(),
        employer_id: employerId,
        employer_name: employerName,
        title: data.title,
        description: data.description,
        budget: data.budget ? Number(data.budget) : null,
        location: data.location || data.address || data.city || '',
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
        city: data.city || '',
        address: data.address || '',
        industry: data.industry || 'General',
        experience_years_required: data.experienceYearsRequired ? Number(data.experienceYearsRequired) : (data.experience_years_required ? Number(data.experience_years_required) : 0),
        cover_image_url: data.coverImageUrl || data.cover_image_url || null,
        status: 'OPEN',
        expires_at: expiresAt,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Populate search index with skills & expiry
    try {
      await prisma.job_search_index.upsert({
        where: { job_id: job.id },
        update: {
          title: job.title,
          description: job.description,
          category: job.industry,
          location: job.location,
          city: job.city,
          address: job.address,
          latitude: job.latitude,
          longitude: job.longitude,
          required_skills: requiredSkillsStr,
          budget: job.budget ? Number(job.budget) : null,
          status: job.status,
          employer_name: employerName,
          last_updated_at: new Date()
        },
        create: {
          job_id: job.id,
          title: job.title,
          description: job.description,
          category: job.industry,
          location: job.location,
          city: job.city,
          address: job.address,
          latitude: job.latitude,
          longitude: job.longitude,
          required_skills: requiredSkillsStr,
          budget: job.budget ? Number(job.budget) : null,
          status: job.status,
          employer_name: employerName,
          indexed_at: new Date(),
          last_updated_at: new Date()
        }
      });
    } catch (e: any) {
      console.warn("Index update notice:", e.message);
    }

    // 1. Dispatch confirmation to Employer
    NotificationDispatcher.dispatch({
      userId: employerId,
      title: "Job Published Successfully 🚀",
      message: `Your job posting "${job.title}" is now active and accepting verified applicants.`,
      type: "JOB_POSTED",
      link: "/jobs",
      data: { jobId: String(job.id) }
    }).catch(() => {});

    // 2. Trigger Enterprise Reverse Search Match Alerts (Indeed / Naukri pattern)
    // Dispatches alerts ONLY to candidates who have actively saved a matching search alert
    SearchAlertService.matchNewJobAgainstAlerts({
      id: job.id,
      title: job.title,
      description: job.description,
      industry: job.industry,
      city: job.city,
      budget: job.budget ? Number(job.budget) : null,
      employer_id: employerId,
      required_skills: requiredSkillsStr,
      experience_years_required: job.experience_years_required
    }).catch((err: any) => {
      console.warn('[SearchAlertService] Reverse match execution notice:', err.message);
    });

    return c.json(ApiResponse.ok("Job created", formatJob({ ...job, required_skills: requiredSkillsStr })));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getAllJobs = async (c: Context) => {
  try {
    const { query, category, industry, location, city } = c.req.query();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Proactively mark passed jobs as EXPIRED
    await prisma.jobs.updateMany({
      where: {
        status: 'OPEN',
        OR: [
          { expires_at: { lte: new Date() } },
          { expires_at: null, created_at: { lte: thirtyDaysAgo } }
        ]
      },
      data: { status: 'EXPIRED' }
    }).catch(() => {});

    let whereClause: any = {
      status: 'OPEN',
      AND: [
        {
          OR: [
            { expires_at: { gt: new Date() } },
            { expires_at: null, created_at: { gt: thirtyDaysAgo } }
          ]
        }
      ]
    };

    const authUser = c.get('user');
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      whereClause.NOT = [
        { is_external: true, status: { not: 'OPEN' } },
        { status: { in: ['PENDING_REVIEW', 'REJECTED'] } }
      ];
    }

    if (query) {
      whereClause.AND.push({
        OR: [
          { title: { contains: query as string, mode: 'insensitive' } },
          { description: { contains: query as string, mode: 'insensitive' } },
          { industry: { contains: query as string, mode: 'insensitive' } },
        ]
      });
    }

    const tradeFilter = (category || industry) as string;
    if (tradeFilter && tradeFilter !== 'All') {
      whereClause.industry = { contains: tradeFilter, mode: 'insensitive' };
    }

    if (location) whereClause.location = { contains: location as string, mode: 'insensitive' };
    if (city) whereClause.city = { contains: city as string, mode: 'insensitive' };

    const jobs = await prisma.jobs.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { job_applications: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    return c.json(ApiResponse.ok(jobs.map(formatJob)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getJobById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const job = await prisma.jobs.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: { job_applications: true }
        }
      }
    });
    if (!job) return c.json(ApiResponse.error("Job not found"), 404 as any);

    // Gating for candidates / public:
    // Scraped external jobs and unreviewed jobs MUST NOT be shown directly to candidates
    // until approved by Admin or Super Admin (status === 'OPEN').
    const authUser = c.get('user');
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN';
    const isOwner = Boolean(authUser?.sub && job.employer_id === authUser.sub);

    if (job.is_external && job.status !== 'OPEN' && !isAdmin) {
      return c.json(ApiResponse.error("This job listing is pending administrator review and approval"), 404 as any);
    }

    if ((job.status === 'PENDING_REVIEW' || job.status === 'REJECTED') && !isAdmin && !isOwner) {
      return c.json(ApiResponse.error("This job listing is pending administrator review and approval"), 404 as any);
    }

    const effectiveExpiry = job.expires_at 
      ? new Date(job.expires_at) 
      : (job.created_at ? new Date(new Date(job.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
    const isJobExpired = Boolean(
      job.status === 'EXPIRED' ||
      job.status === 'CLOSED' ||
      (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
    );

    // If job has passed its expiration date and is still marked OPEN, sync status to EXPIRED
    if (job.status === 'OPEN' && isJobExpired) {
      await prisma.jobs.update({
        where: { id },
        data: { status: 'EXPIRED', updated_at: new Date() }
      }).catch(() => {});
      job.status = 'EXPIRED';
    }

    let employerProfile: any = null;
    if (job.employer_id) {
      const emp = await prisma.employer_profiles.findFirst({
        where: {
          OR: [
            { id: job.employer_id },
            { user_id: job.employer_id }
          ]
        }
      });
      const user = await prisma.user_metadata.findUnique({
        where: { id: emp?.user_id || job.employer_id }
      });
      if (emp || user) {
        employerProfile = {
          id: emp?.id || job.employer_id,
          userId: emp?.user_id || user?.id || job.employer_id,
          companyName: emp?.company_name || job.employer_name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '') || 'Verified Employer',
          companyWebsite: emp?.company_website || '',
          profileBio: emp?.profile_bio || '',
          businessTier: emp?.business_tier || 'STARTER',
          isVerified: emp?.is_verified ?? false,
          location: emp?.location || '',
          city: emp?.city || '',
          address: emp?.address || '',
          logoUrl: user?.profile_image_url || null,
          phoneNumber: user?.phone_number || null,
          email: user?.email || null
        };
      }
    }

    return c.json(ApiResponse.ok({
      ...formatJob(job),
      employerName: employerProfile?.companyName || job.employer_name || 'Verified Employer',
      employer: employerProfile,
      employerProfile
    }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getMyJobs = async (c: Context) => {
  try {
    const employerId = c.get('user')?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    // Proactively mark passed jobs as EXPIRED for this employer
    await prisma.jobs.updateMany({
      where: {
        employer_id: employerId,
        status: 'OPEN',
        expires_at: { lte: new Date() }
      },
      data: { status: 'EXPIRED' }
    }).catch(() => {});

    const jobs = await prisma.jobs.findMany({ 
      where: { employer_id: employerId },
      include: {
        _count: {
          select: { job_applications: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    return c.json(ApiResponse.ok(jobs.map(formatJob)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateJob = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const data = (await c.req.json());

    // Defect fix 3.5: Validate status against allowed enum set
    if (data.status && !ALLOWED_JOB_STATUSES.includes(data.status)) {
      return c.json(ApiResponse.error(`Invalid job status: ${data.status}. Must be one of: ${ALLOWED_JOB_STATUSES.join(', ')}`), 400 as any);
    }

    const updatePayload: any = {
      updated_at: new Date()
    };
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.budget !== undefined) updatePayload.budget = data.budget ? Number(data.budget) : null;
    if (data.location !== undefined) updatePayload.location = data.location;
    if (data.latitude !== undefined) updatePayload.latitude = data.latitude ? Number(data.latitude) : null;
    if (data.longitude !== undefined) updatePayload.longitude = data.longitude ? Number(data.longitude) : null;
    if (data.city !== undefined) updatePayload.city = data.city;
    if (data.address !== undefined) updatePayload.address = data.address;
    if (data.industry !== undefined) updatePayload.industry = data.industry;
    if (data.expiresAt !== undefined || data.expires_at !== undefined) {
      const rawExpiry = data.expiresAt !== undefined ? data.expiresAt : data.expires_at;
      if (rawExpiry && typeof rawExpiry === 'string' && rawExpiry.trim() !== '') {
        const parsed = new Date(rawExpiry);
        updatePayload.expires_at = !isNaN(parsed.getTime()) ? parsed : null;
      } else {
        updatePayload.expires_at = null;
      }
    }
    if (data.experienceYearsRequired !== undefined || data.experience_years_required !== undefined) {
      updatePayload.experience_years_required = Number(data.experienceYearsRequired ?? data.experience_years_required);
    }
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.coverImageUrl !== undefined || data.cover_image_url !== undefined) {
      updatePayload.cover_image_url = data.coverImageUrl || data.cover_image_url || null;
    }

    const whereClause: any = { id };
    if (authUser.role !== 'ADMIN') {
      whereClause.employer_id = employerId;
    }

    const job = await prisma.jobs.updateMany({
      where: whereClause,
      data: updatePayload
    });

    if (job.count === 0) return c.json(ApiResponse.error("Job not found or not owned by employer"), 404 as any);
    const updatedJob = await prisma.jobs.findUnique({ where: { id } });
    return c.json(ApiResponse.ok("Job updated", formatJob(updatedJob)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const deleteJob = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    if (!employerId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const whereClause: any = { id };
    if (authUser.role !== 'ADMIN') {
      whereClause.employer_id = employerId;
    }

    const existingJob = await prisma.jobs.findFirst({ where: whereClause });
    if (!existingJob) {
      return c.json(ApiResponse.error("Job not found or not owned by employer"), 404 as any);
    }

    // Defect fix 3.4: Safely handle cascade deletion for related applications and search index
    await prisma.job_applications.deleteMany({ where: { job_id: id } }).catch(() => {});
    await prisma.job_search_index.deleteMany({ where: { job_id: id } }).catch(() => {});
    await prisma.jobs.delete({ where: { id } });

    return c.json(ApiResponse.ok("Job deleted successfully", null));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getJobsByIds = async (c: Context) => {
  try {
    const body = (await c.req.json().catch(() => ({}))) || {};
    let ids: string[] = [];
    if (Array.isArray(body)) {
      ids = body;
    } else if (body && Array.isArray(body.ids)) {
      ids = body.ids;
    }
    ids = ids.filter(Boolean);

    if (ids.length === 0) {
      return c.json(ApiResponse.ok([]));
    }

    const authUser = c.get('user');
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN';

    const whereClause: any = { id: { in: ids } };
    if (!isAdmin) {
      whereClause.NOT = [
        { is_external: true, status: { not: 'OPEN' } },
        { status: { in: ['PENDING_REVIEW', 'REJECTED'] } }
      ];
    }

    const jobs = await prisma.jobs.findMany({ where: whereClause });
    return c.json(ApiResponse.ok(jobs.map(formatJob)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getStats = async (c: Context) => {
  try {
    const totalJobs = await prisma.jobs.count({
      where: {
        status: 'OPEN'
      }
    });
    return c.json(ApiResponse.ok({ totalJobs }));
  } catch (err: any) {
    console.error("GET STATS ERROR:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
