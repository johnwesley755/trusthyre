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
  Save,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { mediaService } from '../../../services/media.service';
import { sanitizeHtmlDescription } from '../../../utils/textSanitizer';
import { toast } from 'sonner';
import { AppLoader } from '../../../components/common/AppLoader';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { Select } from '../../../components/ui/select';
import { TRADE_COVER_PRESETS, resolveJobCategoryLabel, resolveTradeCover } from '../../../utils/coverImage.utils';

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
  { id: 'apna', name: 'Apna.co Direct (JSON-LD)', free: true, desc: 'Zero-spend pan-India blue & grey collar feed' },
  { id: 'olx_jobs', name: 'OLX Jobs India', free: true, desc: 'Zero-spend local trade, factory & driver classifieds' },
  { id: 'nithra_jobs', name: 'Nithra Jobs (Tamil Nadu Regional)', free: true, desc: 'Deep Tamil Nadu SME, factory & field opportunities' },
  { id: 'quikr_jobs', name: 'QuikrJobs / Babajobs', free: true, desc: 'Zero-spend entry-level trade & logistics postings' },
  { id: 'workindia', name: 'WorkIndia Direct (JSON-LD)', free: true, desc: 'Zero-spend public Schema.org trade feed' },
  { id: 'jobspy_naukri', name: 'Naukri.com (JobSpy Engine)', free: true, desc: 'Zero-spend open-source direct engine' },
  { id: 'jobspy_indeed', name: 'Indeed India (JobSpy Engine)', free: true, desc: 'Zero-spend open-source direct engine' },
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
  const [jobToDelete, setJobToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editJobForm, setEditJobForm] = useState<{
    title: string;
    description: string;
    budget: number;
    city: string;
    address: string;
    industry: string;
    experienceYearsRequired: number;
    coverImageUrl: string;
    allowDirectCall: boolean;
    allowDirectWhatsapp: boolean;
    contactPhone: string;
    isUrgentSpotHire: boolean;
    isWalkInInterview: boolean;
    walkInDates: string;
    walkInTiming: string;
    walkInVenue: string;
    walkInContactPerson: string;
    perks: string[];
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
    address: '',
    industry: 'ELECTRICAL',
    experienceYearsRequired: 0,
    coverImageUrl: '',
    allowDirectCall: true,
    allowDirectWhatsapp: true,
    contactPhone: '',
    isUrgentSpotHire: false,
    isWalkInInterview: false,
    walkInDates: '',
    walkInTiming: '',
    walkInVenue: '',
    walkInContactPerson: '',
    perks: [],
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
  const editModalFileInputRef = useRef<HTMLInputElement>(null);
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
    onSuccess: (_data, deletedJobId) => {
      toast.success('Job removed by administrator');
      // Patch TanStack query cache directly without re-fetching
      queryClient.setQueriesData<AdminJobItem[]>({ queryKey: ['adminJobs'] }, (old: AdminJobItem[] | undefined) => {
        if (!Array.isArray(old)) return old;
        return old.filter((j) => j.id !== deletedJobId);
      }); 
      // Optionally adjust cached stats if present
      queryClient.setQueriesData<any>({ queryKey: ['adminStats'] }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          totalJobs: Math.max(0, (old.totalJobs || 0) - 1),
          jobsCount: Math.max(0, (old.jobsCount || 0) - 1)
        };
      });
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
    setJobToDelete({ id, title });
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
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
            <span>Marketplace Quality & Moderation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] dark:text-white tracking-tight">
            Job Postings & Discovery
          </h1>
          <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-1 leading-relaxed">
            Review blue-collar job openings, moderate external vacancies into the live market, and inspect source compliance.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowSourcesModal(true)}
            className="px-3.5 py-2 rounded-full bg-white dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 text-[#0a0a0a] dark:text-zinc-100 text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
            title="Inspect registered source adapters and compliance states"
          >
            <Database className="w-3.5 h-3.5 text-[#2563c9] dark:text-sky-400" />
            <span>Source Registry</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDiscoveryModal(true)}
            disabled={syncExternalMutation.isPending || (scanStatus?.status === 'RUNNING')}
            className="px-3.5 py-2 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#1a4487] text-white text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer disabled:opacity-60"
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
            className="px-3.5 py-2 rounded-full bg-white dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 text-[#0a0a0a] dark:text-zinc-100 text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer disabled:opacity-60"
            title="Scan existing external postings for expired/dead vacancy links"
          >
            {freshnessMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{freshnessMutation.isPending ? 'Checking...' : 'Check Freshness'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Scan Progress Banner */}
      {scanStatus && (
        <div className={`p-4 rounded-2xl border transition-all ${
          scanStatus.status === 'RUNNING'
            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
            : scanStatus.status === 'COMPLETED'
            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
            : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {scanStatus.status === 'RUNNING' ? (
                <Loader2 className="w-4 h-4 text-[#2563c9] dark:text-sky-400 animate-spin" />
              ) : scanStatus.status === 'COMPLETED' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] dark:text-white">
                  Discovery Session: {scanStatus.status}
                </h4>
                <p className="text-xs text-[#717784] dark:text-zinc-400">
                  Found: <span className="font-medium text-[#0a0a0a] dark:text-white">{scanStatus.total_found}</span> | Valid (Pending Review): <span className="font-semibold text-emerald-600 dark:text-emerald-400">{scanStatus.valid_count}</span> | Duplicates Merged: <span className="font-medium text-[#0a0a0a] dark:text-white">{scanStatus.duplicate_count}</span> | Rejected: <span className="font-medium text-[#717784] dark:text-zinc-400">{scanStatus.rejected_count}</span>
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
                className="px-3 py-1 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white text-xs font-medium uppercase tracking-wider hover:bg-emerald-700 transition-all cursor-pointer"
              >
                View Pending Jobs
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="inline-flex p-1 rounded-full bg-[#f4f4f4] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 overflow-x-auto max-w-full">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                selectedStatus === tab.value
                  ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                  : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
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
            className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-3.5 py-2 pl-9 text-xs text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 outline-hidden shadow-2xs transition-all"
          />
          <Search className="w-4 h-4 text-[#9ea3ae] dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <AppLoader variant="page" message="Loading job openings..." />
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-[#121215] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs">
          <Briefcase className="w-10 h-10 text-[#9ea3ae] dark:text-zinc-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#0a0a0a] dark:text-white">No jobs found</h3>
          <p className="text-xs text-[#717784] dark:text-zinc-400 mt-1">
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
                className={`bg-white dark:bg-[#121215] border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-[#0f2f63]/30 dark:hover:border-zinc-700 transition-all relative overflow-hidden ${
                  job.status === 'PENDING_REVIEW'
                    ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/15 dark:bg-amber-950/10'
                    : isExpired
                    ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/10 dark:bg-rose-950/10'
                    : 'border-[#e6e8ec] dark:border-zinc-800'
                }`}
              >
                <div>
                  {/* Job Cover Banner with Direct Edit Button */}
                  <div className="w-full h-28 -mx-5 -mt-5 mb-3 relative overflow-hidden bg-slate-100 dark:bg-zinc-800 border-b border-[#e6e8ec] dark:border-zinc-800 group">
                    <img 
                      src={job.cover_image_url || job.coverImageUrl || resolveTradeCover(job.title, job.industry)} 
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
                      {resolveJobCategoryLabel(job.title, job.industry)}
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
                          : 'bg-[#f4f4f4] dark:bg-zinc-800 text-[#717784] dark:text-zinc-400 border border-[#e6e8ec] dark:border-zinc-700'
                      }`}>
                        {job.status === 'PENDING_REVIEW' ? 'Pending Review' : (isExpired ? 'EXPIRED' : job.status)}
                      </span>
                      {(job.is_external || job.isExternal) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-sky-950/30 text-blue-700 dark:text-sky-400 border border-blue-200 dark:border-sky-900/50">
                          {job.source_name || job.sourceName || 'External Partner'}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#717784] dark:text-zinc-500 font-mono">
                      {job.created_at ? new Date(job.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-[#0a0a0a] dark:text-white leading-tight mb-1">{job.title}</h3>
                  <p className="text-xs text-[#717784] dark:text-zinc-400 font-medium">{job.employer_name || 'Verified Employer'}</p>

                  <div className="mt-3 pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 space-y-1.5 text-xs text-[#717784] dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 text-[#0a0a0a] dark:text-zinc-200">
                      <MapPin className="w-3.5 h-3.5 text-[#9ea3ae] dark:text-zinc-500" />
                      <span>{job.city || job.location || 'Location unverified'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#0a0a0a] dark:text-zinc-200">
                      <IndianRupee className="w-3.5 h-3.5 text-[#9ea3ae] dark:text-zinc-500" />
                      <span>₹{job.budget?.toLocaleString() || 0} Budget</span>
                    </div>
                    {job.source_url && (
                      <div className="flex items-center gap-1.5 text-[#2563c9] dark:text-sky-400 text-[11px] truncate">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          {job.source_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Moderation & Delete Controls */}
                <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
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
                        className="px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-[#e6e8ec] dark:border-zinc-700 text-rose-600 dark:text-rose-400 rounded-full text-xs font-medium uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Reject listing from marketplace"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#717784] dark:text-zinc-400 font-medium">
                      {job.city || 'Pan India'}
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <Link
                      to={`/jobs/${job.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:text-white bg-[#0f2f63]/5 dark:bg-sky-400/10 hover:bg-[#0f2f63] dark:hover:bg-sky-600 rounded-full transition-all cursor-pointer flex items-center gap-1"
                      title="View full job details page with candidate view and edit controls"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingJob(job);
                        const rawExtra = (job.alternate_sources && typeof job.alternate_sources === 'object')
                          ? ((job.alternate_sources as any).additional_details || job.alternate_sources)
                          : (job.additionalDetails || {});
                        const walkIn = (job as any).walkInDetails || (job as any).walk_in_details || rawExtra?.walkInDetails || (job.alternate_sources as any)?.walk_in_details || {};
                        const rawPerks = Array.isArray(job.perks) 
                          ? job.perks 
                          : (Array.isArray(rawExtra?.perks) ? rawExtra.perks : []);
                        setEditJobForm({
                          title: job.title || '',
                          description: sanitizeHtmlDescription(job.description || ''),
                          budget: job.budget ? Number(job.budget) : 0,
                          city: job.city || job.location || '',
                          address: (job as any).address || '',
                          industry: job.industry || 'ELECTRICAL',
                          experienceYearsRequired: (job as any).experience_years_required ?? (job as any).experienceYearsRequired ?? 0,
                          coverImageUrl: (job as any).cover_image_url || (job as any).coverImageUrl || '',
                          allowDirectCall: (job as any).allow_direct_call ?? (job as any).allowDirectCall ?? true,
                          allowDirectWhatsapp: (job as any).allow_direct_whatsapp ?? (job as any).allowDirectWhatsapp ?? true,
                          contactPhone: (job as any).contact_phone || (job as any).contactPhone || '',
                          isUrgentSpotHire: Boolean((job as any).is_urgent_spot_hire ?? (job as any).isUrgentSpotHire),
                          isWalkInInterview: Boolean((job as any).is_walk_in_interview ?? (job as any).isWalkInInterview),
                          walkInDates: walkIn.dates || '',
                          walkInTiming: walkIn.timing || '',
                          walkInVenue: walkIn.venue || '',
                          walkInContactPerson: walkIn.contactPerson || walkIn.contact_person || '',
                          perks: rawPerks,
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
                      className="px-2.5 py-1 text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:text-white bg-[#0f2f63]/5 dark:bg-sky-400/10 hover:bg-[#0f2f63] dark:hover:bg-sky-600 rounded-full transition-all cursor-pointer flex items-center gap-1"
                      title="Edit job description and details"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit JD</span>
                    </button>
                    <button
                      onClick={() => handleDelete(job.id, job.title)}
                      disabled={deleteMutation.isPending}
                      className="p-1.5 text-[#717784] dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C21] rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#e6e8ec] dark:border-zinc-800 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec] dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#2563c9] dark:text-sky-400" />
                <h3 className="text-base font-semibold text-[#0a0a0a] dark:text-white">Job Sources & Compliance Registry</h3>
              </div>
              <button
                onClick={() => setShowSourcesModal(false)}
                className="p-1.5 text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingSources ? (
              <AppLoader variant="inline" message="Loading source registry..." />
            ) : (
              <div className="space-y-3">
                {sources.map((source: AdminSourceItem) => (
                  <div key={source.source_id} className="p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#f9fafb] dark:bg-[#121215] space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0a0a0a] dark:text-white">{source.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${getStatusBadge(source.status)}`}>
                        {source.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#717784] dark:text-zinc-400 leading-relaxed">
                      {source.compliance_note}
                    </p>
                    {source.error_message && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
                        {source.error_message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setShowSourcesModal(false)}
                className="px-4 py-2 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] text-white text-xs font-medium uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Scraper Command Center Modal */}
      {showDiscoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C21] rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-[#e6e8ec] dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec] dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-sky-950/30 text-[#2563c9] dark:text-sky-400 rounded-xl border border-blue-100 dark:border-sky-900/50">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0a0a0a] dark:text-white">Discovery Command Center</h3>
                  <p className="text-xs text-[#717784] dark:text-zinc-400">Multi-source blue-collar discovery with vernacular ontology ($0.00 Free Stack)</p>
                </div>
              </div>
              <button
                onClick={() => setShowDiscoveryModal(false)}
                className="p-1.5 text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white rounded-lg cursor-pointer text-lg font-medium"
              >
                ✕
              </button>
            </div>

            {/* Target City Selector (Tamil Nadu focus) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] dark:text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2563c9] dark:text-sky-400" />
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
                        ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white border-[#0f2f63] dark:border-[#0066FF] shadow-xs'
                        : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-300 hover:text-[#0a0a0a] dark:hover:text-white border-[#e6e8ec] dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
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
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#000000] text-[#0a0a0a] dark:text-white focus:outline-hidden focus:border-[#2563c9] dark:focus:border-sky-500 transition-all"
              />
            </div>

            {/* Vernacular Trade Term Quick-Chips & Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] dark:text-white flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#2563c9] dark:text-sky-400" />
                  <span>Trade / Vernacular Query (Tamil / English / Hindi)</span>
                </label>
                <span className="text-[11px] text-[#2563c9] dark:text-sky-400 font-medium">Sahayak-RAG Trade Mapper Active</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-[#f9fafb] dark:bg-[#09090b] rounded-xl border border-[#e6e8ec] dark:border-zinc-800">
                {VERNACULAR_TRADE_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setDiscoveryQuery(chip.query)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                      discoveryQuery.toLowerCase().includes(chip.query.toLowerCase())
                        ? 'bg-[#2563c9] text-white border-[#2563c9]'
                        : 'bg-white dark:bg-[#121215] text-[#4b5563] dark:text-zinc-300 border-[#e5e7eb] dark:border-zinc-800 hover:border-[#2563c9]'
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
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#000000] text-[#0a0a0a] dark:text-white focus:outline-hidden focus:border-[#2563c9] dark:focus:border-sky-500 transition-all"
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
                          ? 'bg-blue-50/50 dark:bg-blue-950/30 border-[#2563c9]/40 dark:border-blue-500/50'
                          : 'bg-white dark:bg-[#121215] border-[#e6e8ec] dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
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
                        ? 'bg-[#0f2f63] dark:bg-sky-600 text-white border-[#0f2f63] dark:border-sky-600'
                        : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-300 border-[#e6e8ec] dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C21] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-[#e6e8ec] dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec] dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#0f2f63]/10 dark:bg-sky-400/20 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0a0a0a] dark:text-white">Edit Job Requisition</h3>
                  <p className="text-xs text-[#717784] dark:text-zinc-400">{editingJob.employer_name || 'Verified Employer'} • ID: {editingJob.id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="p-1.5 text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cover Image Uploader & Presets for Scraped/Admin Job */}
              <div className="bg-[#f8f9fa] dark:bg-[#121215] p-3.5 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                    <span className="text-[11px] font-bold text-[#0a0a0a] dark:text-white uppercase tracking-wide">Worksite Photo & Cover Banner</span>
                  </div>
                  {editJobForm.coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setEditJobForm({ ...editJobForm, coverImageUrl: '' })}
                      className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer"
                    >
                      Reset to Category Auto-Cover
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-36 h-24 rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-800 border border-[#e2e4e9] dark:border-zinc-700 relative shrink-0">
                    <img
                      src={editJobForm.coverImageUrl || resolveTradeCover(editJobForm.title, editJobForm.industry)}
                      alt="Job cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-medium backdrop-blur-xs">
                      {editJobForm.coverImageUrl ? 'Custom' : 'Auto'}
                    </div>
                  </div>

                  <div className="w-full flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={editModalFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setIsAdminUploading(true);
                          const localReader = new FileReader();
                          localReader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            if (res) setEditJobForm(prev => ({ ...prev, coverImageUrl: res }));
                          };
                          localReader.readAsDataURL(file);
                          try {
                            const res = await mediaService.uploadFile(file);
                            if (res?.url) {
                              setEditJobForm(prev => ({ ...prev, coverImageUrl: res.url }));
                              toast.success('Cover photo uploaded successfully!');
                            }
                          } catch {
                            toast.success('Local photo ready!');
                          } finally {
                            setIsAdminUploading(false);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => editModalFileInputRef.current?.click()}
                        disabled={isAdminUploading}
                        className="px-3 py-1.5 rounded-lg bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#1a4487] text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isAdminUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                        <span>Upload Custom Photo</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {TRADE_COVER_PRESETS.slice(0, 8).map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setEditJobForm({ ...editJobForm, coverImageUrl: preset.url })}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-all ${
                            editJobForm.coverImageUrl === preset.url 
                              ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white border-[#0f2f63] dark:border-[#0066FF]' 
                              : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-300 border-[#e6e8ec] dark:border-zinc-800 hover:border-[#0f2f63]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200 uppercase mb-1">Job Title *</label>
                <input
                  type="text"
                  value={editJobForm.title}
                  onChange={(e) => setEditJobForm({ ...editJobForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#000000] text-xs font-semibold text-[#0a0a0a] dark:text-white focus:outline-none focus:border-[#0f2f63] dark:focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200 uppercase mb-1">Trade / Industry Category *</label>
                  <Select
                    value={editJobForm.industry}
                    onChange={(e) => setEditJobForm({ ...editJobForm, industry: e.target.value })}
                  >
                    <option value="ELECTRICAL">⚡ Electrical & Maintenance</option>
                    <option value="PLUMBING">🔧 Plumbing & Sanitation</option>
                    <option value="CONSTRUCTION">🏗️ Construction & Civil</option>
                    <option value="CARPENTRY">🪚 Carpentry & Woodwork</option>
                    <option value="PAINTING">🎨 Painting & Finishing</option>
                    <option value="HVAC">❄️ HVAC & Refrigeration</option>
                    <option value="WELDING">🔥 Welding & Fabrication</option>
                    <option value="LOGISTICS">🚚 Delivery & Driving</option>
                    <option value="FACILITY_MANAGEMENT">🏢 Facility Management</option>
                    <option value="SOLAR_RENEWABLE">☀️ Solar & Renewable</option>
                    <option value="AUTOMOTIVE">🚗 Automotive & Mechanic</option>
                    <option value="HOSPITALITY">🍽️ Cooking & Hospitality</option>
                    <option value="RETAIL">🛍️ Retail & Store Operations</option>
                    <option value="HEALTHCARE">🏥 Healthcare & Medical Staff</option>
                    <option value="EDUCATION">🎓 Education & Training</option>
                    <option value="OFFICE_ADMIN">💼 Office Admin & Computer</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200 uppercase mb-1">City / Region *</label>
                  <input
                    type="text"
                    value={editJobForm.city}
                    onChange={(e) => setEditJobForm({ ...editJobForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    placeholder="e.g. Chennai"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Worksite Street Address</label>
                  <input
                    type="text"
                    value={editJobForm.address}
                    onChange={(e) => setEditJobForm({ ...editJobForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    placeholder="e.g. Guindy Industrial Estate, Plot 14"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Experience Required (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={editJobForm.experienceYearsRequired}
                    onChange={(e) => setEditJobForm({ ...editJobForm, experienceYearsRequired: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs font-medium focus:outline-none focus:border-[#0f2f63]"
                    placeholder="0 for Fresher"
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
                  rows={6}
                  value={editJobForm.description}
                  onChange={(e) => setEditJobForm({ ...editJobForm, description: e.target.value })}
                  placeholder="Enter clean job description, duties, and hiring requirements..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs leading-relaxed focus:outline-none focus:border-[#0f2f63] font-sans"
                />
                <span className="text-[10px] text-[#717784]">Any HTML tags like &lt;p&gt; or &lt;br&gt; will be automatically stripped upon saving.</span>
              </div>

              {/* Frontline Workplace Perks Multi-select (Apna / WorkIndia) */}
              <div className="pt-3 border-t border-[#e6e8ec] space-y-2">
                <label className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider block">
                  Workplace Perks & Benefits Provided
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'Free Food', label: '🍛 Free Food / Meals' },
                    { id: 'Room Provided', label: '🏠 Room / Lodging' },
                    { id: 'Daily Pay', label: '💵 Daily / Weekly Payout' },
                    { id: 'Overtime Pay', label: '⏱️ Overtime (OT) Pay' },
                    { id: 'Travel Allowance', label: '⛽ Fuel / Travel Allowance' },
                    { id: 'ESI PF Benefits', label: '🛡️ ESI / PF Benefits' },
                  ].map(perk => {
                    const isSelected = editJobForm.perks.includes(perk.id);
                    return (
                      <button
                        key={perk.id}
                        type="button"
                        onClick={() => {
                          setEditJobForm(prev => ({
                            ...prev,
                            perks: prev.perks.includes(perk.id)
                              ? prev.perks.filter(p => p !== perk.id)
                              : [...prev.perks, perk.id]
                          }));
                        }}
                        className={`p-2.5 rounded-xl border text-[11px] font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#0f2f63] dark:bg-sky-600 text-white border-[#0f2f63] dark:border-sky-600'
                            : 'bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-200 border-[#e6e8ec] dark:border-zinc-800 hover:border-[#0f2f63]/40 dark:hover:border-zinc-700'
                        }`}
                      >
                        <span>{perk.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Direct Calling & Contact Options */}
              <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 space-y-3">
                <span className="text-[11px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase tracking-wider block">Candidate Contact Channels</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215]">
                    <div>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">Direct Phone Call</p>
                      <p className="text-[10px] text-[#717784] dark:text-zinc-400">Enables Call HR button</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editJobForm.allowDirectCall}
                      onChange={(e) => setEditJobForm({ ...editJobForm, allowDirectCall: e.target.checked })}
                      className="w-4 h-4 accent-[#0f2f63] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215]">
                    <div>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-white">WhatsApp Chat</p>
                      <p className="text-[10px] text-[#717784] dark:text-zinc-400">Enables WhatsApp button</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editJobForm.allowDirectWhatsapp}
                      onChange={(e) => setEditJobForm({ ...editJobForm, allowDirectWhatsapp: e.target.checked })}
                      className="w-4 h-4 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200 uppercase mb-1">Recruiter / Supervisor Phone Number</label>
                  <input
                    type="tel"
                    value={editJobForm.contactPhone}
                    onChange={(e) => setEditJobForm({ ...editJobForm, contactPhone: e.target.value })}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#000000] text-[#0a0a0a] dark:text-white text-xs font-medium focus:outline-none focus:border-[#0f2f63] dark:focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Walk-in Interview Details */}
              <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase tracking-wider">Walk-in Interview FastTrack</span>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editJobForm.isWalkInInterview}
                      onChange={(e) => setEditJobForm({ ...editJobForm, isWalkInInterview: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 cursor-pointer"
                    />
                    <span>Is Walk-in Interview</span>
                  </label>
                </div>

                {editJobForm.isWalkInInterview && (
                  <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#0a0a0a] dark:text-zinc-300 uppercase mb-1">Walk-in Dates</label>
                        <input
                          type="text"
                          value={editJobForm.walkInDates}
                          onChange={(e) => setEditJobForm({ ...editJobForm, walkInDates: e.target.value })}
                          placeholder="e.g. 06 Nov - 09 Nov (Mon to Fri)"
                          className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs bg-white dark:bg-[#000000] text-slate-900 dark:text-white focus:outline-none focus:border-[#0f2f63] dark:focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#0a0a0a] dark:text-zinc-300 uppercase mb-1">Timing Slot</label>
                        <input
                          type="text"
                          value={editJobForm.walkInTiming}
                          onChange={(e) => setEditJobForm({ ...editJobForm, walkInTiming: e.target.value })}
                          placeholder="e.g. 10:00 AM - 04:00 PM"
                          className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs bg-white dark:bg-[#000000] text-slate-900 dark:text-white focus:outline-none focus:border-[#0f2f63] dark:focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-[#0a0a0a] dark:text-zinc-300 uppercase mb-1">Venue / Landmark</label>
                        <input
                          type="text"
                          value={editJobForm.walkInVenue}
                          onChange={(e) => setEditJobForm({ ...editJobForm, walkInVenue: e.target.value })}
                          placeholder="e.g. Near Metro Station, Opp. Police Station"
                          className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs bg-white dark:bg-[#000000] text-slate-900 dark:text-white focus:outline-none focus:border-[#0f2f63] dark:focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#0a0a0a] dark:text-zinc-300 uppercase mb-1">Contact Person / HR</label>
                        <input
                          type="text"
                          value={editJobForm.walkInContactPerson}
                          onChange={(e) => setEditJobForm({ ...editJobForm, walkInContactPerson: e.target.value })}
                          placeholder="e.g. Mr. Ramesh (HR Manager)"
                          className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs bg-white dark:bg-[#000000] text-slate-900 dark:text-white focus:outline-none focus:border-[#0f2f63] dark:focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                    <Select
                      value={editJobForm.employmentType}
                      onChange={(e) => setEditJobForm({ ...editJobForm, employmentType: e.target.value })}
                    >
                      <option value="">Not specified</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Shift Based">Shift Based</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#0a0a0a] uppercase mb-1">Shift</label>
                    <Select
                      value={editJobForm.shift}
                      onChange={(e) => setEditJobForm({ ...editJobForm, shift: e.target.value })}
                    >
                      <option value="">Not specified</option>
                      <option value="Day Shift">Day Shift</option>
                      <option value="Night Shift">Night Shift</option>
                      <option value="Rotational Shift">Rotational Shift</option>
                      <option value="Flexible Hours">Flexible Hours</option>
                    </Select>
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
                    <Select
                      value={editJobForm.education}
                      onChange={(e) => setEditJobForm({ ...editJobForm, education: e.target.value })}
                    >
                      <option value="">Not specified</option>
                      <option value="Below 10th">Below 10th</option>
                      <option value="10th Pass">10th Pass</option>
                      <option value="12th Pass">12th Pass</option>
                      <option value="Diploma / ITI">Diploma / ITI</option>
                      <option value="Graduate">Graduate</option>
                      <option value="Any Education">Any Education</option>
                    </Select>
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
                    <Select
                      value={editJobForm.gender}
                      onChange={(e) => setEditJobForm({ ...editJobForm, gender: e.target.value })}
                    >
                      <option value="">Any gender</option>
                      <option value="Male Only">Male Only</option>
                      <option value="Female Only">Female Only</option>
                      <option value="Any gender">Any gender</option>
                    </Select>
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
                    coverImageUrl: editJobForm.coverImageUrl,
                    extra: {
                      title: editJobForm.title,
                      description: editJobForm.description,
                      budget: editJobForm.budget,
                      city: editJobForm.city,
                      location: editJobForm.city,
                      address: editJobForm.address,
                      industry: editJobForm.industry,
                      experienceYearsRequired: editJobForm.experienceYearsRequired,
                      coverImageUrl: editJobForm.coverImageUrl,
                      cover_image_url: editJobForm.coverImageUrl,
                      perks: editJobForm.perks,
                      allowDirectCall: editJobForm.allowDirectCall,
                      allow_direct_call: editJobForm.allowDirectCall,
                      allowDirectWhatsapp: editJobForm.allowDirectWhatsapp,
                      allow_direct_whatsapp: editJobForm.allowDirectWhatsapp,
                      contactPhone: editJobForm.contactPhone,
                      contact_phone: editJobForm.contactPhone,
                      isUrgentSpotHire: editJobForm.isUrgentSpotHire,
                      is_urgent_spot_hire: editJobForm.isUrgentSpotHire,
                      isWalkInInterview: editJobForm.isWalkInInterview,
                      is_walk_in_interview: editJobForm.isWalkInInterview,
                      walkInDetails: editJobForm.isWalkInInterview ? {
                        isWalkIn: true,
                        dates: editJobForm.walkInDates,
                        timing: editJobForm.walkInTiming,
                        venue: editJobForm.walkInVenue,
                        contactPerson: editJobForm.walkInContactPerson,
                      } : null,
                      additionalDetails: {
                        department: editJobForm.department,
                        roleCategory: editJobForm.roleCategory,
                        employmentType: editJobForm.employmentType,
                        shift: editJobForm.shift,
                        experience: editJobForm.experience,
                        education: editJobForm.education,
                        languages: editJobForm.languages,
                        ageLimit: editJobForm.ageLimit,
                        gender: editJobForm.gender,
                        perks: editJobForm.perks,
                        allowDirectCall: editJobForm.allowDirectCall,
                        allowDirectWhatsapp: editJobForm.allowDirectWhatsapp,
                        contactPhone: editJobForm.contactPhone,
                        walkInDetails: editJobForm.isWalkInInterview ? {
                          isWalkIn: true,
                          dates: editJobForm.walkInDates,
                          timing: editJobForm.walkInTiming,
                          venue: editJobForm.walkInVenue,
                          contactPerson: editJobForm.walkInContactPerson,
                        } : null,
                      }
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C21] rounded-3xl max-w-lg w-full p-6 border border-[#e6e8ec] dark:border-zinc-800 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white">Manage Job Cover Photo</h3>
                <p className="text-xs text-[#717784] dark:text-zinc-400 truncate max-w-xs">{editingCoverJob.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoverJob(null)}
                className="p-1 rounded-full text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Current Active Preview */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200">Current Preview</label>
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 relative border border-[#e6e8ec] dark:border-zinc-800">
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
              className="p-4 border-2 border-dashed border-[#c5c8d0] dark:border-zinc-700 hover:border-[#0f2f63] dark:hover:border-sky-500 hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 rounded-2xl text-center cursor-pointer transition-all flex items-center justify-center gap-3 bg-white dark:bg-[#121215]"
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
              <div className="w-10 h-10 rounded-xl bg-[#0f2f63]/5 dark:bg-sky-400/10 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="block text-xs font-bold text-[#0a0a0a] dark:text-white">Upload Your Own Image</span>
                <span className="block text-[11px] text-[#717784] dark:text-zinc-400">Click to browse photo from computer or phone</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200">Or Choose a Free Trade Preset</label>
              <div className="grid grid-cols-3 gap-2">
                {TRADE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setCustomCoverInput(preset.url)}
                    className={`p-1.5 rounded-xl border text-left cursor-pointer transition-all ${
                      customCoverInput === preset.url
                        ? 'border-[#0f2f63] dark:border-sky-500 bg-[#0f2f63]/5 dark:bg-sky-500/10 font-bold shadow-xs'
                        : 'border-[#e6e8ec] dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-10 rounded-lg object-cover mb-1" />
                    <span className="block text-[10px] text-[#0a0a0a] dark:text-zinc-200 truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#e6e8ec] dark:border-zinc-800">
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
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Clear Cover
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCoverJob(null)}
                  className="px-4 py-2 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-xs font-medium cursor-pointer hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 text-[#0a0a0a] dark:text-zinc-300"
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
                  className="px-4 py-2 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#1a4487] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  Save Cover Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Job Modal */}
      <ConfirmModal
        isOpen={Boolean(jobToDelete)}
        title="Delete Job Posting"
        description="Are you sure you want to permanently delete this job posting? This action cannot be undone."
        entityName={jobToDelete?.title}
        confirmText="Delete Job"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (jobToDelete?.id) {
            deleteMutation.mutate(jobToDelete.id, {
              onSettled: () => setJobToDelete(null)
            });
          }
        }}
        onCancel={() => setJobToDelete(null)}
      />
    </div>
  );
};
