
export const detectJobIndustry = (title?: string, rawIndustry?: string): string => {
  const norm = (rawIndustry || '').trim();
  const text = `${title || ''} ${rawIndustry || ''}`.toLowerCase();

  if (text.includes('counsel') || text.includes('admission') || text.includes('teacher') || text.includes('tutor') || text.includes('faculty') || text.includes('academic') || text.includes('school') || text.includes('college')) {
    return 'Education & Training';
  }
  if (text.includes('nurse') || text.includes('clinic') || text.includes('hospital') || text.includes('pharma') || text.includes('patient') || text.includes('medical') || text.includes('doctor')) {
    return 'Healthcare & Medical';
  }
  if (text.includes('cashier') || text.includes('retail') || text.includes('counter sales') || text.includes('store keeper') || text.includes('sales executive') || text.includes('showroom')) {
    return 'Retail & Counter Sales';
  }
  if (text.includes('receptionist') || text.includes('front desk') || text.includes('telecaller') || text.includes('bpo') || text.includes('data entry') || text.includes('office assistant') || text.includes('clerk')) {
    return 'Office & Support';
  }
  if (text.includes('electr') || text.includes('wireman') || text.includes('power grid')) {
    return 'Electrical & Power';
  }
  if (text.includes('plumb') || text.includes('pipe') || text.includes('drain')) {
    return 'Plumbing & Pipefitting';
  }
  if (text.includes('cook') || text.includes('chef') || text.includes('kitchen') || text.includes('baker') || text.includes('cater') || text.includes('restaurant')) {
    return 'Hospitality & Cooking';
  }
  if (text.includes('construct') || text.includes('mason') || text.includes('carpenter') || text.includes('painter') || text.includes('welder') || text.includes('civil')) {
    return 'Construction & Masonry';
  }
  if (text.includes('technician') || text.includes('repair') || text.includes('maintain') || text.includes('mechanic') || text.includes('ac repair') || text.includes('hvac')) {
    return 'Maintenance & Repair';
  }
  if (text.includes('secur') || text.includes('guard') || text.includes('watchman') || text.includes('patrol')) {
    return 'Security Services';
  }
  if (text.includes('driv') || text.includes('deliver') || text.includes('rider') || text.includes('courier') || text.includes('logist') || text.includes('cargo') || text.includes('warehouse') || text.includes('packer') || text.includes('loader')) {
    return 'Logistics & Delivery';
  }
  if (text.includes('clean') || text.includes('maid') || text.includes('housekeep') || text.includes('sweeper')) {
    return 'Housekeeping & Cleaning';
  }
  if (text.includes('manufactur') || text.includes('factory') || text.includes('machin') || text.includes('assembly') || text.includes('operator')) {
    return 'Manufacturing & Fabrication';
  }

  if (norm && norm !== 'Field Operations & Logistics' && norm !== 'Field Operations & Services' && norm !== 'General') {
    return norm;
  }
  return 'Skilled Services & Operations';
};

export const resolveTradeCoverImage = (title?: string, industry?: string): string => {
  const text = `${title || ''} ${industry || ''}`.toLowerCase();
  if (text.includes('counsel') || text.includes('admission') || text.includes('teacher') || text.includes('academic') || text.includes('school')) {
    return 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';
  }
  if (text.includes('nurse') || text.includes('clinic') || text.includes('medical') || text.includes('pharma') || text.includes('hospital')) {
    return 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80';
  }
  if (text.includes('retail') || text.includes('cashier') || text.includes('sales') || text.includes('store')) {
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80';
  }
  if (text.includes('office') || text.includes('receptionist') || text.includes('telecaller') || text.includes('desk') || text.includes('clerk')) {
    return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80';
  }
  if (text.includes('electr')) return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80';
  if (text.includes('driv') || text.includes('deliver') || text.includes('logist')) return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80';
  if (text.includes('construct') || text.includes('mason') || text.includes('carpenter')) return 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=1200&q=80';
  if (text.includes('cook') || text.includes('chef') || text.includes('kitchen') || text.includes('cater')) return 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80';
  if (text.includes('plumb') || text.includes('technician') || text.includes('ac') || text.includes('repair')) return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80';
  if (text.includes('secur') || text.includes('guard')) return 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80';
  if (text.includes('wareh') || text.includes('pack')) return 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80';
  return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80';
};
import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { NotificationDispatcher } from '../services/notificationDispatcher';
import { GoogleAnalyticsService } from '../services/googleAnalyticsService';


export const getAdminStats = async (c: Context) => {
  try {
    const [
      totalWorkers,
      totalEmployers,
      totalJobs,
      openJobs,
      totalApplications,
      totalHired,
      pendingVerifications,
      totalVerifications,
      recentUsers,
      recentJobs
    ] = await Promise.all([
      prisma.user_metadata.count({ where: { role: 'WORKER' } }),
      prisma.user_metadata.count({ where: { role: 'EMPLOYER' } }),
      prisma.jobs.count(),
      prisma.jobs.count({ where: { status: 'OPEN' } }),
      prisma.job_applications.count(),
      prisma.job_applications.count({ where: { status: { in: ['ACCEPTED', 'APPROVED', 'COMPLETED'] } } }),
      prisma.verification_records.count({ where: { status: 'PENDING' } }),
      prisma.verification_records.count(),
      prisma.user_metadata.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: { id: true, email: true, first_name: true, last_name: true, role: true, created_at: true, email_verified: true }
      }),
      prisma.jobs.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: { id: true, title: true, employer_name: true, budget: true, status: true, created_at: true }
      })
    ]);

    return c.json(ApiResponse.ok({
      totalWorkers,
      totalEmployers,
      totalUsers: totalWorkers + totalEmployers,
      totalJobs,
      openJobs,
      totalApplications,
      totalHired,
      pendingVerifications,
      totalVerifications,
      recentUsers,
      recentJobs,
      escrowVolume: totalHired * 4500
    }));
  } catch (err: any) {
    console.error("getAdminStats error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getVerifications = async (c: Context) => {
  try {
    const statusQuery = c.req.query('status');
    const whereClause: any = {};
    if (statusQuery && statusQuery !== 'ALL') {
      whereClause.status = statusQuery.toUpperCase();
    }

    const records = await prisma.verification_records.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' }
    });

    const userIds = Array.from(new Set(records.map(r => r.user_id).filter(Boolean)));
    const [userMetaList, workerProfiles] = await Promise.all([
      prisma.user_metadata.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, first_name: true, last_name: true, phone_number: true, profile_image_url: true, role: true }
      }),
      prisma.worker_profiles.findMany({
        where: { user_id: { in: userIds } }
      })
    ]);

    const userMetaMap = new Map(userMetaList.map(u => [u.id, u]));
    const workerProfileMap = new Map(workerProfiles.map(w => [w.user_id, w]));

    const formatted = records.map(r => {
      const meta = userMetaMap.get(r.user_id);
      const worker = workerProfileMap.get(r.user_id);
      const fullName = worker?.full_name || [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || 'Candidate';
      
      return {
        id: r.id,
        userId: r.user_id,
        userName: fullName,
        userEmail: meta?.email,
        userPhone: meta?.phone_number,
        userPhoto: meta?.profile_image_url,
        role: meta?.role || 'WORKER',
        verificationType: r.verification_type || 'GOVERNMENT_ID',
        docImageUrl: r.doc_image_url,
        liveImageUrl: r.live_image_url,
        confidenceScore: r.confidence_score || '98%',
        status: r.status,
        failureReason: r.failure_reason,
        createdAt: r.created_at,
        verifiedAt: r.verified_at
      };
    });

    return c.json(ApiResponse.ok(formatted));
  } catch (err: any) {
    console.error("getVerifications error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateVerificationStatus = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const { status, failureReason } = (await c.req.json());

    if (!id || !status) {
      return c.json(ApiResponse.error("Verification ID and status are required"), 400 as any);
    }

    const normalizedStatus = status.toUpperCase();
    if (!['VERIFIED', 'APPROVED', 'REJECTED', 'PENDING'].includes(normalizedStatus)) {
      return c.json(ApiResponse.error("Invalid status value"), 400 as any);
    }

    const record = await prisma.verification_records.findUnique({ where: { id } });
    if (!record) {
      return c.json(ApiResponse.error("Verification record not found"), 404 as any);
    }

    const isApproved = normalizedStatus === 'VERIFIED' || normalizedStatus === 'APPROVED';

    const updatedRecord = await prisma.verification_records.update({
      where: { id },
      data: {
        status: isApproved ? 'VERIFIED' : 'REJECTED',
        failure_reason: isApproved ? null : failureReason || 'Document could not be verified.',
        verified_at: new Date(),
        updated_at: new Date()
      }
    });

    // Update associated user verification status
    if (record.user_id) {
      if (isApproved) {
        await prisma.user_metadata.update({
          where: { id: record.user_id },
          data: { email_verified: true, updated_at: new Date() }
        }).catch(() => {});

        await prisma.worker_profiles.updateMany({
          where: { user_id: record.user_id },
          data: { trust_score: 95, updated_at: new Date() }
        }).catch(() => {});
      }

      // Dispatch Synchronized In-App & Push Notification
      await NotificationDispatcher.dispatch({
        userId: record.user_id,
        title: isApproved ? "Identity Verification Approved! ✅" : "Identity Verification Update ⚠️",
        message: isApproved 
          ? "Your identity document has been verified. Your verified trust badge is now live on your profile."
          : `Your verification submission was not approved: ${failureReason || 'Please resubmit a clear photo of your ID.'}`,
        type: isApproved ? "KYC_VERIFIED" : "KYC_REJECTED",
        link: "/profile",
        data: { verificationId: String(record.id), status: String(record.status) }
      }).catch(() => {});
    }

    return c.json(ApiResponse.ok("Verification status updated successfully", updatedRecord));
  } catch (err: any) {
    console.error("updateVerificationStatus error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getAllUsers = async (c: Context) => {
  try {
    const role = c.req.query('role');
    const query = c.req.query('q')?.toLowerCase();

    const where: any = {};
    if (role && role !== 'ALL') {
      where.role = role.toUpperCase();
    }

    const users = await prisma.user_metadata.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        phone_number: true,
        first_name: true,
        last_name: true,
        profile_image_url: true,
        role: true,
        email_verified: true,
        onboarded: true,
        created_at: true
      }
    });

    let filtered = users;
    if (query) {
      filtered = users.filter(u => 
        u.email?.toLowerCase().includes(query) ||
        u.first_name?.toLowerCase().includes(query) ||
        u.last_name?.toLowerCase().includes(query) ||
        u.phone_number?.includes(query)
      );
    }

    return c.json(ApiResponse.ok(filtered));
  } catch (err: any) {
    console.error("getAllUsers error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getAllJobs = async (c: Context) => {
  try {
    const status = c.req.query('status');
    const query = c.req.query('q')?.toLowerCase();

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    const jobs = await prisma.jobs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
      include: {
        _count: {
          select: { job_applications: true }
        }
      }
    });

    let filtered = jobs;
    if (query) {
      filtered = jobs.filter(j => 
        j.title?.toLowerCase().includes(query) ||
        j.employer_name?.toLowerCase().includes(query) ||
        j.city?.toLowerCase().includes(query) ||
        j.location?.toLowerCase().includes(query)
      );
    }

    const formatted = filtered.map(j => ({
      ...j,
      applicantCount: j._count.job_applications
    }));

    return c.json(ApiResponse.ok(formatted));
  } catch (err: any) {
    console.error("getAllJobs error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const deleteJobByAdmin = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    await prisma.jobs.delete({ where: { id } });
    return c.json(ApiResponse.ok("Job deleted by administrator"));
  } catch (err: any) {
    console.error("deleteJobByAdmin error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};


/**
 * Delete a user profile and clean up associated records
 * Protected: Requires ADMIN or SUPER_ADMIN
 */
export const deleteUserByAdmin = async (c: Context) => {
  try {
    const caller = c.get('user');
    const id = c.req.param('id') as string;

    if (!id) {
      return c.json(ApiResponse.error("User ID is required"), 400 as any);
    }

    // Prevent admin from deleting their own active session
    if (caller?.id === id || caller?.sub === id) {
      return c.json(ApiResponse.error("You cannot delete your own active administrator account"), 400 as any);
    }

    const user = await prisma.user_metadata.findUnique({ where: { id } });
    if (!user) {
      return c.json(ApiResponse.error("User account not found"), 404 as any);
    }

    // Only SUPER_ADMIN can delete other ADMIN or SUPER_ADMIN accounts
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      if (caller?.role !== 'SUPER_ADMIN') {
        return c.json(ApiResponse.error("Only Super Administrators can delete administrator accounts"), 403 as any);
      }
    }

    // Clean up all related child records safely in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete notifications & tokens
      await tx.notifications.deleteMany({ where: { user_id: id } }).catch(() => {});
      await tx.user_fcm_tokens.deleteMany({ where: { user_id: id } }).catch(() => {});
      await tx.user_search_alerts.deleteMany({ where: { user_id: id } }).catch(() => {});
      await tx.user_settings.deleteMany({ where: { user_id: id } }).catch(() => {});
      await tx.user_activities.deleteMany({ where: { user_id: id } }).catch(() => {});
      await tx.verification_records.deleteMany({ where: { user_id: id } }).catch(() => {});

      // 2. Delete worker search index and applications (indexed by user_id)
      await tx.worker_search_index.deleteMany({ where: { user_id: id } }).catch(() => {});
      const worker = await tx.worker_profiles.findFirst({ where: { user_id: id } });
      const workerIdsToDelete = [id, worker?.id].filter(Boolean) as string[];
      await tx.job_applications.deleteMany({ where: { worker_id: { in: workerIdsToDelete } } }).catch(() => {});
      await (tx as any).saved_jobs?.deleteMany({ where: { user_id: id } }).catch(() => {});
      if (worker) {
        await tx.worker_profiles.deleteMany({ where: { user_id: id } }).catch(() => {});
      }

      // 3. If employer profile exists, delete employer jobs or detach
      const employer = await tx.employer_profiles.findFirst({ where: { user_id: id } });
      if (employer) {
        const empJobs = await tx.jobs.findMany({
          where: {
            OR: [
              { employer_id: id },
              { employer_id: employer.id }
            ]
          },
          select: { id: true }
        });
        const jobIds = empJobs.map(j => j.id);
        if (jobIds.length > 0) {
          await tx.job_applications.deleteMany({ where: { job_id: { in: jobIds } } }).catch(() => {});
          await tx.job_search_index.deleteMany({ where: { job_id: { in: jobIds } } }).catch(() => {});
          await tx.jobs.deleteMany({ where: { id: { in: jobIds } } }).catch(() => {});
        }
        await tx.employer_profiles.deleteMany({ where: { user_id: id } }).catch(() => {});
      }

      // 4. Finally delete user metadata
      await tx.user_metadata.delete({ where: { id } });
    });

    return c.json(ApiResponse.ok("User account and related data deleted successfully"));
  } catch (err: any) {
    console.error("deleteUserByAdmin error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const createAdminUser = async (c: Context) => {
  try {
    const caller = c.get('user');
    if (caller?.role !== 'SUPER_ADMIN') {
      return c.json(ApiResponse.error("Forbidden: Only Super Administrators can directly create administrators"), 403 as any);
    }
    const bcrypt = await import('bcryptjs');
    const { email, password, firstName, lastName } = (await c.req.json());

    if (!email || !password) {
      return c.json(ApiResponse.error("Email and password are required"), 400 as any);
    }

    const existing = await prisma.user_metadata.findUnique({ where: { email } });
    if (existing) {
      return c.json(ApiResponse.error("An account with this email already exists"), 400 as any);
    }

    const passwordHash = await bcrypt.default.hash(password, 10);

    const newAdmin = await prisma.user_metadata.create({
      data: {
        id: uuidv4(),
        email,
        password_hash: passwordHash,
        first_name: firstName || 'Admin',
        last_name: lastName || '',
        role: 'ADMIN',
        email_verified: true,
        onboarded: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return c.json(ApiResponse.ok("Administrator account created successfully", {
      id: newAdmin.id,
      email: newAdmin.email,
      firstName: newAdmin.first_name,
      lastName: newAdmin.last_name,
      role: newAdmin.role
    }));
  } catch (err: any) {
    console.error("createAdminUser error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const syncExternalJobs = async (c: Context) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { ScraperServiceClient } = await import('../services/scraperServiceClient');
    const { LeadService } = await import('../services/leadService');

    const result = await ScraperServiceClient.runDiscovery({
      query: body.query,
      city: body.city,
      category: body.category,
      sources: Array.isArray(body.sources) ? body.sources : undefined,
      limit: Number(body.limit) || 25,
    });

    // Upsert into prisma.jobs so admin panel displays jobs immediately in Pending Review in parallel
    if (Array.isArray(result.items) && result.items.length > 0) {
      await Promise.allSettled(
        result.items.map((item) =>
          prisma.jobs.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              employer_id: item.employer_id || 'external_aggregator',
              title: item.title,
              employer_name: item.employer_name || 'Verified Employer',
              description: item.description || '',
              industry: detectJobIndustry(item.title, item.industry),
              experience_years_required: item.experience_years_required || 0,
              budget: item.budget ? Number(item.budget) : null,
              status: 'PENDING_REVIEW',
              city: item.city || body.city || 'Chennai',
              location: item.location || item.city || body.city || 'Chennai',
              is_external: true,
              source_name: item.source_name || 'Web Discovery',
              source_url: item.source_url || '',
              cover_image_url: item.cover_image_url || resolveTradeCoverImage(item.title, item.industry),
              source_hash: item.source_hash || item.id,
              external_id: item.external_id || item.id,
              created_at: item.created_at ? new Date(item.created_at) : new Date(),
              updated_at: new Date(),
            },
            update: {
              last_verified_at: new Date(),
            },
          })
        )
      );
      await LeadService.syncLeadsFromScrapedJobs().catch(() => {});
    }

    return c.json(ApiResponse.ok("External jobs synchronized successfully via Python Scraper Service", result));
  } catch (err: any) {
    console.error("syncExternalJobs error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const runJobFreshnessCycle = async (c: Context) => {
  try {
    const { JobFreshnessWorker } = await import('../services/jobFreshnessWorker');
    const result = await JobFreshnessWorker.runCycle();
    return c.json(ApiResponse.ok("Job freshness cycle completed", result));
  } catch (err: any) {
    console.error("runJobFreshnessCycle error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getScanStatus = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const { ScraperServiceClient } = await import('../services/scraperServiceClient');
    const { LeadService } = await import('../services/leadService');
    const status = await ScraperServiceClient.getScanStatus(id);

    // If scan is completed and contains items, ensure they are stored in PostgreSQL
    const items = (status as any).items;
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        try {
          await prisma.jobs.upsert({
            where: { id: item.id },
            create: {
              id: item.id,
              employer_id: item.employer_id || 'external_aggregator',
              title: item.title,
              employer_name: item.employer_name || 'Verified Employer',
              description: item.description || '',
              industry: detectJobIndustry(item.title, item.industry),
              experience_years_required: item.experience_years_required || 0,
              budget: item.budget ? Number(item.budget) : null,
              status: 'PENDING_REVIEW',
              city: item.city || 'Chennai',
              location: item.location || item.city || 'Chennai',
              is_external: true,
              source_name: item.source_name || 'Web Discovery',
              source_url: item.source_url || '',
              cover_image_url: item.cover_image_url || resolveTradeCoverImage(item.title, item.industry),
              source_hash: item.source_hash || item.id,
              external_id: item.external_id || item.id,
              created_at: item.created_at ? new Date(item.created_at) : new Date(),
              updated_at: new Date(),
            },
            update: {
              last_verified_at: new Date(),
            }
          });
        } catch (_) {}
      }
      await LeadService.syncLeadsFromScrapedJobs().catch(() => {});
    }

    return c.json(ApiResponse.ok(status));
  } catch (err: any) {
    console.error("getScanStatus error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getScraperSources = async (c: Context) => {
  try {
    const { ScraperServiceClient } = await import('../services/scraperServiceClient');
    const rawSources = await ScraperServiceClient.getSources();
    const sources = rawSources.map((s) => {
      const isLive = !s.is_restricted && (s.status === 'ACTIVE' || s.status === 'SUPPORTED' || (s as any).active === true);
      return {
        ...s,
        status: isLive ? 'ACTIVE' : s.status,
        active: isLive,
      };
    });
    return c.json(ApiResponse.ok(sources));
  } catch (err: any) {
    console.error("getScraperSources error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const moderateJobByAdmin = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const body = await c.req.json().catch(() => ({}));
    const { 
      action, 
      reason, 
      title, 
      description, 
      coverImageUrl, 
      cover_image_url, 
      budget, 
      city, 
      location, 
      address,
      industry,
      experienceYearsRequired,
      experience_years_required,
      jobType,
      job_type,
      perks,
      allowDirectCall,
      allow_direct_call,
      allowDirectWhatsapp,
      allow_direct_whatsapp,
      contactPhone,
      contact_phone,
      isUrgentSpotHire,
      is_urgent_spot_hire,
      isWalkInInterview,
      is_walk_in_interview,
      walkInDetails,
      walk_in_details,
      additionalDetails, 
      additional_details 
    } = body;
    if (!['approve', 'reject', 'expire', 'update'].includes(action)) {
      return c.json(ApiResponse.error("Invalid action. Must be 'approve', 'reject', 'expire', or 'update'."), 400 as any);
    }
    const newStatus = action === 'approve' ? 'OPEN' : (action === 'reject' ? 'REJECTED' : (action === 'expire' ? 'EXPIRED' : undefined));
    const updateData: any = {
      updated_at: new Date()
    };
    if (newStatus) updateData.status = newStatus;
    const cover = coverImageUrl || cover_image_url;
    if (cover !== undefined) updateData.cover_image_url = cover || null;
    if (description !== undefined) {
      const { sanitizeHtmlDescription } = await import('../utils/textSanitizer');
      updateData.description = sanitizeHtmlDescription(description);
    }
    if (title !== undefined) updateData.title = String(title).trim();
    if (budget !== undefined) updateData.budget = budget ? Number(budget) : null;
    if (city !== undefined) updateData.city = String(city).trim();
    if (location !== undefined) updateData.location = String(location).trim();
    if (address !== undefined) updateData.address = String(address).trim();
    if (industry !== undefined) updateData.industry = String(industry).trim();
    
    const exp = experienceYearsRequired !== undefined ? experienceYearsRequired : experience_years_required;
    if (exp !== undefined) updateData.experience_years_required = Number(exp) || 0;

    const jType = jobType || job_type;
    if (jType !== undefined) updateData.job_type = String(jType);

    const callAllowed = allowDirectCall !== undefined ? allowDirectCall : allow_direct_call;
    if (callAllowed !== undefined) updateData.allow_direct_call = Boolean(callAllowed);

    const waAllowed = allowDirectWhatsapp !== undefined ? allowDirectWhatsapp : allow_direct_whatsapp;
    if (waAllowed !== undefined) updateData.allow_direct_whatsapp = Boolean(waAllowed);

    const phone = contactPhone !== undefined ? contactPhone : contact_phone;
    if (phone !== undefined) updateData.contact_phone = phone ? String(phone).trim() : null;

    const spot = isUrgentSpotHire !== undefined ? isUrgentSpotHire : is_urgent_spot_hire;
    if (spot !== undefined) updateData.is_urgent_spot_hire = Boolean(spot);

    const walkIn = isWalkInInterview !== undefined ? isWalkInInterview : is_walk_in_interview;
    if (walkIn !== undefined) updateData.is_walk_in_interview = Boolean(walkIn);

    if (perks !== undefined && Array.isArray(perks)) {
      updateData.perks = perks;
    }

    const details = additionalDetails || additional_details || walkInDetails || walk_in_details;
    if (details !== undefined) {
      updateData.alternate_sources = { 
        additional_details: details,
        walk_in_details: walkInDetails || walk_in_details || undefined
      };
    }

    const updated = await prisma.jobs.update({
      where: { id },
      data: updateData
    });

    if (newStatus === 'OPEN') {
      try {
        await prisma.job_search_index.upsert({
          where: { job_id: updated.id },
          update: {
            title: updated.title,
            description: updated.description,
            category: updated.industry,
            location: updated.location,
            city: updated.city,
            address: updated.address,
            latitude: updated.latitude,
            longitude: updated.longitude,
            budget: updated.budget ? Number(updated.budget) : null,
            status: updated.status,
            employer_name: updated.employer_name,
            indexed_at: new Date(),
            last_updated_at: new Date()
          },
          create: {
            job_id: updated.id,
            title: updated.title,
            description: updated.description,
            category: updated.industry,
            location: updated.location,
            city: updated.city,
            address: updated.address,
            latitude: updated.latitude,
            longitude: updated.longitude,
            budget: updated.budget ? Number(updated.budget) : null,
            status: updated.status,
            employer_name: updated.employer_name,
            indexed_at: new Date(),
            last_updated_at: new Date()
          }
        });
      } catch (idxErr: any) {
        console.warn("Index upsert notice on approval:", idxErr.message);
      }
    } else {
      try {
        await prisma.job_search_index.deleteMany({ where: { job_id: id } });
      } catch (_) {}
    }

    try {
      const { ScraperServiceClient } = await import('../services/scraperServiceClient');
      await ScraperServiceClient.moderateJob(id, action, reason || 'Admin moderation');
    } catch (_) {}

    return c.json(ApiResponse.ok(`Job ${action}d successfully`, updated));
  } catch (err: any) {
    console.error("moderateJobByAdmin error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * Super Admin: Get real-time visitor count, audience trends, and GA4 telemetry
 */
export const getVisitorAnalytics = async (c: Context) => {
  try {
    const refresh = c.req.query('refresh') === 'true';
    const dateRange = c.req.query('dateRange') || '30d';
    const channel = c.req.query('channel') || undefined;
    const device = c.req.query('device') || undefined;

    if (refresh) {
      GoogleAnalyticsService.clearCache();
    }
    const data = await GoogleAnalyticsService.getOverview(dateRange, channel, device);
    return c.json(ApiResponse.ok("Visitor analytics retrieved successfully", data));
  } catch (err: any) {
    console.error("getVisitorAnalytics error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};




/**
 * Create a secure Admin invitation
 * Allowed: SUPER_ADMIN or ADMIN with proper credentials
 * Sends Brevo email and returns shareable link for WhatsApp/Slack
 */
export const createAdminInvitation = async (c: Context) => {
  try {
    const caller = c.get('user');
    if (caller?.role !== 'SUPER_ADMIN') {
      return c.json(ApiResponse.error("Forbidden: Only Super Administrators can issue admin invitations"), 403 as any);
    }
    const { email, firstName, lastName, sendEmailNotification = true } = (await c.req.json());

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return c.json(ApiResponse.error("A valid email address is required"), 400 as any);
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user_metadata.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      if (existingUser.role === 'ADMIN' || existingUser.role === 'SUPER_ADMIN') {
        return c.json(ApiResponse.error("This user is already an administrator"), 400 as any);
      }
      return c.json(ApiResponse.error("A user with this email already exists in the registry"), 400 as any);
    }

    // Generate secure cryptographic invitation token (32 hex characters)
    const crypto = await import('crypto');
    const token = crypto.randomBytes(24).toString('hex');
    const invitationId = uuidv4();
    const expiresInHours = 48;
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Save invitation to admin_invitations table safely via raw SQL (handles if table was just created)
    await prisma.$executeRaw`
      INSERT INTO admin_invitations (
        id, email, first_name, last_name, role, token, invited_by, status, expires_at, created_at, updated_at
      ) VALUES (
        ${invitationId}::uuid, ${cleanEmail}, ${firstName || null}, ${lastName || null}, 'ADMIN',
        ${token}, ${caller?.email || 'Super Admin'}, 'PENDING', ${expiresAt}, NOW(), NOW()
      )
      ON CONFLICT (token) DO UPDATE SET
        email = ${cleanEmail},
        expires_at = ${expiresAt},
        status = 'PENDING',
        updated_at = NOW();
    `;

    // Dynamically detect client origin from request headers (Origin / Referer) or fall back to FRONTEND_URL
    const reqOrigin = c.req.header('origin') || c.req.header('referer');
    let clientBaseUrl = process.env.FRONTEND_URL;
    if (reqOrigin) {
      try {
        const parsed = new URL(reqOrigin);
        clientBaseUrl = `${parsed.protocol}//${parsed.host}`;
      } catch {}
    }
    const frontendUrl = (clientBaseUrl || 'https://trusthyre.com').replace(/\/$/, '');
    const inviteLink = `${frontendUrl}/admin/accept-invite?token=${token}`;

    let emailDelivered = false;
    if (sendEmailNotification) {
      try {
        const { renderAdminInvitationEmail } = await import('../services/emailTemplateService');
        const { sendEmail } = await import('../services/mailer');

        const emailContent = renderAdminInvitationEmail({
          recipientName: firstName || 'Administrator',
          email: cleanEmail,
          inviteLink: inviteLink,
          invitedBy: caller?.first_name ? `${caller.first_name} ${caller.last_name || ''}`.trim() : 'Platform Administrator',
          expiresInHours
        });

        await sendEmail(cleanEmail, emailContent.subject, emailContent.html, {
          category: 'auth',
          text: emailContent.text
        });
        emailDelivered = true;
      } catch (mailErr: any) {
        console.warn('[AdminInvitation] Notice: Email dispatch error (share link remains active):', mailErr.message);
      }
    }

    return c.json(ApiResponse.ok("Administrator invitation created successfully", {
      invitationId,
      email: cleanEmail,
      firstName: firstName || null,
      lastName: lastName || null,
      token,
      inviteLink,
      expiresAt: expiresAt.toISOString(),
      expiresInHours,
      emailDelivered
    }));
  } catch (err: any) {
    console.error("createAdminInvitation error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * Public validation endpoint for an invitation token
 * Validates token expiration and returns invited email for confirmation UI
 */
export const getAdminInvitationByToken = async (c: Context) => {
  try {
    const token = c.req.query('token') || c.req.param('token');
    if (!token) {
      return c.json(ApiResponse.error("Invitation token is required"), 400 as any);
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT id, email, first_name, last_name, role, status, expires_at
      FROM admin_invitations
      WHERE token = ${token}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return c.json(ApiResponse.error("Invalid or expired invitation link"), 404 as any);
    }

    const invitation = rows[0];

    if (invitation.status === 'ACCEPTED') {
      return c.json(ApiResponse.error("This invitation has already been accepted"), 400 as any);
    }

    if (invitation.status === 'REVOKED' || new Date(invitation.expires_at).getTime() <= Date.now()) {
      return c.json(ApiResponse.error("This invitation link has expired or been revoked"), 410 as any);
    }

    return c.json(ApiResponse.ok({
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      role: invitation.role,
      expiresAt: invitation.expires_at
    }));
  } catch (err: any) {
    console.error("getAdminInvitationByToken error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * Public endpoint to accept an invitation and configure private administrator password
 */
export const acceptAdminInvitation = async (c: Context) => {
  try {
    const bcrypt = await import('bcryptjs');
    const { token, password, firstName, lastName } = (await c.req.json());

    if (!token || !password) {
      return c.json(ApiResponse.error("Token and new password are required"), 400 as any);
    }

    if (password.length < 8) {
      return c.json(ApiResponse.error("Password must be at least 8 characters"), 400 as any);
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT id, email, first_name, last_name, role, status, expires_at
      FROM admin_invitations
      WHERE token = ${token}
      LIMIT 1;
    `;

    if (!rows || rows.length === 0) {
      return c.json(ApiResponse.error("Invalid invitation token"), 404 as any);
    }

    const invitation = rows[0];

    if (invitation.status === 'ACCEPTED') {
      return c.json(ApiResponse.error("This invitation has already been activated"), 400 as any);
    }

    if (new Date(invitation.expires_at).getTime() <= Date.now() || invitation.status === 'REVOKED') {
      return c.json(ApiResponse.error("This invitation has expired"), 410 as any);
    }

    const cleanEmail = invitation.email.toLowerCase();

    // Check if user already exists
    const existing = await prisma.user_metadata.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return c.json(ApiResponse.error("An account with this email already exists"), 400 as any);
    }

    const passwordHash = await bcrypt.default.hash(password, 10);
    const userId = uuidv4();

    // Create the new administrator account
    const newAdmin = await prisma.user_metadata.create({
      data: {
        id: userId,
        email: cleanEmail,
        password_hash: passwordHash,
        first_name: firstName || invitation.first_name || 'Admin',
        last_name: lastName || invitation.last_name || '',
        role: invitation.role || 'ADMIN',
        email_verified: true,
        onboarded: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Mark invitation as ACCEPTED
    await prisma.$executeRaw`
      UPDATE admin_invitations
      SET status = 'ACCEPTED', accepted_at = NOW(), updated_at = NOW()
      WHERE id = ${invitation.id}::uuid;
    `;

    // Issue JWT token so new admin is immediately authenticated
    const jwt = await import('jsonwebtoken');
    const secret = (c.env?.JWT_SECRET as string) || (process.env.JWT_SECRET as string) || 'trusthyre_jwt_secret_default';
    const authToken = jwt.default.sign(
      {
        sub: newAdmin.id,
        id: newAdmin.id,
        email: newAdmin.email,
        role: newAdmin.role
      },
      secret,
      { expiresIn: '7d' }
    );

    return c.json(ApiResponse.ok("Administrator account successfully activated", {
      token: authToken,
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        firstName: newAdmin.first_name,
        lastName: newAdmin.last_name,
        role: newAdmin.role
      }
    }));
  } catch (err: any) {
    console.error("acceptAdminInvitation error:", err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
