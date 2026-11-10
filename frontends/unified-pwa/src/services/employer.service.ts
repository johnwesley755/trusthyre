import apiClient from '../api/apiClient';
import type { EmployerProfile } from '../types';

export const employerService = {
  getProfile: () => apiClient.get<EmployerProfile>('/api/employer/me'),
  updateProfile: (data: Partial<EmployerProfile>) => apiClient.put<EmployerProfile>('/api/employer/me', data),
  getEmployerById: (id: string) => apiClient.get<EmployerProfile>(`/api/employer/${id}`),
  getEmployerStats: () => apiClient.get('/api/employer/stats'),
  completeOnboarding: (data: any) => apiClient.post('/api/employer/complete-onboarding', data),
  updateTier: (tier: string) => apiClient.put('/api/employer/tier', { tier }),
  unlockContact: (workerId: string) => apiClient.post<{ workerId: string; workerName: string; phoneNumber: string; whatsappPhone: string; remainingCredits: number }>(`/api/employer/unlock-contact/${workerId}`),
};
