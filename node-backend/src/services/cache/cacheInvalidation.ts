import { cacheService } from './cacheService';
import { CacheKeys } from './cacheKeys';

/**
 * Domain-specific cache invalidation triggers for write mutations.
 */
export const cacheInvalidation = {
  /**
   * Invalidate specific job details and related statistics.
   */
  async invalidateJob(jobId: string) {
    await cacheService.delete([
      CacheKeys.jobDetail(jobId),
      CacheKeys.jobStats()
    ]);
  },

  /**
   * Invalidate user-scoped dashboard summary.
   */
  async invalidateUserDashboard(userId: string, role: string) {
    await cacheService.delete(CacheKeys.dashboardSummary(userId, role));
  },

  /**
   * Invalidate worker profile cache.
   */
  async invalidateWorker(workerId: string) {
    await cacheService.delete(CacheKeys.workerProfile(workerId));
  },

  /**
   * Invalidate blog articles and listings.
   */
  async invalidateBlog(slug?: string) {
    const keys = [CacheKeys.blogList(1), CacheKeys.blogCategories()];
    if (slug) keys.push(CacheKeys.blogDetail(slug));
    await cacheService.delete(keys);
  }
};
