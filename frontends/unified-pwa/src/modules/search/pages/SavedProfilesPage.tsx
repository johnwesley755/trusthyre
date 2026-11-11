import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { 
  Bookmark, 
  MapPin, 
  ShieldCheck, 
  ChevronRight, 
  Users, 
  Trash2, 
  Search,
  LayoutGrid,
  List,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Clock,
  Briefcase
} from 'lucide-react';

import { useTranslation } from '../../../providers/TranslationContext';

export const SavedProfilesPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { savedWorkers, removeSavedWorker } = useSavedStore();

  // Search, View Mode & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter workers based on query
  const filteredWorkers = useMemo(() => {
    if (!searchQuery.trim()) return savedWorkers;
    const q = searchQuery.toLowerCase();
    return savedWorkers.filter(w => 
      w.name.toLowerCase().includes(q) ||
      (w.city && w.city.toLowerCase().includes(q)) ||
      (w.location && w.location.toLowerCase().includes(q)) ||
      (w.skills && w.skills.some(s => s.toLowerCase().includes(q)))
    );
  }, [savedWorkers, searchQuery]);

  // Compute pagination
  const totalItems = filteredWorkers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Keep current page in bounds
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedWorkers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredWorkers.slice(startIndex, startIndex + pageSize);
  }, [filteredWorkers, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">

        {/* 1. Hallmark Hero Header Banner */}
        <div className="rounded-[2rem] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#09090b] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#0f2f63]/5 dark:from-[#0066FF]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
           

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f2f63]/10 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] text-xs font-semibold">
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                  <span>{t("SHORTLISTED SPECIALISTS", "SHORTLISTED SPECIALISTS")}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0A1931] dark:text-white tracking-tight">
                  {t("Saved Candidate Profiles", "Saved Candidate Profiles")}
                </h1>
                <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed">
                  {t("Review and manage your bookmarked specialists. Compare skills, track verification status, and extend direct shift offers instantly.", "Review and manage your bookmarked specialists. Compare skills, track verification status, and extend direct shift offers instantly.")}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/find-workers"
                  className="rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white text-xs sm:text-sm font-medium uppercase px-5 py-3 transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>{t("Browse Talent Directory", "Browse Talent Directory")}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Main Content Body */}
        {savedWorkers.length > 0 ? (
          <div className="space-y-5">
            {/* Tactile Control Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#09090b] p-3 sm:p-4 rounded-[1.5rem] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={t("Filter by candidate name, skill, or location...", "Filter by candidate name, skill, or location...")}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-700 rounded-full text-xs font-medium text-[#0A1931] dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#0f2f63]/20 dark:focus:ring-blue-500/30 focus:border-[#0f2f63] dark:focus:border-[#0066FF] transition-all"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 px-1">
                  {filteredWorkers.length}{' '}
                  {filteredWorkers.length === 1 ? t("specialist", "specialist") : t("specialists", "specialists")}{' '}
                  {searchQuery ? t("matching", "matching") : t("saved", "saved")}
                </span>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-white dark:bg-[#121215] p-1 rounded-full border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white'
                    }`}
                    title={t("Grid View", "Grid View")}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-full transition-all cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-white'
                    }`}
                    title={t("Table View", "Table View")}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* View Mode 1: Modern Tactile Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {paginatedWorkers.length > 0 ? (
                  paginatedWorkers.map((worker) => {
                    const skillList = Array.isArray(worker.skills) ? worker.skills : [];
                    return (
                      <div
                        key={worker.userId}
                        onClick={() => navigate(`/worker/${worker.userId}`)}
                        className="rounded-[2rem] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-xs hover:border-[#0f2f63]/40 dark:hover:border-[#0066FF]/60 transition-all flex flex-col justify-between group cursor-pointer space-y-4"
                      >
                        {/* Header: Avatar, Name & Remove Bookmark */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <UserAvatar
                              src={worker.profileImageUrl || (worker as any).profile_image_url || worker.profilePhoto}
                              name={worker.name}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-extrabold text-[#0A1931] dark:text-white group-hover:text-[#0f2f63] dark:group-hover:text-[#38BDF8] transition-colors truncate text-sm sm:text-base">
                                  {worker.name}
                                </h3>
                                {worker.isVerified && (
                                  <span title="Identity Verified">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-[#0f2f63] dark:text-[#38BDF8]" />
                                  <span>{worker.city || worker.location || 'Local Area'}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSavedWorker(worker.userId);
                            }}
                            className="p-2 rounded-full text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                            title={t("Remove from saved profiles", "Remove from saved profiles")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Experience & Role Capsule */}
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-[#0f2f63]/10 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] text-xs font-semibold">
                            {skillList[0] ? t(skillList[0], skillList[0]) : t("Technical Specialist", "Technical Specialist")}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 text-[#0A1931] dark:text-zinc-200 text-xs font-medium">
                            {worker.experience ? `${worker.experience}+ ${t("Yrs Experience", "Yrs Experience")}` : t("Certified", "Certified")}
                          </span>
                        </div>

                        {/* Skills Row */}
                        {skillList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {skillList.slice(0, 4).map((skill: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2.5 py-0.5 bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-medium rounded-full border border-slate-200/60 dark:border-zinc-800 transition-colors"
                              >
                                {t(skill, skill)}
                              </span>
                            ))}
                            {skillList.length > 4 && (
                              <span className="px-2 py-0.5 text-slate-500 dark:text-zinc-400 text-xs font-medium self-center">
                                +{skillList.length - 4} {t("more", "more")}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Hallmark Trust Check Badges */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-slate-500 dark:text-zinc-400 font-medium border-t border-slate-100 dark:border-zinc-800/80">
                          <span className="inline-flex items-center gap-1.5 text-[#0A1931] dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t("Biometric Checked", "Biometric Checked")}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[#0A1931] dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t("Skill Verified", "Skill Verified")}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[#0A1931] dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t("Profile Verified", "Profile Verified")}
                          </span>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
                          <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400 text-[11px]">
                            <Clock className="w-3 h-3" />
                            <span>{t("Saved", "Saved")} {new Date(worker.savedAt).toLocaleDateString()}</span>
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/worker/${worker.userId}`);
                            }}
                            className="rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white text-xs font-medium uppercase px-4 py-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <span>{t("View Profile", "View Profile")}</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-12 text-center text-slate-500 dark:text-zinc-400 bg-white dark:bg-[#121215] rounded-[2rem] border border-slate-200/80 dark:border-zinc-800 shadow-xs">
                    <p className="font-semibold text-sm text-[#0A1931] dark:text-white">{t("No specialists match your filter criteria.", "No specialists match your filter criteria.")}</p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-2 text-xs font-bold text-[#0f2f63] dark:text-[#38BDF8] hover:underline"
                    >
                      {t("Clear search query", "Clear search query")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* View Mode 2: Tactile High-Craft Table View */}
            <div className="rounded-[2rem] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#0A1931] dark:text-zinc-100">
                  <thead className="bg-slate-50/80 dark:bg-[#09090b] text-slate-500 dark:text-zinc-400 text-xs font-bold border-b border-slate-200/80 dark:border-zinc-800">
                    <tr>
                      <th className="px-5 py-4">{t("Specialist", "Specialist")}</th>
                      <th className="px-5 py-4">{t("Role & Experience", "Role & Experience")}</th>
                      <th className="px-5 py-4">{t("Location", "Location")}</th>
                      <th className="px-5 py-4">{t("Key Skills", "Key Skills")}</th>
                      <th className="px-5 py-4">{t("Saved Date", "Saved Date")}</th>
                      <th className="px-5 py-4 text-right">{t("Actions", "Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
                    {paginatedWorkers.length > 0 ? (
                      paginatedWorkers.map((worker) => (
                        <tr
                          key={worker.userId}
                          className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/60 transition-colors group"
                        >
                          {/* Candidate Avatar & Name */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                src={worker.profileImageUrl || (worker as any).profile_image_url || worker.profilePhoto}
                                name={worker.name}
                                size="md"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => navigate(`/worker/${worker.userId}`)}
                                    className="font-bold text-[#0A1931] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate hover:underline text-left cursor-pointer text-sm"
                                  >
                                    {worker.name}
                                  </button>
                                  {worker.isVerified && (
                                    <span title={t("Identity Verified", "Identity Verified")} className="inline-flex shrink-0">
                                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3 text-[#0f2f63] dark:text-[#38BDF8]" />
                                  <span>{worker.city || worker.location || 'Local Area'}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Role & Experience */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className="font-semibold text-[#0A1931] dark:text-white text-xs block">
                                {worker.skills?.[0] ? t(worker.skills[0], worker.skills[0]) : t("Technical Specialist", "Technical Specialist")}
                              </span>
                              <span className="inline-block px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] border border-blue-100/60 dark:border-blue-800/60 rounded-full font-semibold text-[11px]">
                                {worker.experience ? `${worker.experience}+ ${t("Yrs Exp", "Yrs Exp")}` : t("Verified", "Verified")}
                              </span>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8] shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {worker.city || worker.location || 'Local Area'}
                              </span>
                            </div>
                          </td>

                          {/* Skills */}
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {worker.skills && worker.skills.length > 0 ? (
                                <>
                                  {worker.skills.slice(0, 3).map((skill, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-slate-100/90 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-[10px] font-medium rounded-full border border-slate-200/60 dark:border-zinc-700 whitespace-nowrap"
                                    >
                                      {t(skill, skill)}
                                    </span>
                                  ))}
                                  {worker.skills.length > 3 && (
                                    <span className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium self-center">
                                      +{worker.skills.length - 3}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-500 dark:text-zinc-400 italic text-[11px]">{t("Verified Skills", "Verified Skills")}</span>
                              )}
                            </div>
                          </td>

                          {/* Saved Date */}
                          <td className="px-5 py-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 font-medium">
                            {new Date(worker.savedAt).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/worker/${worker.userId}`)}
                                className="rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white text-xs font-medium uppercase px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span>{t("View", "View")}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => removeSavedWorker(worker.userId)}
                                className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
                                title={t("Remove from Saved", "Remove from Saved")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400">
                          <p className="font-semibold text-sm">{t("No specialists match your filter criteria.", "No specialists match your filter criteria.")}</p>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-2 text-xs font-bold text-[#0f2f63] dark:text-[#38BDF8] hover:underline"
                          >
                            {t("Clear search query", "Clear search query")}
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Standardized Pagination Bar */}
            <DataTablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              itemName={t("saved specialists", "saved specialists")}
              className="rounded-[1.5rem] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] p-3 shadow-xs"
            />
          </div>
        ) : (
          /* Empty State */
          <div className="rounded-[2rem] border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-[#121215] p-12 text-center max-w-xl mx-auto space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900 shadow-xs">
              <Bookmark className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A1931] dark:text-white">
              No Saved Profiles Yet
            </h2>
            <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
              When browsing specialists and candidates in the talent directory, click the bookmark icon to save profiles here for fast review and direct hiring.
            </p>
            <div className="pt-2">
              <Link
                to="/find-workers"
                className="inline-flex items-center gap-2 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white text-xs sm:text-sm font-medium uppercase px-6 py-3 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span>Find Candidates Now</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
