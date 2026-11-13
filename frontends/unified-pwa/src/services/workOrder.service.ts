import apiClient from '../api/apiClient';

export interface WorkOrder {
  id: string;
  order_number: string;
  job_id?: string | null;
  application_id?: string | null;
  employer_id: string;
  worker_id: string;
  
  job_title: string;
  work_description?: string | null;
  worksite_name: string;
  worksite_address: string;
  city: string;
  district?: string | null;
  taluk?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  
  start_date: string;
  expected_end_date?: string | null;
  work_duration_days?: number | null;
  shift_timing: string;
  weekly_rest_day?: string | null;
  daily_working_hours: number | string;
  overtime_terms?: string | null;
  
  wage_amount: number | string;
  wage_frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT';
  food_provided?: boolean | null;
  accommodation_provided?: boolean | null;
  transport_provided?: boolean | null;
  other_benefits?: string | null;
  agreed_deductions?: string | null;
  
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  worker_response_notes?: string | null;
  accepted_at?: string | null;
  declined_at?: string | null;
  created_at: string;
  updated_at: string;
  
  worker?: {
    user_id: string;
    full_name: string;
    phone_number?: string;
    profile_image_url?: string;
    level?: string;
    trust_score?: number;
    skills?: string;
    city?: string;
  } | null;
  
  employer?: {
    user_id: string;
    company_name: string;
    is_verified?: boolean;
    city?: string;
    address?: string;
    business_tier?: string;
  } | null;

  events?: Array<{
    id: string;
    actor_id: string;
    actor_role: string;
    event_type: string;
    notes?: string | null;
    created_at: string;
  }>;
}

export interface CreateWorkOrderPayload {
  jobId?: string;
  applicationId?: string;
  workerId: string;
  
  jobTitle: string;
  workDescription?: string;
  worksiteName: string;
  worksiteAddress: string;
  city: string;
  district?: string;
  taluk?: string;
  latitude?: number;
  longitude?: number;
  
  startDate: string;
  expectedEndDate?: string;
  workDurationDays?: number;
  shiftTiming: string;
  weeklyRestDay?: string;
  dailyWorkingHours: number;
  overtimeTerms?: string;
  
  wageAmount: number;
  wageFrequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PROJECT';
  foodProvided?: boolean;
  accommodationProvided?: boolean;
  transportProvided?: boolean;
  otherBenefits?: string;
  agreedDeductions?: string;
  
  autoSend?: boolean;
}

export const workOrderService = {
  /**
   * Employer: Create a new digital work order
   */
  createWorkOrder: async (payload: CreateWorkOrderPayload): Promise<WorkOrder> => {
    const res = await apiClient.post<any>('/api/work-orders', payload);
    return res.data?.data || res.data;
  },

  /**
   * Employer: Retrieve list of issued work orders
   */
  getEmployerWorkOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<any>('/api/work-orders/employer', { params });
    const data = res.data?.data || res.data;
    return {
      workOrders: (data?.workOrders || []) as WorkOrder[],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 15,
      totalPages: data?.totalPages || 1
    };
  },

  /**
   * Worker: Retrieve list of received work orders
   */
  getWorkerWorkOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<any>('/api/work-orders/worker', { params });
    const data = res.data?.data || res.data;
    return {
      workOrders: (data?.workOrders || []) as WorkOrder[],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 15,
      totalPages: data?.totalPages || 1
    };
  },

  /**
   * Get single work order details & audit history
   */
  getWorkOrderById: async (id: string): Promise<WorkOrder> => {
    const res = await apiClient.get<any>(`/api/work-orders/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Employer: Send a DRAFT work order to the candidate
   */
  sendWorkOrder: async (id: string): Promise<WorkOrder> => {
    const res = await apiClient.post<any>(`/api/work-orders/${id}/send`);
    return res.data?.data || res.data;
  },

  /**
   * Worker: Respond with ACCEPT, DECLINE, or CLARIFY
   */
  respondToWorkOrder: async (id: string, action: 'ACCEPT' | 'DECLINE' | 'CLARIFY', notes?: string): Promise<WorkOrder> => {
    const res = await apiClient.post<any>(`/api/work-orders/${id}/respond`, { action, notes });
    return res.data?.data || res.data;
  },

  /**
   * Employer: Update terms
   */
  updateTerms: async (id: string, payload: Partial<CreateWorkOrderPayload>): Promise<WorkOrder> => {
    const res = await apiClient.put<any>(`/api/work-orders/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Cancel work order
   */
  cancelWorkOrder: async (id: string, reason?: string): Promise<WorkOrder> => {
    const res = await apiClient.post<any>(`/api/work-orders/${id}/cancel`, { reason });
    return res.data?.data || res.data;
  }
};

