import apiClient from '../api/apiClient';

export interface SearchAlert {
  id: string;
  user_id: string;
  alert_type: 'JOB_ALERT' | 'CANDIDATE_ALERT';
  title: string;
  query?: string | null;
  city?: string | null;
  category?: string | null;
  min_salary?: number | null;
  max_salary?: number | null;
  experience?: string | null;
  is_active: boolean;
  frequency: 'INSTANT' | 'DAILY';
  last_notified_at?: string | null;
  match_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSearchAlertPayload {
  alertType?: 'JOB_ALERT' | 'CANDIDATE_ALERT';
  title?: string;
  query?: string;
  city?: string;
  category?: string;
  minSalary?: number;
  maxSalary?: number;
  experience?: string;
  frequency?: 'INSTANT' | 'DAILY';
}

export const searchAlertService = {
  createAlert: async (payload: CreateSearchAlertPayload): Promise<SearchAlert> => {
    const res = await apiClient.post<any>('/api/search/alerts', payload);
    return res.data?.data || res.data;
  },

  getMyAlerts: async (alertType?: string): Promise<SearchAlert[]> => {
    const res = await apiClient.get<any>('/api/search/alerts', {
      params: alertType ? { alertType } : {}
    });
    return res.data?.data || res.data || [];
  },

  toggleAlert: async (alertId: string, isActive: boolean): Promise<any> => {
    const res = await apiClient.patch<any>(`/api/search/alerts/${alertId}/toggle`, { isActive });
    return res.data;
  },

  deleteAlert: async (alertId: string): Promise<any> => {
    const res = await apiClient.delete<any>(`/api/search/alerts/${alertId}`);
    return res.data;
  },

  testCandidateMatch: async (alertId?: string): Promise<any> => {
    const res = await apiClient.post<any>('/api/search/alerts/test-match', { alertId, alertType: 'CANDIDATE_ALERT' });
    return res.data?.data || res.data;
  },

  testJobMatch: async (alertId?: string): Promise<any> => {
    const res = await apiClient.post<any>('/api/search/alerts/test-match', { alertId, alertType: 'JOB_ALERT' });
    return res.data?.data || res.data;
  }
};

