import apiClient from '../api/apiClient';

export interface BackendJobRecommendationItem {
  job: {
    id: string;
    title: string;
    description?: string;
    city?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    budget?: number;
    payoutFrequency?: string;
    experienceYearsRequired?: number;
    isVerified?: boolean;
    requiredSkills?: string[];
    createdAt?: string;
    employerProfile?: {
      id?: string;
      companyName?: string;
      isVerified?: boolean;
      city?: string;
    } | null;
  };
  overallScore: number;
  scoreBand: string;
  distanceKm?: number | null;
  matchReasons: string[];
  matchingSkills: string[];
  missingSkills: string[];
  breakdown: {
    skills: number;
    geo: number;
    experience: number;
    compensation: number;
    verification: number;
    activity: number;
  };
}

export interface BackendJobRecommendationResponse {
  recommendations: BackendJobRecommendationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BackendWorkerRecommendationItem {
  worker: {
    id: string;
    userId: string;
    name: string;
    bio?: string;
    skills: string[];
    city?: string;
    district?: string;
    state?: string;
    level?: string;
    levelNumber?: number;
    experienceYears?: number;
    isVerified: boolean;
    trustScore: number;
    profileImageUrl?: string;
    hourlyRate?: number;
    isAvailable: boolean;
  };
  overallScore: number;
  scoreBand: string;
  distanceKm?: number | null;
  matchReasons: string[];
  matchingSkills: string[];
  missingSkills: string[];
  breakdown: {
    skills: number;
    geo: number;
    experience: number;
    compensation: number;
    verification: number;
    activity: number;
  };
}

export interface BackendWorkerRecommendationResponse {
  recommendations: BackendWorkerRecommendationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  scopedJobId?: string | null;
}

export interface RecommendationTelemetryPayload {
  interactionType: 'VIEW' | 'CLICK' | 'SAVE' | 'APPLY' | 'INVITE' | 'DISMISS';
  itemType: 'JOB' | 'WORKER';
  itemId: string;
  matchScore?: number;
  metadata?: Record<string, any>;
}

export const recommendationService = {
  /**
   * Fetches personalized recommended jobs for the authenticated worker from the backend engine.
   * Gated: WORKER-only on backend.
   */
  getRecommendedJobs: async (params?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    page?: number;
    limit?: number;
  }): Promise<BackendJobRecommendationResponse> => {
    const res = await apiClient.get<any>('/api/recommendations/jobs', {
      params: {
        lat: params?.lat,
        lng: params?.lng,
        radiusKm: params?.radiusKm,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10
      }
    });

    const data = res.data?.data || res.data;
    return {
      recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      limit: data?.limit ?? 10,
      totalPages: data?.totalPages ?? 1
    };
  },

  /**
   * Fetches top candidate recommendations for an employer's active openings.
   * Gated: EMPLOYER-only on backend.
   */
  getRecommendedWorkers: async (params?: {
    jobId?: string;
    page?: number;
    limit?: number;
  }): Promise<BackendWorkerRecommendationResponse> => {
    const res = await apiClient.get<any>('/api/recommendations/workers', {
      params: {
        jobId: params?.jobId,
        page: params?.page ?? 1,
        limit: params?.limit ?? 10
      }
    });

    const data = res.data?.data || res.data;
    return {
      recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      limit: data?.limit ?? 10,
      totalPages: data?.totalPages ?? 1,
      scopedJobId: data?.scopedJobId ?? null
    };
  },

  /**
   * Ingests recommendation telemetry feedback interactions.
   * Types: VIEW, CLICK, SAVE, APPLY, INVITE, DISMISS.
   */
  recordTelemetry: async (payload: RecommendationTelemetryPayload): Promise<{ success: boolean; id?: string }> => {
    try {
      const res = await apiClient.post<any>('/api/recommendations/telemetry', payload);
      return { success: true, id: res.data?.data?.id };
    } catch (err: any) {
      // Telemetry failures should degrade gracefully without crashing the UI
      console.warn('Failed to record recommendation telemetry:', err?.message || err);
      return { success: false };
    }
  }
};
