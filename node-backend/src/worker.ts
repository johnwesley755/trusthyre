import app from './app';
import { requestContextStorage, RequestScope } from './config/prisma';

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const store: RequestScope = { env, ctx };
    return requestContextStorage.run(store, async () => {
      try {
        return await app.fetch(request, env, ctx);
      } finally {
        if (store.pool) {
          ctx?.waitUntil?.(store.pool.end());
        }
      }
    });
  },

  async scheduled(event: any, env: any, ctx: any): Promise<void> {
    const store: RequestScope = { env, ctx };
    await requestContextStorage.run(store, async () => {
      try {
        console.log(`⏰ [Cloudflare Cron] Scheduled event triggered: ${event.cron || 'daily'}`);
        const { DailyDigestService } = await import('./services/dailyDigestService');
        await DailyDigestService.sendDailyDigests();
      } catch (err: any) {
        console.error('❌ [Cloudflare Cron] Scheduled execution failure:', err.message);
      } finally {
        if (store.pool) {
          ctx?.waitUntil?.(store.pool.end());
        }
      }
    });
  },
};

