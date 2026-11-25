import crypto from 'crypto';

/**
 * Deep recursive key normalization and sorting.
 */
function canonicalizeValue(val: any): any {
  if (val === null || val === undefined || val === '') return undefined;
  if (Array.isArray(val)) {
    return val.map(canonicalizeValue).filter(v => v !== undefined).sort();
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const sorted: Record<string, any> = {};
    for (const k of Object.keys(val).sort()) {
      const canonical = canonicalizeValue(val[k]);
      if (canonical !== undefined) {
        sorted[k] = canonical;
      }
    }
    return sorted;
  }
  return val;
}

/**
 * Deterministic hash generator for query parameters.
 * Produces full 32-character SHA-256 digest to prevent hash collisions.
 */
export const hashFilters = (filters: Record<string, any>): string => {
  const normalized = canonicalizeValue(filters) || {};
  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 32);
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

  workerSearch: (filterHash: string, page = 1, limit = 15, employerScope?: string) =>
    `trusthyre:v1:workers:search:${employerScope || 'public'}:${filterHash}:${page}:${limit}`,

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

  locationLocalities: (district: string) =>
    `trusthyre:v1:locations:localities:${district.toLowerCase().trim()}`,

  locationPincode: (pincode: string) =>
    `trusthyre:v1:locations:pincode:${pincode.trim()}`,

  blogList: (page = 1) =>
    `trusthyre:v1:blog:list:${page}`,

  blogDetail: (slug: string) =>
    `trusthyre:v1:blog:article:${slug.toLowerCase().trim()}`,

  blogCategories: () =>
    `trusthyre:v1:blog:categories`,
};
