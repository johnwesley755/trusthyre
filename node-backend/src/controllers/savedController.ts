import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';

export const getSavedJobs = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user?.sub) {
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const savedRecords = await (prisma as any).saved_jobs.findMany({
      where: { user_id: user.sub },
      include: {
        jobs: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Extract employer IDs to fetch employer profiles
    const isValidUuid = (val: any): boolean =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const employerIds = Array.from(new Set(savedRecords.map((r: any) => r.jobs?.employer_id).filter(Boolean)));
    const validEmployerIds = employerIds.filter(isValidUuid) as string[];

    const employerProfiles = validEmployerIds.length > 0 ? await prisma.employer_profiles.findMany({
      where: { user_id: { in: validEmployerIds } }
    }) : [];

    const employerMap = new Map(employerProfiles.map((p: any) => [p.user_id, p]));

    const formattedJobs = savedRecords.map((r: any) => {
      const job = r.jobs;
      if (!job) return null;
      const employer = employerMap.get(job.employer_id);

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        industry: job.industry,
        jobType: job.industry || 'Full-Time',
        location: job.location || job.city || job.address,
        city: job.city,
        budget: job.budget ? Number(job.budget) : undefined,
        experienceYearsRequired: job.experience_years_required || 0,
        status: job.status,
        createdAt: job.created_at,
        savedAt: r.created_at,
        employerProfile: employer ? {
          id: employer.id,
          companyName: employer.company_name || job.employer_name || 'Verified Employer',
          isVerified: employer.is_verified,
          city: employer.city,
        } : {
          companyName: job.employer_name || 'Verified Employer',
          isVerified: true,
          city: job.city
        }
      };
    }).filter(Boolean);

    return c.json(ApiResponse.ok(formattedJobs));
  } catch (err: any) {
    console.error("getSavedJobs error:", err);
    return c.json(ApiResponse.error(err.message || "Failed to fetch saved jobs"), 500 as any);
  }
};

export const saveJob = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user?.sub) {
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const { jobId } = await c.req.json();
    if (!jobId) {
      return c.json(ApiResponse.error("Job ID is required"), 400 as any);
    }

    // Verify job exists
    const job = await prisma.jobs.findUnique({ where: { id: jobId } });
    if (!job) {
      return c.json(ApiResponse.error("Job not found"), 404 as any);
    }

    const saved = await (prisma as any).saved_jobs.upsert({
      where: {
        user_id_job_id: {
          user_id: user.sub,
          job_id: jobId
        }
      },
      update: {},
      create: {
        user_id: user.sub,
        job_id: jobId
      }
    });

    return c.json(ApiResponse.ok("Job saved successfully", saved));
  } catch (err: any) {
    console.error("saveJob error:", err);
    return c.json(ApiResponse.error(err.message || "Failed to save job"), 500 as any);
  }
};

export const removeSavedJob = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user?.sub) {
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const jobId = c.req.param('jobId');
    if (!jobId) {
      return c.json(ApiResponse.error("Job ID is required"), 400 as any);
    }

    await (prisma as any).saved_jobs.deleteMany({
      where: {
        user_id: user.sub,
        job_id: jobId
      }
    });

    return c.json(ApiResponse.ok("Job removed from saved"));
  } catch (err: any) {
    console.error("removeSavedJob error:", err);
    return c.json(ApiResponse.error(err.message || "Failed to remove saved job"), 500 as any);
  }
};

export const getSavedWorkers = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user?.sub) {
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const savedRecords = await (prisma as any).saved_workers.findMany({
      where: { employer_id: user.sub },
      orderBy: { created_at: 'desc' }
    });

    const workerIds = savedRecords.map((r: any) => r.worker_id);
    if (workerIds.length === 0) {
      return c.json(ApiResponse.ok([]));
    }

    // Fetch worker search index / profiles
    const searchIndexList = await prisma.worker_search_index.findMany({
      where: { user_id: { in: workerIds } }
    });

    const userMetadataList = await prisma.user_metadata.findMany({
      where: { 
        id: { in: workerIds },
        role: { notIn: ['ADMIN', 'SUPER_ADMIN'] }
      }
    });

    const workerProfileList = await prisma.worker_profiles.findMany({
      where: { user_id: { in: workerIds } }
    });

    const indexMap = new Map(searchIndexList.map((i: any) => [i.user_id, i]));
    const metaMap = new Map(userMetadataList.map((m: any) => [m.id, m]));
    const profileMap = new Map(workerProfileList.map((p: any) => [p.user_id, p]));

    const formattedWorkers = savedRecords
      .filter((r: any) => metaMap.has(r.worker_id))
      .map((r: any) => {
        const wid = r.worker_id;
      const idx = indexMap.get(wid);
      const meta = metaMap.get(wid);
      const prof = profileMap.get(wid);

      const name = prof?.full_name || (meta ? `${meta.first_name || ''} ${meta.last_name || ''}`.trim() : '') || idx?.name || 'Candidate';
      const skillString = idx?.skills || prof?.trade_skills || '';
      const skills = skillString ? skillString.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

      return {
        userId: wid,
        name,
        profileImageUrl: idx?.profile_image_url || prof?.profile_image_url || meta?.profile_image_url || prof?.profile_photo || '',
        profilePhoto: idx?.profile_image_url || prof?.profile_image_url || meta?.profile_image_url || prof?.profile_photo || '',
        skills,
        city: idx?.city || prof?.city || 'Local Area',
        location: idx?.location || prof?.location || 'Local Area',
        experience: prof?.experience_years || 0,
        trustScore: idx?.trust_score ? `${idx.trust_score}%` : '98%',
        isVerified: idx?.is_verified ?? prof?.is_verified ?? true,
        bio: idx?.bio || prof?.bio,
        savedAt: r.created_at,
      };
    });

    return c.json(ApiResponse.ok(formattedWorkers));
  } catch (err: any) {
    console.error("getSavedWorkers error:", err);
    return c.json(ApiResponse.error(err.message || "Failed to fetch saved workers"), 500 as any);
  }
};

export const saveWorker = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user?.sub) {
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const { workerId } = await c.req.json();
    if (!workerId) {
      return c.json(ApiResponse.error("Worker ID is required"), 400 as any);
    }

    const saved = await (prisma as any).saved_workers.upsert({
      where: {
        employer_id_worker_id: {
          employer_id: user.sub,
          worker_id: workerId
        }
      },
      update: {},
      create: {
        employer_id: user.sub,
        worker_id: workerId
      }
    });

    return c.json(ApiResponse.ok("Worker profile saved successfully", saved));
  } catch (err: any) {
    console.error("saveWorker error:", err);
    return c.json(ApiResponse.error(err.message || "Failed to save worker profile"), 500 as any);
  }
};

export const removeSavedWorker = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user?.sub) {
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const workerId = c.req.param('workerId');
    if (!workerId) {
      return c.json(ApiResponse.error("Worker ID is required"), 400 as any);
    }

    await (prisma as any).saved_workers.deleteMany({
      where: {
        employer_id: user.sub,
        worker_id: workerId
      }
    });

    return c.json(ApiResponse.ok("Worker profile removed from saved"));
  } catch (err: any) {
    console.error("removeSavedWorker error:", err);
    return c.json(ApiResponse.error(err.message || "Failed to remove saved worker profile"), 500 as any);
  }
};
