import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { applicationService } from "../../../services/application.service";
import { jobService } from "../../../services/job.service";
import { queryKeys } from "../../../lib/queryKeys";
import { useState, useMemo } from "react";
import { useUser } from "../../../providers/AuthContext";
import { 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Calendar, 
  CalendarClock,
  ChevronRight, 
  ShieldCheck, 
  AlertCircle, 
  Briefcase, 
  ArrowRight, 
  XCircle, 
  Loader2,
  Table as TableIcon, 
  LayoutGrid,
  Building2,
  Sparkles,
  ExternalLink,
  Star
} from "lucide-react";
import { RatingModal } from "../../../components/common/RatingModal";
import { DataTablePagination } from "../../../components/common/DataTablePagination";
import { AppLoader } from "../../../components/common/AppLoader";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { toast } from 'sonner';

export default function AppliedJobsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ratingTarget, setRatingTarget] = useState<{
    jobId: string;
    rateeId: string;
    rateeName: string;
    jobTitle?: string;
  } | null>(null);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: queryKeys.jobs.myApplications,
    queryFn: applicationService.getMyApplications,
  });

  const jobIds = Array.from(new Set(applications.map((application) => application.jobId)));
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['appliedJobsPage', jobIds],
    queryFn: () => jobService.getJobsByIds(jobIds),
    enabled: jobIds.length > 0,
  });

  const jobsById = useMemo(() => {
    return new Map(jobs.filter((job) => job.id).map((job) => [job.id!, job]));
  }, [jobs]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      applicationService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<any[]>(queryKeys.jobs.myApplications, (old = []) => 
        (old || []).map((app: any) => app.id === variables.id ? { ...app, status: variables.status } : app)
      );

      toast.success(`Application updated: ${variables.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update application.');
    }
  });

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Offers Received') return app.status === 'OFFER_SENT';
      if (activeFilter === 'Under Review') return app.status === 'PENDING' || app.status === 'REVIEWING' || app.status === 'APPLIED';
      if (activeFilter === 'Approved & Hired') return app.status === 'ACCEPTED' || app.status === 'APPROVED' || app.status === 'COMPLETED';
      return true;
    });
  }, [applications, activeFilter]);

  const totalPages = Math.ceil(filteredApplications.length / pageSize) || 1;
  const paginatedApplications = useMemo(() => {
    return filteredApplications.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [filteredApplications, currentPage, pageSize]);

  const countOffers = applications.filter(a => a.status === 'OFFER_SENT').length;
  const countPending = applications.filter(a => a.status === 'PENDING' || a.status === 'REVIEWING' || a.status === 'APPLIED').length;
  const countHired = applications.filter(a => a.status === 'ACCEPTED' || a.status === 'APPROVED' || a.status === 'COMPLETED').length;

  if (isLoading || jobsLoading) {
    return (
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] flex items-center justify-center transition-colors duration-200">
        <AppLoader variant="page" message="Loading your active job applications..." />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] dark:bg-[#38BDF8] animate-pulse" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63] dark:text-[#38BDF8]">
                  Candidate Pipeline
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] dark:text-white">
                My Active Job Applications
              </h1>
              <p className="text-xs text-[#717784] dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                Tracking <span className="tabular-nums font-semibold">{applications.length}</span> submitted applications with real-time status updates and direct hiring pipeline.
              </p>
            </div>

            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95"
            >
              <span>Explore More Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Hallmark 4-Point Trust Proof Ribbon */}
        <div className="bg-[#fbfbfb] dark:bg-[#09090b] rounded-[1.5rem] p-3 sm:p-4 border border-[#e6e8ec] dark:border-zinc-800 shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121215] rounded-xl border border-[#e6e8ec]/80 dark:border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a] dark:text-zinc-200">Direct Employer Access</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121215] rounded-xl border border-[#e6e8ec]/80 dark:border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a] dark:text-zinc-200">Real-Time Status Pipeline</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121215] rounded-xl border border-[#e6e8ec]/80 dark:border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a] dark:text-zinc-200">Direct Employer Contact</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#121215] rounded-xl border border-[#e6e8ec]/80 dark:border-zinc-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a] dark:text-zinc-200">Zero Recruiter Fees</span>
            </div>
          </div>
        </div>

        {/* 3. Filter Controls & View Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#fbfbfb] dark:bg-[#09090b] p-3 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { id: 'All', label: 'All', count: applications.length },
              { id: 'Offers Received', label: 'Offers Received', count: countOffers, pulse: countOffers > 0 },
              { id: 'Under Review', label: 'Under Review', count: countPending },
              { id: 'Approved & Hired', label: 'Approved & Hired', count: countHired }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                    : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white border border-[#e6e8ec] dark:border-zinc-800'
                }`}
              >
                {tab.pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-medium ${
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#f4f4f4] dark:bg-zinc-800 text-[#717784] dark:text-zinc-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle (Cards vs Table) */}
          <div className="flex items-center self-end sm:self-auto bg-white dark:bg-[#121215] p-1 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                  : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                  : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* 4. Applications List / Grid */}
        {filteredApplications.length === 0 ? (
          <div className="bg-[#f4f4f4] dark:bg-[#121215] rounded-[1.75rem] p-10 border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-3">
            <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-[#717784] dark:text-zinc-400 border border-[#e6e8ec] dark:border-zinc-700">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a0a0a] dark:text-white">No Applications in this Category</h3>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
              Discover open jobs matching your verified skills and apply with one click.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white rounded-full text-xs font-semibold uppercase active:scale-95 transition-all shadow-xs"
            >
              Browse Open Jobs
            </Link>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedApplications.map((app) => {
              const job = jobsById.get(app.jobId);
              const status = app.status;
              const isOffer = status === 'OFFER_SENT';
              const isHired = status === 'ACCEPTED' || status === 'APPROVED' || status === 'COMPLETED';
              const isDeclined = status === 'REJECTED' || status === 'DECLINED';
              const employerName = (job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Enterprise';

              return (
                <div
                  key={app.id}
                  className="bg-white dark:bg-[#121215] rounded-2xl p-5 border border-[#e6e8ec] dark:border-zinc-800 hover:border-[#0f2f63]/40 dark:hover:border-zinc-600 transition-all space-y-4 shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Row: Company Logo & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#f4f4f4] dark:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                          {(job as any)?.employerProfile?.profileImageUrl || (job as any)?.logoUrl ? (
                            <img 
                              src={(job as any)?.employerProfile?.profileImageUrl || (job as any)?.logoUrl} 
                              alt={employerName}
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-[#0f2f63] dark:text-[#38BDF8]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 
                            onClick={() => navigate(`/job/${app.jobId}`)}
                            className="text-base font-bold text-[#0a0a0a] dark:text-white group-hover:text-[#0f2f63] dark:group-hover:text-[#38BDF8] transition-colors truncate cursor-pointer"
                          >
                            {job?.title || 'Job Opening'}
                          </h3>
                          <p className="text-xs text-[#717784] dark:text-zinc-400 font-medium truncate">{employerName}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                        isHired 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : isOffer 
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse' 
                          : isDeclined 
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                          : 'bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] border border-blue-200 dark:border-blue-800'
                      }`}>
                        {isHired ? 'Confirmed & Hired' : isOffer ? 'Offer Received' : isDeclined ? 'Declined' : 'Under Review'}
                      </span>
                    </div>

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#717784] dark:text-zinc-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                        <span>{job?.location || job?.city || 'Pan India'}</span>
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {job?.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Standard Market Rate'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#717784] dark:text-zinc-400" />
                        <span>Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                      </span>
                    </div>

                    {/* 🚦 Live 3-Step Hiring Pipeline Stepper (JobToday & WorkIndia Pattern) */}
                    <div className="bg-[#f8f9fa] dark:bg-[#1C1C21] rounded-xl p-3 border border-[#e6e8ec] dark:border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#0a0a0a] dark:text-white">Application Progress</span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">
                          {isHired 
                            ? 'Confirmed Hired' 
                            : isOffer 
                            ? 'Action Required: Offer Ready' 
                            : isDeclined 
                            ? 'Application Closed' 
                            : 'Recruiter evaluating'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {/* Step 1: Applied */}
                        <div className="flex flex-col items-center gap-1 text-center">
                          <div className="w-full h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">1. Applied</span>
                        </div>

                        {/* Step 2: Under Review / Profile Opened */}
                        <div className="flex flex-col items-center gap-1 text-center">
                          <div className={`w-full h-1.5 rounded-full ${
                            isDeclined 
                              ? 'bg-slate-300 dark:bg-zinc-700' 
                              : isHired || isOffer 
                              ? 'bg-emerald-500' 
                              : 'bg-blue-600 animate-pulse'
                          }`} />
                          <span className={`text-[10px] font-bold ${
                            isHired || isOffer ? 'text-emerald-800 dark:text-emerald-300' : isDeclined ? 'text-slate-400 dark:text-zinc-500' : 'text-blue-700 dark:text-sky-300'
                          }`}>
                            2. HR Review
                          </span>
                        </div>

                        {/* Step 3: Offer / Walk-In / Interview */}
                        <div className="flex flex-col items-center gap-1 text-center">
                          <div className={`w-full h-1.5 rounded-full ${
                            isHired 
                              ? 'bg-emerald-500' 
                              : isOffer 
                              ? 'bg-amber-500 animate-pulse' 
                              : isDeclined 
                              ? 'bg-rose-400' 
                              : 'bg-slate-200 dark:bg-zinc-800'
                          }`} />
                          <span className={`text-[10px] font-bold ${
                            isHired 
                              ? 'text-emerald-800 dark:text-emerald-300' 
                              : isOffer 
                              ? 'text-amber-800 dark:text-amber-300' 
                              : isDeclined 
                              ? 'text-rose-700 dark:text-rose-400' 
                              : 'text-slate-400 dark:text-zinc-500'
                          }`}>
                            {isHired ? '3. Hired' : isOffer ? '3. Offer Sent' : isDeclined ? '3. Declined' : '3. Interview'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Offer Sent Alert Box if present */}
                    {isOffer && (
                      <div className="bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          🎉 Offer received from employer!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => statusMutation.mutate({ id: app.id, status: 'ACCEPTED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-1.5 px-3 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white text-xs font-semibold rounded-full uppercase transition-all cursor-pointer text-center"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ id: app.id, status: 'DECLINED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-1.5 px-3 bg-white dark:bg-black border border-[#e6e8ec] dark:border-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-full uppercase transition-all cursor-pointer text-center"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interview Invitation Alert Box */}
                    {app.status === 'INTERVIEW_SCHEDULED' && (
                      <div className="bg-sky-50 dark:bg-sky-950/50 p-3.5 rounded-xl border border-sky-200 dark:border-sky-800/60 space-y-2">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                          <p className="text-xs font-bold text-sky-950 dark:text-sky-200">
                            Interview Invitation Received
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                          The employer has invited you to coordinate an interview session. Check your notifications for venue details and timing.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-[#717784] dark:text-zinc-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified Application</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {isHired && ((job as any)?.employerId || (job as any)?.employer_id || (job as any)?.employerProfile?.userId) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRatingTarget({
                              jobId: app.jobId,
                              rateeId: (job as any)?.employerId || (job as any)?.employer_id || (job as any)?.employerProfile?.userId,
                              rateeName: employerName,
                              jobTitle: job?.title
                            });
                          }}
                          className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>Rate Employer</span>
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/job/${app.jobId}`)}
                        className="text-xs font-semibold text-[#0f2f63] dark:text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Opening Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#121215] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-[#fbfbfb]">
                <TableRow>
                  <TableHead className="font-bold text-xs text-[#0a0a0a]">Job & Employer</TableHead>
                  <TableHead className="font-bold text-xs text-[#0a0a0a]">Location</TableHead>
                  <TableHead className="font-bold text-xs text-[#0a0a0a]">Applied Date</TableHead>
                  <TableHead className="font-bold text-xs text-[#0a0a0a]">Compensation</TableHead>
                  <TableHead className="font-bold text-xs text-[#0a0a0a]">Status</TableHead>
                  <TableHead className="font-bold text-xs text-[#0a0a0a] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedApplications.map((app) => {
                  const job = jobsById.get(app.jobId);
                  const status = app.status;
                  const isOffer = status === 'OFFER_SENT';
                  const isHired = status === 'ACCEPTED' || status === 'APPROVED' || status === 'COMPLETED';
                  const isDeclined = status === 'REJECTED' || status === 'DECLINED';
                  const employerName = (job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Enterprise';

                  return (
                    <TableRow key={app.id} className="hover:bg-[#f4f4f4]/60">
                      <TableCell>
                        <div>
                          <p className="font-bold text-xs text-[#0a0a0a]">{job?.title || 'Job Opening'}</p>
                          <p className="text-[11px] text-[#717784]">{employerName}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#717784]">{job?.location || job?.city || 'Local area'}</TableCell>
                      <TableCell className="text-xs text-[#717784]">
                        {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-emerald-700">
                        {job?.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Standard'}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isHired ? 'bg-emerald-50 text-emerald-800' : isOffer ? 'bg-amber-50 text-amber-800' : isDeclined ? 'bg-rose-50 text-rose-800' : 'bg-blue-50 text-blue-800'
                        }`}>
                          {status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isHired && ((job as any)?.employerId || (job as any)?.employer_id || (job as any)?.employerProfile?.userId) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRatingTarget({
                                  jobId: app.jobId,
                                  rateeId: (job as any)?.employerId || (job as any)?.employer_id || (job as any)?.employerProfile?.userId,
                                  rateeName: employerName,
                                  jobTitle: job?.title
                                });
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                            >
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>Rate</span>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/job/${app.jobId}`)}
                            className="px-3 py-1 bg-[#f4f4f4] hover:bg-[#0f2f63] hover:text-white text-xs font-semibold rounded-full transition-all cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 5. Pagination */}
        {filteredApplications.length > pageSize && (
          <div className="pt-2">
            <DataTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredApplications.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        )}

      </main>

      {ratingTarget && (
        <RatingModal
          isOpen={Boolean(ratingTarget)}
          onClose={() => setRatingTarget(null)}
          jobId={ratingTarget.jobId}
          rateeId={ratingTarget.rateeId}
          rateeName={ratingTarget.rateeName}
          rateeRole="employer"
          jobTitle={ratingTarget.jobTitle}
        />
      )}
    </div>
  );
}
