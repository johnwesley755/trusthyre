import apiClient from '../api/apiClient';
import type { JobApplication } from '../types';

export type { JobApplication };

const mapApp = (app: any): JobApplication => ({
  ...app,
  jobId: app.job_id || app.jobId,
  workerId: app.worker_id || app.workerId,
  appliedAt: app.applied_at || app.appliedAt,
  coverLetter: app.cover_letter || app.coverLetter,
  job: app.job || app.jobs,
  jobs: app.jobs || app.job,
  jobTitle: app.job?.title || app.jobs?.title || app.jobTitle,
});

export const applicationService = {
  applyForJob: async (jobIdOrPayload: string | { jobId: string; coverLetter?: string }, coverLetter?: string): Promise<JobApplication> => {
    const payload = typeof jobIdOrPayload === 'string'
      ? { jobId: jobIdOrPayload, coverLetter }
      : jobIdOrPayload;
    const res = await apiClient.post<any>('/api/jobs/applications', payload);
    return mapApp(res.data);
  },
  dispatchOffer: async (payload: { jobId: string; workerId: string; coverLetter?: string }): Promise<JobApplication> => {
    const res = await apiClient.post<any>('/api/jobs/applications/dispatch-offer', payload);
    return mapApp(res.data);
  },
  getEmployerWorkerStatus: async (workerId: string): Promise<{ applications: JobApplication[]; jobs: any[] }> => {
    const res = await apiClient.get<any>(`/api/jobs/applications/employer-status/${workerId}`);
    return {
      applications: (res.data?.applications || []).map(mapApp),
      jobs: res.data?.jobs || []
    };
  },
  getMyApplications: async (): Promise<JobApplication[]> => {
    const res = await apiClient.get<any[]>('/api/jobs/applications/my');
    return (res.data || []).map(mapApp);
  },
  getJobApplications: async (jobId: string): Promise<JobApplication[]> => {
    const res = await apiClient.get<any[]>(`/api/jobs/applications/job/${jobId}`);
    return (res.data || []).map(mapApp);
  },
  getApplicationsByJobs: async (jobIds: string[]): Promise<JobApplication[]> => {
    const res = await apiClient.post<any[]>('/api/jobs/applications/by-jobs', { jobIds });
    return (res.data || []).map(mapApp);
  },
  getApplicationsForEmployerJobs: async (jobIds: string[]): Promise<JobApplication[]> => {
    const res = await apiClient.post<any[]>('/api/jobs/applications/by-jobs', { jobIds });
    return (res.data || []).map(mapApp);
  },
  updateApplicationStatus: async (applicationId: string, status: string): Promise<any> => {
    const res = await apiClient.patch(`/api/jobs/applications/${applicationId}/status`, { status });
    return res.data;
  },
  updateStatus: async (applicationId: string, status: string): Promise<any> => {
    const res = await apiClient.patch(`/api/jobs/applications/${applicationId}/status`, { status });
    return res.data;
  },
};

