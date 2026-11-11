import { PrismaClient } from '@prisma/client';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { AsyncLocalStorage } from 'node:async_hooks';

// Ensure WebSocket constructor is set in Node.js environments (Workers provide global WebSocket)
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

export interface RequestScope {
  prisma?: PrismaClient;
  pool?: any;
  env?: any;
  ctx?: any;
  currentUserId?: string;
  currentUserRole?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestScope>();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let cachedLocalPrisma: PrismaClient | null = globalForPrisma.prisma || null;

const DEFAULT_LOCAL_DATABASE_URL = "postgresql://postgres:G2q2hxzc%2427@localhost:5432/trusthire_auth_db?schema=public";

const attachRetryExtension = (client: PrismaClient): PrismaClient => {
  return (client as any).$extends({
    query: {
      async $allOperations({ operation, model, args, query }: any) {
        let attempts = 3;
        let delay = 600;

        while (attempts > 0) {
          try {
            return await query(args);
          } catch (error: any) {
            const errMsg = String(error?.message || '');
            const errCode = String((error as any)?.code || '');
            const isColdStartOrConnError =
              errCode === 'P1001' ||
              errCode === 'P1002' ||
              errCode === 'P1008' ||
              errCode === 'P1017' ||
              errMsg.includes("Can't reach database server") ||
              errMsg.includes("Connection terminated unexpectedly") ||
              errMsg.includes("connection closed") ||
              errMsg.includes("WebSocket") ||
              errMsg.includes("fetch failed") ||
              errMsg.includes("Server closed the connection") ||
              errMsg.includes("terminating connection due to administrator command");

            if (isColdStartOrConnError && attempts > 1) {
              attempts--;
              console.warn(`[Prisma/Neon] Transient DB connection/cold-start error (${errCode || errMsg.slice(0, 50)}). Retrying in ${delay}ms... (${attempts} retries remaining)`);
              await new Promise((res) => setTimeout(res, delay));
              delay *= 2;
              continue;
            }
            throw error;
          }
        }
      }
    }
  }) as unknown as PrismaClient;
};

const getLocalClient = (dbUrl: string): PrismaClient => {
  if (cachedLocalPrisma) {
    return cachedLocalPrisma;
  }

  if (dbUrl.includes('neon.tech')) {
    let finalUrl = dbUrl;
    if (!finalUrl.includes('connect_timeout=')) {
      finalUrl += finalUrl.includes('?') ? '&connect_timeout=15' : '?connect_timeout=15';
    }
    const pool = new NeonPool({
      connectionString: finalUrl,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
    });
    const adapter = new PrismaNeon(pool);
    const baseClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    cachedLocalPrisma = attachRetryExtension(baseClient);
    globalForPrisma.prisma = cachedLocalPrisma;
    return cachedLocalPrisma;
  }

  // Standard Local PostgreSQL Connection with pg driver adapter
  try {
    const { Pool: PgPool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new PgPool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 15000,
      max: 10,
    });
    const adapter = new PrismaPg(pool);
    const baseClient = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    cachedLocalPrisma = attachRetryExtension(baseClient);
    globalForPrisma.prisma = cachedLocalPrisma;
    return cachedLocalPrisma;
  } catch (adapterErr) {
    console.warn('[Prisma] Could not load @prisma/adapter-pg, falling back to direct PrismaClient:', adapterErr);
    let finalUrl = dbUrl;
    if (!finalUrl.includes('connection_limit')) {
      finalUrl += finalUrl.includes('?') ? '&connection_limit=10' : '?connection_limit=10';
    }
    if (!finalUrl.includes('connect_timeout=')) {
      finalUrl += finalUrl.includes('?') ? '&connect_timeout=15' : '?connect_timeout=15';
    }
    const baseClient = new PrismaClient({
      datasources: { db: { url: finalUrl } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
    cachedLocalPrisma = attachRetryExtension(baseClient);
    globalForPrisma.prisma = cachedLocalPrisma;
    return cachedLocalPrisma;
  }
};

const createPrismaClient = (): PrismaClient => {
  const store = requestContextStorage.getStore();

  // 1. If running within a Cloudflare Workers request context
  if (store) {
    if (store.prisma) {
      return store.prisma;
    }

    const rawUrl = store.env?.DATABASE_URL || process.env.DATABASE_URL || (globalThis as any).DATABASE_URL || DEFAULT_LOCAL_DATABASE_URL;

    let dbUrl = rawUrl;
    if (dbUrl.includes('neon.tech')) {
      if (!dbUrl.includes('connect_timeout=')) {
        dbUrl += dbUrl.includes('?') ? '&connect_timeout=15' : '?connect_timeout=15';
      }

      // Create a fresh Neon Pool bound to THIS specific request's execution context
      const pool = new NeonPool({
        connectionString: dbUrl,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
      });

      store.pool = pool;

      const adapter = new PrismaNeon(pool);
      const baseClient = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });

      const clientWithRetry = attachRetryExtension(baseClient);
      store.prisma = clientWithRetry;
      return clientWithRetry;
    }

    // In local Node server request context, reuse local client
    const localClient = getLocalClient(dbUrl);
    store.prisma = localClient;
    return localClient;
  }

  // 2. Fallback for non-request environments (e.g. Node.js local dev server, seeds, migrations)
  const rawUrl = process.env.DATABASE_URL || (globalThis as any).process?.env?.DATABASE_URL || (globalThis as any).DATABASE_URL || DEFAULT_LOCAL_DATABASE_URL;
  return getLocalClient(rawUrl);
};

// Use Proxy for lazy evaluation so module import at deploy time doesn't throw if env is not yet bound
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = createPrismaClient();
    const val = Reflect.get(client, prop, receiver);
    return typeof val === 'function' ? val.bind(client) : val;
  }
});

/**
 * Runs a transactional query block bound to explicit PostgreSQL RLS session variables.
 * Automatically clears on transaction completion to prevent connection pooling context bleed.
 */
export const withRlsContext = async <T>(
  client: PrismaClient,
  userId: string | undefined,
  role: string | undefined,
  fn: (tx: any) => Promise<T>
): Promise<T> => {
  return (client as any).$transaction(async (tx: any) => {
    if (userId) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true);`, userId);
    }
    if (role) {
      await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_role', $1, true);`, role);
    }
    return fn(tx);
  });
};

export default prisma;
