import crypto from 'node:crypto';
import { prisma } from '../config/prisma';

export interface ReferralStats {
  referralCode: string;
  workerInviteUrl: string;
  employerInviteUrl: string;
  totalRegistrations: number;
  workerRegistrations: number;
  employerRegistrations: number;
  workerOnboardingsCompleted: number;
  employersWithFirstJob: number;
  breakdownBySource: Record<string, number>;
}

export class ReferralService {
  /**
   * Generates a collision-safe, cryptographically secure 8-character alphanumeric referral code.
   * Format: 'TH' + 6 upper-case alphanumeric characters (excluding confusing chars 0, O, I, 1).
   */
  static generateRandomCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const bytes = crypto.randomBytes(6);
    let code = 'TH-';
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * Retrieves an existing referral code for a user, or generates a new one with retry on collisions.
   */
  static async getOrCreateUserReferralCode(userId: string): Promise<string> {
    const existing = await prisma.user_metadata.findUnique({
      where: { id: userId },
      select: { referral_code: true }
    });

    if (existing?.referral_code) {
      return existing.referral_code;
    }

    let attempts = 5;
    while (attempts > 0) {
      attempts--;
      const newCode = this.generateRandomCode();
      try {
        const updated = await prisma.user_metadata.update({
          where: { id: userId },
          data: { referral_code: newCode },
          select: { referral_code: true }
        });
        if (updated.referral_code) {
          return updated.referral_code;
        }
      } catch (err: any) {
        // Unique key constraint violation code: P2002
        if (err?.code === 'P2002' && attempts > 0) {
          continue;
        }
        throw err;
      }
    }

    throw new Error('Failed to generate a unique referral code after multiple attempts.');
  }

  /**
   * Resolves a referral code (case-insensitive) to its owner user record.
   */
  static async resolveReferralCode(code: string): Promise<{ id: string; role: string | null; referral_code: string } | null> {
    if (!code || typeof code !== 'string') return null;
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 4 || cleanCode.length > 32) return null;

    const user = await prisma.user_metadata.findFirst({
      where: {
        referral_code: {
          equals: cleanCode,
          mode: 'insensitive'
        }
      },
      select: { id: true, role: true, referral_code: true }
    });

    if (!user || !user.referral_code) return null;

    return {
      id: user.id,
      role: user.role,
      referral_code: user.referral_code
    };
  }

  /**
   * Validates and records attribution for a newly registered user.
   * Prevents self-referrals, duplicate attributions, and re-attributions.
   */
  static async recordAttribution(params: {
    referredUserId: string;
    referralCode?: string | null;
    source?: string | null;
    signupRole: 'WORKER' | 'EMPLOYER';
  }): Promise<boolean> {
    const { referredUserId, referralCode, source, signupRole } = params;

    if (!referralCode || typeof referralCode !== 'string') {
      return false;
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // 1. Resolve referrer from referral code
    const referrer = await this.resolveReferralCode(cleanCode);
    if (!referrer) {
      console.warn(`[ReferralService] Invalid referral code supplied: ${cleanCode}`);
      return false;
    }

    // 2. Prevent self-referrals
    if (referrer.id === referredUserId) {
      console.warn(`[ReferralService] Self-referral attempt blocked for user: ${referredUserId}`);
      return false;
    }

    // 3. Ensure this referred user does not already have an attribution (first-touch immutable)
    const existingAttribution = await prisma.referral_attributions.findUnique({
      where: { referred_user_id: referredUserId }
    });
    if (existingAttribution) {
      console.warn(`[ReferralService] User ${referredUserId} is already attributed. Duplicate ignored.`);
      return false;
    }

    // 4. Sanitize source (max 50 chars, alphanumeric + underscores)
    const rawSource = String(source || 'direct_invite').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 50);
    const safeSource = rawSource || 'direct_invite';

    try {
      await prisma.referral_attributions.create({
        data: {
          referrer_user_id: referrer.id,
          referred_user_id: referredUserId,
          referral_code: cleanCode,
          source: safeSource,
          signup_role: signupRole,
          created_at: new Date()
        }
      });
      console.log(`[ReferralService] Attribution recorded: Referrer ${referrer.id} -> Referred ${referredUserId} (${signupRole}, src: ${safeSource})`);
      return true;
    } catch (err: any) {
      // In case of race conditions or constraint collisions
      if (err?.code === 'P2002') {
        console.warn(`[ReferralService] Concurrent duplicate attribution prevented for ${referredUserId}`);
        return false;
      }
      console.error('[ReferralService] Failed to record attribution:', err.message);
      return false;
    }
  }

  /**
   * Idempotently marks a referred user as activated.
   * e.g. WORKER_ONBOARDING_COMPLETED or EMPLOYER_FIRST_JOB_POSTED
   */
  static async markActivated(
    userId: string,
    activationType: 'WORKER_ONBOARDING_COMPLETED' | 'EMPLOYER_FIRST_JOB_POSTED'
  ): Promise<boolean> {
    if (!userId) return false;

    try {
      const attribution = await prisma.referral_attributions.findUnique({
        where: { referred_user_id: userId }
      });

      if (!attribution) {
        return false; // Not a referred user
      }

      // If already activated, preserve the initial activation timestamp
      if (attribution.activated_at) {
        return true;
      }

      await prisma.referral_attributions.update({
        where: { referred_user_id: userId },
        data: {
          activated_at: new Date(),
          activation_type: activationType
        }
      });

      console.log(`[ReferralService] User ${userId} marked as activated: ${activationType}`);
      return true;
    } catch (err: any) {
      console.error(`[ReferralService] Error recording activation for ${userId}:`, err.message);
      return false;
    }
  }

  /**
   * Retrieves referral performance statistics and invite URLs for the authenticated user.
   */
  static async getReferralStats(
    referrerUserId: string,
    originUrl: string = 'https://trusthyre.com'
  ): Promise<ReferralStats> {
    const code = await this.getOrCreateUserReferralCode(referrerUserId);

    const attributions = await prisma.referral_attributions.findMany({
      where: { referrer_user_id: referrerUserId },
      select: {
        signup_role: true,
        source: true,
        activated_at: true,
        activation_type: true
      }
    });

    let workerRegistrations = 0;
    let employerRegistrations = 0;
    let workerOnboardingsCompleted = 0;
    let employersWithFirstJob = 0;
    const breakdownBySource: Record<string, number> = {};

    for (const attr of attributions) {
      if (attr.signup_role === 'WORKER') {
        workerRegistrations++;
        if (attr.activated_at || attr.activation_type === 'WORKER_ONBOARDING_COMPLETED') {
          workerOnboardingsCompleted++;
        }
      } else if (attr.signup_role === 'EMPLOYER') {
        employerRegistrations++;
        if (attr.activated_at || attr.activation_type === 'EMPLOYER_FIRST_JOB_POSTED') {
          employersWithFirstJob++;
        }
      }

      const src = attr.source || 'direct_invite';
      breakdownBySource[src] = (breakdownBySource[src] || 0) + 1;
    }

    return {
      referralCode: code,
      workerInviteUrl: `${originUrl}/sign-up?role=worker&ref=${encodeURIComponent(code)}&src=direct_invite`,
      employerInviteUrl: `${originUrl}/sign-up?role=employer&ref=${encodeURIComponent(code)}&src=direct_invite`,
      totalRegistrations: attributions.length,
      workerRegistrations,
      employerRegistrations,
      workerOnboardingsCompleted,
      employersWithFirstJob,
      breakdownBySource
    };
  }
}
