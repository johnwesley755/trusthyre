import apiClient from '../api/apiClient';

export interface LeadRequirementItem {
  id: string;
  lead_id: string;
  title: string;
  normalized_title: string;
  category?: string | null;
  description?: string | null;
  city?: string | null;
  location?: string | null;
  workers_needed: number;
  salary_range?: string | null;
  source_name: string;
  source_url: string;
  source_hash: string;
  is_verified: boolean;
  discovered_at: string;
  last_seen_at: string;
  status: string;
}

export interface LeadOutreachLogItem {
  id: string;
  lead_id: string;
  admin_id: string;
  channel: string;
  contact_target?: string | null;
  notes: string;
  outcome?: string | null;
  contacted_at: string;
}

export interface EmployerLeadItem {
  id: string;
  company_name: string;
  normalized_name: string;
  company_domain?: string | null;
  company_website?: string | null;
  industry?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  official_email?: string | null;
  official_phone?: string | null;
  contact_page_url?: string | null;
  contactability_score: 'COMPLETE' | 'PARTIAL' | 'UNCONTACTABLE';
  status: 'DISCOVERED' | 'REVIEWING' | 'VERIFIED' | 'CONTACTABLE' | 'CONTACTED' | 'RESPONDED' | 'INTERESTED' | 'ONBOARDED' | 'INVALID' | 'DUPLICATE' | 'EXPIRED' | 'NOT_INTERESTED';
  trusthire_employer_id?: string | null;
  created_at: string;
  updated_at: string;
  requirements: LeadRequirementItem[];
  outreach_logs: LeadOutreachLogItem[];
}

export interface LeadStatsResponse {
  totalLeads: number;
  completeLeads: number;
  verifiedLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  totalRequirements: number;
}

export interface GetLeadsParams {
  status?: string;
  contactability?: string;
  city?: string;
  category?: string;
  sortBy?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface DiscoverySourceItem {
  id: string;
  name: string;
  type: string;
  status: string;
  active: boolean;
  complianceNote: string;
  lastScan: string | null;
}

export interface CrawledJobData {
  companyName: string;
  companyWebsite: string | null;
  industry: string | null;
  city: string | null;
  officialEmail: string | null;
  officialPhone: string | null;
  contactPageUrl: string | null;
  title: string;
  category: string;
  workersNeeded: number | null;
  salaryRange: string | null;
  sourceName: string;
  sourceUrl: string;
  description: string;
}

export interface CrawlUrlResult {
  success: boolean;
  data: CrawledJobData;
  lead: CrawledJobData;
  logs: any[];
  session: any;
}

export interface AutoDiscoveryResponse {
  success: boolean;
  totalScanned: number;
  newLeadsCount: number;
  updatedLeadsCount: number;
  duplicatesIgnored: number;
  rejectedCount: number;
  results: any[];
  sourceBreakdown?: Array<{
    sourceId: string;
    sourceName: string;
    status: string;
    leadsFound: number;
    requirementsFound: number;
    error?: string;
  }>;
}

export const leadService = {
  getLeads: async (params?: GetLeadsParams): Promise<{ total: number; page: number; limit: number; totalPages: number; leads: EmployerLeadItem[] }> => {
    const response = await apiClient.get('/api/admin/leads', { params });
    const payload = response.data?.data || response.data;
    return {
      total: payload?.total || 0,
      page: payload?.page || 1,
      limit: payload?.limit || 10,
      totalPages: payload?.totalPages || 1,
      leads: payload?.leads || []
    };
  },

  getStats: async (): Promise<LeadStatsResponse> => {
    const response = await apiClient.get('/api/admin/leads/stats');
    const raw = response.data;
    return raw?.stats || raw?.data || raw;
  },

  ingestLead: async (data: any): Promise<any> => {
    const response = await apiClient.post('/api/admin/leads/ingest', data);
    return response.data;
  },

  batchIngest: async (leads: any[]): Promise<any> => {
    const response = await apiClient.post('/api/admin/leads/batch-ingest', { leads });
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<any> => {
    const response = await apiClient.patch(`/api/admin/leads/${id}/status`, { status });
    return response.data;
  },

  logOutreach: async (id: string, data: { channel: string; contactTarget?: string; notes: string; outcome?: string }): Promise<any> => {
    const response = await apiClient.post(`/api/admin/leads/${id}/outreach`, data);
    return response.data;
  },

  convertLead: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/api/admin/leads/${id}/convert`);
    return response.data;
  },

  runAutoDiscovery: async (params?: { query?: string; city?: string; sources?: string[]; limit?: number }): Promise<any> => {
    const response = await apiClient.post('/api/admin/leads/run-discovery', params || {});
    return response.data;
  },

  getScanStatus: async (scanId: string): Promise<any> => {
    const response = await apiClient.get(`/api/admin/leads/scan-status/${encodeURIComponent(scanId)}`);
    return response.data;
  },

  getSources: async (): Promise<DiscoverySourceItem[]> => {
    const response = await apiClient.get('/api/admin/leads/sources');
    const raw = response.data;
    if (Array.isArray(raw)) return raw;
    return raw?.sources || raw?.data || [];
  }
};

