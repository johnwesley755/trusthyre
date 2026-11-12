import apiClient from '../api/apiClient';

export interface Interview {
  id: string;
  application_id: string;
  applicationId?: string;
  job_id: string;
  jobId?: string;
  employer_id: string;
  worker_id: string;
  scheduled_at: string;
  scheduledAt?: string;
  interview_type: 'IN_PERSON' | 'PHONE' | 'WHATSAPP_VIDEO';
  interviewType?: 'IN_PERSON' | 'PHONE' | 'WHATSAPP_VIDEO';
  location_address?: string | null;
  locationAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_person?: string | null;
  contactPerson?: string | null;
  contact_phone?: string | null;
  contactPhone?: string | null;
  instructions?: string | null;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'RESCHEDULE_REQUESTED' | 'COMPLETED' | 'CANCELLED';
  reschedule_note?: string | null;
  rescheduleNote?: string | null;
  created_at?: string;
  updated_at?: string;
  jobs?: any;
  job_applications?: any;
}

export interface ScheduleInterviewPayload {
  applicationId: string;
  scheduledAt: string;
  interviewType?: 'IN_PERSON' | 'PHONE' | 'WHATSAPP_VIDEO';
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  contactPerson?: string;
  contactPhone?: string;
  instructions?: string;
}

const mapInterview = (data: any): Interview => {
  if (!data) return data;
  return {
    ...data,
    applicationId: data.application_id || data.applicationId,
    jobId: data.job_id || data.jobId,
    scheduledAt: data.scheduled_at || data.scheduledAt,
    interviewType: data.interview_type || data.interviewType || 'IN_PERSON',
    locationAddress: data.location_address || data.locationAddress,
    contactPerson: data.contact_person || data.contactPerson,
    contactPhone: data.contact_phone || data.contactPhone,
    rescheduleNote: data.reschedule_note || data.rescheduleNote,
  };
};

export const interviewService = {
  scheduleInterview: async (payload: ScheduleInterviewPayload): Promise<Interview> => {
    const res = await apiClient.post<any>('/api/interviews/schedule', payload);
    return mapInterview(res.data);
  },

  getInterviewByApplication: async (applicationId: string): Promise<Interview | null> => {
    const res = await apiClient.get<any>(`/api/interviews/application/${applicationId}`);
    return res.data ? mapInterview(res.data) : null;
  },

  getMyInterviews: async (): Promise<Interview[]> => {
    const res = await apiClient.get<any[]>('/api/interviews/my');
    return (res.data || []).map(mapInterview);
  },

  respondToInterview: async (
    id: string, 
    action: 'ACCEPT' | 'DECLINE' | 'RESCHEDULE', 
    rescheduleNote?: string
  ): Promise<Interview> => {
    const res = await apiClient.post<any>(`/api/interviews/${id}/respond`, { action, rescheduleNote });
    return mapInterview(res.data);
  },

  updateInterviewStatus: async (
    id: string, 
    payload: { status?: string; scheduledAt?: string; instructions?: string }
  ): Promise<Interview> => {
    const res = await apiClient.patch<any>(`/api/interviews/${id}/status`, payload);
    return mapInterview(res.data);
  }
};

