import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { sanitizeHtmlDescription } from '../utils/textSanitizer';

export const searchJobs = async (c: Context) => {
  try {
    const { query, category, industry, location, city, jobType, minSalary, maxSalary, minExperience, maxExperience, sortBy, employerId, includeExpired, source } = c.req.query();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Proactively sync expired open jobs (by expires_at or 30-day default lifetime)
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
      AND: []
    };

    const authUser = c.get('user');
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'SUPER_ADMIN';

    // External scraped jobs require approval from Admin / Super Admin before candidate visibility
    if (!isAdmin) {
      if (includeExpired === 'true') {
        whereClause.status = { in: ['OPEN', 'EXPIRED', 'CLOSED'] };
      } else {
        whereClause.status = 'OPEN';
        whereClause.AND.push({
          OR: [
            { expires_at: { gt: new Date() } },
            { expires_at: null, created_at: { gt: thirtyDaysAgo } }
          ]
        });
      }
      whereClause.NOT = [
        { is_external: true, status: { not: 'OPEN' } },
        { status: { in: ['PENDING_REVIEW', 'REJECTED'] } }
      ];
    } else {
      if (includeExpired !== 'true') {
        whereClause.status = 'OPEN';
        whereClause.AND.push({
          OR: [
            { expires_at: { gt: new Date() } },
            { expires_at: null, created_at: { gt: thirtyDaysAgo } }
          ]
        });
      }
    }

    if (query) {
      whereClause.AND.push({
        OR: [
          { title: { contains: query as string, mode: 'insensitive' } },
          { description: { contains: query as string, mode: 'insensitive' } },
          { industry: { contains: query as string, mode: 'insensitive' } },
          { employer_name: { contains: query as string, mode: 'insensitive' } },
        ]
      });
    }

    const tradeFilter = (category || industry) as string;
    if (tradeFilter && tradeFilter !== 'All') {
      whereClause.industry = { contains: tradeFilter, mode: 'insensitive' };
    }

    if (location) whereClause.location = { contains: location as string, mode: 'insensitive' };
    if (city) whereClause.city = { contains: city as string, mode: 'insensitive' };
    if (employerId) whereClause.employer_id = employerId;

    if (source === 'internal') {
      whereClause.is_external = false;
    } else if (source === 'external') {
      whereClause.is_external = true;
    }

    if (minSalary || maxSalary) {
      const budgetFilter: any = {};
      if (minSalary) budgetFilter.gte = Number(minSalary);
      if (maxSalary) budgetFilter.lte = Number(maxSalary);
      whereClause.budget = budgetFilter;
    }

    if (minExperience || maxExperience) {
      const expFilter: any = {};
      if (minExperience) expFilter.gte = Number(minExperience);
      if (maxExperience) expFilter.lte = Number(maxExperience);
      whereClause.experience_years_required = expFilter;
    }

    // Determine order by
    let orderBy: any = { created_at: 'desc' };
    if (sortBy === 'salary_desc') {
      orderBy = { budget: 'desc' };
    } else if (sortBy === 'salary_asc') {
      orderBy = { budget: 'asc' };
    } else if (sortBy === 'exp_asc') {
      orderBy = { experience_years_required: 'asc' };
    }

    const jobs = await prisma.jobs.findMany({ 
      where: whereClause,
      orderBy
    });

    const jobIds = jobs.map(j => j.id);
    const isValidUuid = (val: any): boolean =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    const employerIds = jobs.map(j => j.employer_id).filter(Boolean);
    const validEmployerIds = employerIds.filter(isValidUuid) as string[];

    const [searchIndices, employerProfiles] = await Promise.all([
      prisma.job_search_index.findMany({ where: { job_id: { in: jobIds } } }),
      validEmployerIds.length > 0
        ? prisma.employer_profiles.findMany({
            where: {
              OR: [
                { id: { in: validEmployerIds } },
                { user_id: { in: validEmployerIds } }
              ]
            }
          })
        : Promise.resolve([])
    ]);

    const indexByJobId = new Map(searchIndices.map(si => [si.job_id, si]));
    const employerById = new Map();
    employerProfiles.forEach(ep => {
      employerById.set(ep.id, ep);
      if (ep.user_id) employerById.set(ep.user_id, ep);
    });

    const formatted = jobs.map(j => {
      const sIndex = indexByJobId.get(j.id);
      const emp = employerById.get(j.employer_id);

      // Determine clean Job Type from title or category if not explicitly set
      const defaultJobType = j.title?.toLowerCase().includes('intern') 
        ? 'Internship' 
        : (j.title?.toLowerCase().includes('contract') || j.industry?.toLowerCase().includes('contract') 
            ? 'Contract' 
            : 'Full Time');

        const effectiveExpiry = j.expires_at 
          ? new Date(j.expires_at) 
          : (j.created_at ? new Date(new Date(j.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
        const isJobExpired = Boolean(
          j.status === 'EXPIRED' ||
          j.status === 'CLOSED' ||
          (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
        );

        return {
          id: j.id,
          title: j.title,
          description: sanitizeHtmlDescription(j.description),
          industry: j.industry || 'General',
          jobType: defaultJobType,
          location: j.location || '',
          city: j.city || '',
          budget: j.budget ? Number(j.budget) : 0,
          experienceYearsRequired: j.experience_years_required != null ? Number(j.experience_years_required) : 0,
          experienceLevel: 'Standard',
          status: isJobExpired ? 'EXPIRED' : (j.status || 'OPEN'),
          expiresAt: (j.expires_at || effectiveExpiry)?.toISOString(),
          isExpired: isJobExpired,
          isExternal: Boolean(j.is_external),
          sourceName: j.source_name || (j.is_external ? 'Verified Partner' : 'TrustHyre Direct'),
          sourceUrl: j.source_url || null,
          alternateSources: Array.isArray(j.alternate_sources) ? j.alternate_sources : [],
          datePosted: j.date_posted || j.created_at,
          createdAt: j.created_at,
          updatedAt: j.updated_at,
          coverImageUrl: j.cover_image_url || null,
          cover_image_url: j.cover_image_url || null,
        requiredSkills: sIndex?.required_skills
          ? sIndex.required_skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        employerProfile: emp ? {
          id: emp.id,
          companyName: emp.company_name || j.employer_name || 'Employer',
          businessTier: emp.business_tier || 'STARTER',
          isVerified: emp.is_verified || false,
          city: emp.city || j.city || '',
          logoUrl: ''
        } : (j.is_external ? {
          id: 'EXTERNAL',
          companyName: j.employer_name || 'Verified Employer',
          businessTier: 'VERIFIED_PARTNER',
          isVerified: true,
          city: j.city || '',
          logoUrl: ''
        } : null)
      };
    });

    return c.json(ApiResponse.ok(formatted));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getPopularEmployers = async (c: Context) => {
  try {
    const { city } = c.req.query();
    
    // Fetch employers with their active jobs count
    const employers = await prisma.employer_profiles.findMany({
      where: city ? { city: { contains: city as string, mode: 'insensitive' } } : {},
      take: 10,
      orderBy: { created_at: 'desc' }
    });

    const userIds = employers.map(e => e.user_id).filter(Boolean);
    const employerProfileIds = employers.map(e => e.id);

    const activeJobs = await prisma.jobs.findMany({
      where: {
        status: 'OPEN',
        OR: [
          { employer_id: { in: userIds } },
          { employer_id: { in: employerProfileIds } }
        ]
      },
      select: { employer_id: true }
    });

    const jobCountMap = new Map<string, number>();
    activeJobs.forEach(j => {
      const current = jobCountMap.get(j.employer_id) || 0;
      jobCountMap.set(j.employer_id, current + 1);
    });

    const popular = employers.map(emp => {
      const count = (jobCountMap.get(emp.id) || 0) + (jobCountMap.get(emp.user_id) || 0);
      return {
        id: emp.id,
        userId: emp.user_id,
        companyName: emp.company_name || 'Verified Employer',
        industry: emp.industry || 'General',
        city: emp.city || '',
        businessTier: emp.business_tier || 'STARTER',
        isVerified: emp.is_verified || false,
        activeJobsCount: count > 0 ? count : 1 // at least 1 for display or real count
      };
    });

    return c.json(ApiResponse.ok(popular));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const searchWorkers = async (c: Context) => {
  try {
    const employerId = c.get('user')?.sub;
    const { query, level, location, city, skills, trade, minExperience, maxExperience, experience } = c.req.query();
    let whereClause: any = {};

    if (query) {
      whereClause.OR = [
        { full_name: { contains: query as string, mode: 'insensitive' } },
        { skills: { contains: query as string, mode: 'insensitive' } },
        { bio: { contains: query as string, mode: 'insensitive' } },
      ];
    }

    if (location) whereClause.location = { contains: location as string, mode: 'insensitive' };
    if (city) whereClause.city = { contains: city as string, mode: 'insensitive' };
    
    const skillOrTrade = (trade || skills) as string;
    if (skillOrTrade && skillOrTrade !== 'All') {
      whereClause.skills = { contains: skillOrTrade, mode: 'insensitive' };
    }

    // Handle experience ranges
    let minExp = minExperience ? Number(minExperience) : undefined;
    let maxExp = maxExperience ? Number(maxExperience) : undefined;

    if (experience && experience !== 'all') {
      if (experience === '0-1') { minExp = 0; maxExp = 1; }
      else if (experience === '1-3') { minExp = 1; maxExp = 3; }
      else if (experience === '3-5') { minExp = 3; maxExp = 5; }
      else if (experience === '5+') { minExp = 5; maxExp = 50; }
    }

    if (minExp !== undefined || maxExp !== undefined) {
      const expFilter: any = {};
      if (minExp !== undefined) expFilter.gte = minExp;
      if (maxExp !== undefined) expFilter.lte = maxExp;
      whereClause.experience_years = expFilter;
    }

    const workers = await prisma.worker_profiles.findMany({ 
      where: whereClause,
      orderBy: { updated_at: 'desc' }
    });

    const userIds = workers.map(w => w.user_id).filter(Boolean);

    const [userMetaList, verifications] = await Promise.all([
      prisma.user_metadata.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          profile_image_url: true,
          phone_number: true,
          email_verified: true
        }
      }),
      prisma.verification_records.findMany({
        where: { user_id: { in: userIds } }
      })
    ]);

    const userMetaById = new Map(userMetaList.map(u => [u.id, u]));
    const verificationByUser = new Map(verifications.map(v => [v.user_id, v]));

    let employerOffersMap = new Map<string, string>();
    let savedWorkerIds = new Set<string>();

    if (employerId) {
      const employerProfile = await prisma.employer_profiles.findFirst({
        where: { user_id: employerId }
      });
      const employerOwnerIds = [employerId, employerProfile?.id].filter(Boolean) as string[];

      const [employerJobs, savedRecords] = await Promise.all([
        prisma.jobs.findMany({
          where: {
            OR: [
              { employer_id: employerId },
              ...(employerProfile ? [{ employer_id: employerProfile.id }] : [])
            ]
          },
          select: { id: true }
        }),
        (prisma as any).saved_workers.findMany({
          where: { employer_id: { in: employerOwnerIds } },
          select: { worker_id: true }
        })
      ]);

      savedRecords.forEach((s: any) => {
        if (s.worker_id) savedWorkerIds.add(s.worker_id);
      });

      const jobIds = employerJobs.map(j => j.id);
      if (jobIds.length > 0) {
        const offers = await prisma.job_applications.findMany({
          where: { 
            job_id: { in: jobIds }
          },
          select: { worker_id: true, status: true }
        });
        offers.forEach(o => {
          if (o.worker_id && o.status) {
            employerOffersMap.set(o.worker_id, o.status);
          }
        });
      }
    }

    const formatted = workers.map(w => {
      const meta = userMetaById.get(w.user_id);
      const vRecord = verificationByUser.get(w.user_id);
      const isVerified = vRecord?.status === 'VERIFIED' || vRecord?.status === 'APPROVED' || Boolean(meta?.email_verified);
      const offerStatus = employerOffersMap.get(w.id) || (w.user_id ? employerOffersMap.get(w.user_id) : null) || null;
      const isSaved = savedWorkerIds.has(w.id) || (w.user_id ? savedWorkerIds.has(w.user_id) : false);
      const resolvedImage = (w as any).profile_image_url || meta?.profile_image_url || (w as any).profilePhoto || '';

      return {
        id: w.id,
        userId: w.user_id,
        name: w.full_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || 'Worker',
        bio: w.bio || '',
        skills: w.skills || '',
        location: w.location || '',
        city: w.city || '',
        level: w.level && !w.level.startsWith('L') ? w.level : 'Verified Specialist',
        levelNumber: w.level_number || 1,
        experienceYears: w.experience_years || 0,
        hourlyRate: w.hourly_rate ? Number(w.hourly_rate) : null,
        isVerified,
        profileImageUrl: resolvedImage,
        profilePhoto: resolvedImage,
        profile_image_url: resolvedImage,
        status: w.is_available ? 'AVAILABLE' : 'OFFLINE',
        trustScore: w.trust_score || 70,
        offerStatus,
        isOfferSent: Boolean(offerStatus),
        isSaved: Boolean(isSaved)
      };
    });

    return c.json(ApiResponse.ok(formatted));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const indexJob = async (c: Context) => {
  try {
    const data = (await c.req.json());
    await prisma.job_search_index.upsert({
      where: { job_id: data.jobId || data.job_id },
      update: { ...data, indexed_at: new Date() },
      create: { ...data, indexed_at: new Date() }
    });
    return c.json(ApiResponse.ok("Job indexed"));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const removeJob = async (c: Context) => {
  try {
    const jobId = c.req.param('jobId') as string;
    await prisma.job_search_index.delete({ where: { job_id: jobId } });
    return c.json(ApiResponse.ok("Job removed from index"));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const indexWorker = async (c: Context) => {
  try {
    const data = (await c.req.json());
    await prisma.worker_search_index.upsert({
      where: { user_id: data.userId || data.user_id },
      update: { ...data, indexed_at: new Date() },
      create: { ...data, indexed_at: new Date() }
    });
    return c.json(ApiResponse.ok("Worker indexed"));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const removeWorker = async (c: Context) => {
  try {
    const userId = c.req.param('userId') as string;
    await prisma.worker_search_index.delete({ where: { user_id: userId } });
    return c.json(ApiResponse.ok("Worker removed from index"));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

