import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { SearchAlertService } from '../services/searchAlertService';

const maskPhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length <= 4) return '******';
  const prefix = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : '';
  const last4 = digits.slice(-4);
  return `${prefix}******${last4}`;
};

const maskEmail = (email: string | null | undefined): string | null => {
  if (!email) return null;
  const parts = String(email).split('@');
  if (parts.length !== 2) return '***@***';
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

const formatWorkerProfile = (profile: any, userMeta?: any, isVerified?: boolean, maskContact: boolean = false) => {
  if (!profile) return profile;
  let phoneNumber = userMeta?.phone_number || profile.phone_number || profile.phoneNumber || null;
  let email = userMeta?.email || profile.email || null;
  if (maskContact) {
    phoneNumber = maskPhoneNumber(phoneNumber);
    email = maskEmail(email);
  }
  const profileImageUrl = profile.profile_image_url || userMeta?.profile_image_url || profile.profileImageUrl || userMeta?.photoURL || null;
  const fullName = profile.full_name || `${userMeta?.first_name || ''} ${userMeta?.last_name || ''}`.trim() || 'Worker';

  // Safely parse JSON array fields
  const parseList = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback comma-separated
    }
    return String(val).split(',').map(s => s.trim()).filter(Boolean);
  };

  return {
    ...profile,
    full_name: fullName,
    fullName: fullName,
    profile_views: profile.profile_views != null ? Number(profile.profile_views) : 0,
    hourly_rate: profile.hourly_rate != null ? Number(profile.hourly_rate) : null,
    phone_number: phoneNumber,
    phoneNumber: phoneNumber,
    email: email,
    profile_image_url: profileImageUrl,
    profileImageUrl: profileImageUrl,
    profilePhoto: profileImageUrl,
    skills: parseList(profile.skills),
    experienceYears: profile.experience_years != null ? Number(profile.experience_years) : (profile.experienceYears != null ? Number(profile.experienceYears) : 0),
    experience_years: profile.experience_years != null ? Number(profile.experience_years) : (profile.experienceYears != null ? Number(profile.experienceYears) : 0),
    bio: profile.bio || '',
    is_verified: isVerified ?? (Boolean(userMeta?.email_verified) || Boolean(profile.is_verified)),
    isVerified: isVerified ?? (Boolean(userMeta?.email_verified) || Boolean(profile.is_verified)),
    
    // Onboarding & Resume Builder fields
    dob: profile.dob || null,
    gender: profile.gender || null,
    whatsapp_opt_in: profile.whatsapp_opt_in ?? true,
    whatsapp_number: profile.whatsapp_number || null,
    whatsappNumber: profile.whatsapp_number || null,
    is_differently_abled: Boolean(profile.is_differently_abled),
    isDifferentlyAbled: Boolean(profile.is_differently_abled),
    disability_type: profile.disability_type || null,
    disabilityType: profile.disability_type || null,
    disability_area: profile.disability_area || null,
    disabilityArea: profile.disability_area || null,
    disability_reason: profile.disability_reason || null,
    disabilityReason: profile.disability_reason || null,
    state: profile.state || null,
    district: profile.district || null,
    taluk: profile.taluk || null,
    town_panchayat: profile.town_panchayat || null,
    townPanchayat: profile.town_panchayat || null,
    pincode: profile.pincode || null,
    work_experience_type: profile.work_experience_type || 'FRESHER',
    workExperienceType: profile.work_experience_type || 'FRESHER',
    area: profile.area || null,
    willing_to_relocate: Boolean(profile.willing_to_relocate),
    preferred_cities: parseList(profile.preferred_cities),
    highest_education: profile.highest_education || null,
    is_pursuing_education: Boolean(profile.is_pursuing_education),
    college_name: profile.college_name || null,
    degree: profile.degree || null,
    specialization: profile.specialization || null,
    school_medium: profile.school_medium || null,
    english_proficiency: profile.english_proficiency || 'BASIC',
    languages_known: parseList(profile.languages_known),
    preferred_roles: parseList(profile.preferred_roles),
    resume_url: profile.resume_url || null,
  };
};

export const getMyProfile = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const userMeta = await prisma.user_metadata.findUnique({ where: { id: userId } });
    const roleUpper = (userMeta?.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN') {
      return c.json(ApiResponse.error("Admin accounts do not have worker profiles"), 403 as any);
    }

    let profile = await prisma.worker_profiles.findUnique({ where: { user_id: userId } });

    if (!profile) {
      profile = await prisma.worker_profiles.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          full_name: `${userMeta?.first_name || ''} ${userMeta?.last_name || ''}`.trim() || 'Worker',
          profile_image_url: userMeta?.profile_image_url || null,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }
    return c.json(ApiResponse.ok(formatWorkerProfile(profile, userMeta)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateProfile = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    const userRole = (authUser?.role || '').toUpperCase();
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      return c.json(ApiResponse.error("Admin accounts cannot modify or create worker profiles"), 403 as any);
    }
    const isAdmin = false;

    const data = (await c.req.json());

    // Normalize Array / string fields for persistence
    const languagesStr = Array.isArray(data.languagesKnown) 
      ? JSON.stringify(data.languagesKnown) 
      : (data.languagesKnown ? String(data.languagesKnown) : undefined);

    const preferredRolesStr = Array.isArray(data.preferredRoles) 
      ? JSON.stringify(data.preferredRoles) 
      : (data.preferredRoles ? String(data.preferredRoles) : undefined);

    const preferredCitiesStr = Array.isArray(data.preferredCities) 
      ? JSON.stringify(data.preferredCities) 
      : (data.preferredCities ? String(data.preferredCities) : undefined);

    const skillsStr = Array.isArray(data.skills)
      ? data.skills.join(', ')
      : (data.skills ? String(data.skills) : undefined);

    let parsedDob: Date | undefined = undefined;
    if (data.dob) {
      const d = new Date(data.dob);
      if (!isNaN(d.getTime())) {
        parsedDob = d;
      }
    }

    const profileImageUrl = data.profileImageUrl || data.profile_image_url || data.profilePhoto || undefined;

    // Security Gate: Strip privileged fields (level, trust_score, is_verified) from worker self-update
    const updatePayload: any = {
      full_name: data.fullName,
      profile_image_url: profileImageUrl,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      area: data.area,
      address: data.address,
      bio: data.bio !== undefined ? String(data.bio) : undefined,
      skills: skillsStr,
      experience_years: data.experienceYears !== undefined 
        ? Number(data.experienceYears) 
        : (data.experience_years !== undefined ? Number(data.experience_years) : undefined),
      hourly_rate: data.hourlyRate !== undefined ? Number(data.hourlyRate) : undefined,
      level: isAdmin ? data.level : undefined,
      is_available: data.isAvailable !== undefined ? Boolean(data.isAvailable) : undefined,
      
      // Demographics & Education
      dob: parsedDob,
      gender: data.gender,
      whatsapp_opt_in: data.whatsappOptIn !== undefined ? Boolean(data.whatsappOptIn) : undefined,
      whatsapp_number: data.whatsappNumber !== undefined ? data.whatsappNumber : data.whatsapp_number,
      is_differently_abled: data.isDifferentlyAbled !== undefined ? Boolean(data.isDifferentlyAbled) : (data.is_differently_abled !== undefined ? Boolean(data.is_differently_abled) : undefined),
      disability_type: data.disabilityType !== undefined ? data.disabilityType : data.disability_type,
      disability_area: data.disabilityArea !== undefined ? data.disabilityArea : data.disability_area,
      disability_reason: data.disabilityReason !== undefined ? data.disabilityReason : data.disability_reason,
      state: data.state,
      district: data.district,
      taluk: data.taluk,
      town_panchayat: data.townPanchayat !== undefined ? data.townPanchayat : data.town_panchayat,
      pincode: data.pincode,
      work_experience_type: data.workExperienceType !== undefined ? data.workExperienceType : data.work_experience_type,
      willing_to_relocate: data.willingToRelocate !== undefined ? Boolean(data.willingToRelocate) : undefined,
      preferred_cities: preferredCitiesStr,
      highest_education: data.highestEducation,
      is_pursuing_education: data.isPursuingEducation !== undefined ? Boolean(data.isPursuingEducation) : undefined,
      college_name: data.collegeName,
      degree: data.degree,
      specialization: data.specialization,
      school_medium: data.schoolMedium,
      english_proficiency: data.englishProficiency,
      languages_known: languagesStr,
      preferred_roles: preferredRolesStr,
      resume_url: data.resumeUrl,
      updated_at: new Date()
    };

    const profile = await prisma.worker_profiles.upsert({
      where: { user_id: userId },
      update: updatePayload,
      create: {
        id: uuidv4(),
        user_id: userId,
        ...updatePayload,
        level: isAdmin && data.level ? data.level : 'L1',
        level_number: 1,
        created_at: new Date()
      }
    });

    // Sync to worker_search_index so talent search is immediately fresh
    await prisma.worker_search_index.upsert({
      where: { user_id: userId },
      update: {
        name: profile.full_name || 'Worker',
        bio: profile.bio,
        skills: profile.skills,
        location: profile.location,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        level: profile.level,
        profile_image_url: profile.profile_image_url,
        trust_score: profile.trust_score,
        last_updated_at: new Date()
      },
      create: {
        user_id: userId,
        name: profile.full_name || 'Worker',
        bio: profile.bio,
        skills: profile.skills,
        location: profile.location,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        level: profile.level,
        profile_image_url: profile.profile_image_url,
        trust_score: profile.trust_score,
        indexed_at: new Date(),
        last_updated_at: new Date()
      }
    }).catch((e: any) => console.warn("worker_search_index sync notice:", e.message));

    let updatedUserMeta: any = null;
    const userMetaExists = await prisma.user_metadata.findUnique({ where: { id: userId } });
    if (userMetaExists) {
      if (data.phoneNumber) {
        const cleanPhone = String(data.phoneNumber).trim().replace(/\D/g, '').slice(-10);
        if (cleanPhone.length !== 10) {
          return c.json(ApiResponse.error("Please provide a valid 10-digit phone number."), 400 as any);
        }

        const existingPhoneUser = await prisma.user_metadata.findFirst({
          where: {
            phone_number: cleanPhone,
            id: { not: userId }
          }
        });

        if (existingPhoneUser) {
          return c.json(ApiResponse.error("This phone number is already registered to another account. Duplicate accounts are not permitted."), 400 as any);
        }

        updatedUserMeta = await prisma.user_metadata.update({
          where: { id: userId },
          data: { 
            phone_number: cleanPhone,
            profile_image_url: profileImageUrl !== undefined ? profileImageUrl : undefined,
            onboarded: true,
            first_name: data.fullName ? data.fullName.split(' ')[0] : undefined,
            last_name: data.fullName ? data.fullName.split(' ').slice(1).join(' ') : undefined,
          }
        });
      } else {
        updatedUserMeta = await prisma.user_metadata.update({
          where: { id: userId },
          data: { 
            profile_image_url: profileImageUrl !== undefined ? profileImageUrl : undefined,
            onboarded: true,
            first_name: data.fullName ? data.fullName.split(' ')[0] : undefined,
            last_name: data.fullName ? data.fullName.split(' ').slice(1).join(' ') : undefined,
          }
        });
      }
    }

    // Trigger Enterprise Candidate Reverse Search Alert Matching (Naukri Resdex model)
    if (profile.is_available !== false) {
      SearchAlertService.matchNewCandidateAgainstAlerts({
        user_id: userId,
        full_name: profile.full_name,
        skills: profile.skills,
        city: profile.city,
        location: profile.location,
        specialization: profile.specialization,
        preferred_roles: profile.preferred_roles,
        experience_years: profile.experience_years,
        is_available: profile.is_available
      }).catch((e: any) => console.warn('[SearchAlertService] Candidate reverse match notice:', e.message));
    }

    return c.json(ApiResponse.ok("Profile updated", formatWorkerProfile(profile, updatedUserMeta)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getProfileCompletion = async (c: Context) => {
  try {
    const userId = c.req.param('userId') as string;
    const profile = await prisma.worker_profiles.findUnique({ where: { user_id: userId } });

    let isComplete = false;
    let missingFields: string[] = [];
    if (profile) {
      if (!profile.full_name) missingFields.push('fullName');
      if (!profile.skills) missingFields.push('skills');
      if (!profile.hourly_rate) missingFields.push('hourlyRate');
      isComplete = missingFields.length === 0;
    }

    return c.json(ApiResponse.ok({ isComplete, missingFields }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getProfilesByUserIds = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const employerId = authUser?.sub;
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'admin';
    const userIds: string[] = (await c.req.json());
    const validUserIds = (userIds || []).filter(Boolean);
    if (validUserIds.length === 0) return c.json(ApiResponse.ok([]));
    
    // Proactively query admin user IDs to ensure they are excluded completely
    const adminUsers = await prisma.user_metadata.findMany({
      where: {
        OR: [
          { role: { in: ['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'] } },
          { email: { contains: 'admin', mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });
    const adminIdSet = new Set(adminUsers.map(a => a.id));

    const profiles = await prisma.worker_profiles.findMany({
      where: {
        AND: [
          {
            OR: [
              { user_id: { in: validUserIds } },
              { id: { in: validUserIds } }
            ]
          },
          ...(adminUsers.length > 0
            ? [{
                user_id: { notIn: Array.from(adminIdSet) },
                full_name: { notIn: ['Super Admin', 'Admin', 'super admin', 'admin'] }
              }]
            : [])
        ]
      }
    });

    const targetUserIds = Array.from(new Set([
      ...validUserIds,
      ...profiles.map(p => p.user_id).filter(Boolean)
    ])).filter(id => !adminIdSet.has(id));

    const [userMetaList, verifications] = await Promise.all([
      prisma.user_metadata.findMany({
        where: { 
          id: { in: targetUserIds },
          role: { notIn: ['ADMIN', 'SUPER_ADMIN', 'admin', 'super_admin'] }
        }
      }),
      prisma.verification_records.findMany({
        where: { user_id: { in: targetUserIds } }
      })
    ]);

    const userMetaById = new Map();
    userMetaList.forEach(u => {
      userMetaById.set(u.id, u);
    });

    const verificationByUser = new Map();
    verifications.forEach(v => {
      verificationByUser.set(v.user_id, v);
    });

    let employerOffers = new Set();
    if (employerId) {
      const employerProfile = await prisma.employer_profiles.findFirst({
        where: { user_id: employerId }
      });
      const employerOwnerId = employerProfile?.id || employerId;

      const employerJobs = await prisma.jobs.findMany({ where: { employer_id: employerOwnerId }, select: { id: true } });
      const jobIds = employerJobs.map(j => j.id);
      if (jobIds.length > 0) {
        const offers = await prisma.job_applications.findMany({
          where: { 
            job_id: { in: jobIds },
            worker_id: { in: targetUserIds },
            status: { in: ['OFFER_SENT', 'PENDING', 'ACCEPTED'] } 
          },
          select: { worker_id: true }
        });
        offers.forEach(o => employerOffers.add(o.worker_id));
      }
    }

    const formatted = profiles
      .filter(p => userMetaById.has(p.user_id) || userMetaById.has(p.id))
      .map((p) => {
        const meta = userMetaById.get(p.user_id) || userMetaById.get(p.id);
      const vRecord = verificationByUser.get(p.user_id) || verificationByUser.get(p.id);
      const isVerified = vRecord?.status === 'VERIFIED' || vRecord?.status === 'APPROVED' || Boolean(meta?.email_verified);
      const isOfferSent = employerOffers.has(p.user_id) || employerOffers.has(p.id);
      const isSelf = employerId && (employerId === p.user_id || employerId === p.id);
      
      // Privacy Gate: Mask contact info unless admin, owner, or employer with active application/offer
      const shouldMask = !isSelf && !isAdmin && !isOfferSent;
      
      const f = formatWorkerProfile(p, meta, isVerified, shouldMask);
      if (f) {
        f.isOfferSent = isOfferSent;
      }
      return f;
    });

    return c.json(ApiResponse.ok(formatted));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const incrementProfileView = async (c: Context) => {
  try {
    const userId = c.req.param('userId') as string;
    await prisma.worker_profiles.updateMany({
      where: {
        OR: [
          { user_id: userId },
          { id: userId }
        ]
      },
      data: { profile_views: { increment: 1 } }
    });
    return c.json(ApiResponse.ok("View incremented", null));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getWorkerById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    let profile = await prisma.worker_profiles.findFirst({
      where: {
        OR: [
          { id },
          { user_id: id }
        ]
      }
    });

    if (!profile) {
      return c.json(ApiResponse.error("Worker profile not found"), 404 as any);
    }

    const authUser = c.get('user');
    const requesterId = authUser?.sub;
    const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'admin';
    const isSelf = requesterId && (requesterId === profile.user_id || requesterId === profile.id);

    let hasEmployerRelation = false;
    if (requesterId && !isSelf && !isAdmin) {
      const employerProfile = await prisma.employer_profiles.findFirst({
        where: { user_id: requesterId }
      });
      const employerOwnerId = employerProfile?.id || requesterId;

      const employerJobs = await prisma.jobs.findMany({
        where: { employer_id: employerOwnerId },
        select: { id: true }
      });

      if (employerJobs.length > 0) {
        const jobIds = employerJobs.map(j => j.id);
        const application = await prisma.job_applications.findFirst({
          where: {
            job_id: { in: jobIds },
            worker_id: { in: [profile.user_id, profile.id] }
          }
        });
        if (application) {
          hasEmployerRelation = true;
        }
      }
    }

    const [userMeta, verification] = await Promise.all([
      prisma.user_metadata.findUnique({
        where: { id: profile.user_id },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          profile_image_url: true,
          phone_number: true,
          email_verified: true,
          role: true
        }
      }),
      prisma.verification_records.findFirst({
        where: { user_id: profile.user_id }
      })
    ]);

    // Safety Gate: Block non-admins from viewing ADMIN / SUPER_ADMIN profiles disguised as workers
    const roleUpper = (userMeta?.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || roleUpper === 'SUPER_ADMIN' || (userMeta?.email && userMeta.email.toLowerCase().includes('admin'))) {
      return c.json(ApiResponse.error("Worker profile not found"), 404 as any);
    }

    const isVerified = verification?.status === 'VERIFIED' || verification?.status === 'APPROVED' || Boolean(userMeta?.email_verified);
    // Privacy Gate: Mask contact details unless requester is profile owner, admin, or related employer
    const shouldMask = !isSelf && !isAdmin && !hasEmployerRelation;

    return c.json(ApiResponse.ok(formatWorkerProfile(profile, userMeta, isVerified, shouldMask)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getTrustScore = async (c: Context) => {
  try {
    const userId = c.req.param('userId') as string;
    const profile = await prisma.worker_profiles.findFirst({
      where: {
        OR: [
          { user_id: userId },
          { id: userId }
        ]
      }
    });

    const targetUserId = profile?.user_id || userId;

    // Check verification status
    const verification = await prisma.verification_records.findFirst({
      where: { user_id: targetUserId, status: { in: ['APPROVED', 'VERIFIED'] } }
    });

    const userMeta = await prisma.user_metadata.findUnique({
      where: { id: targetUserId }
    });

    const isIdVerified = !!verification || Boolean(userMeta?.email_verified);

    // Count passed tests
    const passedTestsCount = await prisma.skill_test_results.count({
      where: { worker_id: targetUserId, passed: true }
    });

    // Rating aggregate
    const ratings = await prisma.ratings.aggregate({
      where: { ratee_id: targetUserId },
      _avg: { score: true },
      _count: { score: true }
    });

    // Completed jobs count
    const completedJobsCount = await prisma.job_applications.count({
      where: {
        worker_id: targetUserId,
        status: { in: ['COMPLETED', 'ACCEPTED'] }
      }
    });

    // Compute composite trust score (0 to 100)
    let computedScore = 50; // Base baseline
    if (isIdVerified) computedScore += 20;
    computedScore += Math.min(passedTestsCount * 5, 15); // Up to 15 points for skill tests
    if (ratings._count.score > 0 && ratings._avg.score) {
      computedScore += Math.round((ratings._avg.score / 5) * 15);
    }
    if (completedJobsCount > 0) {
      computedScore += Math.min(completedJobsCount * 2, 10);
    }
    computedScore = Math.min(100, Math.max(20, computedScore));

    const avgRating = ratings._avg.score ? Number(ratings._avg.score.toFixed(1)) : 4.8;
    const reliabilityRate = completedJobsCount > 0 ? 0.98 : 0.92;

    return c.json(ApiResponse.ok({
      score: profile?.trust_score && profile.trust_score > 0 ? profile.trust_score : computedScore,
      identityVerified: isIdVerified,
      skillsVerifiedCount: passedTestsCount,
      avgRating,
      reliabilityRate,
      completedJobsCount,
      ratingsCount: ratings._count.score,
      lastUpdated: new Date().toISOString()
    }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getGlobalStats = async (c: Context) => {
  try {
    const totalWorkers = await prisma.worker_profiles.count();
    return c.json(ApiResponse.ok({ totalWorkers }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * ⚡ Digital Labour Chowk: Get real live standby workers from PostgreSQL
 */
export const getStandbyPoolWorkers = async (c: Context) => {
  try {
    const query = c.req.query();
    const city = query.city || 'Chennai';
    const trade = query.trade;
    const maxWage = query.maxWage ? parseFloat(query.maxWage) : undefined;
    const taluk = query.taluk;

    // Use prisma.$queryRaw so it works directly against PostgreSQL without requiring prisma generate restart
    let poolRows: any[] = [];
    try {
      poolRows = await prisma.$queryRaw<any[]>`
        SELECT * FROM worker_standby_pool
        WHERE LOWER(city) = LOWER(${city})
          AND is_ready_now = true
          ${trade && trade !== 'All' ? prisma.$queryRaw`AND LOWER(trade) LIKE ${`%${trade.toLowerCase()}%`}` : prisma.$queryRaw``}
          ${taluk && taluk !== 'All' ? prisma.$queryRaw`AND LOWER(taluk) = LOWER(${taluk})` : prisma.$queryRaw``}
          ${maxWage ? prisma.$queryRaw`AND expected_daily_wage <= ${maxWage}` : prisma.$queryRaw``}
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } catch (dbErr: any) {
      console.warn('[DigitalLabourChowk] Standby pool query note:', dbErr.message);
      // Fallback: If table has no rows or is initializing
      return c.json(ApiResponse.ok([]));
    }

    if (!poolRows || poolRows.length === 0) {
      return c.json(ApiResponse.ok([]));
    }

    const userIds = poolRows.map((r: any) => r.user_id).filter(Boolean);

    // Fetch related profile, metadata, and verification
    const [profiles, userMetas, verifications] = await Promise.all([
      prisma.worker_profiles.findMany({
        where: { user_id: { in: userIds } }
      }).catch(() => []),
      prisma.user_metadata.findMany({
        where: { id: { in: userIds } }
      }).catch(() => []),
      prisma.verification_records.findMany({
        where: { user_id: { in: userIds }, status: 'VERIFIED' }
      }).catch(() => [])
    ]);

    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    const metaMap = new Map(userMetas.map(m => [m.id, m]));
    const verifiedUserSet = new Set(verifications.map(v => v.user_id));

    const standbyWorkers = poolRows.map((row: any) => {
      const profile = profileMap.get(row.user_id);
      const meta = metaMap.get(row.user_id);
      const isVerified = verifiedUserSet.has(row.user_id) || Boolean(profile?.skill_score && profile.skill_score >= 50);

      const rawPhone = meta?.phone_number || profile?.phone_number || '';
      const maskedPhone = rawPhone.length > 5 ? rawPhone.slice(0, 4) + ' ****' + rawPhone.slice(-2) : 'Contact Available';

      return {
        id: row.id,
        userId: row.user_id,
        name: profile?.full_name || `${meta?.first_name || ''} ${meta?.last_name || ''}`.trim() || 'Verified Worker',
        trade: row.trade,
        taluk: row.taluk || profile?.taluk || profile?.area || city,
        city: row.city,
        expectedDailyWage: Number(row.expected_daily_wage),
        availabilityWindow: row.notes || 'Ready Now (within 45 mins)',
        shiftPreference: row.shift_preference || 'DAY_SHIFT',
        experienceYears: profile?.experience_years || 2,
        trustScore: profile?.trust_score || 85,
        phone: rawPhone,
        maskedPhone,
        isBiometricVerified: isVerified,
        createdAt: row.created_at
      };
    });

    return c.json(ApiResponse.ok(standbyWorkers));
  } catch (err: any) {
    console.error('[getStandbyPoolWorkers] Error:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * ⚡ Worker joins/updates Standby Pool for today
 */
export const joinStandbyPool = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user || !user.id) {
      return c.json(ApiResponse.error('Unauthorized. Please log in as a worker.'), 401 as any);
    }

    const body = await c.req.json();
    const { trade, expectedDailyWage, taluk, city = 'Chennai', shiftPreference = 'DAY_SHIFT', notes } = body;

    if (!trade || !expectedDailyWage) {
      return c.json(ApiResponse.error('Trade and expected daily wage are required.'), 400 as any);
    }

    const parsedWage = parseFloat(expectedDailyWage);
    if (isNaN(parsedWage) || parsedWage <= 0) {
      return c.json(ApiResponse.error('Invalid daily wage value.'), 400 as any);
    }

    const safeTaluk = taluk || 'Guindy';
    const safeNotes = notes || 'Ready for spot shift';
    const safeShift = shiftPreference || 'DAY_SHIFT';

    // Upsert directly into PostgreSQL via $executeRaw
    await prisma.$executeRaw`
      INSERT INTO worker_standby_pool (
        user_id, trade, expected_daily_wage, taluk, city, shift_preference, is_ready_now, notes, available_date, updated_at
      ) VALUES (
        ${user.id}, ${trade}, ${parsedWage}, ${safeTaluk}, ${city}, ${safeShift}, true, ${safeNotes}, CURRENT_DATE, NOW()
      )
      ON CONFLICT (user_id, available_date)
      DO UPDATE SET
        trade = EXCLUDED.trade,
        expected_daily_wage = EXCLUDED.expected_daily_wage,
        taluk = EXCLUDED.taluk,
        city = EXCLUDED.city,
        shift_preference = EXCLUDED.shift_preference,
        is_ready_now = true,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `;

    return c.json(ApiResponse.ok({
      message: 'Successfully broadcasted availability on Digital Labour Chowk!'
    }));
  } catch (err: any) {
    console.error('[joinStandbyPool] Error:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * ⚡ Worker removes themselves from Standby Pool
 */
export const leaveStandbyPool = async (c: Context) => {
  try {
    const user = c.get('user');
    if (!user || !user.id) {
      return c.json(ApiResponse.error('Unauthorized.'), 401 as any);
    }

    await prisma.$executeRaw`
      UPDATE worker_standby_pool
      SET is_ready_now = false, updated_at = NOW()
      WHERE user_id = ${user.id} AND available_date = CURRENT_DATE
    `;

    return c.json(ApiResponse.ok({ message: 'Removed from today\'s standby radar.' }));
  } catch (err: any) {
    console.error('[leaveStandbyPool] Error:', err);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

