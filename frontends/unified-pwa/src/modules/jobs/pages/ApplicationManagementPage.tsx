import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationService, type JobApplication } from '../../../services/application.service';
import { jobService } from '../../../services/job.service';
import { workerService } from '../../../services/worker.service';
import { queryKeys } from '../../../lib/queryKeys';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  CalendarClock,
  AlertCircle,
  ChevronRight, 
  Loader2, 
  MapPin, 
  Plus, 
  Briefcase, 
  ShieldCheck, 
  Search,
  Building2,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
  Award,
  Send,
  Sparkles
} from 'lucide-react';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { AppLoader } from '../../../components/common/AppLoader';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { toast } from 'sonner';

export default function ApplicationManagementPage() {
  const navigate = useNavigate();
  const { jobId: routeJobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const urlJobId = routeJobId || searchParams.get('jobId');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => urlJobId || null);

  useEffect(() => {
    if (urlJobId) {
      setSelectedJobId(urlJobId);
    }
  }, [urlJobId]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'OFFER_SENT' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jobCurrentPage, setJobCurrentPage] = useState(1);
  const [jobPageSize, setJobPageSize] = useState(8);
  const [jobSearchQuery, setJobSearchQuery] = useState('');

  const { data: jobs = [], isLoading: isJobsLoading } = useQuery<import('../../../types').Job[]>({ 
    queryKey: queryKeys.jobs.employerJobs, 
    queryFn: jobService.getEmployerJobs 
  });
  
  const jobIds = useMemo(() => jobs.map((j: any) => j.id).filter((id): id is string => !!id), [jobs]);
  
  const { data: allApplicationsRaw = [], isLoading: isAppsLoading } = useQuery<JobApplication[]>({
    queryKey: queryKeys.jobs.allEmployerApplications(jobIds),
    queryFn: () => applicationService.getApplicationsForEmployerJobs(jobIds),
    enabled: jobIds.length > 0,
  });

  const allApplications = allApplicationsRaw;

  const selectedJobApplications = useMemo(() => {
    return allApplications.filter(app => {
      if (app.jobId !== selectedJobId) return false;
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'ACCEPTED') return app.status === 'ACCEPTED' || app.status === 'APPROVED';
      if (statusFilter === 'REJECTED') return app.status === 'REJECTED' || app.status === 'DECLINED';
      return app.status === statusFilter;
    });
  }, [allApplications, selectedJobId, statusFilter]);

  const workerIds = useMemo(() => selectedJobApplications.map((app) => app.workerId), [selectedJobApplications]);
  
  const { data: workers = [] } = useQuery({
    queryKey: queryKeys.workers.byUserIds(workerIds),
    queryFn: () => workerService.getProfilesByUserIds(workerIds),
    enabled: selectedJobId !== null && workerIds.length > 0,
  });

  const workersById = useMemo(() => {
    const map = new Map<string, any>();
    workers.forEach((worker) => {
      if (worker.userId) map.set(worker.userId, worker);
      if (worker.id) map.set(worker.id, worker);
    });
    return map;
  }, [workers]);

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: JobApplication['status'] }) => 
      applicationService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      // 1. Immediately update applications queries in local TanStack cache for zero-latency sync
      queryClient.setQueriesData<JobApplication[]>(
        { queryKey: ['jobs', 'allEmployerApplications'] },
        (old = []) => (old || []).map(app => app.id === variables.id ? { ...app, status: variables.status } : app)
      );
      if (selectedJobId) {
        queryClient.setQueriesData<JobApplication[]>(
          { queryKey: ['jobs', 'applications', selectedJobId] },
          (old = []) => (old || []).map(app => app.id === variables.id ? { ...app, status: variables.status } : app)
        );
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employer.profile });
      toast.success(variables.status === 'OFFER_SENT' ? 'Job offer dispatched to candidate!' : `Applicant status updated to ${variables.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update applicant status.');
    }
  });

  const getApplicationCountForJob = (jobId: string) => {
    return allApplications.filter(app => app.jobId === jobId).length;
  };

  const getPendingCountForJob = (jobId: string) => {
    return allApplications.filter(app => app.jobId === jobId && app.status === 'PENDING').length;
  };

  const { data: directJob } = useQuery({
    queryKey: ['job', selectedJobId],
    queryFn: () => jobService.getJobById(selectedJobId!),
    enabled: Boolean(selectedJobId) && !jobs.some((j: any) => j.id === selectedJobId),
  });

  const selectedJob = useMemo(() => {
    return jobs.find((j: any) => j.id === selectedJobId) || directJob;
  }, [jobs, selectedJobId, directJob]);

  const filteredJobs = useMemo(() => {
    if (!jobSearchQuery.trim()) return jobs;
    const q = jobSearchQuery.toLowerCase();
    return jobs.filter((job: any) => {
      return (
        (job.title || '').toLowerCase().includes(q) ||
        (job.industry || '').toLowerCase().includes(q) ||
        (job.location || '').toLowerCase().includes(q)
      );
    });
  }, [jobs, jobSearchQuery]);

  const jobTotalPages = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize));
  const paginatedJobs = useMemo(() => {
    return filteredJobs.slice(
      (jobCurrentPage - 1) * jobPageSize,
      jobCurrentPage * jobPageSize
    );
  }, [filteredJobs, jobCurrentPage, jobPageSize]);

  const allJobApps = useMemo(() => allApplications.filter(app => app.jobId === selectedJobId), [allApplications, selectedJobId]);
  const countAll = allJobApps.length;
  const countPending = allJobApps.filter(app => app.status === 'PENDING').length;
  const countOfferSent = allJobApps.filter(app => app.status === 'OFFER_SENT').length;
  const countAccepted = allJobApps.filter(app => app.status === 'ACCEPTED' || app.status === 'APPROVED').length;
  const countRejected = allJobApps.filter(app => app.status === 'REJECTED' || app.status === 'DECLINED').length;

  if (isJobsLoading || (isAppsLoading && !allApplications)) {
    return (
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] flex items-center justify-center">
        <AppLoader variant="page" message="Loading hiring pipeline & applications..." />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* VIEW 1: OPENINGS LISTING (When no job is selected) */}
        {!selectedJobId ? (
          <div className="space-y-6">
            
            {/* Header Hero Card */}
            <div className="bg-[#f4f4f4] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase text-[#0f2f63]">
                      Employer Operations Hub
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                    Active Openings & Applications
                  </h1>
                  <p className="text-xs text-[#717784] font-medium leading-relaxed max-w-xl">
                    Select any active job posting to review candidate profiles, verify technical certifications, and extend instant shift offers.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white px-3.5 py-1.5 rounded-full flex items-center gap-2 border border-[#e6e8ec] shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-[#0a0a0a] tabular-nums">
                      {allApplications.length} Applicants Received
                    </span>
                  </div>
                  <Link
                    to="/post-job"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Post a Job</span>
                  </Link>
                </div>
              </div>
            </div>

          
            {/* Search Filter Capsule */}
            <div className="bg-[#fbfbfb] p-3 rounded-2xl border border-[#e6e8ec] flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717784]" />
                <input
                  type="text"
                  value={jobSearchQuery}
                  onChange={(e) => {
                    setJobSearchQuery(e.target.value);
                    setJobCurrentPage(1);
                  }}
                  placeholder="Filter openings by role title, trade, or site location..."
                  className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-white border border-[#e6e8ec] focus:border-[#0f2f63] outline-none"
                />
              </div>
              <span className="text-xs font-semibold text-[#717784] shrink-0 px-2 tabular-nums">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>

            {/* Jobs Cards Grid */}
            {filteredJobs.length === 0 ? (
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-10 border border-[#e6e8ec] text-center space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-[#717784] border border-[#e6e8ec]">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a]">No Openings Found</h3>
                <p className="text-xs text-[#717784] max-w-sm mx-auto">
                  {jobSearchQuery ? "No jobs match your search filter." : "You haven't posted any jobs yet. Create a new listing to start receiving verified applicants."}
                </p>
                <Link
                  to="/post-job"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] text-white rounded-full text-xs font-semibold uppercase active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post Your First Job</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedJobs.map((job: any) => {
                  const totalCount = getApplicationCountForJob(job.id);
                  const pendingCount = getPendingCountForJob(job.id);
                  const effectiveExpiry = job.expiresAt ? new Date(job.expiresAt) : (job.createdAt ? new Date(new Date(job.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
                  const isExpired = Boolean(
                    job.isExpired || 
                    job.status === 'EXPIRED' || 
                    job.status === 'CLOSED' ||
                    (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
                  );

                  return (
                    <div
                      key={job.id}
                        onClick={() => {
                          setSelectedJobId(job.id);
                          navigate(`/jobs/${job.id}/applicants`);
                        }}
                        className={`bg-white rounded-2xl p-5 border transition-all space-y-4 shadow-2xs group cursor-pointer flex flex-col justify-between ${
                          isExpired 
                            ? 'border-rose-200 hover:border-rose-300 bg-rose-50/20' 
                            : 'border-[#e6e8ec] hover:border-[#0f2f63]/40'
                        }`}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-[#0f2f63]/5 text-[#0f2f63] text-[10px] font-bold border border-[#0f2f63]/10">
                                  {job.industry || 'Specialist'}
                                </span>
                                {isExpired ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[10px] font-bold border border-rose-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span>EXPIRED</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>{job.status || 'ACTIVE'}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors mt-1">
                                {job.title}
                              </h3>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-bold text-sm text-emerald-700">
                                ₹{(job.budget || 0).toLocaleString('en-IN')}
                              </span>
                              <span className="block text-[10px] text-[#717784]">Direct Posting</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#717784]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                              <span>{job.location || job.city || 'Pan India'}</span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#717784]" />
                              <span>{job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                            </span>
                            {job.expiresAt && (
                              <>
                                <span>•</span>
                                <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-700 font-semibold' : 'text-[#717784]'}`}>
                                  <CalendarClock className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-600' : 'text-[#0f2f63]'}`} />
                                  <span>
                                    {isExpired ? 'Expired' : 'Expires'}: {new Date(job.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, {new Date(job.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                      <div className="pt-3 border-t border-[#e6e8ec] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0a0a0a]">
                            {totalCount} Total Applicants
                          </span>
                          {pendingCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200 animate-pulse">
                              {pendingCount} need review
                            </span>
                          )}
                        </div>

                        <span className="text-xs font-semibold text-[#0f2f63] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          <span>Review Applicants</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination for jobs */}
            {filteredJobs.length > jobPageSize && (
              <div className="pt-2">
                <DataTablePagination
                  currentPage={jobCurrentPage}
                  totalPages={jobTotalPages}
                  pageSize={jobPageSize}
                  totalItems={filteredJobs.length}
                  onPageChange={setJobCurrentPage}
                  onPageSizeChange={(newSize) => {
                    setJobPageSize(newSize);
                    setJobCurrentPage(1);
                  }}
                />
              </div>
            )}

          </div>
        ) : (
          /* VIEW 2: APPLICANTS FOR SELECTED JOB */
          <div className="space-y-6">
            
            {/* Breadcrumb Back Button */}
            <button
              onClick={() => {
                setSelectedJobId(null);
                setStatusFilter('ALL');
                navigate('/jobs');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] text-xs font-medium transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to All Openings</span>
            </button>

            {!selectedJob && !isJobsLoading ? (
              <div className="bg-[#f4f4f4] rounded-[2rem] p-10 border border-[#e6e8ec] text-center space-y-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto text-[#717784] border border-[#e6e8ec] shadow-xs">
                  <Briefcase className="w-7 h-7 text-[#0f2f63]" />
                </div>
                <h3 className="text-lg font-bold text-[#0a0a0a]">Opening Not Found</h3>
                <p className="text-xs text-[#717784] max-w-md mx-auto">
                  The requested job opening could not be located in your listings. It may have been archived or removed.
                </p>
                <button
                  onClick={() => {
                    setSelectedJobId(null);
                    setStatusFilter('ALL');
                    navigate('/jobs');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>View All Active Openings</span>
                </button>
              </div>
            ) : (
              <>
                {/* Selected Job Overview Card */}
            {(() => {
              const isSelectedJobExpired = Boolean(
                selectedJob?.isExpired ||
                selectedJob?.status === 'EXPIRED' ||
                (selectedJob?.expiresAt && new Date(selectedJob.expiresAt).getTime() <= Date.now())
              );

              return (
                <>
                  <div className={`rounded-[2rem] p-6 sm:p-8 border transition-all ${
                    isSelectedJobExpired 
                      ? 'bg-rose-50/40 border-rose-200' 
                      : 'bg-[#f4f4f4] border-[#e6e8ec]'
                  }`}>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-[#0f2f63]/5 text-[#0f2f63] text-[10px] font-bold border border-[#0f2f63]/10">
                            {selectedJob?.industry || 'Enterprise Trade'}
                          </span>
                          {isSelectedJobExpired ? (
                            <span className="text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              <span>Requisition Expired</span>
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Requisition Active</span>
                            </span>
                          )}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                          {selectedJob?.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[#717784]">
                          <span className="font-semibold text-emerald-700">
                            ₹{(selectedJob?.budget || 0).toLocaleString('en-IN')} / month
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                            <span>{selectedJob?.location || selectedJob?.city || 'Worksite'}</span>
                          </span>
                          <span>•</span>
                          <span>
                            {(() => {
                              const exp = selectedJob?.experienceYearsRequired ?? (selectedJob as any)?.experience_years_required;
                              if (exp === undefined || exp === null || exp === 0) return 'Fresher (0 Years)';
                              if (exp === 1) return '1 Year Experience';
                              return `${exp} Years Experience`;
                            })()}
                          </span>
                          {selectedJob?.expiresAt && (
                            <>
                              <span>•</span>
                              <span className={`flex items-center gap-1 font-semibold ${isSelectedJobExpired ? 'text-rose-700' : 'text-[#717784]'}`}>
                                <CalendarClock className={`w-3.5 h-3.5 ${isSelectedJobExpired ? 'text-rose-600' : 'text-[#0f2f63]'}`} />
                                <span>
                                  {isSelectedJobExpired ? 'Expired on' : 'Auto-expires:'} {new Date(selectedJob.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(selectedJob.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Pipeline Counters Metric Pill */}
                      <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-[#e6e8ec] shadow-2xs">
                        <div className="text-center px-2">
                          <p className="text-base font-bold text-[#0a0a0a] tabular-nums tracking-tight">{countAll}</p>
                          <p className="text-[10px] text-[#717784] font-medium uppercase">Total</p>
                        </div>
                        <div className="w-px h-6 bg-[#e6e8ec]" />
                        <div className="text-center px-2">
                          <p className="text-base font-bold text-amber-600 tabular-nums tracking-tight">{countPending}</p>
                          <p className="text-[10px] text-[#717784] font-medium uppercase">Review</p>
                        </div>
                        <div className="w-px h-6 bg-[#e6e8ec]" />
                        <div className="text-center px-2">
                          <p className="text-base font-bold text-emerald-600 tabular-nums tracking-tight">{countAccepted}</p>
                          <p className="text-[10px] text-[#717784] font-medium uppercase">Hired</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSelectedJobExpired && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                            Job Requisition Closed • Auto-Expired
                          </h4>
                          <p className="text-xs text-rose-800 mt-0.5">
                            This opening expired on {selectedJob?.expiresAt ? `${new Date(selectedJob.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} at ${new Date(selectedJob.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'the scheduled deadline'}. Applications from new workers are closed. You can review and process all existing applicants below.
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/post-job"
                        className="shrink-0 px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs self-start sm:self-auto cursor-pointer"
                      >
                        Post New Opening
                      </Link>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Status Filter Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fbfbfb] p-3 rounded-2xl border border-[#e6e8ec]">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {[
                  { id: 'ALL', label: 'All Applicants', count: countAll },
                  { id: 'PENDING', label: 'Under Review', count: countPending, pulse: countPending > 0 },
                  { id: 'OFFER_SENT', label: 'Offers Sent', count: countOfferSent },
                  { id: 'ACCEPTED', label: 'Approved & Hired', count: countAccepted },
                  { id: 'REJECTED', label: 'Declined', count: countRejected }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setStatusFilter(tab.id as any);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      statusFilter === tab.id
                        ? 'bg-[#0f2f63] text-white shadow-xs'
                        : 'bg-white text-[#717784] hover:text-[#0a0a0a] border border-[#e6e8ec]'
                    }`}
                  >
                    {tab.pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#f4f4f4] text-[#717784]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <span className="text-xs font-semibold text-[#717784] px-2">
                Showing {selectedJobApplications.length} candidate{selectedJobApplications.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Applicants List */}
            {selectedJobApplications.length === 0 ? (
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-10 border border-[#e6e8ec] text-center space-y-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-[#717784] border border-[#e6e8ec]">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#0a0a0a]">No Applicants in this Stage</h3>
                <p className="text-xs text-[#717784] max-w-sm mx-auto">
                  Candidates applying to this position will be displayed here with verified biometric credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedJobApplications.map((app) => {
                  const worker = workersById.get(app.workerId);
                  const candidateName = worker?.fullName || worker?.name || 'Candidate';
                  const firstSkill = Array.isArray(worker?.skills) ? worker.skills[0] : (typeof worker?.skills === 'string' ? worker.skills.split(',')[0] : undefined);
                  const candidateRole = worker?.preferredRoles?.[0] || firstSkill || 'Technical Specialist';
                  const isVerified = Boolean(worker?.identityVerified || worker?.isVerified);
                  const isApproved = app.status === 'ACCEPTED' || app.status === 'APPROVED';
                  const isOfferSent = app.status === 'OFFER_SENT';
                  const isDeclined = app.status === 'REJECTED' || app.status === 'DECLINED';

                  return (
                    <div
                      key={app.id}
                      className="bg-white rounded-2xl p-5 border border-[#e6e8ec] hover:border-[#0f2f63]/40 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs group"
                    >
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <UserAvatar
                          src={worker?.profileImageUrl}
                          name={candidateName}
                          size="lg"
                        />

                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold text-[#0a0a0a]">
                              {candidateName}
                            </h4>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isVerified ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-[#717784]'
                            }`}>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>{isVerified ? 'Biometric Verified' : 'ID Pending'}</span>
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isApproved 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : isOfferSent 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' 
                                : isDeclined 
                                ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                                : 'bg-blue-50 text-[#0f2f63] border border-blue-200'
                            }`}>
                              {app.status}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#717784]">
                            <span className="font-semibold text-[#0a0a0a]">{candidateRole}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                              <span>{worker?.city || worker?.location || 'Local Zone'}</span>
                            </span>
                            <span>•</span>
                            <span>{worker?.experienceYears ? `${worker.experienceYears}+ Years Exp` : 'Entry Level'}</span>
                          </div>

                          {app.coverLetter && (
                            <p className="text-xs text-[#717784] bg-[#fbfbfb] p-2.5 rounded-xl border border-[#e6e8ec] italic max-w-xl">
                              "{app.coverLetter}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#e6e8ec]">
                        <Link
                          to={`/worker/${app.workerId}`}
                          className="px-4 py-2 bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] rounded-full text-xs font-semibold uppercase transition-all"
                        >
                          View CV
                        </Link>

                        {!isApproved && !isOfferSent && !isDeclined && (
                          <>
                            <button
                              onClick={() => mutation.mutate({ id: app.id, status: 'OFFER_SENT' })}
                              disabled={mutation.isPending}
                              className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                            >
                              {mutation.isPending && (mutation.variables as any)?.id === app.id && (mutation.variables as any)?.status === 'OFFER_SENT' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Sending Offer...</span>
                                </>
                              ) : (
                                <span>Send Offer</span>
                              )}
                            </button>
                            <button
                              onClick={() => mutation.mutate({ id: app.id, status: 'DECLINED' })}
                              disabled={mutation.isPending}
                              className="px-3 py-2 bg-white border border-[#e6e8ec] text-rose-600 hover:bg-rose-50 rounded-full text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1 disabled:opacity-60"
                            >
                              {mutation.isPending && (mutation.variables as any)?.id === app.id && (mutation.variables as any)?.status === 'DECLINED' && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              <span>Decline</span>
                            </button>
                          </>
                        )}

                        {isOfferSent && (
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                            Awaiting Candidate Confirmation
                          </span>
                        )}

                        {isApproved && (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Confirmed for Shift</span>
                          </span>
                        )}

                        {isDeclined && (
                          <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200">
                            Offer Declined
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>
    )}

      </main>
    </div>
  );
}
