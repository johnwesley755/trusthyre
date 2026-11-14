import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma, withRlsContext } from '../src/config/prisma';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

describe('Referral System RLS Tenant Isolation Tests', () => {
  const referrerAId = crypto.randomUUID();
  const referrerBId = crypto.randomUUID();
  const referredUserAId = crypto.randomUUID();
  const referredUserBId = crypto.randomUUID();
  const codeA = `TH-RLSA-${Date.now()}`;
  const codeB = `TH-RLSB-${Date.now()}`;

  // Connect as the restricted application role (NOBYPASSRLS)
  // Dynamically derive database name and host from DATABASE_URL
  const baseDbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/trusthire_test_db?schema=public';
  const urlObj = new URL(baseDbUrl);
  urlObj.username = 'trusthire_app';
  urlObj.password = 'apptestpassword';
  const appDbUrl = urlObj.toString();

  const appClient = new PrismaClient({
    datasources: {
      db: {
        url: appDbUrl
      }
    }
  });

  beforeAll(async () => {
    // 1. Setup metadata rows via admin/setup client
    await prisma.user_metadata.createMany({
      data: [
        { id: referrerAId, email: `ref_a_${Date.now()}@test.com`, role: 'WORKER', referral_code: codeA },
        { id: referrerBId, email: `ref_b_${Date.now()}@test.com`, role: 'EMPLOYER', referral_code: codeB },
        { id: referredUserAId, email: `referred_a_${Date.now()}@test.com`, role: 'WORKER' },
        { id: referredUserBId, email: `referred_b_${Date.now()}@test.com`, role: 'WORKER' }
      ]
    });

    // 2. Insert attributions via admin/setup client
    await prisma.referral_attributions.createMany({
      data: [
        {
          referrer_user_id: referrerAId,
          referred_user_id: referredUserAId,
          referral_code: codeA,
          source: 'job_share',
          signup_role: 'WORKER'
        },
        {
          referrer_user_id: referrerBId,
          referred_user_id: referredUserBId,
          referral_code: codeB,
          source: 'visiting_card',
          signup_role: 'WORKER'
        }
      ]
    });
  });

  afterAll(async () => {
    await prisma.referral_attributions.deleteMany({
      where: {
        referrer_user_id: { in: [referrerAId, referrerBId] }
      }
    }).catch(() => {});
    await prisma.user_metadata.deleteMany({
      where: {
        id: { in: [referrerAId, referrerBId, referredUserAId, referredUserBId] }
      }
    }).catch(() => {});
    await appClient.$disconnect();
  });

  it('1. Enforces tenant isolation on referral_attributions table under restricted app role', async () => {
    // 1. Query under Referrer A's session context using restricted appClient
    const attributionsForA = await withRlsContext(
      appClient,
      referrerAId,
      'WORKER',
      async (tx) => {
        return tx.referral_attributions.findMany({
          where: { referrer_user_id: referrerAId }
        });
      }
    );

    expect(attributionsForA.length).toBe(1);
    expect(attributionsForA[0].referrer_user_id).toBe(referrerAId);
    expect(attributionsForA[0].referred_user_id).toBe(referredUserAId);

    // 2. Query under Referrer B's session context using restricted appClient
    const attributionsForB = await withRlsContext(
      appClient,
      referrerBId,
      'EMPLOYER',
      async (tx) => {
        return tx.referral_attributions.findMany({
          where: { referrer_user_id: referrerBId }
        });
      }
    );

    expect(attributionsForB.length).toBe(1);
    expect(attributionsForB[0].referrer_user_id).toBe(referrerBId);
    expect(attributionsForB[0].referred_user_id).toBe(referredUserBId);

    // 3. Query under an unrelated third party's session context using restricted appClient
    const thirdPartyId = crypto.randomUUID();
    const attributionsForThirdParty = await withRlsContext(
      appClient,
      thirdPartyId,
      'WORKER',
      async (tx) => {
        return tx.referral_attributions.findMany();
      }
    );
    expect(attributionsForThirdParty.length).toBe(0);
  });
});
