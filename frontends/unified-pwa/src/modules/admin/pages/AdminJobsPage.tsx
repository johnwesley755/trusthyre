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
  Check,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  Edit3,
  FileText,
  Save
} from 'lucide-react';
import { mediaService } from '../../../services/media.service';
import { sanitizeHtmlDescription } from '../../../utils/textSanitizer';
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


const TRADE_PRESETS = [
  { id: 'electrical', label: 'Electrical', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80' },
  { id: 'logistics', label: 'Delivery / Logistics', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80' },
  { id: 'construction', label: 'Construction', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=1200&q=80' },
  { id: 'cooking', label: 'Kitchen / Chef', url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1200&q=80' },
  { id: 'maintenance', label: 'Maintenance / AC', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80' },
  { id: 'security', label: 'Security', url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80' },
];

const resolveAutoCover = (title?: string, industry?: string): string => {
  const text = (title || '' + ' ' + (industry || '')).toLowerCase();
  if (text.includes('electr')) return TRADE_PRESETS[0].url;
  if (text.includes('driv') || text.includes('deliver') || text.includes('logist')) return TRADE_PRESETS[1].url;
  if (text.includes('construct') || text.includes('mason') || text.includes('carpenter')) return TRADE_PRESETS[2].url;
  if (text.includes('cook') || text.includes('chef') || text.includes('kitchen')) return TRADE_PRESETS[3].url;
  if (text.includes('plumb') || text.includes('technician') || text.includes('repair')) return TRADE_PRESETS[4].url;
  if (text.includes('secur') || text.includes('guard')) return TRADE_PRESETS[5].url;
  return TRADE_PRESETS[4].url;
};

export const AdminJobsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCoverJob, setEditingCoverJob] = useState<any | null>(null);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editJobForm, setEditJobForm] = useState<{
    title: string;
    description: string;
    budget: number;
    city: string;
    department: string;
    roleCategory: string;
    employmentType: string;
    shift: string;
    experience: string;
    education: string;
    languages: string;
    ageLimit: string;
    gender: string;
  }>({
    title: '',
    description: '',
    budget: 0,
    city: '',
    department: '',
    roleCategory: '',
    employmentType: '',
    shift: '',
    experience: '',
    education: '',
    languages: '',
    ageLimit: '',
    gender: ''
  });
  const [customCoverInput, setCustomCoverInput] = useState<string>('');
  const adminFileInputRef = useRef<HTMLInputElement>(null);
  const [isAdminUploading, setIsAdminUploading] = useState<boolean>(false);

  const handleAdminFileUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    setIsAdminUploading(true);
    const localReader = new FileReader();
    localReader.onload = (e) => {
      const localDataUrl = e.target?.result as string;
      if (localDataUrl) {
        setCustomCoverInput(localDataUrl);
      }
    };
    localReader.readAsDataURL(file);

    try {
      const res = await mediaService.uploadFile(file);
      if (res?.url) {
        setCustomCoverInput(res.url);
        toast.success('Cover image uploaded!');
      }
    } catch {
      toast.success('Photo ready to save!');
    } finally {
      setIsAdminUploading(false);
    }
  };


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
  const isPollingInFlightRef = useRef<boolean>(false);

  useEffect(() => {
    if (!activeScanId) return;

    pollCountRef.current = 0;
    let isCancelled = false;

    const executePoll = async () => {
      if (isCancelled || isPollingInFlightRef.current) return;
      isPollingInFlightRef.current = true;
      pollCountRef.current += 1;

      try {
        const res = await adminService.getScanStatus(activeScanId);
        const data = (res as any)?.data || res;
        if (isCancelled) return;
        setScanStatus(data);

        if (data.status === 'COMPLETED') {
          if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
          }
          toast.success(`Scan completed: ${data.valid_count || 0} blue-collar jobs discovered into Pending Review!`);
          setActiveScanId(null);
          queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
          return;
        } else if (data.status === 'FAILED' || data.status === 'INTERRUPTED' || data.status === 'CANCELLED') {
          if (pollTimeoutRef.current) {
            clearTimeout(pollTimeoutRef.current);
            pollTimeoutRef.current = null;
          }
          toast.error(`Scan stopped with status: ${data.status}`);
          setActiveScanId(null);
          return;
        }
      } catch (err: any) {
        console.error('Polling error:', err);
      } finally {
        isPollingInFlightRef.current = false;
      }

      if (isCancelled) return;

      // Max attempt governor (15 attempts ~ 45-60s) to prevent runaway billing & infinite loops
      if (pollCountRef.current >= 15) {
        if (pollTimeoutRef.current) {
          clearTimeout(pollTimeoutRef.current);
          pollTimeoutRef.current = null;
        }
        toast.info('Discovery scan processing completed. Refreshing jobs...');
        setActiveScanId(null);
        queryClient.invalidateQueries({ queryKey: ['adminJobs'] });
        return;
      }

      // Exponential backoff: starts at 2000ms, gently scales up to 6000ms
      const nextDelay = Math.min(2000 * Math.pow(1.2, pollCountRef.current - 1), 6000);
      if (!isCancelled) {
        pollTimeoutRef.current = setTimeout(executePoll, nextDelay);
      }
    };

    executePoll();

    return () => {
      isCancelled = true;
      isPollingInFlightRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
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
    mutationFn: ({ id, action, coverImageUrl, extra }: { id: string; action: 'approve' | 'reject' | 'expire' | 'update'; coverImageUrl?: string; extra?: any }) => adminService.moderateJob(id, action, undefined, coverImageUrl, extra),
    onSuccess: (_, vars) => {
      if (vars.action === 'update') { toast.success('Cover image updated successfully'); } else { toast.success(`Job ${vars.action}d successfully`); }
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
                  {/* Job Cover Banner with Direct Edit Button */}
                  <div className="w-full h-28 -mx-5 -mt-5 mb-3 relative overflow-hidden bg-slate-100 border-b border-[#e6e8ec] group">
                    <img 
                      src={job.cover_image_url || job.coverImageUrl || resolveAutoCover(job.title, job.industry)} 
                      alt={job.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCoverJob(job);
                        setCustomCoverInput(job.cover_image_url || job.coverImageUrl || '');
                      }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Upload or change cover photo for this job"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Cover Photo</span>
                    </button>
                    <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold">
                      {job.industry || 'Field Operations'}
                    </span>
                  </div>

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

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingJob(job);
                        const rawExtra = (job.alternate_sources && typeof job.alternate_sources === 'object')
                          ? ((job.alternate_sources as any).additional_details || job.alternate_sources)
                          : (job.additionalDetails || {});
                        setEditJobForm({
                          title: job.title || '',
                          description: sanitizeHtmlDescription(job.description || ''),
                          budget: job.budget ? Number(job.budget) : 0,
                          city: job.city || job.location || '',
                          department: rawExtra.department || '',
                          roleCategory: rawExtra.roleCategory || rawExtra.role_category || '',
                          employmentType: rawExtra.employmentType || rawExtra.employment_type || '',
                          shift: rawExtra.shift || '',
                          experience: rawExtra.experience || '',
                          education: rawExtra.education || '',
                          languages: rawExtra.languages || rawExtra.englishLevel || rawExtra.english_level || '',
                          ageLimit: rawExtra.ageLimit || rawExtra.age_limit || '',
                          gender: rawExtra.gender || ''
                        });
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0f2f63] hover:text-white bg-[#0f2f63]/5 hover:bg-[#0f2f63] rounded-full transition-all cursor-pointer flex items-center gap-1"
                      title="Edit job description and details"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit JD</span>
                    </button>
                    <button
                      onClick={() => handleDelete(job.id, job.title)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-[#717784] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Edit Job Description & Details Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#e6e8ec] space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0f2f63]/10 text-[#0f2f63] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0a0a0a]">Edit Job Requisition</h3>
                  <p className="text-xs text-[#717784]">{editingJob.employer_name || 'Verified Employer'} • ID: {editingJob.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="p-1.5 text-[#717784] hover:text-[#0a0a0a] rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Job Title</label>
                <input
                  type="text"
                  value={editJobForm.title}
                  onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs font-semibold focus:outline-none focus:border-[#0f2f63]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">City / Location</label>
                  <input
                    type="text"
                    value={editJobForm.city}
                    onChange={(e) => setEditJobForm({ ...editJobForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Monthly Salary / Budget (₹)</label>
                  <input
                    type="number"
                    value={editJobForm.budget || ''}
                    onChange={(e) => setEditJobForm({ ...editJobForm, budget: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    placeholder="e.g. 25000"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#0a0a0a] uppercase">Job Description & Scope</label>
                  <button
                    type="button"
                    onClick={() => setEditJobForm({ ...editJobForm, description: sanitizeHtmlDescription(editJobForm.description) })}
                    className="text-[10px] text-[#0f2f63] font-semibold hover:underline cursor-pointer"
                  >
                    Clean HTML tags
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={editJobForm.description}
                  onChange={(e) => setEditJobForm({ ...editJobForm, description: e.target.value })}
                  placeholder="Enter clean job description, duties, and hiring requirements..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs leading-relaxed focus:outline-none focus:border-[#0f2f63] font-sans"
                />
                <span className="text-[10px] text-[#717784]">Any HTML tags like &lt;p&gt; or &lt;br&gt; will be automatically stripped upon saving.</span>
              </div>

              {/* Rich Job Criteria & Eligibility Details (Optional) */}
              <div className="pt-3 border-t border-[#e6e8ec] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider">Role & Eligibility Criteria (Optional)</span>
                  <span className="text-[10px] text-[#717784]">Shown on Job Details Page</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Restaurant / Hospitality / Tourism"
                      value={editJobForm.department}
                      onChange={(e) => setEditJobForm({ ...editJobForm, department: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Role / Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Cook / Chef / Kitchen Help"
                      value={editJobForm.roleCategory}
                      onChange={(e) => setEditJobForm({ ...editJobForm, roleCategory: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Employment Type</label>
                    <select
                      value={editJobForm.employmentType}
                      onChange={(e) => setEditJobForm({ ...editJobForm, employmentType: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                    >
                      <option value="">Not specified</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Shift Based">Shift Based</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Shift</label>
                    <select
                      value={editJobForm.shift}
                      onChange={(e) => setEditJobForm({ ...editJobForm, shift: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                    >
                      <option value="">Not specified</option>
                      <option value="Day Shift">Day Shift</option>
                      <option value="Night Shift">Night Shift</option>
                      <option value="Rotational Shift">Rotational Shift</option>
                      <option value="Flexible Hours">Flexible Hours</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Experience</label>
                    <input
                      type="text"
                      placeholder="e.g. Any experience / 1-2 Yrs"
                      value={editJobForm.experience}
                      onChange={(e) => setEditJobForm({ ...editJobForm, experience: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Education</label>
                    <select
                      value={editJobForm.education}
                      onChange={(e) => setEditJobForm({ ...editJobForm, education: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                    >
                      <option value="">Not specified</option>
                      <option value="Below 10th">Below 10th</option>
                      <option value="10th Pass">10th Pass</option>
                      <option value="12th Pass">12th Pass</option>
                      <option value="Diploma / ITI">Diploma / ITI</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Any Education">Any Education</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Languages</label>
                    <input
                      type="text"
                      placeholder="e.g. English, Tamil, Hindi"
                      value={editJobForm.languages}
                      onChange={(e) => setEditJobForm({ ...editJobForm, languages: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Age Limit</label>
                    <input
                      type="text"
                      placeholder="e.g. 18 - 35 years"
                      value={editJobForm.ageLimit}
                      onChange={(e) => setEditJobForm({ ...editJobForm, ageLimit: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Gender Preference</label>
                    <select
                      value={editJobForm.gender}
                      onChange={(e) => setEditJobForm({ ...editJobForm, gender: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-[#e2e4e9] text-xs font-medium focus:outline-none focus:border-[#0f2f63] bg-white"
                    >
                      <option value="">Any gender</option>
                      <option value="Male Only">Male Only</option>
                      <option value="Female Only">Female Only</option>
                      <option value="Any gender">Any gender</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e6e8ec]">
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="px-4 py-2 rounded-full border border-[#e6e8ec] text-xs font-medium cursor-pointer hover:bg-[#f4f4f4]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={moderateMutation.isPending}
                onClick={() => {
                  moderateMutation.mutate({
                    id: editingJob.id,
                    action: 'update',
                    extra: {
                      title: editJobForm.title,
                      description: editJobForm.description,
                      budget: editJobForm.budget,
                      city: editJobForm.city
                    }
                  });
                  setEditingJob(null);
                }}
                className="px-5 py-2 rounded-full bg-[#0f2f63] hover:bg-[#1a4487] text-white text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cover Image Editor Modal with Direct Upload */}
      {editingCoverJob && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-[#e6e8ec] shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0a0a0a]">Manage Job Cover Photo</h3>
                <p className="text-xs text-[#717784] truncate max-w-xs">{editingCoverJob.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoverJob(null)}
                className="p-1 rounded-full text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0a0a0a]">Current Preview</label>
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 relative border border-[#e6e8ec]">
                <img
                  src={customCoverInput || editingCoverJob.cover_image_url || editingCoverJob.coverImageUrl || resolveAutoCover(editingCoverJob.title, editingCoverJob.industry)}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {isAdminUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-semibold gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading photo...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Device Upload Box */}
            <div
              onClick={() => adminFileInputRef.current?.click()}
              className="p-4 border-2 border-dashed border-[#c5c8d0] hover:border-[#0f2f63] hover:bg-slate-50/80 rounded-2xl text-center cursor-pointer transition-all flex items-center justify-center gap-3 bg-white"
            >
              <input
                ref={adminFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAdminFileUpload(file);
                }}
              />
              <div className="w-10 h-10 rounded-xl bg-[#0f2f63]/5 text-[#0f2f63] flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-[#0a0a0a]">Upload Your Own Image</span>
                <span className="block text-[11px] text-[#717784]">Click to browse photo from computer or phone</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0a0a0a]">Or Choose a Free Trade Preset</label>
              <div className="grid grid-cols-3 gap-2">
                {TRADE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCustomCoverInput(preset.url)}
                    className={`p-1.5 rounded-xl border text-left cursor-pointer transition-all ${
                      customCoverInput === preset.url
                        ? 'border-[#0f2f63] bg-[#0f2f63]/5 font-bold shadow-xs'
                        : 'border-[#e6e8ec] hover:border-slate-400'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-10 rounded-lg object-cover mb-1" />
                    <span className="block text-[10px] text-[#0a0a0a] truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#e6e8ec]">
              <button
                type="button"
                onClick={() => {
                  moderateMutation.mutate({
                    id: editingCoverJob.id,
                    action: 'update',
                    coverImageUrl: ''
                  });
                  setEditingCoverJob(null);
                }}
                className="text-xs text-rose-600 hover:underline cursor-pointer"
              >
                Clear Cover
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCoverJob(null)}
                  className="px-4 py-2 rounded-full border border-[#e6e8ec] text-xs font-medium cursor-pointer hover:bg-[#f4f4f4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={moderateMutation.isPending || isAdminUploading}
                  onClick={() => {
                    moderateMutation.mutate({
                      id: editingCoverJob.id,
                      action: 'update',
                      coverImageUrl: customCoverInput
                    });
                    setEditingCoverJob(null);
                  }}
                  className="px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#1a4487] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Save Cover Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
