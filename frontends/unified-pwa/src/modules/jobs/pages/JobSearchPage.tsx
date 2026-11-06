import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchService } from '../../../services/search.service';
import { applicationService } from '../../../services/application.service';
import { profileService } from '../../../services/profile.service';
import { queryKeys } from '../../../lib/queryKeys';
import { 
  Briefcase, 
  UploadCloud, 
  RotateCcw,
  ChevronDown,
  Bell,
  Check,
  Zap,
  MapPin,
  ShieldCheck,
  Utensils,
  Home,
  ArrowRight
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { JobSearchHero } from '../components/JobSearchHero';
import { JobFilterSidebar, type FilterCounts } from '../components/JobFilterSidebar';
import { JobSearchResultCard, type JobCardData } from '../components/JobSearchResultCard';
import { JobSearchRightSidebar } from '../components/JobSearchRightSidebar';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { AppLoader } from '../../../components/common/AppLoader';
import { detectCurrentCity } from '../../../utils/geolocation';
import { useAuth } from '../../../providers/AuthContext';
import { fcmService } from '../../../services/fcm.service';
import { searchAlertService, type SearchAlert } from '../../../services/searchAlert.service';
import { JobAlertModal } from '../components/JobAlertModal';
import { ManageAlertsModal } from '../../dashboard/features/alerts/ManageAlertsModal';
import { WhatsAppBulletinModal } from '../../../components/common/WhatsAppBulletinModal';
import { SeoHead } from '../../../components/common/SeoHead';
import { getTaluksForCity } from '../../../constants/regionalTaluks';
import { WageBenchmarkModal } from '../../../components/common/WageBenchmarkModal';
import { DigitalLabourChowkModal } from '../../../components/common/DigitalLabourChowkModal';

export default function JobSearchPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filter State
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [jobType, setJobType] = useState(searchParams.get('type') || 'All');
  const [budgetRange, setBudgetRange] = useState(searchParams.get('budget') || 'all');
  const [experience, setExperience] = useState(searchParams.get('exp') || 'all');
  const [trade, setTrade] = useState(searchParams.get('trade') || 'All');
  const [source, setSource] = useState(searchParams.get('source') || 'all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'salary_desc' | 'salary_asc'>('date_desc');
  const [isLocating, setIsLocating] = useState(false);

  // Pagination & Display State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [hideExpired, setHideExpired] = useState(true);

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isJobAlertModalOpen, setIsJobAlertModalOpen] = useState(false);
  const [isManageAlertsOpen, setIsManageAlertsOpen] = useState(false);
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [isWageModalOpenMobile, setIsWageModalOpenMobile] = useState(false);
  const [isChowkModalOpen, setIsChowkModalOpen] = useState(false);

  const { user } = useAuth();

  // Numeric minimum salary computed from budgetRange
  const numericMinSalary = useMemo(() => {
    if (budgetRange === '1000to2500') return 25000;
    if (budgetRange === '2500to5000') return 40000;
    if (budgetRange === 'above5000') return 60000;
    return undefined;
  }, [budgetRange]);

  // Query existing candidate job alerts
  const { data: userAlerts = [] } = useQuery<SearchAlert[]>({
    queryKey: ['searchAlerts', 'JOB_ALERT'],
    queryFn: () => searchAlertService.getMyAlerts('JOB_ALERT'),
    enabled: Boolean(user)
  });

  // Live match check: determines if an active alert matches current criteria or nationwide
  const isMatchingAlertActive = useMemo(() => {
    if (!user || userAlerts.length === 0) return false;
    return userAlerts.some((alert) => {
      if (!alert.is_active) return false;
      const alertCity = alert.city?.trim().toLowerCase();
      const currentCity = city?.trim().toLowerCase();
      const alertCategory = alert.category?.trim().toLowerCase();
      const currentCategory = (trade && trade !== 'All') ? trade.trim().toLowerCase() : null;

      const cityMatches = !alertCity || (currentCity && alertCity === currentCity);
      const categoryMatches = !alertCategory || (currentCategory && alertCategory === currentCategory);

      return cityMatches && categoryMatches;
    });
  }, [user, userAlerts, city, trade]);

  const [selectedPerkFilter, setSelectedPerkFilter] = useState<string>('all');

  const handleOpenAlertModal = () => {
    if (!user) {
      alert("Please sign in or create an account to save job search alerts.");
      return;
    }
    setIsJobAlertModalOpen(true);
  };

  // Sync state if URL changes externally
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const c = searchParams.get('city') || '';
    const t = searchParams.get('type') || 'All';
    const b = searchParams.get('budget') || 'all';
    const exp = searchParams.get('exp') || 'all';
    const tr = searchParams.get('trade') || 'All';
    const s = searchParams.get('source') || 'all';

    if (q !== query) setQuery(q);
    if (c !== city) setCity(c);
    if (t !== jobType) setJobType(t);
    if (b !== budgetRange) setBudgetRange(b);
    if (exp !== experience) setExperience(exp);
    if (tr !== trade) setTrade(tr);
    if (s !== source) setSource(s);
  }, [searchParams]);

  // Helper to sync to URL
  const updateUrlParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val && val !== 'All' && val !== 'all') {
        newParams.set(key, val);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  // Convert budget range to min/max
  const { minSalary, maxSalary } = useMemo(() => {
    switch (budgetRange) {
      case 'under1000': return { minSalary: 0, maxSalary: 1000 };
      case '1000to2500': return { minSalary: 1000, maxSalary: 2500 };
      case '2500to5000': return { minSalary: 2500, maxSalary: 5000 };
      case 'above5000': return { minSalary: 5000, maxSalary: 9999999 };
      default: return { minSalary: undefined, maxSalary: undefined };
    }
  }, [budgetRange]);

  // Convert experience to min/max
  const { minExperience, maxExperience } = useMemo(() => {
    switch (experience) {
      case '0-1': return { minExperience: 0, maxExperience: 1 };
      case '1-3': return { minExperience: 1, maxExperience: 3 };
      case '3-5': return { minExperience: 3, maxExperience: 5 };
      case '5+': return { minExperience: 5, maxExperience: 50 };
      default: return { minExperience: undefined, maxExperience: undefined };
    }
  }, [experience]);

  // Fetch Jobs via Search API
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', 'search', { query, city, trade, jobType, minSalary, maxSalary, minExperience, maxExperience, sortBy, source }],
    queryFn: () => searchService.searchJobs({
      query: query || undefined,
      city: city || undefined,
      industry: trade !== 'All' ? trade : undefined,
      minSalary,
      maxSalary,
      minExperience,
      maxExperience,
      sortBy,
      source: source !== 'all' ? source : undefined,
      includeExpired: 'true'
    }),
    staleTime: 1000 * 60 * 2,
  });

  // Fetch user profile and applications to compute status badges (only for logged-in candidates)
  useQuery({
    queryKey: queryKeys.workers.detail('me'),
    queryFn: profileService.getProfile,
    enabled: Boolean(user && user.role === 'WORKER')
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: queryKeys.jobs.myApplications,
    queryFn: applicationService.getMyApplications,
    enabled: Boolean(user && user.role === 'WORKER')
  });

  const appliedJobIdsMap = useMemo(() => {
    const map = new Map<string, string>();
    myApplications.forEach((app: any) => {
      const jId = app.job_id || app.jobId;
      if (jId) map.set(jId, app.status || 'APPLIED');
    });
    return map;
  }, [myApplications]);

  // Apply to Job Mutation
  const applyMutation = useMutation({
    mutationFn: (jobId: string) => applicationService.applyForJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myApplications });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'search'] });
    }
  });

  // Compute dynamic filter counts from fetched jobs
  const filterCounts: FilterCounts = useMemo(() => {
    const counts: FilterCounts = {
      jobTypes: {},
      locations: {},
      trades: {},
      total: jobs.length,
    };

    jobs.forEach((j: any) => {
      // Job Type
      const type = j.jobType || (j.title?.toLowerCase().includes('intern') ? 'Internship' : 'Full Time');
      counts.jobTypes[type] = (counts.jobTypes[type] || 0) + 1;

      // Location / City
      const c = j.city || j.location;
      if (c) counts.locations[c] = (counts.locations[c] || 0) + 1;

      // Trade / Industry
      if (j.industry) counts.trades[j.industry] = (counts.trades[j.industry] || 0) + 1;
    });

    return counts;
  }, [jobs]);

  // Handle Search Submission
  const handleSearch = (newQuery: string, newCity: string) => {
    setQuery(newQuery);
    setCity(newCity);
    updateUrlParams({ q: newQuery, city: newCity });
  };

  // Handle Auto Location
  const handleLocateMe = async (detectedCity?: string) => {
    if (detectedCity) {
      setCity(detectedCity);
      updateUrlParams({ city: detectedCity });
      return;
    }
    setIsLocating(true);
    try {
      const loc = await detectCurrentCity();
      if (loc.city) {
        setCity(loc.city);
        updateUrlParams({ city: loc.city });
      }
    } catch (err) {
      console.error("Location detection error in JobSearchPage:", err);
    } finally {
      setIsLocating(false);
    }
  };

  // Clear all filters
  const handleClearAll = () => {
    setQuery('');
    setCity('');
    setJobType('All');
    setBudgetRange('all');
    setExperience('all');
    setTrade('All');
    setSource('all');
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = (jobType !== 'All' ? 1 : 0) + (budgetRange !== 'all' ? 1 : 0) + (experience !== 'all' ? 1 : 0) + (trade !== 'All' ? 1 : 0) + (city ? 1 : 0) + (source !== 'all' ? 1 : 0);
  const hasActiveFilters = Boolean(query || city || jobType !== 'All' || budgetRange !== 'all' || experience !== 'all' || trade !== 'All' || source !== 'all');

  const TRADE_CATEGORIES = [
    'All',
    'Construction',
    'Facility Management',
    'Logistics',
    'Manufacturing',
    'Security',
    'Hospitality',
    'Retail',
    'Agriculture'
  ];

  // Format job data for rendering
  const formattedJobs: JobCardData[] = useMemo(() => {
    return jobs.map((j: any) => {
      const rawExpiry = j.expiresAt || j.expires_at;
      const createdDate = j.createdAt || j.created_at;
      const effectiveExpiry = rawExpiry
        ? new Date(rawExpiry)
        : (createdDate ? new Date(new Date(createdDate).getTime() + 30 * 24 * 60 * 60 * 1000) : null);

      const isExpired = Boolean(
        j.isExpired ||
        j.status === 'EXPIRED' ||
        j.status === 'CLOSED' ||
        (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
      );

      return {
        id: j.id,
        title: j.title,
        description: j.description,
        industry: j.industry,
        jobType: j.jobType || 'Full Time',
        location: j.location,
        city: j.city,
        budget: j.budget,
        experienceYearsRequired: j.experienceYearsRequired ?? j.experience_years_required ?? 0,
        status: isExpired ? 'EXPIRED' : (j.status || 'OPEN'),
        createdAt: createdDate,
        expiresAt: rawExpiry || effectiveExpiry?.toISOString(),
        isExpired,
        isExternal: Boolean(j.isExternal || j.is_external),
        sourceName: j.sourceName || j.source_name,
        sourceUrl: j.sourceUrl || j.source_url,
        alternateSources: j.alternateSources || j.alternate_sources,
        employerProfile: j.employerProfile,
        coverImageUrl: (j.coverImageUrl || j.cover_image_url || null),
        cover_image_url: (j.cover_image_url || j.coverImageUrl || null),
        hasApplied: appliedJobIdsMap.has(j.id),
        applicationStatus: appliedJobIdsMap.get(j.id),
        perks: j.perks || (j.additionalDetails?.perks || []),
        allowDirectCall: j.allowDirectCall ?? j.allow_direct_call ?? true,
        allowDirectWhatsapp: j.allowDirectWhatsapp ?? j.allow_direct_whatsapp ?? true,
        contactPhone: j.contactPhone || j.contact_phone || (j as any).phoneNumber || null,
        contactWhatsapp: j.contactWhatsapp || j.contact_whatsapp || null,
        additionalDetails: j.additionalDetails || j.additional_details,
        isUrgentSpotHire: Boolean(j.isUrgentSpotHire || j.is_urgent_spot_hire || (j.additionalDetails && j.additionalDetails.isUrgentSpotHire)),
      };
    });
  }, [jobs, appliedJobIdsMap]);

  // Filter based on hideExpired and selectedPerkFilter
  const displayJobs = useMemo(() => {
    return formattedJobs.filter(j => {
      if (hideExpired && j.isExpired) return false;
      if (selectedPerkFilter !== 'all') {
        if (selectedPerkFilter === 'spot') {
          return Boolean(j.isUrgentSpotHire);
        }
        const jobPerks: string[] = Array.isArray(j.perks) ? j.perks : [];
        const hasPerk = jobPerks.some((p: string) => {
          const lower = p.toLowerCase();
          if (selectedPerkFilter === 'food') return lower.includes('food') || lower.includes('meal');
          if (selectedPerkFilter === 'room') return lower.includes('room') || lower.includes('accommodation') || lower.includes('lodging');
          if (selectedPerkFilter === 'daily') return lower.includes('daily') || lower.includes('weekly');
          if (selectedPerkFilter === 'ot') return lower.includes('overtime') || lower.includes('ot');
          if (selectedPerkFilter === 'travel') return lower.includes('travel') || lower.includes('fuel') || lower.includes('petrol');
          return false;
        });
        if (!hasPerk) return false;
      }
      return true;
    });
  }, [formattedJobs, hideExpired, selectedPerkFilter]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, city, jobType, budgetRange, experience, trade, sortBy, hideExpired, source]);

  // Safe pagination calculations
  const totalItems = displayJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedJobs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return displayJobs.slice(startIndex, startIndex + pageSize);
  }, [displayJobs, safeCurrentPage, pageSize]);

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <SeoHead
        title="Browse Verified Job Openings"
        description="Find top verified trade, technician, and skilled blue-collar job openings with direct employer hiring on TrustHyre."
        canonicalPath="/search"
      />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Header Hero Banner Replicating Landing Page Navy Editorial Aesthetic */}
        <JobSearchHero
          initialQuery={query}
          initialCity={city}
          totalJobs={displayJobs.length}
          selectedTrade={trade}
          onTradeSelect={(t) => {
            setTrade(t);
            updateUrlParams({ trade: t });
          }}
          onSearch={handleSearch}
          onLocateMe={handleLocateMe}
          isLocating={isLocating}
        />

        {/* 2. Mobile Quick Filter Action Row (Visible on Mobile Only) */}
        <div className="lg:hidden px-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#717784]">
              <strong className="text-[#0a0a0a] font-bold">{displayJobs.length}</strong> verified openings
            </span>
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] rounded-full text-xs font-medium uppercase text-[#0a0a0a] shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0f2f63] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Main 3-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* DESKTOP LEFT COLUMN: Filters Sidebar (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-3 bg-[#f4f4f4] rounded-[1.75rem] p-5 sm:p-6 border border-[#e6e8ec] lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar">
            <JobFilterSidebar
              selectedJobType={jobType}
              onSelectJobType={(t) => {
                setJobType(t);
                updateUrlParams({ type: t });
              }}
              selectedLocation={city}
              onSelectLocation={(l) => {
                setCity(l);
                setQuery('');
                updateUrlParams({ city: l, q: '' });
              }}
              selectedTaluk={query}
              onSelectTaluk={(t) => {
                setQuery(t);
                updateUrlParams({ q: t });
              }}
              selectedBudget={budgetRange}
              onSelectBudget={(b) => {
                setBudgetRange(b);
                updateUrlParams({ budget: b });
              }}
              selectedExperience={experience}
              onSelectExperience={(e) => {
                setExperience(e);
                updateUrlParams({ exp: e });
              }}
              selectedTrade={trade}
              onSelectTrade={(tr) => {
                setTrade(tr);
                updateUrlParams({ trade: tr });
              }}
              selectedSource={source}
              onSelectSource={(s) => {
                setSource(s);
                updateUrlParams({ source: s });
              }}
              onSelectBenchmarkFilter={(bTrade, _minBudget) => {
                setQuery(bTrade);
                setTrade('All');
                updateUrlParams({ q: bTrade, trade: 'All' });
              }}
              counts={filterCounts}
              onClearAll={handleClearAll}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* CENTER COLUMN: Feed (Full width on mobile, 6 cols on desktop) */}
          <div className="col-span-1 lg:col-span-6 space-y-5">
            
            {/* ⚡ 24H SPOT-HIRE & WALK-IN RADAR STRIP (Nithra & JobToday Model) */}
            <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-amber-200/80 rounded-[1.5rem] p-3.5 sm:p-4 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-rose-900 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
                    <span>24h Spot-Hire & Walk-In Radar</span>
                  </span>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                  {city ? `Active in ${city}` : 'Direct Company Entry'}
                </span>
              </div>

              {/* Quick Perks & Immediate Category Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedPerkFilter === 'walkin' ? 'all' : 'walkin';
                    setSelectedPerkFilter(next);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    selectedPerkFilter === 'walkin'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-100/50'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>Walk-in Today</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = selectedPerkFilter === 'food' ? 'all' : 'food';
                    setSelectedPerkFilter(next);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    selectedPerkFilter === 'food'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Free Food Provided</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = selectedPerkFilter === 'room' ? 'all' : 'room';
                    setSelectedPerkFilter(next);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                    selectedPerkFilter === 'room'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Room / Accommodation</span>
                </button>
              </div>
            </div>

            {/* ⚡ Breakthrough Feature: Digital Labour Chowk Banner (Nithra & Shramik Model) */}
            <div className="bg-white border border-[#e6e8ec] rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Standby Radar
                    </span>
                    <h4 className="text-sm font-bold text-[#0A1931] tracking-tight">
                      Digital Labour Chowk: Verified Workers Ready Today
                    </h4>
                  </div>
                  <p className="text-xs text-[#717784] mt-1 line-clamp-1">
                    Emergency replacements & daily wage workers ready to report in {city || 'your area'} within 45 mins.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsChowkModalOpen(true)}
                className="px-5 py-2.5 bg-[#0f2f63] hover:bg-[#0066ff] active:bg-[#003d99] text-white rounded-full font-bold text-xs uppercase tracking-wider shrink-0 transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto active:scale-95"
              >
                <span>Open Labour Chowk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reassurance Anti-Scam Shield Ribbon */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-[11px]">
                  <strong>100% Free Job Guarantee:</strong> Never pay consultants or registration fees. All jobs verified by TrustHyre.
                </span>
              </div>
            </div>

            {/* Contextual Top Banner: Tailored for Employer vs Jobseeker */}
            {user?.role === 'EMPLOYER' ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-[1.5rem] p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white text-[#0f2f63] flex items-center justify-center shrink-0 border border-blue-200 shadow-2xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0f2f63] text-white uppercase tracking-wider">Employer Mode</span>
                      <h4 className="text-sm font-bold text-[#0a0a0a]">
                        Looking to hire verified trade specialists?
                      </h4>
                    </div>
                    <p className="text-xs text-[#475467] font-medium truncate mt-0.5">
                      Browse and contact ready-to-work electricians, plumbers, welders and more.
                    </p>
                  </div>
                </div>
                <Link
                  to="/find-workers"
                  className="px-4 py-2 bg-[#0f2f63] hover:bg-[#1a4487] text-white rounded-full font-semibold text-xs shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Find Workers
                </Link>
              </div>
            ) : (
              <div className="bg-[#f4f4f4] rounded-[1.5rem] p-4 sm:p-5 border border-[#e6e8ec] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-white text-[#0f2f63] flex items-center justify-center shrink-0 border border-[#e6e8ec] shadow-2xs">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#0a0a0a]">
                      Upload your resume
                    </h4>
                    <p className="text-xs text-[#717784] font-medium truncate">
                      AI-powered smart matching with verified local employers.
                    </p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="px-4 py-2 bg-[#0f2f63] hover:bg-[#1a4487] text-white rounded-full font-medium text-xs shrink-0 transition-all shadow-xs cursor-pointer active:scale-95 uppercase"
                >
                  Upload
                </Link>
              </div>
            )}

            {/* Results Count & Sort Row */}
            <div className="flex items-center justify-between px-1 flex-wrap gap-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-medium text-[#717784]">
                  Showing <strong className="text-[#0a0a0a] font-bold">{totalItems === 0 ? 0 : `${(safeCurrentPage - 1) * pageSize + 1}-${Math.min(safeCurrentPage * pageSize, totalItems)}`}</strong> of <strong className="text-[#0a0a0a] font-bold">{totalItems}</strong> verified job postings
                </span>

                {/* Hide / Show Expired Toggle */}
                <button
                  type="button"
                  onClick={() => setHideExpired(!hideExpired)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                    hideExpired
                      ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs'
                      : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] border-[#e6e8ec]'
                  }`}
                  title={hideExpired ? "Currently hiding expired jobs. Click to show all." : "Currently showing all jobs. Click to hide expired."}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hideExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <span>{hideExpired ? 'Hiding Expired' : 'Showing All'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulletinOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] shadow-2xs transition-all cursor-pointer active:scale-95"
                  title="Generate shareable WhatsApp bulletin of today's verified jobs"
                >
                  <svg className="w-3.5 h-3.5 fill-current text-[#25D366]" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>WhatsApp Job Bulletin</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAlertModal}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                    isMatchingAlertActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:bg-emerald-100'
                      : 'bg-white hover:bg-[#0f2f63] text-[#0f2f63] hover:text-white border-[#0f2f63]/30 shadow-2xs'
                  }`}
                  title={isMatchingAlertActive ? "Job alert active! Tap to manage or modify criteria." : "Configure alert for new job postings"}
                >
                  {isMatchingAlertActive ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Job Alert Active</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-[#2563c9]" />
                      <span>Alert Me on New Jobs</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#717784] font-medium">Sort by:</span>
                <div className="relative inline-block">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] rounded-full pl-3.5 pr-8 py-1.5 text-xs font-medium text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63] cursor-pointer transition-colors"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="salary_desc">Highest Pay</option>
                    <option value="salary_asc">Lowest Pay</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#717784] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Blue-Collar Quick Perks Filter Chips (WorkIndia / Apna style) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
              {[
                { id: 'all', label: 'All Openings' },
                { id: 'spot', label: '⚡ Urgent Spot Hire' },
                { id: 'food', label: '🍛 Free Food' },
                { id: 'room', label: '🏠 With Room' },
                { id: 'daily', label: '💵 Daily Pay' },
                { id: 'ot', label: '⏱️ Overtime OT' },
                { id: 'travel', label: '⛽ Fuel Allowance' },
              ].map((perk) => (
                <button
                  key={perk.id}
                  type="button"
                  onClick={() => setSelectedPerkFilter(perk.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedPerkFilter === perk.id
                      ? 'bg-[#0f2f63] text-white shadow-xs'
                      : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#475467] border border-[#e6e8ec]'
                  }`}
                >
                  {perk.label}
                </button>
              ))}
            </div>

            {/* Job List Feed */}
            {isLoading ? (
              <AppLoader variant="skeleton" />
            ) : paginatedJobs.length > 0 ? (
              <div className="space-y-4">
                {paginatedJobs.map((job) => (
                  <JobSearchResultCard
                    key={job.id}
                    job={job}
                    onApply={(jobId) => applyMutation.mutate(jobId)}
                    isApplying={applyMutation.isPending && applyMutation.variables === job.id}
                  />
                ))}

                {/* Standardized Pagination Bar */}
                <DataTablePagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  pageSizeOptions={[15, 30, 45, 60]}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 380, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  itemName="job postings"
                  className="rounded-[1.5rem] border border-[#e6e8ec] bg-white p-3 shadow-xs mt-6"
                />
              </div>
            ) : (
              /* Empty State */
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-10 border border-[#e6e8ec] text-center space-y-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto text-[#717784] border border-[#e6e8ec] shadow-2xs">
                  <Briefcase className="w-7 h-7 text-[#0f2f63]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#0a0a0a]">
                    No matching jobs found
                  </h3>
                  <p className="text-xs text-[#717784] max-w-sm mx-auto">
                    Try adjusting your filters, searching for a different trade or city, or resetting active filters to view all available verified positions.
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-2 bg-[#0f2f63] hover:bg-[#1a4487] text-white rounded-full font-medium text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs active:scale-95 uppercase"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset All Filters
                  </button>
                )}
              </div>
            )}

          </div>

          {/* DESKTOP RIGHT COLUMN: Contextual Widgets Sidebar (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-3 space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar">
            <JobSearchRightSidebar
              currentCity={city}
              currentTrade={trade}
              currentQuery={query}
              minSalary={numericMinSalary}
              onOpenAlertModal={handleOpenAlertModal}
              onSelectCompany={(comp) => {
                setQuery(comp);
                updateUrlParams({ q: comp });
              }}
            />
          </div>

        </div>
      </div>

      {/* 4. Mobile Filter Bottom-Sheet / Drawer Modal */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] max-h-[88vh] flex flex-col shadow-2xl border border-[#e6e8ec] overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e6e8ec] flex items-center justify-between shrink-0 bg-[#fbfbfb]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0f2f63]" />
                <h3 className="text-base font-bold text-[#0a0a0a]">
                  Filter Job Openings
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs font-medium text-[#717784] hover:text-[#0f2f63] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1.5 text-[#717784] hover:text-[#0a0a0a] rounded-full hover:bg-[#e6e8ec] transition-colors cursor-pointer"
                >
                  <span className="text-base font-bold leading-none">✕</span>
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable Filters */}
            <div className="px-6 py-5 overflow-y-auto space-y-6">
              
              {/* Dynamic Taluks for Current Selected Location */}
              {city && (
                <div className="space-y-2.5">
                  <label className="text-[11px] font-bold uppercase text-[#0f2f63] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>Taluks & Areas in {city}</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        updateUrlParams({ q: '' });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        !query
                          ? 'bg-[#0f2f63] text-white shadow-xs'
                          : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                      }`}
                    >
                      All {city} Areas
                    </button>
                    {getTaluksForCity(city).map((tName: string) => {
                      const isSelected = query.toLowerCase() === tName.toLowerCase();
                      return (
                        <button
                          key={tName}
                          type="button"
                          onClick={() => {
                            setQuery(tName);
                            updateUrlParams({ q: tName });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#0f2f63] text-white shadow-xs'
                              : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                          }`}
                        >
                          {tName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Market Wage Benchmark Calculator Callout for Mobile */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <span className="font-bold text-xs">₹</span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950 leading-tight">
                      Market Wage Calculator
                    </h4>
                    <p className="text-[10px] text-emerald-700">Check base pay, OT & allowances</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileFilterOpen(false);
                    setIsWageModalOpenMobile(true);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <span>Open Wage Calculator</span>
                </button>
              </div>

              {/* Hiring Channel Source Filter */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase text-[#717784]">
                  Hiring Channel
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'All Opportunities', val: 'all' },
                    { label: 'TrustHyre Direct', val: 'internal' },
                    { label: 'Verified Partners', val: 'external' }
                  ].map((s) => {
                    const isSelected = source === s.val;
                    return (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => {
                          setSource(s.val);
                          updateUrlParams({ source: s.val });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f2f63] text-white shadow-xs'
                            : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Job Type Filter */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase text-[#717784]">
                  Job Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {['All', 'Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance', 'Daily Gig'].map((t) => {
                    const isSelected = jobType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          setJobType(t);
                          updateUrlParams({ type: t });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f2f63] text-white shadow-xs'
                            : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase text-[#717784]">
                  Industry Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRADE_CATEGORIES.map((cat) => {
                    const isSelected = trade === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setTrade(cat);
                          updateUrlParams({ trade: cat });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f2f63] text-white shadow-xs'
                            : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pay Range Filter */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase text-[#717784]">
                  Pay / Daily Budget
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'All Pay Ranges', value: 'all' },
                    { label: 'Under ₹1,000 / day', value: 'under1000' },
                    { label: '₹1,000 - ₹2,500 / day', value: '1000to2500' },
                    { label: '₹2,500 - ₹5,000 / day', value: '2500to5000' },
                    { label: '₹5,000+ / day', value: 'above5000' }
                  ].map((b) => {
                    const isSelected = budgetRange === b.value;
                    return (
                      <button
                        key={b.value}
                        onClick={() => {
                          setBudgetRange(b.value);
                          updateUrlParams({ budget: b.value });
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f2f63] text-white'
                            : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                        }`}
                      >
                        <span>{b.label}</span>
                        {isSelected && <span className="text-white font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Experience Required Filter */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold uppercase text-[#717784]">
                  Experience Level
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: 'All Experience Levels', value: 'all' },
                    { label: '0 to 1 Year (Entry)', value: '0-1' },
                    { label: '1 to 3 Years (Junior)', value: '1-3' },
                    { label: '3 to 5 Years (Mid)', value: '3-5' },
                    { label: '5+ Years (Senior)', value: '5+' }
                  ].map((exp) => {
                    const isSelected = experience === exp.value;
                    return (
                      <button
                        key={exp.value}
                        onClick={() => {
                          setExperience(exp.value);
                          updateUrlParams({ exp: exp.value });
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f2f63] text-white'
                            : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] text-[#0a0a0a]'
                        }`}
                      >
                        <span>{exp.label}</span>
                        {isSelected && <span className="text-white font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer: Sticky Action Button */}
            <div className="p-4 border-t border-[#e6e8ec] bg-[#fbfbfb] shrink-0">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 bg-[#0f2f63] hover:bg-[#1a4487] text-white rounded-full text-xs font-bold shadow-md shadow-[#0f2f63]/20 transition-all cursor-pointer uppercase active:scale-95"
              >
                Show {formattedJobs.length} Jobs
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Candidate Job Alert Modal */}
      <JobAlertModal
        isOpen={isJobAlertModalOpen}
        onClose={() => setIsJobAlertModalOpen(false)}
        currentQuery={query}
        currentCity={city}
        currentTrade={trade}
        currentMinSalary={numericMinSalary}
        onOpenManageAlerts={() => setIsManageAlertsOpen(true)}
      />

      {/* 6. Manage Alerts Modal */}
      <ManageAlertsModal
        isOpen={isManageAlertsOpen}
        onClose={() => setIsManageAlertsOpen(false)}
        alertType="JOB_ALERT"
      />

      {/* 7. WhatsApp Daily Job Bulletin Modal (Viral Distribution Engine) */}
      <WhatsAppBulletinModal
        isOpen={isBulletinOpen}
        onClose={() => setIsBulletinOpen(false)}
        jobs={(jobs as any) || []}
        city={city || 'Pan India'}
        industry={trade || 'All Trades'}
      />

      {/* 8. Mobile Wage Benchmark Calculator Modal */}
      {isWageModalOpenMobile && (
        <WageBenchmarkModal
          isOpen={isWageModalOpenMobile}
          onClose={() => setIsWageModalOpenMobile(false)}
          defaultTrade={trade !== 'All' ? trade : 'Electrician'}
          currentCity={city || 'Chennai'}
          onSelectBenchmarkFilter={(bTrade) => {
            setQuery(bTrade);
            setTrade('All');
            updateUrlParams({ q: bTrade, trade: 'All' });
          }}
        />
      )}

      {/* 9. ⚡ Breakthrough: Digital Labour Chowk Modal */}
      {isChowkModalOpen && (
        <DigitalLabourChowkModal
          isOpen={isChowkModalOpen}
          onClose={() => setIsChowkModalOpen(false)}
          currentCity={city || 'Chennai'}
          isEmployerRole={user?.role === 'EMPLOYER'}
        />
      )}

    </div>
  );
}

