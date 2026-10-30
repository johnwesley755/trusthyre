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
  ExternalLink
} from "lucide-react";
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
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] flex items-center justify-center">
        <AppLoader variant="page" message="Loading your active job applications..." />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63]">
                  Candidate Pipeline
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                My Active Job Applications
              </h1>
              <p className="text-xs text-[#717784] font-medium leading-relaxed max-w-xl">
                Tracking <span className="tabular-nums font-semibold">{applications.length}</span> submitted applications with real-time status updates and direct hiring pipeline.
              </p>
            </div>

            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95"
            >
              <span>Explore More Jobs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Hallmark 4-Point Trust Proof Ribbon */}
        <div className="bg-[#fbfbfb] rounded-[1.5rem] p-3 sm:p-4 border border-[#e6e8ec] shadow-2xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#e6e8ec]/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a]">Direct Employer Access</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#e6e8ec]/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a]">Real-Time Status Pipeline</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#e6e8ec]/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a]">Direct Employer Contact</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#e6e8ec]/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
              <span className="font-medium text-[#0a0a0a]">Zero Recruiter Fees</span>
            </div>
          </div>
        </div>

        {/* 3. Filter Controls & View Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#fbfbfb] p-3 rounded-2xl border border-[#e6e8ec]">
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
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white text-[#717784] hover:text-[#0a0a0a] border border-[#e6e8ec]'
                }`}
              >
                {tab.pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-medium ${
                  activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-[#f4f4f4] text-[#717784]'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* View Toggle (Cards vs Table) */}
          <div className="flex items-center self-end sm:self-auto bg-white p-1 rounded-xl border border-[#e6e8ec] shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'text-[#717784] hover:text-[#0a0a0a]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'text-[#717784] hover:text-[#0a0a0a]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* 4. Applications List / Grid */}
        {filteredApplications.length === 0 ? (
          <div className="bg-[#f4f4f4] rounded-[1.75rem] p-10 border border-[#e6e8ec] text-center space-y-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-[#717784] border border-[#e6e8ec]">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a0a0a]">No Applications in this Category</h3>
            <p className="text-xs text-[#717784] max-w-sm mx-auto">
              Discover open jobs matching your verified skills and apply with one click.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] text-white rounded-full text-xs font-semibold uppercase active:scale-95 transition-all"
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
                  className="bg-white rounded-2xl p-5 border border-[#e6e8ec] hover:border-[#0f2f63]/40 transition-all space-y-4 shadow-2xs group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header Row: Company Logo & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#f4f4f4] border border-[#e6e8ec] flex items-center justify-center shrink-0 overflow-hidden">
                          {(job as any)?.employerProfile?.profileImageUrl || (job as any)?.logoUrl ? (
                            <img 
                              src={(job as any)?.employerProfile?.profileImageUrl || (job as any)?.logoUrl} 
                              alt={employerName}
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-[#0f2f63]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 
                            onClick={() => navigate(`/job/${app.jobId}`)}
                            className="text-base font-bold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors truncate cursor-pointer"
                          >
                            {job?.title || 'Job Opening'}
                          </h3>
                          <p className="text-xs text-[#717784] font-medium truncate">{employerName}</p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                        isHired 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : isOffer 
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse' 
                          : isDeclined 
                          ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                          : 'bg-blue-50 text-[#0f2f63] border border-blue-200'
                      }`}>
                        {isHired ? 'Confirmed & Hired' : isOffer ? 'Offer Received' : isDeclined ? 'Declined' : 'Under Review'}
                      </span>
                    </div>

                    {/* Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#717784]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                        <span>{job?.location || job?.city || 'Pan India'}</span>
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-emerald-700">
                        {job?.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Standard Market Rate'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#717784]" />
                        <span>Applied {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span>
                      </span>
                    </div>

                    {/* Offer Sent Alert Box if present */}
                    {isOffer && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-2">
                        <p className="text-xs font-bold text-amber-900">
                          🎉 Offer received from employer!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => statusMutation.mutate({ id: app.id, status: 'ACCEPTED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-1.5 px-3 bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold rounded-full uppercase transition-all cursor-pointer text-center"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ id: app.id, status: 'DECLINED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-1.5 px-3 bg-white border border-[#e6e8ec] text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-full uppercase transition-all cursor-pointer text-center"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="pt-3 border-t border-[#e6e8ec] flex items-center justify-between">
                    <span className="text-[11px] text-[#717784] font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Application</span>
                    </span>

                    <button
                      onClick={() => navigate(`/job/${app.jobId}`)}
                      className="text-xs font-semibold text-[#0f2f63] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Opening Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e6e8ec] overflow-hidden shadow-2xs">
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
                        <button
                          onClick={() => navigate(`/job/${app.jobId}`)}
                          className="px-3 py-1 bg-[#f4f4f4] hover:bg-[#0f2f63] hover:text-white text-xs font-semibold rounded-full transition-all cursor-pointer"
                        >
                          Details
                        </button>
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
    </div>
  );
}
