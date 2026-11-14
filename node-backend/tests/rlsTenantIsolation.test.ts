import { describe, it, expect, vi } from 'vitest';
import { requestContextStorage, withRlsContext } from '../src/config/prisma';

describe('RLS Context & Prisma Extension Execution', () => {
  it('passes the transactional client with RLS session variables to query execution callback', async () => {
    const executedRawQueries: string[] = [];
    const mockTx = {
      $executeRawUnsafe: vi.fn(async (sql: string, val: string) => {
        executedRawQueries.push(`${sql} => ${val}`);
        return 1;
      }),
      shift: {
        findMany: vi.fn(async (args: any) => {
          return [{ id: 'shift-123', workerId: 'worker-a', status: 'COMPLETED' }];
        })
      }
    };

    const mockClient = {
      $transaction: vi.fn(async (callback: any) => {
        return callback(mockTx);
      })
    };

    const result = await withRlsContext(
      mockClient as any,
      'worker-a',
      'WORKER',
      async (tx: any) => {
        return tx.shift.findMany({ where: { status: 'COMPLETED' } });
      }
    );

    // Verify session variables set
    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_id', $1, true);`,
      'worker-a'
    );
    expect(mockTx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_role', $1, true);`,
      'WORKER'
    );

    // Verify query executed on tx
    expect(mockTx.shift.findMany).toHaveBeenCalledWith({ where: { status: 'COMPLETED' } });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('shift-123');
  });

  it('runs within AsyncLocalStorage request context correctly isolating context state', async () => {
    let capturedUserId1: string | undefined;
    let capturedUserId2: string | undefined;

    await requestContextStorage.run({ currentUserId: 'user-tenant-1', currentUserRole: 'EMPLOYER' }, async () => {
      capturedUserId1 = requestContextStorage.getStore()?.currentUserId;
    });

    await requestContextStorage.run({ currentUserId: 'user-tenant-2', currentUserRole: 'WORKER' }, async () => {
      capturedUserId2 = requestContextStorage.getStore()?.currentUserId;
    });

    expect(capturedUserId1).toBe('user-tenant-1');
    expect(capturedUserId2).toBe('user-tenant-2');
    expect(requestContextStorage.getStore()).toBeUndefined();
  });
});
