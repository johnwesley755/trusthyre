import apiClient from '../api/apiClient';
import type { Job } from '../types';

export type { Job };

export interface CreateJobDto {
  title: string;
  description: string;
  industry: string;
  requiredSkills: string[];
  experienceYearsRequired: number;
  budget: number;
  location: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  expiresAt?: string | null;
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
}

export const jobService = {
  createJob: async (data: CreateJobDto): Promise<Job> => {
    const res = await apiClient.post<Job>('/api/jobs', data);
    return res.data;
  },
  getAllJobs: async (params?: any): Promise<Job[]> => {
    const isFilterObj = params && typeof params === 'object' && ('query' in params || 'industry' in params || 'location' in params || 'city' in params);
    const res = await apiClient.get<Job[]>('/api/jobs', { params: isFilterObj ? params : undefined });
    return res.data;
  },
  getMyJobs: async (): Promise<Job[]> => {
    const res = await apiClient.get<Job[]>('/api/jobs/employer');
    return res.data;
  },
  getJobStats: async (): Promise<any> => {
    const res = await apiClient.get('/api/jobs/stats');
    return res.data;
  },
  getJobById: async (id: string): Promise<Job> => {
    const res = await apiClient.get<Job>(`/api/jobs/${id}`);
    return res.data;
  },
  updateJob: async (id: string, data: Partial<CreateJobDto>): Promise<Job> => {
    const res = await apiClient.put<Job>(`/api/jobs/${id}`, data);
    return res.data;
  },
  deleteJob: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/jobs/${id}`);
  },
  getJobsByIds: async (ids: string[]): Promise<Job[]> => {
    const res = await apiClient.post<Job[]>('/api/jobs/by-ids', { ids });
    return res.data;
  },
  getEmployerJobs: async (): Promise<Job[]> => {
    return jobService.getMyJobs();
  },
};
