import { cacheService } from './cacheService';
import { CacheKeys } from './cacheKeys';

/**
 * Domain-specific cache invalidation triggers for write mutations.
 */
export const cacheInvalidation = {
  /**
   * Invalidate specific job details, related statistics, and popular employers.
   */
  async invalidateJob(jobId: string, city?: string | null) {
    const keys = [
      CacheKeys.jobDetail(jobId),
      CacheKeys.jobStats(),
      CacheKeys.popularEmployers(city || undefined),
      CacheKeys.popularEmployers('all')
    ];
    await cacheService.delete(keys);
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
   * Invalidate metadata and location caches.
   */
  async invalidateMetadata(type: 'options' | 'locations' | 'all' = 'all') {
    const keys: string[] = [];
    if (type === 'options' || type === 'all') {
      keys.push(CacheKeys.metadataOptions());
    }
    if (type === 'locations' || type === 'all') {
      keys.push(
        CacheKeys.locationStates(),
        CacheKeys.locationLocalities(),
        CacheKeys.locationDistricts('all')
      );
    }
    if (keys.length > 0) {
      await cacheService.delete(keys);
    }
  },

  /**
   * Invalidate blog articles, categories and listings.
   */
  async invalidateBlog(slug?: string) {
    const keys = [
      CacheKeys.blogCategories(),
      CacheKeys.blogList(1),
      CacheKeys.blogList(2),
      CacheKeys.blogList(3)
    ];
    if (slug) {
      keys.push(CacheKeys.blogDetail(slug));
    }
    await cacheService.delete(keys);
  }
};
