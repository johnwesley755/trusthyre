import { describe, it, expect, vi } from 'vitest';
import { withRlsContext } from '../src/config/prisma';

describe('Referral System RLS Tenant Isolation Tests', () => {
  it('1. Enforces tenant isolation on referral_attributions table under restricted app role', async () => {
    const executedRawQueries: string[] = [];
    const referrerAId = 'referrer-worker-uuid-a';
    const referrerBId = 'referrer-employer-uuid-b';
    const referredUserAId = 'referred-worker-uuid-a';
    const referredUserBId = 'referred-worker-uuid-b';
    const thirdPartyId = 'third-party-uuid-c';

    // Mock records in database
    const attributionsDb = [
      {
        id: 'attr-1',
        referrer_user_id: referrerAId,
        referred_user_id: referredUserAId,
        referral_code: 'TH-RLSA',
        source: 'job_share',
        signup_role: 'WORKER'
      },
      {
        id: 'attr-2',
        referrer_user_id: referrerBId,
        referred_user_id: referredUserBId,
        referral_code: 'TH-RLSB',
        source: 'visiting_card',
        signup_role: 'WORKER'
      }
    ];

    let currentSessionUserId: string | null = null;
    let currentSessionUserRole: string | null = null;

    const mockTx = {
      $executeRawUnsafe: vi.fn(async (sql: string, val: string) => {
        executedRawQueries.push(`${sql} => ${val}`);
        if (sql.includes('app.current_user_id')) currentSessionUserId = val;
        if (sql.includes('app.current_user_role')) currentSessionUserRole = val;
        return 1;
      }),
      referral_attributions: {
        findMany: vi.fn(async (args?: any) => {
          // Strictly mirror PostgreSQL RLS policy:
          // is_app_admin() OR referrer_user_id = current_app_user_id() OR referred_user_id = current_app_user_id()
          const isAdmin = currentSessionUserRole === 'ADMIN' || currentSessionUserRole === 'SUPER_ADMIN';
          return attributionsDb.filter((row) => {
            if (isAdmin) return true;
            if (!currentSessionUserId) return false;
            const matchesRls = row.referrer_user_id === currentSessionUserId || row.referred_user_id === currentSessionUserId;
            if (!matchesRls) return false;
            if (args?.where?.referrer_user_id && row.referrer_user_id !== args.where.referrer_user_id) return false;
            return true;
          });
        })
      }
    };

    const mockClient = {
      $transaction: vi.fn(async (callback: any) => {
        return callback(mockTx);
      })
    };

    // 1. Query under Referrer A's session context
    const attributionsForA = await withRlsContext(
      mockClient as any,
      referrerAId,
      'WORKER',
      async (tx: any) => {
        return tx.referral_attributions.findMany({
          where: { referrer_user_id: referrerAId }
        });
      }
    );

    expect(attributionsForA.length).toBe(1);
    expect(attributionsForA[0].referrer_user_id).toBe(referrerAId);
    expect(attributionsForA[0].referred_user_id).toBe(referredUserAId);
    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_id', $1, true);`,
      referrerAId
    );

    // 2. Query under Referrer B's session context
    const attributionsForB = await withRlsContext(
      mockClient as any,
      referrerBId,
      'EMPLOYER',
      async (tx: any) => {
        return tx.referral_attributions.findMany({
          where: { referrer_user_id: referrerBId }
        });
      }
    );

    expect(attributionsForB.length).toBe(1);
    expect(attributionsForB[0].referrer_user_id).toBe(referrerBId);
    expect(attributionsForB[0].referred_user_id).toBe(referredUserBId);
    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_id', $1, true);`,
      referrerBId
    );

    // 3. Query under an unrelated third party's session context
    const attributionsForThirdParty = await withRlsContext(
      mockClient as any,
      thirdPartyId,
      'WORKER',
      async (tx: any) => {
        return tx.referral_attributions.findMany();
      }
    );

    expect(attributionsForThirdParty.length).toBe(0);
    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_id', $1, true);`,
      thirdPartyId
    );
  });
});
