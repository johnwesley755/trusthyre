/**
 * Centralized Query Key Factory for TanStack Query
 * Follows TanStack Query best practices for hierarchical, serializable query keys.
 */

export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
  },
  workers: {
    all: ['workers'] as const,
    search: (params?: Record<string, any>) => ['workers', 'search', params || {}] as const,
    detail: (id: string) => ['workers', 'detail', id] as const,
    me: ['workers', 'me'] as const,
    ratings: (id: string) => ['workers', 'ratings', id] as const,
    scoring: (id: string) => ['workers', 'scoring', id] as const,
    level: (id: string) => ['workers', 'level', id] as const,
    trustScore: (id: string) => ['workers', 'trustScore', id] as const,
    byUserIds: (ids: string[]) => ['workers', 'byUserIds', [...ids].sort().join(',')] as const,
  },
  employer: {
    profile: ['employer', 'profile'] as const,
    stats: ['employer', 'stats'] as const,
    workerStatus: (workerId: string) => ['employer', 'workerStatus', workerId] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    search: (params?: Record<string, any>) => ['jobs', 'search', params || {}] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    employerJobs: ['jobs', 'employer'] as const,
    applications: (jobId: string) => ['jobs', 'applications', jobId] as const,
    allEmployerApplications: (jobIds: string[]) => ['jobs', 'allEmployerApplications', [...jobIds].sort().join(',')] as const,
    myApplications: ['jobs', 'myApplications'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    unreadCount: ['notifications', 'unreadCount'] as const,
  },
  activities: {
    recent: (limit?: number) => ['activities', 'recent', limit || 10] as const,
  },
  settings: {
    user: ['settings', 'user'] as const,
  },
  skillTests: {
    all: ['skillTests'] as const,
    detail: (id: string) => ['skillTests', 'detail', id] as const,
    results: (workerId: string) => ['skillTests', 'results', workerId] as const,
  },
  verification: {
    status: (userId: string) => ['verification', 'status', userId] as const,
  }
};
