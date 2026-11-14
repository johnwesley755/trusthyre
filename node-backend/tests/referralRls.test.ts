import { describe, it, expect, afterAll } from 'vitest';
import { prisma, withRlsContext } from '../src/config/prisma';
import { PrismaClient } from '@prisma/client';
import crypto from 'node:crypto';

describe('Referral System RLS Tenant Isolation Tests', () => {
  const referrerAId = crypto.randomUUID();
  const referrerBId = crypto.randomUUID();
  const referredUserAId = crypto.randomUUID();
  const referredUserBId = crypto.randomUUID();

  // Connect as the restricted application role (NOBYPASSRLS)
  const appClient = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://trusthire_app:apptestpassword@localhost:5432/trusthire_auth_db?schema=public'
      }
    }
  });

  afterAll(async () => {
    await appClient.$disconnect();
  });

  it('1. Enforces tenant isolation on referral_attributions table under restricted app role', async () => {
    const codeA = `TH-RLSA-${Date.now()}`;
    const codeB = `TH-RLSB-${Date.now()}`;

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

    // 3. Query under Referrer A's session context using restricted appClient
    const attributionsForA = await withRlsContext(
      appClient,
      referrerAId,
      'WORKER',
      async (tx) => {
        return tx.referral_attributions.findMany();
      }
    );

    // Referrer A must see ONLY their own referrals (referredUserAId), NOT Referrer B's
    expect(attributionsForA.length).toBe(1);
    expect(attributionsForA[0].referrer_user_id).toBe(referrerAId);
    expect(attributionsForA[0].referred_user_id).toBe(referredUserAId);

    // 4. Query under Referrer B's session context using restricted appClient
    const attributionsForB = await withRlsContext(
      appClient,
      referrerBId,
      'EMPLOYER',
      async (tx) => {
        return tx.referral_attributions.findMany();
      }
    );

    expect(attributionsForB.length).toBe(1);
    expect(attributionsForB[0].referrer_user_id).toBe(referrerBId);
    expect(attributionsForB[0].referred_user_id).toBe(referredUserBId);

    // 5. Query under an unrelated third party's session context using restricted appClient
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
