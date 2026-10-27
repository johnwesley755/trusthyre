import apiClient from '../api/apiClient';

export interface AdminStats {
  totalWorkers: number;
  totalEmployers: number;
  totalUsers: number;
  totalJobs: number;
  openJobs: number;
  totalApplications: number;
  totalHired: number;
  pendingVerifications: number;
  totalVerifications: number;
  escrowVolume: number;
  recentUsers: any[];
  recentJobs: any[];
}

export interface VerificationItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  userPhoto?: string;
  role: string;
  verificationType: string;
  docImageUrl?: string;
  liveImageUrl?: string;
  confidenceScore?: string;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED';
  failureReason?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  role: 'WORKER' | 'EMPLOYER' | 'ADMIN';
  email_verified: boolean;
  onboarded: boolean;
  created_at: string;
}

export interface AdminJobItem {
  id: string;
  title: string;
  employer_name?: string;
  employer_id?: string;
  city?: string;
  location?: string;
  budget?: number;
  status: string;
  is_external?: boolean;
  source_name?: string;
  source_url?: string;
  external_id?: string;
  date_posted?: string;
  applicantCount?: number;
  created_at: string;
}

export interface AdminSourceItem {
  source_id: string;
  name: string;
  status: string;
  is_restricted: boolean;
  compliance_note: string;
  last_checked_at: string;
  error_message?: string;
}

export interface AdminScanStatus {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'INTERRUPTED';
  total_found: number;
  valid_count: number;
  duplicate_count: number;
  rejected_count: number;
  error_count: number;
  sources_scanned: string[];
  source_stats: Record<string, any>;
  started_at: string;
  completed_at?: string;
}

export interface DynamicScanPayload {
  query?: string;
  city?: string;
  category?: string;
  sources?: string[];
  limit?: number;
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const res = await apiClient.get<AdminStats>('/api/admin/stats');
    return res.data;
  },

  getVerifications: async (status: string = 'ALL'): Promise<VerificationItem[]> => {
    const res = await apiClient.get<VerificationItem[]>('/api/admin/verifications', {
      params: { status }
    });
    return res.data || [];
  },

  updateVerificationStatus: async (
    id: string, 
    status: 'VERIFIED' | 'REJECTED', 
    failureReason?: string
  ): Promise<any> => {
    const res = await apiClient.patch(`/api/admin/verifications/${id}/status`, {
      status,
      failureReason
    });
    return res.data;
  },

  getUsers: async (params?: { role?: string; q?: string }): Promise<AdminUserItem[]> => {
    const res = await apiClient.get<AdminUserItem[]>('/api/admin/users', { params });
    return res.data || [];
  },

  getJobs: async (params?: { status?: string; q?: string }): Promise<AdminJobItem[]> => {
    const res = await apiClient.get<AdminJobItem[]>('/api/admin/jobs', { params });
    return res.data || [];
  },

  deleteJob: async (id: string): Promise<any> => {
    const res = await apiClient.delete(`/api/admin/jobs/${id}`);
    return res.data;
  },

  moderateJob: async (id: string, action: 'approve' | 'reject' | 'expire', reason?: string): Promise<any> => {
    const res = await apiClient.patch(`/api/admin/jobs/${id}/moderate`, { action, reason });
    return res.data;
  },

  getScanStatus: async (scanId: string): Promise<AdminScanStatus> => {
    const res = await apiClient.get<AdminScanStatus>(`/api/admin/jobs/scan-status/${scanId}`);
    return res.data;
  },

  getScraperSources: async (): Promise<AdminSourceItem[]> => {
    const res = await apiClient.get<AdminSourceItem[]>('/api/admin/jobs/sources');
    return res.data || [];
  },

  createAdmin: async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<any> => {
    const res = await apiClient.post('/api/admin/users/create-admin', data);
    return res.data;
  },

  syncExternalJobs: async (data?: DynamicScanPayload): Promise<any> => {
    const res = await apiClient.post('/api/admin/jobs/sync-external', data || {});
    return res.data;
  },

  runFreshnessCycle: async (): Promise<any> => {
    const res = await apiClient.post('/api/admin/jobs/freshness-cycle', {});
    return res.data;
  },

  getVisitorAnalytics: async (refresh = false): Promise<VisitorAnalyticsData> => {
    const res = await apiClient.get<VisitorAnalyticsData>(`/api/admin/analytics/visitors${refresh ? '?refresh=true' : ''}`);
    return res.data;
  }
};

export interface VisitorAnalyticsData {
  status: 'connected' | 'not_configured' | 'error';
  errorMessage?: string;
  measurementId: string;
  propertyId?: string;
  realtime: {
    activeUsers: number;
    lastUpdated: string;
  };
  metrics: {
    todayUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    totalPageViews: number;
    averageSessionDurationSeconds: number;
  };
  trend: Array<{
    date: string;
    label: string;
    users: number;
    pageViews: number;
  }>;
  topPages: Array<{
    path: string;
    title: string;
    views: number;
    users: number;
  }>;
  topCities: Array<{
    city: string;
    state?: string;
    users: number;
    percentage: number;
  }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
  trafficChannels: Array<{
    channel: string;
    sessions: number;
    percentage: number;
  }>;
  setupInstructions?: {
    isConfigured: boolean;
    missingEnvVars: string[];
    helpUrl: string;
  };
}


