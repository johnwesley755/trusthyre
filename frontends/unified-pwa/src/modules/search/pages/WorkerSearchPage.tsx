import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchService, type WorkerSearch } from '../../../services/search.service';
import { queryKeys } from '../../../lib/queryKeys';
import { 
  MapPin, 
  ShieldCheck, 
  SlidersHorizontal, 
  CheckCircle2, 
  RotateCcw,
  Users,
  PlusCircle,
  X,
  Check,
  Bookmark,
  ArrowRight,
  Bell
} from 'lucide-react';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { WorkerSearchHero } from '../components/WorkerSearchHero';
import { AppLoader } from '../../../components/common/AppLoader';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { useTranslation } from '../../../providers/TranslationContext';
import { useAuth } from '../../../providers/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { fcmService } from '../../../services/fcm.service';
import { searchAlertService, type SearchAlert } from '../../../services/searchAlert.service';
import { ManageAlertsModal } from '../../dashboard/features/alerts/ManageAlertsModal';
import { TalentAlertModal } from '../components/TalentAlertModal';
import { normalizeSkills } from '../../../utils/skills';
import { SeoHead } from '../../../components/common/SeoHead';

const JOB_CATEGORIES = [
  "All",
  "Construction",
  "Facility Management",
  "Logistics",
  "Manufacturing",
  "Security",
  "Hospitality",
  "Retail",
  "Agriculture"
];

const EXPERIENCE_LEVELS = [
  { value: 'all', label: 'All Experience Levels' },
  { value: '0-1', label: 'Entry Level (0 - 1 Years)' },
  { value: '1-3', label: 'Junior / Associate (1 - 3 Years)' },
  { value: '3-5', label: 'Mid-Level Specialist (3 - 5 Years)' },
  { value: '5+', label: 'Senior / Expert (5+ Years)' },
];

export const WorkerSearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [experience, setExperience] = useState(searchParams.get('exp') || 'all');
  const [selectedTrade, setSelectedTrade] = useState(searchParams.get('trade') || 'All');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isManageAlertsOpen, setIsManageAlertsOpen] = useState(false);
  const [isTalentAlertModalOpen, setIsTalentAlertModalOpen] = useState(false);

  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch employer's active candidate alerts to reflect live subscription state
  const { data: userAlerts = [] } = useQuery<SearchAlert[]>({
    queryKey: ['searchAlerts', 'CANDIDATE_ALERT'],
    queryFn: () => searchAlertService.getMyAlerts('CANDIDATE_ALERT'),
    enabled: Boolean(user),
    staleTime: 60 * 1000
  });

  // Check if an alert matching the current active filter is already configured
  const isMatchingAlertActive = Boolean(userAlerts.some(a => {
    if (!a.is_active) return false;
    const alertCity = (a.city || '').trim().toLowerCase();
    const currentCityLower = (city || '').trim().toLowerCase();
    const alertTrade = (a.category || 'All').trim().toLowerCase();
    const currentTradeLower = (selectedTrade || 'All').trim().toLowerCase();
    const alertQuery = (a.query || '').trim().toLowerCase();
    const currentQueryLower = (query || '').trim().toLowerCase();

    return alertCity === currentCityLower && alertTrade === currentTradeLower && alertQuery === currentQueryLower;
  }));

  const handleOpenTalentAlertModal = () => {
    if (!user) {
      alert("Please sign in or create an account to configure candidate search alerts.");
      return;
    }
    setIsTalentAlertModalOpen(true);
  };

  const { isWorkerSaved, toggleSaveWorker, syncSavedStatusFromList } = useSavedStore({ lazy: true });

  useEffect(() => {
    const q = searchParams.get('q') || '';
    const c = searchParams.get('city') || '';
    const exp = searchParams.get('exp') || 'all';
    const tr = searchParams.get('trade') || 'All';
    
    if (q !== query) setQuery(q);
    if (c !== city) setCity(c);
    if (exp !== experience) setExperience(exp);
    if (tr !== selectedTrade) setSelectedTrade(tr);
  }, [searchParams]);

  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== 'All') newParams.set(key, value);
      else newParams.delete(key);
    });
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setQuery('');
    setCity('');
    setExperience('all');
    setSelectedTrade('All');
    setSearchParams(new URLSearchParams());
  };

  const { data: results = [], isLoading } = useQuery<WorkerSearch[]>({
    queryKey: queryKeys.workers.search({ 
      q: query, 
      city, 
      trade: selectedTrade !== 'All' ? selectedTrade : undefined,
      experience: experience !== 'all' ? experience : undefined 
    }),
    queryFn: () => searchService.searchWorkers({
      query: query || undefined,
      city: city || undefined,
      trade: selectedTrade !== 'All' ? selectedTrade : undefined,
      experience: experience !== 'all' ? experience : undefined,
    }),
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 3,
  });

  useEffect(() => {
    if (results && results.length > 0) {
      syncSavedStatusFromList(results);
    }
  }, [results, syncSavedStatusFromList]);

  const activeFilterCount = (experience !== 'all' ? 1 : 0) + (selectedTrade !== 'All' ? 1 : 0) + (city ? 1 : 0);
  const hasActiveFilters = Boolean(query || city || experience !== 'all' || selectedTrade !== 'All');

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0A1931]">
      <SeoHead
        title="Find Verified Skilled Workers"
        description="Search and hire verified electricians, plumbers, drivers, logistics workers, and tradespeople across India on TrustHyre."
        canonicalPath="/find-workers"
      />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 1. Header Hero Banner Replicating Landing Page Navy Aesthetic */}
        <WorkerSearchHero
          initialQuery={query}
          initialCity={city}
          totalWorkers={results.length}
          selectedTrade={selectedTrade}
          onTradeSelect={(trade) => {
            setSelectedTrade(trade);
            updateSearchParams({ trade });
          }}
          onSearch={(q, c) => {
            setQuery(q);
            setCity(c);
            updateSearchParams({ q, city: c });
          }}
        />

        {/* 2. Mobile Quick Filter Action Row (Visible on Mobile Only) */}
        <div className="lg:hidden px-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500">
              <strong className="text-[#0A1931] font-bold tabular-nums">{results.length}</strong> {t("verified specialists", "verified specialists")}
            </span>
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full text-xs font-medium uppercase text-slate-700 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>{t("Filters", "Filters")}</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#0f2f63] text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. Main 3-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* DESKTOP LEFT COLUMN: Talent Filter Sidebar (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-3 bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0f2f63]" />
                <h2 className="text-sm font-medium uppercase text-[#0A1931]">
                  {t("Talent Filters", "Talent Filters")}
                </h2>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-[#2563c9] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t("Clear", "Clear")}
                </button>
              )}
            </div>

            {/* Job Category */}
            <div className="space-y-2">
              <span className="text-[10px] font-medium uppercase text-slate-500">
                {t("Industry & Category", "Industry & Category")}
              </span>
              <div className="space-y-1">
                {JOB_CATEGORIES.map((cat) => {
                  const isSelected = selectedTrade === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedTrade(cat);
                        updateSearchParams({ trade: cat });
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2f63] text-white shadow-xs'
                          : 'bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 border border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <span>{t(cat, cat)}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience Level Filter */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-medium uppercase text-slate-500">
                {t("Experience Level", "Experience Level")}
              </span>
              <div className="space-y-1">
                {EXPERIENCE_LEVELS.map((el) => {
                  const isSelected = experience === el.value;
                  return (
                    <button
                      key={el.value}
                      onClick={() => {
                        setExperience(el.value);
                        updateSearchParams({ exp: el.value });
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2f63] text-white shadow-xs'
                          : 'bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 border border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <span>{t(el.label, el.label)}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* CANDIDATES FEED: Shows FIRST on mobile and in Center on desktop */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* Header Result Count */}
            <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500">
                  <strong className="text-[#0A1931] font-bold">{results.length}</strong> {t("verified specialists available", "verified specialists available")}
                </span>
                <button
                  type="button"
                  onClick={handleOpenTalentAlertModal}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                    isMatchingAlertActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:bg-emerald-100/70'
                      : 'bg-white hover:bg-[#0f2f63] text-[#0f2f63] hover:text-white border-[#0f2f63]/30 shadow-2xs'
                  }`}
                  title={isMatchingAlertActive ? t('Talent Alert Active - Click to view or manage', 'Talent Alert Active - Click to view or manage') : t('Configure talent alert', 'Configure talent alert')}
                >
                  {isMatchingAlertActive ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("Talent Alert Active", "Talent Alert Active")}</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-[#2563c9]" />
                      <span>{t("Alert Me on New Talent", "Alert Me on New Talent")}</span>
                    </>
                  )}
                </button>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-[#2563c9] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t("Reset filters", "Reset filters")}
                </button>
              )}
            </div>

            {/* Worker Feed */}
            {isLoading ? (
              <AppLoader variant="skeleton" />
            ) : results.length > 0 ? (
              <div className="space-y-4">

                {results
                  .slice((Math.min(currentPage, Math.max(1, Math.ceil(results.length / pageSize))) - 1) * pageSize, Math.min(currentPage, Math.max(1, Math.ceil(results.length / pageSize))) * pageSize)
                  .map((worker: any) => {
                    const skillList = normalizeSkills(worker.skills);

                    const displayRole = worker.level && !worker.level.startsWith('L')
                      ? t(worker.level, worker.level)
                      : worker.experienceYears
                        ? `${worker.experienceYears}+ ${t("Yrs Exp", "Yrs Exp")}`
                        : t('Verified Specialist', 'Verified Specialist');

                    return (
                      <div
                        key={worker.userId}
                        onClick={() => navigate(`/worker/${worker.userId}`)}
                        className="bg-white rounded-[1.75rem] p-5 sm:p-6 border border-slate-200/80 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer space-y-4 shadow-xs relative overflow-hidden"
                      >
                        {/* Card Header Cluster */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="relative shrink-0">
                              <UserAvatar
                                src={worker.profileImageUrl || (worker as any).profile_image_url || worker.profilePhoto}
                                name={worker.name}
                                size="lg"
                              />
                              {worker.isVerified && (
                                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[8px]" title={t("ID & Skills Verified", "ID & Skills Verified")}>
                                  ✓
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-base sm:text-lg font-semibold text-[#0A1931] group-hover:text-blue-600 transition-colors truncate">
                                  {worker.name}
                                </h3>
                                {worker.isVerified && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                    <span>{t("Verified", "Verified")}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
                                <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#2563c9]" />
                                  <span>{worker.city || worker.location || 'Local Area'}</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="px-2.5 py-0.5 bg-blue-50 text-[#0f2f63] border border-blue-100/60 rounded-full font-medium text-[11px]">
                                  {displayRole}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Top-Right: Bookmark Action */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveWorker({
                                  userId: worker.userId,
                                  name: worker.name,
                                  profilePhoto: worker.profileImageUrl || (worker as any).profile_image_url || worker.profilePhoto,
                                  profileImageUrl: worker.profileImageUrl || (worker as any).profile_image_url || worker.profilePhoto,
                                  skills: skillList,
                                  city: worker.city || worker.location || 'Local Area',
                                  location: worker.location || worker.city || 'Local Area',
                                  experience: worker.experienceYears || 0,
                                  trustScore: worker.trustScore ? `${worker.trustScore}%` : '98%',
                                  isVerified: worker.isVerified,
                                  bio: worker.bio,
                                });
                              }}
                              className={`p-2.5 rounded-full border transition-all cursor-pointer ${
                                (isWorkerSaved(worker.userId) || worker.isSaved)
                                  ? 'bg-[#0f2f63] border-[#0f2f63] text-white shadow-xs'
                                  : 'bg-slate-50 border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                              title={(isWorkerSaved(worker.userId) || worker.isSaved) ? t('Remove from Saved', 'Remove from Saved') : t('Save Profile', 'Save Profile')}
                            >
                              <Bookmark className={`w-4 h-4 ${(isWorkerSaved(worker.userId) || worker.isSaved) ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Bio Snippet */}
                        {worker.bio && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                            {worker.bio}
                          </p>
                        )}

                        {/* Skills Micro-Pills */}
                        {skillList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {skillList.slice(0, 5).map((skill: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-full border border-slate-200/60 transition-colors"
                              >
                                {t(skill, skill)}
                              </span>
                            ))}
                            {skillList.length > 5 && (
                              <span className="px-2.5 py-1 text-slate-500 text-xs font-medium">
                                +{skillList.length - 5} {t("more", "more")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Card Footer: Live Status & View Profile CTA */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t("Available for Direct Hire", "Available for Direct Hire")}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/worker/${worker.userId}`);
                            }}
                            className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-medium uppercase px-4 py-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <span>{t("View Profile", "View Profile")}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                {/* Standardized Pagination Bar */}
                <DataTablePagination
                  currentPage={Math.min(currentPage, Math.max(1, Math.ceil(results.length / pageSize)))}
                  totalPages={Math.max(1, Math.ceil(results.length / pageSize))}
                  totalItems={results.length}
                  pageSize={pageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={(page) => setCurrentPage(page)}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  itemName={t("specialists", "specialists")}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white p-3 shadow-xs"
                />
              </div>
            ) : (
              <div className="bg-white rounded-[1.5rem] p-10 border border-slate-200/80 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-200/60 shadow-xs">
                  <Users className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-medium uppercase text-[#0A1931]">
                    {t("No verified workers found", "No verified workers found")}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {t("Try loosening your criteria or search across different cities to see available technicians.", "Try loosening your criteria or search across different cities to see available technicians.")}
                  </p>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t("Reset All Filters", "Reset All Filters")}</span>
                  </button>
                )}
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Direct Hire & Verification Standard */}
          <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar">
            
            {/* Quick Post Job Card in Navy Aesthetic */}
            <div className="relative overflow-hidden rounded-[1.5rem] bg-[#0f2f63] text-white p-5 sm:p-6 space-y-4 shadow-lg border border-white/10">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#2563c9]/30 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#5790e6]/20 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 space-y-2">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-medium uppercase border border-white/10">
                  {t("Direct Hire", "Direct Hire")}
                </span>
                <h3 className="text-base sm:text-lg font-medium uppercase leading-tight text-white">
                  {t("Need Multiple Specialists Fast?", "Need Multiple Specialists Fast?")}
                </h3>
                <p className="text-white/80 text-xs font-normal leading-relaxed">
                  {t("Post your requirements and let our matching engine notify verified workers within your municipal radius.", "Post your requirements and let our matching engine notify verified workers within your municipal radius.")}
                </p>
              </div>

              <Link
                to="/post-job"
                className="relative z-10 w-full py-2.5 px-4 bg-white text-[#0f2f63] hover:bg-slate-100 rounded-full font-medium uppercase text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#0f2f63]" />
                <span>{t("Post a Job Opening", "Post a Job Opening")}</span>
              </Link>
            </div>

            {/* Hiring Verification Info Card */}
            <div className="rounded-[1.5rem] bg-white p-5 sm:p-6 border border-slate-200/80 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-[#0A1931] font-medium text-xs uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t("TrustHyre Verification Standard", "TrustHyre Verification Standard")}</span>
              </div>
              <ul className="text-xs text-slate-500 space-y-2.5 font-medium">
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>{t("Skill certified & profile verified", "Skill certified & profile verified")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>{t("Practical skill assessment validated", "Practical skill assessment validated")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>{t("Direct employer communication", "Direct employer communication")}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span>{t("Geofenced on-site attendance tracking", "Geofenced on-site attendance tracking")}</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      </div>

      {/* MOBILE FILTER MODAL / BOTTOM SHEET */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] p-6 space-y-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 shadow-2xl border border-slate-200/80">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0f2f63]" />
                <h3 className="text-base font-medium uppercase text-[#0A1931]">
                  Filter Talent
                </h3>
              </div>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Job Categories */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-medium uppercase text-slate-500">
                Industry & Category
              </span>
              <div className="grid grid-cols-2 gap-2">
                {JOB_CATEGORIES.map((cat) => {
                  const isSelected = selectedTrade === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedTrade(cat)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2f63] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <span>{cat}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience Levels */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-medium uppercase text-slate-500">
                Experience Level
              </span>
              <div className="space-y-1.5">
                {EXPERIENCE_LEVELS.map((el) => {
                  const isSelected = experience === el.value;
                  return (
                    <button
                      key={el.value}
                      onClick={() => setExperience(el.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2f63] text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60'
                      }`}
                    >
                      <span>{el.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium uppercase transition-colors cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  updateSearchParams({ trade: selectedTrade, exp: experience });
                  setIsMobileFilterOpen(false);
                }}
                className="flex-2 py-3 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-medium uppercase shadow-md transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Talent Alert Configuration Modal */}
      <TalentAlertModal
        isOpen={isTalentAlertModalOpen}
        onClose={() => setIsTalentAlertModalOpen(false)}
        currentQuery={query}
        currentCity={city}
        currentTrade={selectedTrade}
        currentExperience={experience}
        onOpenManageAlerts={() => setIsManageAlertsOpen(true)}
      />

      {/* Manage Candidate Alerts Modal */}
      <ManageAlertsModal
        isOpen={isManageAlertsOpen}
        onClose={() => setIsManageAlertsOpen(false)}
        alertType="CANDIDATE_ALERT"
      />

    </div>
  );
};

