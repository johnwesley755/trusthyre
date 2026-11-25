/**
 * Centralized TTL policies (in seconds) for application caches.
 */
export const CacheTTL = {
  // Discovery & Search
  jobSearch: 45,
  jobDetail: 90,
  workerSearch: 30,
  workerProfile: 60,
  popularEmployers: 180,

  // Dashboards & User States
  employerDashboard: 15,
  workerDashboard: 15,
  adminStats: 30,

  // Metadata & Geographic data (Relatively static)
  metadataOptions: 3600 * 2, // 2 hours
  locationStates: 3600 * 24, // 24 hours
  locationDistricts: 3600 * 24, // 24 hours
  locationLocalities: 3600 * 6, // 6 hours
  locationPincode: 3600 * 24 * 7, // 7 days

  // Blog & Content
  blogList: 60,
  blogDetail: 600, // 10 minutes
  blogCategories: 3600, // 1 hour
} as const;
