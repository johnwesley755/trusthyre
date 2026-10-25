import prisma from '../config/prisma';

export interface FreshnessCycleResult {
  expiredByTTL: number;
  verifiedActive: number;
  expiredByDeadLink: number;
}

export class JobFreshnessWorker {
  /**
   * Purges or marks jobs expired when their 14-day TTL has passed.
   */
  static async purgeExpiredJobs(): Promise<number> {
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await prisma.jobs.updateMany({
      where: {
        status: 'OPEN',
        is_external: true,
        OR: [
          { expires_at: { lte: now } },
          { expires_at: null, created_at: { lte: thirtyDaysAgo } },
        ],
      },
      data: {
        status: 'EXPIRED',
      },
    });

    // Mirror to search index
    if (result.count > 0) {
      await prisma.job_search_index.updateMany({
        where: {
          job_id: {
            in: (
              await prisma.jobs.findMany({
                where: { status: 'EXPIRED', is_external: true },
                select: { id: true },
              })
            ).map((j) => j.id),
          },
        },
        data: { status: 'EXPIRED' },
      });
    }

    return result.count;
  }

  /**
   * Liveness checker: performs lightweight HEAD check on active external jobs to detect 404/410 dead postings.
   */
  static async verifyLivenessBatch(batchSize: number = 20): Promise<{ verifiedActive: number; expiredByDeadLink: number }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const candidates = await prisma.jobs.findMany({
      where: {
        status: 'OPEN',
        is_external: true,
        source_url: { not: null },
        OR: [
          { last_verified_at: null },
          { last_verified_at: { lte: oneDayAgo } },
        ],
      },
      take: batchSize,
      select: { id: true, source_url: true },
    });

    let verifiedActive = 0;
    let expiredByDeadLink = 0;

    for (const job of candidates) {
      if (!job.source_url) continue;

      try {
        const parsed = new URL(job.source_url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          continue;
        }

        const res = await fetch(job.source_url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(4000),
          headers: { 'User-Agent': 'TrustHyre-LivenessBot/1.0' },
        });

        if (res.status === 404 || res.status === 410) {
          // Job listing is confirmed dead/removed by host
          await prisma.jobs.update({
            where: { id: job.id },
            data: { status: 'EXPIRED' },
          });
          expiredByDeadLink++;
        } else {
          // Still active or redirects to active portal
          await prisma.jobs.update({
            where: { id: job.id },
            data: { last_verified_at: new Date() },
          });
          verifiedActive++;
        }
      } catch {
        // Network timeout / bot protection block -> keep open but don't mark verified
      }
    }

    return { verifiedActive, expiredByDeadLink };
  }

  /**
   * Executes a full freshness maintenance cycle.
   */
  static async runCycle(): Promise<FreshnessCycleResult> {
    const expiredByTTL = await this.purgeExpiredJobs();
    const { verifiedActive, expiredByDeadLink } = await this.verifyLivenessBatch(20);

    return {
      expiredByTTL,
      verifiedActive,
      expiredByDeadLink,
    };
  }
}
