import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadService, type EmployerLeadItem } from '../../../services/lead.service';
import { 
  Building2, 
  Search, 
  ExternalLink, 
  Link2,
  Mail, 
  Phone, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  UserCheck, 
  Send, 
  Loader2, 
  X, 
  TrendingUp, 
  ShieldCheck,
  Sparkles,
  Radar,
  Bot,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLoader } from '../../../components/common/AppLoader';

/**
 * Strips HTML tags, handles entities, and normalizes text for clean UI display.
 */
const stripHtml = (html?: string | null): string => {
  if (!html) return '';
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    } catch {
      // fallback
    }
  }
  const stripped = html.replace(/<[^>]*>/g, ' ');
  return stripped
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|#x2F);/g, (match) => {
      switch (match) {
        case '&amp;': return '&';
        case '&lt;': return '<';
        case '&gt;': return '>';
        case '&quot;': return '"';
        case '&#39;':
        case '&apos;': return "'";
        case '&nbsp;': return ' ';
        case '&#x2F;': return '/';
        default: return match;
      }
    })
    .replace(/\s+/g, ' ')
    .trim();
};

export const AdminLeadsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [contactabilityFilter, setContactabilityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('NEWEST');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const [selectedLead, setSelectedLead] = useState<EmployerLeadItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<any | null>(null);
  const pollIntervalRef = useRef<any>(null);
  const pollTimeoutRef = useRef<any>(null);
  const pollCountRef = useRef<number>(0);

  // Multi-Trade Auto-Discovery Modal State
  const [isDiscoveryModalOpen, setIsDiscoveryModalOpen] = useState(false);
  const [discoveryTrade, setDiscoveryTrade] = useState<string>('ALL');
  const [customTrade, setCustomTrade] = useState<string>('');
  const [discoveryCity, setDiscoveryCity] = useState<string>('Chennai');
  const [customCity, setCustomCity] = useState<string>('');
  const [discoveryLimit, setDiscoveryLimit] = useState<number>(25);

  // Outreach Form State
  const [outreachForm, setOutreachForm] = useState({
    channel: 'PHONE',
    contactTarget: '',
    notes: '',
    outcome: 'INTERESTED',
  });

  // Manual Ingest Form State
  const [newLeadForm, setNewLeadForm] = useState({
    companyName: '',
    companyWebsite: '',
    industry: 'Hospitality & Food',
    city: 'Chennai',
    officialEmail: '',
    officialPhone: '',
    contactPageUrl: '',
    title: 'Delivery Driver',
    category: 'Logistics & Delivery',
    workersNeeded: 5,
    salaryRange: '₹15,000 - ₹20,000 / month',
    sourceName: 'Direct Career Page',
    sourceUrl: 'https://example.com/careers/jobs/123',
    description: 'Looking for 5 full-time delivery riders with valid license in Chennai.',
  });

  // Queries
  const { data: leadData, isLoading } = useQuery({
    queryKey: ['adminLeads', statusFilter, contactabilityFilter, categoryFilter, sortBy, searchQuery, page, limit],
    queryFn: () => leadService.getLeads({
      status: statusFilter,
      contactability: contactabilityFilter,
      category: categoryFilter,
      sortBy: sortBy,
      q: searchQuery,
      page,
      limit
    }),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['adminLeadStats'],
    queryFn: leadService.getStats,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['adminLeadSources'],
    queryFn: leadService.getSources,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const leads = leadData?.leads || [];
  const totalLeads = leadData?.total || 0;
  const totalPages = leadData?.totalPages || 1;

  // Polling effect for active discovery scans with exponential backoff & max 15 attempts
  useEffect(() => {
    if (!activeScanId) return;

    pollCountRef.current = 0;
    let isCancelled = false;

    const executePoll = async () => {
      if (isCancelled) return;
      pollCountRef.current += 1;

      try {
        console.log(`[AutoDiscovery][Step 3 - POLL ATTEMPT #${pollCountRef.current}] Requesting status for scan ID: ${activeScanId}...`);
        const res = await leadService.getScanStatus(activeScanId);
        const data = res?.data || res;
        console.log(`[AutoDiscovery][Step 3 - POLL RESPONSE]`, data);
        if (!isCancelled) {
          setScanStatus(data);
        }

        if (data.status === 'COMPLETED') {
          const synced = data.syncResult?.newLeadsCount || 0;
          const totalValid = data.valid_count || 0;
          console.log(`[AutoDiscovery][Step 4 - SCAN COMPLETED] Verified vacancies: ${totalValid}, New hiring companies created: ${synced}`);
          toast.success(
            `Auto-Discovery Complete! ${totalValid} vacancies verified across feeds, ${synced} new hiring companies created in Leads table!`,
            { duration: 6000 }
          );
          setActiveScanId(null);
          queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
          queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
          queryClient.invalidateQueries({ queryKey: ['adminLeadSources'] });
          return;
        } else if (data.status === 'FAILED' || data.status === 'INTERRUPTED' || data.status === 'CANCELLED') {
          console.warn(`[AutoDiscovery][SCAN STOPPED] Status: ${data.status}`);
          toast.error(`Auto-Discovery Scan stopped with status: ${data.status}`);
          setActiveScanId(null);
          return;
        }
      } catch (err: any) {
        console.error('[AutoDiscovery][POLL ERROR]', err);
      }

      // Max attempt governor (15 attempts ~ 45-60s) to prevent runaway billing & infinite loops
      if (pollCountRef.current >= 15) {
        console.info('[AutoDiscovery][TIMEOUT GOVERNOR] Maximum poll limit reached (15 attempts). Refreshing leads...');
        toast.info('Auto-discovery processing completed. Refreshing leads...');
        setActiveScanId(null);
        queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
        queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
        return;
      }

      // Exponential backoff: starts at 2000ms, gently scales up to 8000ms
      const nextDelay = Math.min(2000 * Math.pow(1.25, pollCountRef.current - 1), 8000);
      if (!isCancelled) {
        pollTimeoutRef.current = setTimeout(executePoll, nextDelay);
      }
    };

    // Initial poll
    executePoll();

    return () => {
      isCancelled = true;
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [activeScanId, queryClient]);

  // Auto-Discovery Scanner Mutation
  const autoDiscoveryMutation = useMutation({
    mutationFn: (params?: { query?: string; city?: string; sources?: string[]; limit?: number }) => {
      console.log('[AutoDiscovery][Step 1 - INITIATE] Calling /api/admin/leads/run-discovery with params:', params);
      return leadService.runAutoDiscovery(params);
    },
    onSuccess: (res: any) => {
      console.log('[AutoDiscovery][Step 2 - DISPATCH ACCEPTED] Backend response:', res);
      const scanId = res?.id || res?.data?.id;
      if (scanId) {
        setActiveScanId(scanId);
        setScanStatus(res);
        toast.info('Auto-Discovery scan started across live portals (Naukri, WorkIndia, Apna). Polling for new leads...');
      } else {
        toast.success('Discovery scan completed');
        queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
        queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
      }
    },
    onError: (err: any) => {
      console.error('[AutoDiscovery][CLIENT ERROR] Failed to run auto-discovery:', err);
      toast.error(err?.response?.data?.error || err.message || 'Auto-discovery scan failed');
    },
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => leadService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(`Company status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
      if (selectedLead && selectedLead.id === variables.id) {
        setSelectedLead((prev) => (prev ? { ...prev, status: variables.status as any } : null));
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to update status'),
  });

  const outreachMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof outreachForm }) =>
      leadService.logOutreach(id, data),
    onSuccess: () => {
      toast.success('Outreach log recorded successfully');
      setOutreachForm({ channel: 'PHONE', contactTarget: '', notes: '', outcome: 'INTERESTED' });
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to record outreach'),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => leadService.convertLead(id),
    onSuccess: (res) => {
      toast.success(`Company successfully onboarded to TrustHire (${res.email})! Job post created.`);
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
      if (selectedLead) {
        setSelectedLead((prev) => (prev ? { ...prev, status: 'ONBOARDED' } : null));
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to onboard company'),
  });

  const manualIngestMutation = useMutation({
    mutationFn: (data: typeof newLeadForm) =>
      leadService.ingestLead({
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        industry: data.industry,
        city: data.city,
        officialEmail: data.officialEmail,
        officialPhone: data.officialPhone,
        contactPageUrl: data.contactPageUrl,
        requirements: [
          {
            title: data.title,
            category: data.category,
            workersNeeded: Number(data.workersNeeded),
            salaryRange: data.salaryRange,
            sourceName: data.sourceName,
            sourceUrl: data.sourceUrl,
            description: data.description,
          },
        ],
      }),
    onSuccess: () => {
      toast.success('Hiring company recorded successfully');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
      queryClient.invalidateQueries({ queryKey: ['adminLeadStats'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to save hiring company'),
  });

  const kpiCards = [
    {
      title: 'Discovered Companies',
      value: stats?.totalLeads || 0,
      sub: `${stats?.totalRequirements || 0} Open Worker Openings`,
      icon: Building2,
      color: 'bg-blue-50 text-[#0f2f63] border border-blue-100',
    },
    {
      title: 'Ready to Contact',
      value: stats?.completeLeads || 0,
      sub: 'Verified Phone & Email on file',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    },
    {
      title: 'In Outreach Pipeline',
      value: stats?.contactedLeads || 0,
      sub: 'Contacted • Follow-up • Interested',
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-800 border border-amber-200',
    },
    {
      title: 'Joined TrustHyre',
      value: stats?.convertedLeads || 0,
      sub: 'Active TrustHyre Employers',
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-800 border border-purple-200',
    },
  ];

  const statusTabs = [
    { label: 'All Companies', value: 'ALL' },
    { label: 'New Found', value: 'DISCOVERED' },
    { label: 'Verified Info', value: 'VERIFIED' },
    { label: 'Contacted', value: 'CONTACTED' },
    { label: 'Interested', value: 'INTERESTED' },
    { label: 'Joined Platform', value: 'ONBOARDED' },
    { label: 'Closed / Expired', value: 'EXPIRED' },
  ];

  const hasActiveFilters = 
    statusFilter !== 'ALL' || 
    contactabilityFilter !== 'ALL' || 
    categoryFilter !== 'ALL' || 
    sortBy !== 'NEWEST' || 
    searchQuery !== '';

  const resetAllFilters = () => {
    setStatusFilter('ALL');
    setContactabilityFilter('ALL');
    setCategoryFilter('ALL');
    setSortBy('NEWEST');
    setSearchQuery('');
    setPage(1);
  };

  const formatLink = (url?: string | null) => {
    if (!url) return '#';
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  return (
    <div className="space-y-6 font-['Onest',system-ui,sans-serif]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
            <span>Opportunity Acquisition</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] tracking-tight">Hiring Company Discovery</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 text-[#0f2f63] border border-blue-200 hidden">
              Live Opportunity Finder
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#717784] mt-1 max-w-3xl leading-relaxed">
            Find external businesses that currently need workers, view their verified phone and email, and invite them to hire verified workers on TrustHyre.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Interactive Guide / How It Works Button */}
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium uppercase tracking-wider bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 shadow-xs transition-all cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            <span>How This Works</span>
          </button>

          {/* Auto Discovery Scanner Run with Trade & City Selector */}
          <button
            onClick={() => setIsDiscoveryModalOpen(true)}
            disabled={autoDiscoveryMutation.isPending || activeScanId !== null}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
            title="Scan active career feeds and schema.org postings across all blue-collar trades"
          >
            {autoDiscoveryMutation.isPending || activeScanId ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Radar className="w-3.5 h-3.5" />
            )}
            <span>{autoDiscoveryMutation.isPending || activeScanId ? 'Searching Feeds...' : 'Run Auto-Discovery Scan'}</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-800 text-white uppercase tracking-wider">
              Free $0
            </span>
          </button>

          {/* Ingest Manual Lead */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wider bg-[#0f2f63] hover:bg-[#2563c9] text-white shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Company</span>
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
                  Auto-Discovery Session: {scanStatus.status}
                </h4>
                <p className="text-xs text-[#717784]">
                  Scanned: <span className="font-medium text-[#0a0a0a]">{scanStatus.sources_scanned?.length || scanStatus.sourcesScanned || 8} Sources</span> | Total Found: <span className="font-semibold text-emerald-600">{scanStatus.total_found || 0}</span> | Valid Vacancies: <span className="font-semibold text-emerald-600">{scanStatus.valid_count || 0}</span> | Duplicates: <span className="font-medium text-[#717784]">{scanStatus.duplicate_count || 0}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {scanStatus.status === 'RUNNING' && (
                <button
                  onClick={() => {
                    if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
                    setActiveScanId(null);
                    setScanStatus((prev: any) => prev ? { ...prev, status: 'CANCELLED' } : null);
                    queryClient.invalidateQueries({ queryKey: ['adminLeads'] });
                    toast.info('Discovery scan polling cancelled.');
                  }}
                  className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-all cursor-pointer"
                >
                  Stop Scan
                </button>
              )}
              {scanStatus.status === 'COMPLETED' && (
                <button
                  onClick={() => setScanStatus(null)}
                  className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium uppercase tracking-wider hover:bg-emerald-700 transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discovery Sources Status Strip */}
      {sourcesData && sourcesData.length > 0 && (
        <div className="bg-[#f8fafc] border border-[#e2e4e9] rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#0f2f63]" />
            <span className="font-bold text-[#0a0a0a]">Configured Discovery Crawlers:</span>
            <span className="text-emerald-700 font-bold">
              {sourcesData.filter((s: any) => s.active || s.status === 'ACTIVE' || s.status === 'SUPPORTED' || !s.is_restricted).length} Active Channels
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {sourcesData.map((s: any) => {
              const isLive = Boolean(s.active || s.status === 'ACTIVE' || s.status === 'SUPPORTED' || !s.is_restricted);
              return (
                <span
                  key={s.id || s.name}
                  title={s.complianceNote || (isLive ? 'Active automated feed' : 'Requires official partner API')}
                  className="px-2.5 py-1 bg-white border border-[#e2e4e9] rounded-full text-[10px] font-semibold text-[#5a6270] flex items-center gap-1.5 cursor-help shadow-2xs"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  <span>{s.name}</span>
                  <span className={`text-[9px] ${isLive ? 'text-emerald-700 font-bold' : 'text-[#717784]'}`}>
                    ({isLive ? 'LIVE' : 'RESTRICTED'})
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-[#e2e4e9] rounded-2xl sm:rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#cbd0d8] transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#717784] uppercase tracking-wider">{kpi.title}</span>
                <div className={`w-10 h-10 rounded-2xl ${kpi.color} flex items-center justify-center shadow-xs`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-black text-[#0a0a0a]">{kpi.value.toLocaleString()}</span>
                <p className="text-xs text-[#717784] font-medium mt-1">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-3.5">
        {/* Top Row: Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e6e8ec]">
          <div className="inline-flex p-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] overflow-x-auto max-w-full">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.value
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'text-[#717784] hover:text-[#0a0a0a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-full border border-rose-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Second Row: Detailed Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Bar */}
          <div className="relative lg:col-span-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search company, job role, phone, city..."
              className="w-full bg-[#f8fafc] border border-[#e2e4e9] focus:border-[#0f2f63] focus:bg-white focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-3.5 py-2 pl-9 pr-8 text-xs text-[#0a0a0a] placeholder:text-[#94a3b8] outline-none transition-all"
            />
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0a0a0a] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Contact Readiness Filter */}
          <div>
            <select
              value={contactabilityFilter}
              onChange={(e) => {
                setContactabilityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8fafc] border border-[#e2e4e9] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-3 py-2 text-xs text-[#0a0a0a] font-medium outline-none transition-all cursor-pointer"
            >
              <option value="ALL">All Contact Readiness</option>
              <option value="COMPLETE">Full Info (Phone + Email ✓)</option>
              <option value="PARTIAL">Partial (Website only)</option>
              <option value="UNCONTACTABLE">No Contact Info</option>
            </select>
          </div>

          {/* Industry Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#f8fafc] border border-[#e2e4e9] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-3 py-2 text-xs text-[#0a0a0a] font-medium outline-none transition-all cursor-pointer"
            >
              <option value="ALL">All Trade Industries</option>
              <option value="Logistics">Logistics & Delivery</option>
              <option value="Hospitality">Hospitality & Food</option>
              <option value="Electrical">Electrical & Wiring</option>
              <option value="Home Services">Home Services & Trade</option>
              <option value="Courier">Courier & Freight</option>
              <option value="Healthcare">Healthcare & Facilities</option>
              <option value="Manufacturing">Manufacturing & Welding</option>
              <option value="Warehousing">Warehousing & Packing</option>
            </select>
          </div>

          {/* Sort By & Page Size Controls */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="flex-1 bg-[#f8fafc] border border-[#e2e4e9] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-2.5 py-2 text-xs text-[#0a0a0a] font-medium outline-none transition-all cursor-pointer"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="NAME_DESC">Name (Z-A)</option>
            </select>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#f8fafc] border border-[#e2e4e9] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-2.5 py-2 text-xs text-[#0a0a0a] font-medium outline-none shrink-0 transition-all cursor-pointer"
              title="Items per page"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Directory Table */}
      {isLoading ? (
        <AppLoader variant="page" message="Loading business lead directory..." />
      ) : leads.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl sm:rounded-3xl border border-[#e2e4e9] shadow-xs">
          <Building2 className="w-10 h-10 text-[#94a3b8] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#0a0a0a]">No hiring companies found</h3>
          <p className="text-xs text-[#717784] mt-1">
            Click "Run Auto-Discovery Scan" or "Quick Scrape URL" to discover hiring businesses.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e4e9] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#5a6270]">
              <thead className="bg-[#f8fafc] text-[#5a6270] uppercase text-[10px] font-bold border-b border-[#e2e4e9] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[240px]">Company Name & Website</th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[220px]">Workers Needed (Openings)</th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[180px]">Phone & Email</th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">Contact Readiness</th>
                  <th className="px-5 py-3.5 whitespace-nowrap min-w-[150px]">Progress Status</th>
                  <th className="px-5 py-3.5 whitespace-nowrap text-right min-w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8ec]">
                {leads.map((lead) => {
                  const reqCount = lead.requirements?.length || 0;
                  const primaryReq = lead.requirements?.[0];

                  return (
                    <tr key={lead.id} className="hover:bg-[#f8fafc]/80 transition-colors group">
                      {/* Employer Info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100 text-[#0f2f63] font-bold flex items-center justify-center text-sm shrink-0 shadow-2xs">
                            {lead.company_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedLead(lead)}
                              className="font-bold text-[#0a0a0a] hover:text-[#0f2f63] text-left block text-xs sm:text-sm leading-tight transition-colors truncate max-w-[220px] cursor-pointer"
                              title={lead.company_name}
                            >
                              {lead.company_name}
                            </button>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {lead.company_domain ? (
                                <a
                                  href={formatLink(lead.company_website || lead.company_domain)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-[#0f2f63] hover:underline font-mono inline-flex items-center gap-1 shrink-0"
                                >
                                  <Globe className="w-3 h-3 text-[#717784]" />
                                  <span className="truncate max-w-[140px]">{lead.company_domain}</span>
                                </a>
                              ) : (
                                <span className="text-[11px] text-[#94a3b8]">No website</span>
                              )}
                              {lead.city && (
                                <span className="text-[10px] px-2 py-0.5 bg-[#f4f5f8] text-[#5a6270] rounded-full border border-[#e2e4e9] font-medium whitespace-nowrap">
                                  {lead.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Worker Requirements */}
                      <td className="px-5 py-3.5">
                        {primaryReq ? (
                          <div className="min-w-0">
                            <span className="font-bold text-[#0a0a0a] block text-xs truncate max-w-[240px]" title={primaryReq.title}>
                              {primaryReq.title}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-[#5a6270] mt-0.5 whitespace-nowrap">
                              <span className="text-[#0f2f63] font-semibold">{primaryReq.workers_needed || 1} Worker(s) Needed</span>
                              {primaryReq.salary_range && <span className="text-[#94a3b8]">•</span>}
                              {primaryReq.salary_range && <span className="text-[#717784]">{primaryReq.salary_range}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {primaryReq.source_url && (
                                <a
                                  href={formatLink(primaryReq.source_url)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white hover:bg-[#f4f5f8] text-[#0f2f63] rounded-full text-[10px] font-semibold border border-[#e2e4e9] transition-all shadow-2xs max-w-[170px] truncate"
                                  title={`Open exact job post on ${primaryReq.source_name || 'Portal'}`}
                                >
                                  <Link2 className="w-2.5 h-2.5 shrink-0 text-[#0f2f63]" />
                                  <span className="truncate">{primaryReq.source_name || 'View Post'}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 text-[#717784]" />
                                </a>
                              )}
                              {reqCount > 1 && (
                                <span className="text-[10px] font-semibold text-[#717784] bg-[#f4f5f8] px-2 py-0.5 rounded-full border border-[#e2e4e9] whitespace-nowrap">
                                  +{reqCount - 1} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#94a3b8] italic text-xs">No roles detected</span>
                        )}
                      </td>

                      {/* Contact Channels */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          {lead.official_email ? (
                            <a
                              href={`mailto:${lead.official_email}`}
                              className="flex items-center gap-1.5 text-[11px] text-[#0a0a0a] hover:text-[#0f2f63] font-medium transition-colors"
                            >
                              <Mail className="w-3 h-3 text-[#717784] shrink-0" />
                              <span className="truncate max-w-[160px]">{lead.official_email}</span>
                            </a>
                          ) : null}
                          {lead.official_phone ? (
                            <a
                              href={`tel:${lead.official_phone}`}
                              className="flex items-center gap-1.5 text-[11px] text-[#0a0a0a] hover:text-[#0f2f63] font-medium transition-colors"
                            >
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{lead.official_phone}</span>
                            </a>
                          ) : null}
                          {!lead.official_email && !lead.official_phone && (
                            <span className="text-[11px] text-[#94a3b8] italic">Finding contacts...</span>
                          )}
                        </div>
                      </td>

                      {/* Contactability Score Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {lead.contactability_score === 'COMPLETE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span>Full Info</span>
                          </span>
                        ) : lead.contactability_score === 'PARTIAL' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <ShieldCheck className="w-3 h-3 shrink-0" />
                            <span>Partial Info</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f4f5f8] text-[#717784] border border-[#e2e4e9] whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] shrink-0" />
                            <span>No Contact</span>
                          </span>
                        )}
                      </td>

                      {/* Progress Status Badge */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {lead.status === 'ONBOARDED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Joined Platform</span>
                          </span>
                        ) : lead.status === 'DISCOVERED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0f2f63] border border-blue-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] shrink-0" />
                            <span>New Lead</span>
                          </span>
                        ) : lead.status === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                            <span>Verified Info</span>
                          </span>
                        ) : lead.status === 'CONTACTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Contacted</span>
                          </span>
                        ) : lead.status === 'INTERESTED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span>Interested</span>
                          </span>
                        ) : lead.status === 'EXPIRED' || lead.status === 'INVALID' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Expired</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#f4f5f8] text-[#717784] border border-[#e2e4e9] whitespace-nowrap shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#94a3b8] shrink-0" />
                            <span>{lead.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="px-3 py-1.5 bg-white hover:bg-[#f4f5f8] border border-[#e2e4e9] text-[#0a0a0a] hover:text-[#0f2f63] rounded-full text-xs font-semibold whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                          {lead.status !== 'ONBOARDED' && (
                            <button
                              type="button"
                              onClick={() => convertMutation.mutate(lead.id)}
                              disabled={convertMutation.isPending}
                              className="px-3.5 py-1.5 bg-[#0f2f63] hover:bg-[#163e7f] text-white rounded-full text-xs font-semibold whitespace-nowrap shadow-xs hover:shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Onboard company to TrustHyre"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                              <span>Onboard</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="px-5 py-3.5 bg-[#fafbfc] border-t border-[#e2e4e9] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#717784] font-medium">
              Showing{' '}
              <span className="font-bold text-[#0a0a0a]">
                {totalLeads === 0 ? 0 : (page - 1) * limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-[#0a0a0a]">
                {Math.min(page * limit, totalLeads)}
              </span>{' '}
              of <span className="font-bold text-[#0a0a0a]">{totalLeads}</span> hiring companies
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#e2e4e9] bg-white text-xs font-semibold text-[#0a0a0a] hover:bg-[#f4f5f8] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {/* Page Number Pills */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Always show first, last, and pages near current page
                    if (p === 1 || p === totalPages) return true;
                    if (Math.abs(p - page) <= 1) return true;
                    return false;
                  })
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                      acc.push('...');
                    }
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) => {
                    if (typeof p === 'string') {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-1 text-[#94a3b8] text-xs font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setPage(p)}
                        disabled={isLoading}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          page === p
                            ? 'bg-[#0f2f63] text-white shadow-xs'
                            : 'bg-white border border-[#e2e4e9] text-[#5a6270] hover:text-[#0a0a0a] hover:bg-[#f4f5f8]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#e2e4e9] bg-white text-xs font-semibold text-[#0a0a0a] hover:bg-[#f4f5f8] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail & Provenance Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e4e9] w-full max-w-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#e6e8ec]">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50/80 border border-blue-100 text-[#0f2f63] font-black flex items-center justify-center text-base sm:text-lg shrink-0 mt-0.5 sm:mt-0">
                  {selectedLead.company_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] truncate">{selectedLead.company_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {selectedLead.company_website && (
                      <a
                        href={formatLink(selectedLead.company_website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#0f2f63] hover:underline flex items-center gap-1 font-medium"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Visit Website</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <span className="text-xs text-[#717784]">• {selectedLead.industry || 'General Trade'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="p-1.5 sm:p-2 rounded-full text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f5f8] transition-colors shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Official Contact & Provenance Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Contact Channels Card */}
              <div className="bg-[#f8fafc] p-3.5 sm:p-4 rounded-2xl border border-[#e2e4e9] space-y-2.5">
                <span className="text-[10px] font-bold text-[#717784] uppercase tracking-wider block">
                  Official Business Channels
                </span>
                <div className="space-y-2 text-xs text-[#0a0a0a]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#717784] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#0f2f63]" /> Email:
                    </span>
                    <span className="font-semibold text-[#0a0a0a] truncate max-w-[180px]">{selectedLead.official_email || 'Not Provided'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#717784] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> Phone:
                    </span>
                    <span className="font-semibold text-[#0a0a0a]">{selectedLead.official_phone || 'Not Provided'}</span>
                  </div>
                  {selectedLead.contact_page_url && (
                    <div className="flex items-center justify-between pt-1 border-t border-[#e2e4e9]">
                      <span className="text-[#717784]">Contact Form:</span>
                      <a
                        href={formatLink(selectedLead.contact_page_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0f2f63] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Page</span>
                        <ExternalLink className="w-3 h-3 text-[#717784]" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Provenance & Status Card */}
              <div className="bg-[#f8fafc] p-3.5 sm:p-4 rounded-2xl border border-[#e2e4e9] space-y-2.5">
                <span className="text-[10px] font-bold text-[#717784] uppercase tracking-wider block">
                  Progress Status
                </span>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#717784]">Stage:</span>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => updateStatusMutation.mutate({ id: selectedLead.id, status: e.target.value })}
                    className="bg-white border border-[#e2e4e9] rounded-xl px-2.5 py-1 text-xs font-semibold text-[#0a0a0a] outline-none focus:border-[#0f2f63]"
                  >
                    <option value="DISCOVERED">New Found</option>
                    <option value="VERIFIED">Verified Info</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="INTERESTED">Interested</option>
                    <option value="ONBOARDED">Joined TrustHyre</option>
                    <option value="EXPIRED">Closed / Expired</option>
                  </select>
                </div>
                <div className="text-[11px] text-[#717784] flex justify-between">
                  <span>Found on:</span>
                  <span className="font-medium text-[#0a0a0a]">
                    {new Date(selectedLead.created_at).toLocaleDateString()}
                  </span>
                </div>
                {selectedLead.trusthire_employer_id && (
                  <div className="p-1.5 bg-blue-50/80 text-[#0f2f63] rounded-lg text-[10px] font-bold text-center border border-blue-100">
                    Linked to Live TrustHyre Employer Account
                  </div>
                )}
              </div>
            </div>

            {/* Worker Requirements List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                  Open Opportunities / Vacancies ({selectedLead.requirements?.length || 0})
                </h4>
                <span className="text-[11px] text-[#717784]">Detected from source postings</span>
              </div>
              <div className="space-y-2.5">
                {selectedLead.requirements?.map((req) => {
                  const cleanDesc = stripHtml(req.description);
                  return (
                    <div key={req.id} className="p-3.5 sm:p-4 bg-[#f8fafc] border border-[#e2e4e9] rounded-2xl space-y-2">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs sm:text-sm font-semibold text-[#0a0a0a] leading-snug">{req.title}</h5>
                          {cleanDesc ? (
                            <p className="text-[11px] sm:text-xs text-[#5a6270] mt-1 leading-relaxed line-clamp-3">
                              {cleanDesc}
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#94a3b8] italic mt-0.5">No description text provided in posting</p>
                          )}
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50/80 text-[#0f2f63] border border-blue-100 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap">
                          {req.workers_needed || 1} Worker(s)
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#e2e4e9] text-[11px] text-[#5a6270]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#717784]">Salary:</span>
                          <strong className="text-[#0a0a0a] font-medium">{req.salary_range || 'Competitive'}</strong>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.source_url ? (
                            <a
                              href={formatLink(req.source_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-[#f4f5f8] text-[#0f2f63] rounded-lg text-xs font-semibold border border-[#e2e4e9] transition-all shadow-2xs"
                            >
                              <Link2 className="w-3 h-3 text-[#0f2f63]" />
                              <span className="truncate max-w-[240px]">Open Exact Job Post ({req.source_name || 'Portal'})</span>
                              <ExternalLink className="w-3 h-3 text-[#717784]" />
                            </a>
                          ) : (
                            <span className="text-[#717784] font-medium">Source: {req.source_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outreach Activity Log */}
            <div className="space-y-3 pt-2 border-t border-[#e6e8ec]">
              <h4 className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                Call & Outreach Log ({selectedLead.outreach_logs?.length || 0})
              </h4>

              {/* Log Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!outreachForm.notes) {
                    toast.error('Notes are required');
                    return;
                  }
                  outreachMutation.mutate({ id: selectedLead.id, data: outreachForm });
                }}
                className="p-3.5 bg-[#f8fafc] border border-[#e2e4e9] rounded-2xl space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={outreachForm.channel}
                    onChange={(e) => setOutreachForm({ ...outreachForm, channel: e.target.value })}
                    className="bg-white border border-[#e2e4e9] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#0a0a0a] outline-none focus:border-[#0f2f63]"
                  >
                    <option value="PHONE">Phone Call</option>
                    <option value="EMAIL">Email</option>
                    <option value="IN_PERSON">In Person Visit</option>
                    <option value="CONTACT_FORM">Contact Form</option>
                  </select>

                  <select
                    value={outreachForm.outcome}
                    onChange={(e) => setOutreachForm({ ...outreachForm, outcome: e.target.value })}
                    className="bg-white border border-[#e2e4e9] rounded-xl px-2.5 py-1.5 text-xs font-medium text-[#0a0a0a] outline-none focus:border-[#0f2f63]"
                  >
                    <option value="INTERESTED">Interested in TrustHyre</option>
                    <option value="FOLLOW_UP">Needs Follow-Up</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                    <option value="NO_ANSWER">No Answer</option>
                  </select>

                  <input
                    type="text"
                    value={outreachForm.contactTarget}
                    onChange={(e) => setOutreachForm({ ...outreachForm, contactTarget: e.target.value })}
                    placeholder="e.g. Spoke with HR Mgr"
                    className="bg-white border border-[#e2e4e9] rounded-xl px-3 py-1.5 text-xs text-[#0a0a0a] placeholder:text-[#94a3b8] outline-none focus:border-[#0f2f63]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={outreachForm.notes}
                    onChange={(e) => setOutreachForm({ ...outreachForm, notes: e.target.value })}
                    placeholder="Enter call notes or next action steps..."
                    className="flex-1 bg-white border border-[#e2e4e9] rounded-xl px-3 py-1.5 text-xs text-[#0a0a0a] placeholder:text-[#94a3b8] outline-none focus:border-[#0f2f63]"
                  />
                  <button
                    type="submit"
                    disabled={outreachMutation.isPending}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0f2f63] hover:bg-[#163e7f] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Log Call</span>
                  </button>
                </div>
              </form>

              {/* Past Logs */}
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {selectedLead.outreach_logs?.map((log) => (
                  <div key={log.id} className="p-2.5 bg-white border border-[#e2e4e9] rounded-xl text-xs flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0a0a0a]">{log.channel}</span>
                        {log.contact_target && <span className="text-[11px] text-[#717784]">({log.contact_target})</span>}
                        <span className="px-1.5 py-0.5 bg-blue-50/80 text-[#0f2f63] border border-blue-100 rounded text-[9px] font-bold">
                          {log.outcome || 'COMPLETED'}
                        </span>
                      </div>
                      <p className="text-[#5a6270] mt-0.5">{log.notes}</p>
                    </div>
                    <span className="text-[10px] text-[#717784]">
                      {new Date(log.contacted_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3.5 border-t border-[#e6e8ec] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <button
                onClick={() => setSelectedLead(null)}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#f4f5f8] text-[#0a0a0a] border border-[#e2e4e9] rounded-xl text-xs font-medium transition-colors cursor-pointer text-center"
              >
                Close
              </button>

              {selectedLead.status !== 'ONBOARDED' && (
                <button
                  onClick={() => convertMutation.mutate(selectedLead.id)}
                  disabled={convertMutation.isPending}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#0f2f63] hover:bg-[#163e7f] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-[#5790e6]" />
                  <span>Onboard to TrustHyre (Create Employer)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e4e9] w-full max-w-lg rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl relative max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#e6e8ec]">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] tracking-tight">Add Hiring Company Record</h3>
                <p className="text-[11px] sm:text-xs text-[#5a6270] mt-0.5">Record a new business looking for workers into your pipeline.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-full text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f5f8] transition-colors shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                manualIngestMutation.mutate(newLeadForm);
              }}
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Company Name</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.companyName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, companyName: e.target.value })}
                    placeholder="e.g. ABC Restaurant"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.city}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, city: e.target.value })}
                    placeholder="e.g. Chennai"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Official Website</label>
                  <input
                    type="text"
                    value={newLeadForm.companyWebsite}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, companyWebsite: e.target.value })}
                    placeholder="e.g. https://abcrestaurant.in"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newLeadForm.officialEmail}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, officialEmail: e.target.value })}
                    placeholder="careers@abcrestaurant.in"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Official Phone</label>
                  <input
                    type="text"
                    value={newLeadForm.officialPhone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, officialPhone: e.target.value })}
                    placeholder="044-2811xxxx"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Contact Page URL</label>
                  <input
                    type="text"
                    value={newLeadForm.contactPageUrl}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactPageUrl: e.target.value })}
                    placeholder="https://abcrestaurant.in/contact"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
              </div>

              {/* Requirement details */}
              <div className="pt-2 border-t border-[#e6e8ec] space-y-3">
                <span className="text-[11px] font-bold text-[#0f2f63] uppercase tracking-wider block">
                  Worker Opening Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Job Title</label>
                    <input
                      type="text"
                      required
                      value={newLeadForm.title}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                      placeholder="e.g. Delivery Driver"
                      className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Workers Needed</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newLeadForm.workersNeeded}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, workersNeeded: parseInt(e.target.value, 10) })}
                      className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Salary Range</label>
                    <input
                      type="text"
                      value={newLeadForm.salaryRange}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, salaryRange: e.target.value })}
                      placeholder="₹15,000 - ₹20,000 / month"
                      className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Original Job Posting Link</label>
                    <input
                      type="text"
                      required
                      value={newLeadForm.sourceUrl}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, sourceUrl: e.target.value })}
                      placeholder="https://source.com/listing/123"
                      className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#0a0a0a] mb-1">Job Description</label>
                  <textarea
                    rows={2}
                    value={newLeadForm.description}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, description: e.target.value })}
                    placeholder="Requirement description and job details..."
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl p-2.5 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e6e8ec] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-[#f4f5f8] text-[#0a0a0a] border border-[#e2e4e9] rounded-xl text-xs font-medium transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualIngestMutation.isPending}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#0f2f63] hover:bg-[#163e7f] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {manualIngestMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Save Company Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Trade Blue-Collar Discovery Modal */}
      {isDiscoveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e4e9] w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xl relative max-h-[92vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#e6e8ec]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
                  <Radar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0a0a0a]">Auto-Discovery Scanner</h3>
                  <p className="text-xs text-[#717784]">Select blue-collar trades and target city to scan 8 live portals.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDiscoveryModalOpen(false)}
                className="p-1.5 rounded-full text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f5f8] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 text-xs">
              {/* Trade Selection */}
              <div>
                <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">
                  Target Blue-Collar Role / Trade:
                </label>
                <select
                  value={discoveryTrade}
                  onChange={(e) => setDiscoveryTrade(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2.5 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10"
                >
                  <option value="ALL">🌟 All Trades (Driver, Electrician, Plumber, Warehouse, Security, Cook, Cleaner)</option>
                  <option value="Delivery Driver">🛵 Delivery Driver & Courier Executive</option>
                  <option value="Electrician">⚡ Electrician, Wireman & Maintenance</option>
                  <option value="Plumber">🔧 Plumber & Pipe Fitter</option>
                  <option value="Warehouse Associate">📦 Warehouse Associate, Packer & Picker</option>
                  <option value="Security Guard">🛡️ Security Guard & Watchman</option>
                  <option value="Cook">🍳 Cook, Chef & Kitchen Helper</option>
                  <option value="Housekeeping">🧹 Housekeeper, Cleaner & Office Boy</option>
                  <option value="Technician">🛠️ AC Mechanic, Field Technician & Repair</option>
                  <option value="Tailor">🧵 Tailor & Sewing Machine Operator</option>
                  <option value="CUSTOM">✏️ Custom Job Role...</option>
                </select>
              </div>

              {discoveryTrade === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0a0a0a] mb-1">Custom Role Name:</label>
                  <input
                    type="text"
                    required
                    value={customTrade}
                    onChange={(e) => setCustomTrade(e.target.value)}
                    placeholder="e.g. CNC Machine Operator, Carpenter, Welder"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63]"
                  />
                </div>
              )}

              {/* City Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">Target City:</label>
                  <select
                    value={discoveryCity}
                    onChange={(e) => setDiscoveryCity(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2.5 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63]"
                  >
                    <option value="Chennai">Chennai (Tamil Nadu)</option>
                    <option value="Bengaluru">Bengaluru (Karnataka)</option>
                    <option value="Mumbai">Mumbai (Maharashtra)</option>
                    <option value="Delhi">Delhi NCR</option>
                    <option value="Hyderabad">Hyderabad (Telangana)</option>
                    <option value="Pune">Pune (Maharashtra)</option>
                    <option value="Kolkata">Kolkata (West Bengal)</option>
                    <option value="CUSTOM">Custom City...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0a0a0a] mb-1.5">Scan Limit:</label>
                  <select
                    value={discoveryLimit}
                    onChange={(e) => setDiscoveryLimit(Number(e.target.value))}
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2.5 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63]"
                  >
                    <option value={15}>15 Vacancies (Fast)</option>
                    <option value={25}>25 Vacancies (Recommended)</option>
                    <option value={50}>50 Vacancies (Deep Crawl)</option>
                  </select>
                </div>
              </div>

              {discoveryCity === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-semibold text-[#0a0a0a] mb-1">Custom City Name:</label>
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="e.g. Coimbatore, Madurai, Ahmedabad"
                    className="w-full bg-[#f8fafc] border border-[#e2e4e9] rounded-xl px-3 py-2 text-xs text-[#0a0a0a] outline-none focus:bg-white focus:border-[#0f2f63]"
                  />
                </div>
              )}

              {/* Informational strip */}
              <div className="bg-[#f8fafc] border border-[#e2e4e9] rounded-xl p-3 text-[11px] text-[#5a6270] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[#0a0a0a]">
                  <Bot className="w-3.5 h-3.5 text-emerald-600" />
                  <span>8 Crawlers Ready (Free $0):</span>
                </div>
                <p>Naukri Blue Collar, Indeed India, WorkIndia Direct, Apna Gateway, Headcount Labs, Lever & Greenhouse ATS feeds, Schema.org.</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#e6e8ec] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDiscoveryModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-[#f4f5f8] text-[#0a0a0a] border border-[#e2e4e9] rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={autoDiscoveryMutation.isPending || activeScanId !== null}
                onClick={() => {
                  const effectiveQuery = discoveryTrade === 'CUSTOM' ? (customTrade.trim() || 'Worker') : discoveryTrade;
                  const effectiveCity = discoveryCity === 'CUSTOM' ? (customCity.trim() || 'Chennai') : discoveryCity;
                  setIsDiscoveryModalOpen(false);
                  autoDiscoveryMutation.mutate({
                    query: effectiveQuery,
                    city: effectiveCity,
                    limit: discoveryLimit,
                  });
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {autoDiscoveryMutation.isPending || activeScanId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Radar className="w-4 h-4" />
                )}
                <span>Start Live Discovery Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Guide & Walkthrough Modal */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e4e9] w-full max-w-3xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 sm:p-7 shadow-xl relative max-h-[92vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#e6e8ec]">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs shrink-0 mt-0.5 sm:mt-0">
                  <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] tracking-tight">How Hiring Company Discovery Works</h3>
                  <p className="text-[11px] sm:text-xs text-[#5a6270] mt-0.5">
                    A quick visual guide explaining how we find businesses and bring them onto TrustHyre.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="p-1.5 sm:p-2 rounded-full text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f5f8] transition-colors shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Plain English Explanation Card */}
            <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-4 sm:p-5 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-black text-[#0066FF] text-sm">
                <Sparkles className="w-4 h-4" />
                <span>What is a "Hiring Company Lead"?</span>
              </div>
              <p className="leading-relaxed">
                A <strong>Hiring Company</strong> is any real-world business (like a restaurant, logistics company, electrical contractor, or retail store) that has posted job requirements on the internet asking for workers.
              </p>
              <p className="leading-relaxed text-slate-600">
                Instead of waiting for employers to register on TrustHire by themselves, our engine finds them automatically, grabs their office phone and email, and lets your team call them to onboard them onto TrustHire.
              </p>
            </div>

            {/* 4-Step Interactive Diagram */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0A1931] uppercase tracking-wider">
                The 4-Step Acquisition Journey
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Step 1 */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#0066FF] text-white text-[11px] font-black flex items-center justify-center">
                      1
                    </span>
                    <h5 className="text-xs font-bold text-[#0A1931]">Automated Discovery</h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    The engine scans external career feeds, public boards, and structured job data (`Schema.org/JobPosting`) to find open worker requisitions.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-[11px] font-black flex items-center justify-center">
                      2
                    </span>
                    <h5 className="text-xs font-bold text-[#0A1931]">Contact Verification</h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    The crawler visits the employer's official website domain to extract real business emails, office phone numbers, and contact forms.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-600 text-white text-[11px] font-black flex items-center justify-center">
                      3
                    </span>
                    <h5 className="text-xs font-bold text-[#0A1931]">Team Outreach Call</h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Admin / BD team calls the employer: <em>"We saw you need 5 delivery drivers in Chennai. We have verified workers ready right now."</em>
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 relative overflow-hidden">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-black flex items-center justify-center">
                      4
                    </span>
                    <h5 className="text-xs font-bold text-[#0A1931]">1-Click Onboard</h5>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    When the employer agrees, clicking <strong>"Onboard"</strong> instantly creates their TrustHire employer profile and publishes their job post live!
                  </p>
                </div>
              </div>
            </div>

            {/* Example Box */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                Real-World Walkthrough Example
              </span>
              <p className="text-slate-700 leading-relaxed">
                <strong>Example:</strong> ABC Restaurant in Chennai posts <em>"Need 5 delivery riders"</em> on their site.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                <li>Discovery crawler extracts company name, 5 driver requirement, and phone `044-2811xxxx`.</li>
                <li>TrustHire Admin calls ABC Restaurant and explains how candidates are identity and background verified.</li>
                <li>Admin clicks <strong>"Onboard to TrustHire"</strong> $\rightarrow$ ABC Restaurant's job goes live $\rightarrow$ Verified delivery drivers apply immediately!</li>
              </ul>
            </div>

            {/* Calling Tips */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick BD Outreach Pitch Script
              </span>
              <p className="text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200/70">
                "Hello [Company Name], this is the TrustHire team in Chennai. We noticed you are currently hiring for [Job Role]. We have background-verified trade workers available in your area who can start immediately with zero advance placement fees. Can we share a few verified candidate profiles with you?"
              </p>
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Read full technical docs in <code className="text-[#0066FF] font-mono">docs/HIRING_COMPANY_DISCOVERY_GUIDE.md</code>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsGuideModalOpen(false);
                    autoDiscoveryMutation.mutate();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Radar className="w-3.5 h-3.5" />
                  <span>Try Auto-Discovery Now</span>
                </button>
                <button
                  onClick={() => setIsGuideModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
