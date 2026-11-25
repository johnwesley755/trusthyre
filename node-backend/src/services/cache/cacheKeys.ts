import crypto from 'crypto';

/**
 * Deterministic hash generator for query parameters.
 */
export const hashFilters = (filters: Record<string, any>): string => {
  const sortedKeys = Object.keys(filters).sort();
  const normalized: Record<string, any> = {};
  for (const k of sortedKeys) {
    const val = filters[k];
    if (val !== undefined && val !== null && val !== '') {
      normalized[k] = val;
    }
  }
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16);
};

/**
 * Standardized, versioned cache key namespaces.
 */
export const CacheKeys = {
  jobSearch: (filterHash: string, page = 1, limit = 15) =>
    `trusthyre:v1:jobs:search:${filterHash}:${page}:${limit}`,

  jobDetail: (jobId: string) =>
    `trusthyre:v1:jobs:detail:${jobId}`,

  jobStats: () =>
    `trusthyre:v1:jobs:stats`,

  workerSearch: (filterHash: string, page = 1, limit = 15) =>
    `trusthyre:v1:workers:search:${filterHash}:${page}:${limit}`,

  workerProfile: (workerId: string) =>
    `trusthyre:v1:workers:profile:${workerId}`,

  popularEmployers: (city?: string) =>
    `trusthyre:v1:employers:popular:${(city || 'all').toLowerCase().trim()}`,

  dashboardSummary: (userId: string, role: string) =>
    `trusthyre:v1:dashboard:${role.toLowerCase().trim()}:${userId}`,

  adminStats: () =>
    `trusthyre:v1:admin:stats`,

  metadataOptions: () =>
    `trusthyre:v1:metadata:options`,

  locationStates: () =>
    `trusthyre:v1:locations:states`,

  locationDistricts: (state: string) =>
    `trusthyre:v1:locations:districts:${state.toLowerCase().trim()}`,

  locationPincode: (pincode: string) =>
    `trusthyre:v1:locations:pincode:${pincode.trim()}`,

  blogList: (page = 1) =>
    `trusthyre:v1:blog:list:${page}`,

  blogDetail: (slug: string) =>
    `trusthyre:v1:blog:article:${slug.toLowerCase().trim()}`,

  blogCategories: () =>
    `trusthyre:v1:blog:categories`,
};
