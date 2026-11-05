import apiClient from '../api/apiClient';
import type { Rating } from '../types';

export const ratingService = {
  createRating: async (data: { rateeId: string; jobId: string; score: number; comment?: string }): Promise<Rating> => {
    const res = await apiClient.post<Rating>('/api/ratings', data);
    return res.data;
  },
  submitRating: async (data: { rateeId: string; jobId: string; score: number; comment?: string }): Promise<Rating> => {
    const res = await apiClient.post<Rating>('/api/ratings', data);
    return res.data;
  },
  getRatingsForRatee: async (rateeId: string): Promise<Rating[]> => {
    const res = await apiClient.get<any>(`/api/ratings/user/${rateeId}`);
    return res.data?.data || res.data || [];
  },
  checkEligibility: async (jobId: string, rateeId: string): Promise<{
    eligible: boolean;
    alreadyRated: boolean;
    rating?: Rating;
  }> => {
    const res = await apiClient.get<any>('/api/ratings/eligibility', {
      params: { jobId, rateeId }
    });
    return res.data?.data || res.data;
  },
  getRatingsForJob: async (jobId: string): Promise<Rating[]> => {
    const res = await apiClient.get<any>(`/api/ratings/job/${jobId}`);
    return res.data?.data || res.data || [];
  },
  getRatingSummary: async (userId: string): Promise<{ average: number }> => {
    const res = await apiClient.get<any>(`/api/ratings/user/${userId}/average`);
    return { average: res.data?.data || res.data || 0 };
  },
};
