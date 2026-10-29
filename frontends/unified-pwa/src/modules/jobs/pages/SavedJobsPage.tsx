import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSavedStore, type SavedJob } from '../../../hooks/useSavedStore';
import { DataTablePagination } from '../../../components/common/DataTablePagination';
import { TranslateText } from '../../../components/common/TranslateText';
import { 
  Bookmark, 
  Building2, 
  MapPin, 
  CheckCircle2, 
  ChevronRight, 
  Trash2, 
  Briefcase,
  Search,
  IndianRupee
} from 'lucide-react';

const getEffectiveExpiryDate = (job: SavedJob): Date | null => {
  if (job.expiresAt) {
    return new Date(job.expiresAt);
  }
  const dateBase = job.createdAt || job.savedAt;
  if (dateBase) {
    return new Date(new Date(dateBase).getTime() + 30 * 24 * 60 * 60 * 1000);
  }
  return null;
};

import { useTranslation } from '../../../providers/TranslationContext';

export const SavedJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { savedJobs, removeSavedJob } = useSavedStore();

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter jobs based on query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return savedJobs;
    const q = searchQuery.toLowerCase();
    return savedJobs.filter(j => 
      j.title.toLowerCase().includes(q) ||
      (j.companyName && j.companyName.toLowerCase().includes(q)) ||
      (j.city && j.city.toLowerCase().includes(q)) ||
      (j.location && j.location.toLowerCase().includes(q)) ||
      (j.jobType && j.jobType.toLowerCase().includes(q))
    );
  }, [savedJobs, searchQuery]);

  // Compute pagination
  const totalItems = filteredJobs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedJobs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredJobs.slice(startIndex, startIndex + pageSize);
  }, [filteredJobs, safeCurrentPage, pageSize]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Banner */}
        <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#0f2f63] uppercase mb-1">
                <Bookmark className="w-4 h-4 fill-current" />
                <span>{t("My Bookmarks", "My Bookmarks")}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                {t("Saved Jobs", "Saved Jobs")}
              </h1>
              <p className="text-[#717784] text-xs sm:text-sm mt-1 font-medium">
                {t("Review opportunities you have bookmarked and submit your applications.", "Review opportunities you have bookmarked and submit your applications.")}
              </p>
            </div>

            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#1a4487] text-white text-xs sm:text-sm font-medium shadow-xs transition-all cursor-pointer self-start sm:self-auto uppercase active:scale-95"
            >
              <Briefcase className="w-4 h-4" />
              <span>{t("Browse All Jobs", "Browse All Jobs")}</span>
            </Link>
          </div>
        </div>

        <main className="space-y-4">
          {savedJobs.length > 0 ? (
            <div className="space-y-4">
              {/* Control Bar: Search and Summary */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#f4f4f4] p-3.5 sm:p-4 rounded-[1.5rem] border border-[#e6e8ec]">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717784]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t("Filter by job title, company, or city...", "Filter by job title, company, or city...")}
                    className="w-full pl-9 pr-4 py-2 bg-white hover:bg-slate-50 focus:bg-white border border-[#e6e8ec] rounded-full text-xs font-medium text-[#0a0a0a] placeholder:text-[#717784] focus:outline-none focus:border-[#0f2f63] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-[#717784] px-1">
                  <span>
                    <strong className="text-[#0a0a0a] font-bold tabular-nums">{filteredJobs.length}</strong>{' '}
                    {filteredJobs.length === 1 ? t("job", "job") : t("jobs", "jobs")}{' '}
                    {searchQuery ? t("matching", "matching") : t("saved", "saved")}
                  </span>
                </div>
              </div>

              {/* Table View Container */}
              <div className="bg-white rounded-[1.75rem] border border-[#e6e8ec] overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#0a0a0a]">
                    <thead className="bg-[#fbfbfb] text-[#717784] uppercase text-[10px] font-bold border-b border-[#e6e8ec]">
                      <tr>
                        <th className="px-5 py-4">{t("Job & Company", "Job & Company")}</th>
                        <th className="px-5 py-4">{t("Location", "Location")}</th>
                        <th className="px-5 py-4">{t("Job Type", "Job Type")}</th>
                        <th className="px-5 py-4">{t("Compensation", "Compensation")}</th>
                        <th className="px-5 py-4">{t("Experience", "Experience")}</th>
                        <th className="px-5 py-4">{t("Saved Date", "Saved Date")}</th>
                        <th className="px-5 py-4 text-right">{t("Actions", "Actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6e8ec]">
                      {paginatedJobs.length > 0 ? (
                        paginatedJobs.map((job) => {
                          const companyName = job.companyName || 'Verified Employer';
                          const companyInitial = companyName.charAt(0).toUpperCase();
                          const locationText = job.city || job.location || 'Local Area';
                          const effectiveExpiry = getEffectiveExpiryDate(job);
                          const isExpired = Boolean(
                            job.status === 'EXPIRED' || 
                            (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
                          );

                          return (
                            <tr
                              key={job.id}
                              className={`transition-colors group ${isExpired ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-[#fbfbfb]'}`}
                            >
                              {/* Job & Company */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-[#f4f4f4] border border-[#e6e8ec] flex items-center justify-center text-[#0a0a0a] font-bold text-sm shrink-0 group-hover:border-[#0f2f63]/40 group-hover:text-[#0f2f63] transition-all overflow-hidden">
                                    {job.logoUrl ? (
                                      <img
                                        src={job.logoUrl}
                                        alt={companyName}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <span>{companyInitial}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <button
                                      onClick={() => navigate(`/jobs/${job.id}`)}
                                      className="font-bold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors truncate hover:underline text-left cursor-pointer block max-w-xs"
                                    >
                                      <TranslateText text={job.title} />
                                    </button>
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#717784] font-medium mt-0.5">
                                      <span className="text-[#0a0a0a] font-semibold truncate">
                                        {companyName}
                                      </span>
                                      {isExpired ? (
                                        <span className="px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 text-[9px] font-bold border border-rose-200">
                                          {t("Expired", "Expired")}
                                        </span>
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Location */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-[#717784] font-medium">
                                  <MapPin className="w-3.5 h-3.5 text-[#0f2f63] shrink-0" />
                                  <span className="truncate max-w-[140px]"><TranslateText text={locationText} /></span>
                                </div>
                              </td>

                              {/* Job Type */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                {isExpired ? (
                                  <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-full uppercase">
                                    {t("Expired", "Expired")}
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-[#f4f4f4] border border-[#e6e8ec] text-[#0a0a0a] text-[11px] font-medium rounded-full uppercase">
                                    <TranslateText text={job.jobType || 'Full-Time'} />
                                  </span>
                                )}
                              </td>

                              {/* Compensation */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <span className="font-bold text-emerald-700 text-xs">
                                  {job.salaryText || (job.budget ? `₹${job.budget.toLocaleString()}` : t("Competitive", "Competitive"))}
                                </span>
                              </td>

                              {/* Experience */}
                              <td className="px-5 py-4 whitespace-nowrap text-[#0a0a0a] font-medium">
                                {job.experienceText || `${job.experienceYearsRequired || 0}+ ${t("Yrs", "Yrs")}`}
                              </td>

                              {/* Saved Date */}
                              <td className="px-5 py-4 whitespace-nowrap text-[#717784] font-medium">
                                {new Date(job.savedAt).toLocaleDateString()}
                              </td>

                              {/* Actions */}
                              <td className="px-5 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/jobs/${job.id}`)}
                                    className={`px-3 py-1.5 rounded-full font-medium text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer uppercase active:scale-95 ${
                                      isExpired 
                                        ? 'bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] border border-[#e6e8ec]' 
                                        : 'bg-[#0f2f63] hover:bg-[#1a4487] text-white'
                                    }`}
                                  >
                                    <span>{isExpired ? t("View Details", "View Details") : t("View & Apply", "View & Apply")}</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => removeSavedJob(job.id)}
                                    className="p-1.5 text-[#717784] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                                    title={t("Remove from Saved", "Remove from Saved")}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-[#717784]">
                            <p className="font-medium text-sm">{t("No jobs match your filter criteria.", "No jobs match your filter criteria.")}</p>
                            <button
                              onClick={() => setSearchQuery('')}
                              className="mt-2 text-xs font-bold text-[#0f2f63] hover:underline"
                            >
                              {t("Clear search query", "Clear search query")}
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Standardized Pagination */}
                <DataTablePagination
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  itemName={t("saved jobs", "saved jobs")}
                />
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-12 text-center border border-[#e6e8ec] max-w-xl mx-auto my-12 space-y-4">
              <div className="w-16 h-16 bg-white text-[#0f2f63] rounded-2xl flex items-center justify-center mx-auto border border-[#e6e8ec] shadow-2xs">
                <Bookmark className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-[#0a0a0a]">
                {t("No Saved Jobs Yet", "No Saved Jobs Yet")}
              </h2>
              <p className="text-[#717784] text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                {t("When searching jobs, bookmark opportunities you are interested in to review and apply to them later.", "When searching jobs, bookmark opportunities you are interested in to review and apply to them later.")}
              </p>
              <div className="pt-2">
                <Link
                  to="/search"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f2f63] hover:bg-[#1a4487] text-white rounded-full text-xs sm:text-sm font-medium shadow-xs transition-all cursor-pointer uppercase active:scale-95"
                >
                  <span>{t("Find Jobs Now", "Find Jobs Now")}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
