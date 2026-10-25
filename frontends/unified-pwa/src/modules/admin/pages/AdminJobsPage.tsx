import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminJobItem, type AdminSourceItem, type AdminScanStatus, type DynamicScanPayload } from '../../../services/admin.service';
import {
  Briefcase,
  Search,
  Trash2,
  MapPin,
  IndianRupee,
  Users,
  Loader2,
  Globe,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  ExternalLink,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  Languages,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLoader } from '../../../components/common/AppLoader';

const TN_PRIORITY_CITIES = [
  { name: 'Chennai', label: 'Chennai (சென்னை)' },
  { name: 'Coimbatore', label: 'Coimbatore (கோவை)' },
  { name: 'Madurai', label: 'Madurai (மதுரை)' },
  { name: 'Tiruchirappalli', label: 'Trichy (திருச்சி)' },
  { name: 'Salem', label: 'Salem (சேலம்)' },
  { name: 'Tiruppur', label: 'Tiruppur (திருப்பூர்)' },
];

const VERNACULAR_TRADE_CHIPS = [
  { id: 'driver', label: 'Delivery / Driver', ta: 'ஓட்டுநர் / டெலிவரி', query: 'Delivery Driver' },
  { id: 'electrician', label: 'Electrician', ta: 'எலக்ட்ரீசியன்', query: 'Electrician' },
  { id: 'technician', label: 'Technician / AC', ta: 'டெக்னீசியன்', query: 'Field Technician' },
  { id: 'warehouse', label: 'Warehouse / Packer', ta: 'கிடங்கு / பேக்கர்', query: 'Warehouse Associate' },
  { id: 'security', label: 'Security Guard', ta: 'காவலாளி', query: 'Security Guard' },
  { id: 'cook', label: 'Cook / Kitchen', ta: 'சமையல்காரர்', query: 'Cook' },
  { id: 'tailor', label: 'Tailor / Garment', ta: 'தையல்காரர்', query: 'Tailor' },
  { id: 'housekeeping', label: 'Housekeeping', ta: 'தூய்மை பணியாளர்', query: 'Housekeeping' },
  { id: 'operator', label: 'Machine Operator', ta: 'மெஷின் ஆபரேட்டர்', query: 'Machine Operator' },
];

const DISCOVERY_SOURCES = [
  { id: 'jobspy_naukri', name: 'Naukri.com (JobSpy Engine)', free: true, desc: 'Zero-spend open-source direct engine' },
  { id: 'jobspy_indeed', name: 'Indeed India (JobSpy Engine)', free: true, desc: 'Zero-spend open-source direct engine' },
  { id: 'workindia', name: 'WorkIndia Direct (JSON-LD)', free: true, desc: 'Zero-spend public Schema.org feed' },
  { id: 'apna', name: 'Apna.co Direct (JSON-LD)', free: true, desc: 'Zero-spend public Schema.org feed' },
  { id: 'lever_ats', name: 'Employer ATS (Lever)', free: true, desc: 'Shadowfax / Meesho / Porter career feeds' },
  { id: 'greenhouse_ats', name: 'Greenhouse Logistics ATS', free: true, desc: 'Public Greenhouse board APIs' },
  { id: 'headcount_labs', name: 'Headcount Labs API', free: false, desc: 'External API Key feed' },
];

export const AdminJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('Chennai');
  const [customCity, setCustomCity] = useState<string>('');
  const [discoveryQuery, setDiscoveryQuery] = useState<string>('Delivery Driver');
  const [scanLimit, setScanLimit] = useState<number>(25);
  const [selectedSources, setSelectedSources] = useState<string[]>([
    'jobspy_naukri',
    'jobspy_indeed',
    'workindia',
    'apna'
  ]);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<AdminScanStatus | null>(null);
  const pollTimeoutRef = useRef<any>(null);
  const pollCountRef = useRef<number>(0);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['adminJobs', selectedStatus, searchQuery],
    queryFn: () => adminService.getJobs({ status: selectedStatus, q: searchQuery }),
  });

  const { data: sources = [], isLoading: isLoadingSources } = useQuery({
    queryKey: ['adminScraperSources'],
    queryFn: () => adminService.getScraperSources(),
    enabled: showSourcesModal,
  });

  // Polling effect for active discovery scans with exponential backoff & max 15 attempts
  useEffect(() => {
    if (!activeScanId) return;

    pollCountRef.current = 0;
    let isCancelled = false;

    const executePoll = async () => {
      if (isCancelled) return;
      pollCountRef.current += 1;

      try {
        const res = await adminService.getScanStatus(activeScanId);
        const data = (res as any)?.data || res;
        if (!isCancelled) {
          setScanStatus(data);
        }

        if (data.status === 'COMPLETED') {
          toast.success(`Scan completed: ${data.valid_count || 0} blue-collar jobs discovered into Pending Review!`);
          setActiveScanId(null);
          queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
          queryClient.invalidateQueries({ queryKey: ['adminStats'] });
          return;
        } else if (data.status === 'FAILED' || data.status === 'INTERRUPTED' || data.status === 'CANCELLED') {
          toast.error(`Scan stopped with status: ${data.status}`);
          setActiveScanId(null);
          return;
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      }

      // Max attempt governor (15 attempts ~ 45-60s) to prevent runaway billing & infinite loops
      if (pollCountRef.current >= 15) {
        toast.info('Discovery scan processing completed. Refreshing jobs...');
        setActiveScanId(null);
        queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        return;
      }

      // Exponential backoff: starts at 2000ms, gently scales up to 8000ms
      const nextDelay = Math.min(2000 * Math.pow(1.25, pollCountRef.current - 1), 8000);
      if (!isCancelled) {
        pollTimeoutRef.current = setTimeout(executePoll, nextDelay);
      }
    };

    executePoll();

    return () => {
      isCancelled = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [activeScanId, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteJob(id),
    onSuccess: () => {
      toast.success('Job removed by administrator');
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    }
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'expire' }) =>
      adminService.moderateJob(id, action),
    onSuccess: (_, vars) => {
      toast.success(`Job ${vars.action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to moderate job');
    }
  });

  const syncExternalMutation = useMutation({
    mutationFn: (payload?: DynamicScanPayload) => adminService.syncExternalJobs(payload || { limit: 25, city: 'Chennai' }),
    onSuccess: (data: any) => {
      const scanId = data?.data?.id || data?.id;
      if (scanId) {
        setActiveScanId(scanId);
        setScanStatus(data?.data || data);
        toast.info('Blue-collar discovery scan started. Polling real-time progress...');
      } else {
        toast.success('Scan initiated');
        queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to trigger scraper service');
    }
  });

  const freshnessMutation = useMutation({
    mutationFn: () => adminService.runFreshnessCycle(),
    onSuccess: (data: any) => {
      const res = data?.data || data;
      toast.success(`Freshness check finished: scanned ${res?.scannedCount || 0}, expired ${res?.expiredCount || 0} dead postings.`);
      queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to run freshness check');
    }
  });

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the job posting "${title}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const statusTabs = [
    { label: 'All Jobs', value: 'ALL' },
    { label: 'Pending Review', value: 'PENDING_REVIEW' },
    { label: 'Open Requisitions', value: 'OPEN' },
    { label: 'Filled / Closed', value: 'FILLED' },
    { label: 'Expired', value: 'EXPIRED' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'SUPPORTED':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'AUTH_REQUIRED':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PERMISSION_REQUIRED':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'RATE_LIMITED':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'DOWN':
      case 'FAILED':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 font-['Onest',system-ui,sans-serif]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
            <span>Marketplace Quality & Moderation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] tracking-tight">
            Job Postings & Discovery
          </h1>
          <p className="text-xs sm:text-sm text-[#717784] mt-1 leading-relaxed">
            Review blue-collar job openings, moderate external vacancies into the live market, and inspect source compliance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSourcesModal(true)}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-[#f4f4f4] border border-[#e6e8ec] text-[#0a0a0a] text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            title="Inspect registered source adapters and compliance states"
          >
            <Database className="w-3.5 h-3.5 text-[#2563c9]" />
            <span>Source Registry</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDiscoveryModal(true)}
            disabled={syncExternalMutation.isPending || (scanStatus?.status === 'RUNNING')}
            className="px-3.5 py-2 rounded-full bg-[#0f2f63] hover:bg-[#1a4487] text-white text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer disabled:opacity-60"
            title="Configure and trigger dynamic multi-source blue-collar discovery scan"
          >
            {syncExternalMutation.isPending || (scanStatus?.status === 'RUNNING') ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-300" />
            )}
            <span>{scanStatus?.status === 'RUNNING' ? 'Scan In Progress...' : 'Discovery Command Center'}</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-white uppercase tracking-wider">
              Free $0
            </span>
          </button>

          <button
            type="button"
            onClick={() => freshnessMutation.mutate()}
            disabled={freshnessMutation.isPending}
            className="px-3.5 py-2 rounded-full bg-white hover:bg-[#f4f4f4] border border-[#e6e8ec] text-[#0a0a0a] text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-60"
            title="Scan existing external postings for expired/dead vacancy links"
          >
            {freshnessMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>{freshnessMutation.isPending ? 'Checking...' : 'Check Freshness'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Scan Progress Banner */}
      {scanStatus && (
        <div className={`p-4 rounded-2xl border transition-all ${
          scanStatus.status === 'RUNNING'
            ? 'bg-blue-50/50 border-blue-200'
            : scanStatus.status === 'COMPLETED'
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-rose-50/50 border-rose-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {scanStatus.status === 'RUNNING' ? (
                <Loader2 className="w-4 h-4 text-[#2563c9] animate-spin" />
              ) : scanStatus.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]">
                  Discovery Session: {scanStatus.status}
                </h4>
                <p className="text-xs text-[#717784]">
                  Found: <span className="font-medium text-[#0a0a0a]">{scanStatus.total_found}</span> | Valid (Pending Review): <span className="font-semibold text-emerald-600">{scanStatus.valid_count}</span> | Duplicates Merged: <span className="font-medium text-[#0a0a0a]">{scanStatus.duplicate_count}</span> | Rejected: <span className="font-medium text-[#717784]">{scanStatus.rejected_count}</span>
                </p>
              </div>
            </div>

            {scanStatus.status === 'COMPLETED' && (
              <button
                onClick={() => {
                  setActiveScanId(null);
                  setScanStatus(null);
                  setSelectedStatus('PENDING_REVIEW');
                }}
                className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium uppercase tracking-wider hover:bg-emerald-700 transition-all cursor-pointer"
              >
                View Pending Jobs
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="inline-flex p-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] overflow-x-auto max-w-full">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedStatus === tab.value
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'text-[#717784] hover:text-[#0a0a0a]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, employer, city..."
            className="w-full bg-[#f4f4f4]/60 hover:bg-[#f4f4f4] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-3.5 py-2 pl-9 text-xs text-[#0a0a0a] placeholder:text-[#9ea3ae] outline-hidden shadow-2xs transition-all"
          />
          <Search className="w-4 h-4 text-[#9ea3ae] absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <AppLoader variant="page" message="Loading job openings..." />
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#e6e8ec] shadow-xs">
          <Briefcase className="w-10 h-10 text-[#9ea3ae] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#0a0a0a]">No jobs found</h3>
          <p className="text-xs text-[#717784] mt-1">
            {selectedStatus === 'PENDING_REVIEW'
              ? 'No newly scraped jobs waiting for moderation.'
              : 'No jobs matched your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {jobs.map((job: any) => {
            const rawExpiry = job.expiresAt || job.expires_at;
            const createdDate = job.createdAt || job.created_at;
            const effectiveExpiry = rawExpiry
              ? new Date(rawExpiry)
              : (createdDate ? new Date(new Date(createdDate).getTime() + 30 * 24 * 60 * 60 * 1000) : null);
            const isExpired = Boolean(
              job.status === 'EXPIRED' ||
              job.status === 'CLOSED' ||
              (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
            );

            return (
              <div 
                key={job.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-[#0f2f63]/30 transition-all relative overflow-hidden ${
                  job.status === 'PENDING_REVIEW'
                    ? 'border-amber-200 bg-amber-50/15'
                    : isExpired
                    ? 'border-rose-200 bg-rose-50/10'
                    : 'border-[#e6e8ec]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        job.status === 'PENDING_REVIEW'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isExpired
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : job.status === 'OPEN' 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-[#f4f4f4] text-[#717784] border border-[#e6e8ec]'
                      }`}>
                        {job.status === 'PENDING_REVIEW' ? 'Pending Review' : (isExpired ? 'EXPIRED' : job.status)}
                      </span>
                      {(job.is_external || job.isExternal) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {job.source_name || job.sourceName || 'External Partner'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#717784] font-mono">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#0a0a0a] leading-tight mb-1">{job.title}</h3>
                  <p className="text-xs text-[#717784] font-medium">{job.employer_name || 'Verified Employer'}</p>

                  <div className="mt-3 pt-3 border-t border-[#e6e8ec] space-y-1.5 text-xs text-[#717784]">
                    <div className="flex items-center gap-1.5 text-[#0a0a0a]">
                      <MapPin className="w-3.5 h-3.5 text-[#9ea3ae]" />
                      <span>{job.city || job.location || 'Location unverified'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#0a0a0a]">
                      <IndianRupee className="w-3.5 h-3.5 text-[#9ea3ae]" />
                      <span>₹{job.budget?.toLocaleString() || 0} Budget</span>
                    </div>
                    {job.source_url && (
                      <div className="flex items-center gap-1.5 text-[#2563c9] text-[11px] truncate">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          {job.source_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Moderation & Delete Controls */}
                <div className="pt-3 border-t border-[#e6e8ec] flex items-center justify-between gap-2 flex-wrap">
                  {job.status === 'PENDING_REVIEW' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => moderateMutation.mutate({ id: job.id, action: 'approve' })}
                        disabled={moderateMutation.isPending}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Approve job and make visible to job-seekers"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => moderateMutation.mutate({ id: job.id, action: 'reject' })}
                        disabled={moderateMutation.isPending}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-[#e6e8ec] text-rose-600 rounded-full text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Reject listing from marketplace"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#717784] font-medium">
                      {job.city || 'Pan India'}
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(job.id, job.title)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-[#717784] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer ml-auto"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source Registry Modal */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#e6e8ec] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec]">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#2563c9]" />
                <h3 className="text-base font-semibold text-[#0a0a0a]">Job Sources & Compliance Registry</h3>
              </div>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="p-1.5 text-[#717784] hover:text-[#0a0a0a] rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingSources ? (
              <AppLoader variant="inline" message="Loading source registry..." />
            ) : (
              <div className="space-y-3">
                {sources.map((source: AdminSourceItem) => (
                  <div key={source.source_id} className="p-3.5 rounded-xl border border-[#e6e8ec] bg-[#f9fafb] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0a0a0a]">{source.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusBadge(source.status)}`}>
                        {source.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#717784] leading-relaxed">
                      {source.compliance_note}
                    </p>
                    {source.error_message && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        {source.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#e6e8ec] flex justify-end">
              <button
                onClick={() => setShowSourcesModal(false)}
                className="px-4 py-2 rounded-full bg-[#0f2f63] text-white text-xs font-medium uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Scraper Command Center Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#e6e8ec] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#2563c9] rounded-xl border border-blue-100">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0a0a0a]">Discovery Command Center</h3>
                  <p className="text-xs text-[#717784]">Multi-source blue-collar discovery with vernacular ontology ($0.00 Free Stack)</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="p-1.5 text-[#717784] hover:text-[#0a0a0a] rounded-lg cursor-pointer text-lg font-medium"
              >
                ✕
              </button>
            </div>

            {/* Target City Selector (Tamil Nadu focus) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2563c9]" />
                <span>Target City (Tamil Nadu Focus)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {TN_PRIORITY_CITIES.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      setSelectedCity(c.name);
                      setCustomCity('');
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                      selectedCity === c.name && !customCity
                        ? 'bg-[#0f2f63] text-white border-[#0f2f63] shadow-xs'
                        : 'bg-white text-[#717784] hover:text-[#0a0a0a] border-[#e6e8ec] hover:border-gray-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type another Indian city (e.g., Hosur, Tirunelveli, Bangalore)..."
                value={customCity}
                onChange={(e) => {
                  setCustomCity(e.target.value);
                  if (e.target.value) setSelectedCity(e.target.value);
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e6e8ec] bg-white text-[#0a0a0a] focus:outline-hidden focus:border-[#2563c9] transition-all"
              />
            </div>

            {/* Vernacular Trade Term Quick-Chips & Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#2563c9]" />
                  <span>Trade / Vernacular Query (Tamil / English / Hindi)</span>
                </label>
                <span className="text-[11px] text-[#2563c9] font-medium">Sahayak-RAG Trade Mapper Active</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-[#f9fafb] rounded-xl border border-[#e6e8ec]">
                {VERNACULAR_TRADE_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setDiscoveryQuery(chip.query)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                      discoveryQuery.toLowerCase().includes(chip.query.toLowerCase())
                        ? 'bg-[#2563c9] text-white border-[#2563c9]'
                        : 'bg-white text-[#4b5563] border-[#e5e7eb] hover:border-[#2563c9]'
                    }`}
                  >
                    <span>{chip.ta}</span>
                    <span className="opacity-70 ml-1 font-normal text-[10px]">({chip.label})</span>
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Search term (e.g. ஓட்டுநர், Electrician, Warehouse Packer, செக்யூரிட்டி)..."
                value={discoveryQuery}
                onChange={(e) => setDiscoveryQuery(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e6e8ec] bg-white text-[#0a0a0a] focus:outline-hidden focus:border-[#2563c9] transition-all"
              />
            </div>

            {/* Target Job Portals Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#2563c9]" />
                  <span>Sources & Engines</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSources(DISCOVERY_SOURCES.filter(s => s.free).map(s => s.id))}
                    className="text-[11px] text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Select All Free ($0.00)
                  </button>
                  <span className="text-[11px] text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSources(DISCOVERY_SOURCES.map(s => s.id))}
                    className="text-[11px] text-[#2563c9] hover:underline font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DISCOVERY_SOURCES.map((source) => {
                  const isChecked = selectedSources.includes(source.id);
                  return (
                    <label
                      key={source.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-blue-50/50 border-[#2563c9]/40'
                          : 'bg-white border-[#e6e8ec] hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSources(prev => [...prev, source.id]);
                          } else {
                            setSelectedSources(prev => prev.filter(id => id !== source.id));
                          }
                        }}
                        className="mt-0.5 rounded text-[#2563c9] focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-[#0a0a0a]">{source.name}</span>
                          {source.free && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Free $0
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#717784] truncate">{source.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scan Limit / Controls */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-[#717784]">Max postings per source:</span>
              <div className="flex gap-1.5">
                {[10, 25, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setScanLimit(num)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer border ${
                      scanLimit === num
                        ? 'bg-[#0f2f63] text-white border-[#0f2f63]'
                        : 'bg-white text-[#717784] border-[#e6e8ec]'
                    }`}
                  >
                    {num} jobs
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#e6e8ec] flex items-center justify-between gap-3">
              <div className="text-[11px] text-[#717784]">
                <span>Selected: </span>
                <span className="font-semibold text-[#0a0a0a]">{selectedSources.length} sources</span>
                <span> in </span>
                <span className="font-semibold text-[#0a0a0a]">{customCity || selectedCity}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(false)}
                  className="px-4 py-2 rounded-full border border-[#e6e8ec] hover:bg-[#f4f4f4] text-[#0a0a0a] text-xs font-medium uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedSources.length === 0 || syncExternalMutation.isPending}
                  onClick={() => {
                    const finalCity = customCity.trim() || selectedCity;
                    syncExternalMutation.mutate({
                      city: finalCity,
                      query: discoveryQuery.trim() || undefined,
                      sources: selectedSources,
                      limit: scanLimit,
                    });
                    setShowDiscoveryModal(false);
                  }}
                  className="px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#1a4487] text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                  <span>Launch Discovery Scan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
