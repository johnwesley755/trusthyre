import { Context } from 'hono';
import prisma, { withSystemContext } from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { v4 as uuidv4 } from 'uuid';
import { isAppAdmin } from '../utils/roles';

const formatEmployerProfile = (profile: any, user?: any) => {
  if (!profile && !user) return null;
  return {
    id: profile?.id,
    userId: profile?.user_id || user?.id,
    user_id: profile?.user_id || user?.id,
    companyName: profile?.company_name || user?.company_name || '',
    company_name: profile?.company_name || user?.company_name || '',
    industry: profile?.industry || 'Enterprise',
    companyWebsite: profile?.company_website || '',
    company_website: profile?.company_website || '',
    profileBio: profile?.profile_bio || '',
    profile_bio: profile?.profile_bio || '',
    businessTier: profile?.business_tier || 'STARTER',
    business_tier: profile?.business_tier || 'STARTER',
    contactCredits: (profile as any)?.contact_credits ?? 5,
    contact_credits: (profile as any)?.contact_credits ?? 5,
    isVerified: profile?.is_verified ?? (user?.identity_verified ?? false),
    is_verified: profile?.is_verified ?? (user?.identity_verified ?? false),
    location: profile?.location || '',
    city: profile?.city || '',
    address: profile?.address || '',
    latitude: profile?.latitude,
    longitude: profile?.longitude,
    phoneNumber: user?.phone_number || '',
    phone_number: user?.phone_number || '',
    email: user?.email || '',
    profileImageUrl: user?.profile_image_url || null,
    profile_image_url: user?.profile_image_url || null,
    createdAt: profile?.created_at || user?.created_at,
    created_at: profile?.created_at || user?.created_at,
    updatedAt: profile?.updated_at || user?.updated_at,
    updated_at: profile?.updated_at || user?.updated_at
  };
};

export const getEmployerProfile = async (c: Context) => {
  try {
    const paramId = c.req.param('userId');
    const authUser = c.get('user');
    const targetUserId = (paramId && paramId !== 'profile' && paramId !== 'me') ? paramId : authUser?.sub;
    
    if (!targetUserId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    let profile = await prisma.employer_profiles.findFirst({
      where: {
        OR: [
          { user_id: targetUserId },
          { id: targetUserId }
        ]
      }
    });

    const user = await prisma.user_metadata.findUnique({
      where: { id: profile?.user_id || targetUserId }
    });
    
    if (!profile && user?.role === 'EMPLOYER') {
      profile = await prisma.employer_profiles.create({
        data: {
          id: uuidv4(),
          user_id: targetUserId,
          company_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'My Company',
          business_tier: 'STARTER',
          is_verified: user.email_verified ?? false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
    }

    if (profile || user) {
      return c.json(ApiResponse.ok(formatEmployerProfile(profile, user)));
    }

    // Return a safe fallback object for verified enterprise partner
    return c.json(ApiResponse.ok({
      id: targetUserId,
      userId: targetUserId,
      user_id: targetUserId,
      companyName: 'Verified Enterprise Partner',
      company_name: 'Verified Enterprise Partner',
      industry: 'Enterprise',
      businessTier: 'STARTER',
      business_tier: 'STARTER',
      contactCredits: 5,
      contact_credits: 5,
      isVerified: true,
      is_verified: true,
      location: 'Chennai',
      city: 'Chennai'
    }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateEmployerProfile = async (c: Context) => {
  try {
    const paramId = c.req.param('userId');
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const targetUserId = (paramId && paramId !== 'profile' && paramId !== 'me') ? paramId : authUser.sub;

    // Security fix 1.4: Prevent editing arbitrary users' profiles
    if (targetUserId !== authUser.sub && !isAppAdmin(authUser.role)) {
      return c.json(ApiResponse.error("Forbidden: You cannot edit another employer's profile"), 403 as any);
    }

    const data = (await c.req.json());

    const dbData: any = {};
    if (data.companyName !== undefined || data.company_name !== undefined) {
      dbData.company_name = data.companyName ?? data.company_name;
    }
    if (data.industry !== undefined) dbData.industry = data.industry;
    if (data.companyWebsite !== undefined || data.company_website !== undefined) {
      dbData.company_website = data.companyWebsite ?? data.company_website;
    }
    if (data.profileBio !== undefined || data.profile_bio !== undefined) {
      dbData.profile_bio = data.profileBio ?? data.profile_bio;
    }
    if (data.city !== undefined) dbData.city = data.city;
    if (data.location !== undefined) dbData.location = data.location;
    if (data.address !== undefined) dbData.address = data.address;
    if (data.latitude !== undefined) dbData.latitude = data.latitude ? Number(data.latitude) : null;
    if (data.longitude !== undefined) dbData.longitude = data.longitude ? Number(data.longitude) : null;

    // Security fix 1.5: Only ADMIN / SUPER_ADMIN can change businessTier or isVerified directly
    if (isAppAdmin(authUser.role)) {
      if (data.businessTier !== undefined || data.business_tier !== undefined) {
        dbData.business_tier = data.businessTier ?? data.business_tier;
      }
      if (data.isVerified !== undefined || data.is_verified !== undefined) {
        dbData.is_verified = data.isVerified ?? data.is_verified;
      }
    }

    const phone = data.phoneNumber || data.phone_number || data.businessPhone;
    if (phone) {
      const duplicatePhone = await prisma.user_metadata.findFirst({
        where: {
          phone_number: phone,
          id: { not: targetUserId }
        }
      });
      if (duplicatePhone) {
        return c.json(ApiResponse.error("This phone number is already registered with another account. Please use a different phone number."), 400 as any);
      }
      await prisma.user_metadata.update({
        where: { id: targetUserId },
        data: { phone_number: phone, updated_at: new Date() }
      });
    }

    const profileImg = data.profileImageUrl || data.profile_image_url || data.profilePhoto;
    if (profileImg !== undefined) {
      await prisma.user_metadata.update({
        where: { id: targetUserId },
        data: { profile_image_url: profileImg, updated_at: new Date() }
      });
    }

    const profile = await prisma.employer_profiles.upsert({
      where: { user_id: targetUserId },
      update: { ...dbData, updated_at: new Date() },
      create: {
        ...dbData,
        id: uuidv4(),
        user_id: targetUserId,
        business_tier: dbData.business_tier || 'STARTER',
        is_verified: dbData.is_verified ?? false,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    const user = await prisma.user_metadata.findUnique({ where: { id: targetUserId } });
    return c.json(ApiResponse.ok("Profile updated", formatEmployerProfile(profile, user)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateEmployerTier = async (c: Context) => {
  try {
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    
    // Tier updates are restricted to admin or payment verification
    if (authUser.role !== 'ADMIN') {
      return c.json(ApiResponse.error("Forbidden: Tier upgrades must be completed via subscription verification"), 403 as any);
    }

    const { tier, userId } = await c.req.json();
    const targetUserId = userId || authUser.sub;
    const profile = await prisma.employer_profiles.update({
      where: { user_id: targetUserId },
      data: { business_tier: tier, updated_at: new Date() }
    });
    return c.json(ApiResponse.ok("Tier updated", formatEmployerProfile(profile)));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const unlockCandidateContact = async (c: Context) => {
  try {
    const authUser = c.get('user');
    if (!authUser?.sub) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const isAdmin = isAppAdmin(authUser.role);
    if (authUser.role !== 'EMPLOYER' && !isAdmin) {
      return c.json(ApiResponse.error("Forbidden: Only employer accounts can unlock candidate contact details."), 403 as any);
    }

    const body = await c.req.json().catch(() => ({}));
    const workerId = c.req.param('workerId') || body?.workerId;
    if (!workerId) {
      return c.json(ApiResponse.error("Worker ID is required"), 400 as any);
    }

    // 1. Fetch Candidate Details safely under withSystemContext (bypassing RLS cross-user block)
    const { workerUser, workerProfile } = await withSystemContext(prisma, async (tx) => {
      const u = await tx.user_metadata.findUnique({
        where: { id: workerId },
        select: { id: true, first_name: true, last_name: true, phone_number: true, email: true }
      });
      const p = await tx.worker_profiles.findFirst({
        where: { OR: [{ user_id: workerId }, { id: workerId }] }
      });
      return { workerUser: u, workerProfile: p };
    });

    if (!workerUser && !workerProfile) {
      return c.json(ApiResponse.error("Candidate not found"), 404 as any);
    }

    const targetUserId = workerProfile?.user_id || workerUser?.id || workerId;

    // 2. Determine if candidate is already unlocked or has an active application/offer
    let alreadyUnlocked = false;
    let creditsRemaining = 5;

    if (!isAdmin) {
      const employerProfile = await prisma.employer_profiles.findFirst({
        where: { user_id: authUser.sub }
      });

      if (!employerProfile) {
        return c.json(ApiResponse.error("Employer profile not found. Please complete profile setup first."), 404 as any);
      }

      creditsRemaining = employerProfile.contact_credits ?? 0;

      // Check if already unlocked in saved_workers
      const existingUnlock = await prisma.saved_workers.findFirst({
        where: {
          employer_id: authUser.sub,
          worker_id: targetUserId
        }
      });

      if (existingUnlock) {
        alreadyUnlocked = true;
      } else {
        // Check if candidate applied to any of this employer's jobs
        const hasApplication = await prisma.job_applications.findFirst({
          where: {
            worker_id: targetUserId,
            jobs: { employer_id: employerProfile.id || authUser.sub }
          }
        });

        if (hasApplication) {
          alreadyUnlocked = true;
        }
      }

      // If not already unlocked, enforce and debit 1 credit
      if (!alreadyUnlocked) {
        if (creditsRemaining <= 0) {
          return c.json({
            success: false,
            message: "Insufficient contact credits (0 remaining). Please top up your contact credit pack to connect directly with this candidate.",
            creditsRemaining: 0,
            requiresTopup: true
          }, 402 as any);
        }

        // Atomically debit 1 credit and record unlock
        await prisma.$transaction(async (tx) => {
          await tx.employer_profiles.update({
            where: { id: employerProfile.id },
            data: { contact_credits: { decrement: 1 } }
          });

          await tx.saved_workers.create({
            data: {
              employer_id: authUser.sub,
              worker_id: targetUserId
            }
          }).catch(() => {}); // ignore duplicate race
        });

        creditsRemaining = Math.max(0, creditsRemaining - 1);
      }
    }

    const phoneNumber = workerProfile?.phone_number || workerUser?.phone_number || 'Not Provided';
    const whatsappPhone = phoneNumber.replace(/[^0-9]/g, '');
    const workerName = workerProfile?.full_name || `${workerUser?.first_name || ''} ${workerUser?.last_name || ''}`.trim() || 'Candidate';

    return c.json(ApiResponse.ok("Candidate contact retrieved successfully", {
      workerId: targetUserId,
      workerName,
      phoneNumber,
      whatsappPhone,
      creditsRemaining,
      alreadyUnlocked
    }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
