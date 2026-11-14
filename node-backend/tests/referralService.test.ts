import { describe, it, expect, beforeEach } from 'vitest';
import { ReferralService } from '../src/services/referralService';
import { prisma } from '../src/config/prisma';
import crypto from 'node:crypto';

describe('ReferralService Unit & Integration Tests', () => {
  const referrerWorkerId = crypto.randomUUID();
  const referrerEmployerId = crypto.randomUUID();
  const referredWorker1Id = crypto.randomUUID();
  const referredEmployer1Id = crypto.randomUUID();

  beforeEach(async () => {
    // Setup test users in user_metadata
    await prisma.user_metadata.upsert({
      where: { id: referrerWorkerId },
      update: {},
      create: {
        id: referrerWorkerId,
        email: `referrer_worker_${Date.now()}@example.com`,
        role: 'WORKER',
        first_name: 'Referrer',
        last_name: 'Worker',
        onboarded: true
      }
    });

    await prisma.user_metadata.upsert({
      where: { id: referrerEmployerId },
      update: {},
      create: {
        id: referrerEmployerId,
        email: `referrer_employer_${Date.now()}@example.com`,
        role: 'EMPLOYER',
        first_name: 'Referrer',
        last_name: 'Employer',
        onboarded: true
      }
    });

    await prisma.user_metadata.upsert({
      where: { id: referredWorker1Id },
      update: {},
      create: {
        id: referredWorker1Id,
        email: `referred_worker_${Date.now()}@example.com`,
        role: 'WORKER',
        first_name: 'Referred',
        last_name: 'Worker',
        onboarded: false
      }
    });

    await prisma.user_metadata.upsert({
      where: { id: referredEmployer1Id },
      update: {},
      create: {
        id: referredEmployer1Id,
        email: `referred_employer_${Date.now()}@example.com`,
        role: 'EMPLOYER',
        first_name: 'Referred',
        last_name: 'Employer',
        onboarded: false
      }
    });
  });

  it('1. Generates and retrieves collision-safe referral codes', async () => {
    const code = await ReferralService.getOrCreateUserReferralCode(referrerWorkerId);
    expect(code).toBeDefined();
    expect(code.startsWith('TH-')).toBe(true);

    // Calling again returns the exact same code (idempotent)
    const codeAgain = await ReferralService.getOrCreateUserReferralCode(referrerWorkerId);
    expect(codeAgain).toBe(code);
  });

  it('2. Resolves referral code case-insensitively', async () => {
    const code = await ReferralService.getOrCreateUserReferralCode(referrerWorkerId);
    const resolvedLower = await ReferralService.resolveReferralCode(code.toLowerCase());
    expect(resolvedLower).toBeDefined();
    expect(resolvedLower?.id).toBe(referrerWorkerId);

    const resolvedUpper = await ReferralService.resolveReferralCode(code.toUpperCase());
    expect(resolvedUpper).toBeDefined();
    expect(resolvedUpper?.id).toBe(referrerWorkerId);

    const invalid = await ReferralService.resolveReferralCode('INVALID-CODE-999');
    expect(invalid).toBeNull();
  });

  it('3. Rejects self-referrals', async () => {
    const code = await ReferralService.getOrCreateUserReferralCode(referrerWorkerId);
    const attributed = await ReferralService.recordAttribution({
      referredUserId: referrerWorkerId,
      referralCode: code,
      signupRole: 'WORKER'
    });
    expect(attributed).toBe(false);
  });

  it('4. Successfully records attribution for a new worker and prevents duplicate attribution', async () => {
    const code = await ReferralService.getOrCreateUserReferralCode(referrerWorkerId);
    
    // First touch
    const attributed = await ReferralService.recordAttribution({
      referredUserId: referredWorker1Id,
      referralCode: code,
      source: 'whatsapp_job_share',
      signupRole: 'WORKER'
    });
    expect(attributed).toBe(true);

    // Duplicate attribution attempt with different code or source is rejected
    const dupAttributed = await ReferralService.recordAttribution({
      referredUserId: referredWorker1Id,
      referralCode: 'TH-ANOTHER',
      source: 'direct_invite',
      signupRole: 'WORKER'
    });
    expect(dupAttributed).toBe(false);
  });

  it('5. Successfully records attribution for an employer and computes stats correctly', async () => {
    const code = await ReferralService.getOrCreateUserReferralCode(referrerWorkerId);

    await ReferralService.recordAttribution({
      referredUserId: referredEmployer1Id,
      referralCode: code,
      source: 'visiting_card',
      signupRole: 'EMPLOYER'
    });

    const stats = await ReferralService.getReferralStats(referrerWorkerId);
    expect(stats.referralCode).toBe(code);
    expect(stats.totalRegistrations).toBeGreaterThanOrEqual(2); // referredWorker1Id + referredEmployer1Id
    expect(stats.workerRegistrations).toBeGreaterThanOrEqual(1);
    expect(stats.employerRegistrations).toBeGreaterThanOrEqual(1);
    expect(stats.breakdownBySource['whatsapp_job_share']).toBeGreaterThanOrEqual(1);
    expect(stats.breakdownBySource['visiting_card']).toBeGreaterThanOrEqual(1);
  });

  it('6. Idempotently marks activations for worker onboarding and employer job posting', async () => {
    // Activate worker onboarding
    const workerAct1 = await ReferralService.markActivated(referredWorker1Id, 'WORKER_ONBOARDING_COMPLETED');
    expect(workerAct1).toBe(true);

    // Repeated call is idempotent
    const workerAct2 = await ReferralService.markActivated(referredWorker1Id, 'WORKER_ONBOARDING_COMPLETED');
    expect(workerAct2).toBe(true);

    // Activate employer job posting
    const empAct1 = await ReferralService.markActivated(referredEmployer1Id, 'EMPLOYER_FIRST_JOB_POSTED');
    expect(empAct1).toBe(true);

    const stats = await ReferralService.getReferralStats(referrerWorkerId);
    expect(stats.workerOnboardingsCompleted).toBeGreaterThanOrEqual(1);
    expect(stats.employersWithFirstJob).toBeGreaterThanOrEqual(1);
  });
});
