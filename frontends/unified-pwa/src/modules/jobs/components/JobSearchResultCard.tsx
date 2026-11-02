import { useState } from 'react';
import { Bookmark, MapPin, CheckCircle2, ArrowRight, ShieldCheck, Clock, Calendar, ExternalLink, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLoader } from '../../../components/common/AppLoader';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { TranslateText } from '../../../components/common/TranslateText';
import { getEffectiveCoverUrl } from '../../../utils/coverImage.utils';

export interface JobCardData {
  id: string;
  title: string;
  description?: string;
  industry?: string;
  jobType?: string;
  location?: string;
  city?: string;
  budget?: number;
  experienceYearsRequired?: number;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  isExternal?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  alternateSources?: Array<{ sourceName: string; sourceUrl: string; dateSeen?: string }>;
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  employerProfile?: {
    id?: string;
    companyName?: string;
    isVerified?: boolean;
    city?: string;
    logoUrl?: string;
  } | null;
  hasApplied?: boolean;
  applicationStatus?: string;
}

interface JobSearchResultCardProps {
  job: JobCardData;
  onApply?: (jobId: string) => void;
  isApplying?: boolean;
}

export const JobSearchResultCard: React.FC<JobSearchResultCardProps> = ({
  job,
  onApply,
  isApplying = false,
}) => {
  const navigate = useNavigate();
  const { isJobSaved, toggleSaveJob } = useSavedStore();
  const isSaved = isJobSaved(job.id);
  const [imageError, setImageError] = useState(false);
  const effectiveCoverUrl = !imageError ? getEffectiveCoverUrl(job) : null;

  const effectiveExpiry = job.expiresAt
    ? new Date(job.expiresAt)
    : (job.createdAt ? new Date(new Date(job.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null);

  const isExpired = Boolean(
    job.isExpired || 
    job.status === 'EXPIRED' || 
    job.status === 'CLOSED' ||
    (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
  );

  const companyName = job.employerProfile?.companyName || 'Verified Employer';
  const locationText = job.city || job.location || 'Local Area';
  const isVerified = job.employerProfile?.isVerified ?? true;

  // Format experience
  const expYears = job.experienceYearsRequired ?? (job as any).experience_years_required ?? 0;
  const experienceText = expYears === 0 
    ? 'Fresher (0 Yrs)' 
    : expYears === 1
      ? '1 Year Exp' 
      : `${expYears} Years Exp`;

  // Format salary
  const budget = job.budget ?? 0;
  const salaryText = budget > 0 
    ? (budget > 10000 
        ? `₹${(budget / 1000).toFixed(0)}k - ₹${((budget * 1.3) / 1000).toFixed(0)}k / mo` 
        : `₹${budget.toLocaleString()} / day`)
    : 'Competitive Pay';

  // Format posted time and calendar date
  const getPostedInfo = (dateStr?: string) => {
    if (!dateStr) return { relative: 'Recently', formattedDate: null };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { relative: 'Recently', formattedDate: null };

      const diffMs = Date.now() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      let relative = 'Posted just now';
      if (diffHours >= 1 && diffHours < 24) {
        relative = `Posted ${diffHours}h ago`;
      } else if (diffHours >= 24) {
        const diffDays = Math.floor(diffHours / 24);
        relative = `Posted ${diffDays}d ago`;
      }

      const formattedDate = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return { relative, formattedDate };
    } catch {
      return { relative: 'Recently', formattedDate: null };
    }
  };

  const postedInfo = getPostedInfo(job.createdAt);
  const companyInitial = companyName.charAt(0).toUpperCase();

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveJob({
      id: job.id,
      title: job.title,
      companyName,
      logoUrl: job.employerProfile?.logoUrl,
      location: locationText,
      city: job.city,
      budget: job.budget,
      salaryText,
      jobType: job.jobType,
      experienceText,
      experienceYearsRequired: job.experienceYearsRequired,
      status: job.status,
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
    });
  };

  return (
    <div 
      onClick={() => navigate(`/job/${job.id}`)}
      className={`bg-white rounded-[2rem] border transition-all duration-300 group cursor-pointer shadow-xs relative overflow-hidden font-['Onest',system-ui,sans-serif] flex flex-col md:flex-row items-stretch ${
        isExpired 
          ? 'border-rose-200/80 bg-slate-50/50 hover:border-rose-300' 
          : 'border-[#e6e8ec] hover:border-[#0f2f63]/50 hover:shadow-xl hover:-translate-y-0.5'
      }`}
    >
      {/* Left: Cover Image Vertical Panel (Exact 20% on Desktop like JobDetailPage) */}
      {effectiveCoverUrl ? (
        <div className="w-full md:w-[22%] md:min-w-[210px] md:max-w-[250px] h-44 sm:h-52 md:h-auto min-h-[200px] overflow-hidden relative border-b md:border-b-0 md:border-r border-[#e6e8ec] bg-slate-900 group shrink-0">
          <img 
            src={effectiveCoverUrl} 
            alt={job.title} 
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block" 
          />
          <div className="absolute inset-0 w-full h-full bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/25 to-transparent pointer-events-none" />

          {/* Badges on Cover Image Panel */}
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-10">
            <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
              {job.industry || 'Verified Opening'}
            </span>
            {isVerified && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Worksite</span>
              </span>
            )}
          </div>

          {/* Top-Right Bookmark on Mobile (when image is rendered on top) */}
          <button
            type="button"
            onClick={handleBookmarkClick}
            className={`md:hidden absolute top-2.5 right-2.5 z-10 p-2 rounded-full backdrop-blur-xs transition-all cursor-pointer shadow-xs ${
              isSaved 
                ? 'bg-[#0f2f63] text-white shadow-sm ring-2 ring-white/50' 
                : 'bg-black/50 hover:bg-black/80 text-white hover:scale-105'
            }`}
            title={isSaved ? 'Remove from Saved' : 'Save Job'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      ) : null}

      {/* Right: Content Details Area (Exact 80% on Desktop) */}
      <div className="p-5 sm:p-6 lg:p-7 flex-1 w-full min-w-0 flex flex-col justify-between gap-4 sm:gap-5">
        
        {/* Top Header Row: Monogram + Title + Employer + Top Action Buttons */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {/* Company Monogram / Logo Badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#f4f4f4] border border-[#e6e8ec] flex items-center justify-center text-[#0a0a0a] font-semibold text-base shrink-0 group-hover:border-[#0f2f63]/30 transition-all overflow-hidden">
              {job.employerProfile?.logoUrl ? (
                <img src={job.employerProfile.logoUrl} alt={companyName} className="w-full h-full object-contain rounded-2xl" />
              ) : (
                <span>{companyInitial}</span>
              )}
            </div>

            {/* Job Title & Company Line */}
            <div className="min-w-0 space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors truncate">
                  <TranslateText text={job.title} />
                </h3>
                {isExpired ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                    <Clock className="w-3 h-3 text-rose-600" />
                    <span>Expired</span>
                  </span>
                ) : isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#717784] font-medium truncate flex-wrap">
                <span className="text-[#0a0a0a] font-semibold">{companyName}</span>
                {job.isExternal ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 shadow-2xs">
                    <Globe className="w-3 h-3 text-blue-600" />
                    <span>{job.sourceName || 'Verified Partner'}</span>
                  </span>
                ) : null}
                {job.alternateSources && job.alternateSources.length > 1 ? (
                  <span 
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200"
                    title={`Also cross-verified on: ${job.alternateSources.map((s) => s.sourceName).join(', ')}`}
                  >
                    <span>+{job.alternateSources.length - 1} Sources</span>
                  </span>
                ) : null}
                <span className="text-[#e6e8ec]">•</span>
                <span className="inline-flex items-center gap-1 text-[#717784] truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#2563c9]" />
                  <span className="truncate"><TranslateText text={locationText} /></span>
                </span>
              </div>
            </div>
          </div>

          {/* Desktop/Default Bookmark Button */}
          <button
            type="button"
            onClick={handleBookmarkClick}
            className={`p-2.5 rounded-full border transition-all cursor-pointer shrink-0 ${
              effectiveCoverUrl ? 'hidden md:flex' : 'flex'
            } items-center justify-center ${
              isSaved 
                ? 'bg-[#0f2f63] border-[#0f2f63] text-white shadow-xs' 
                : 'bg-[#f4f4f4] border-[#e6e8ec] text-[#717784] hover:text-[#0a0a0a] hover:bg-white'
            }`}
            title={isSaved ? 'Remove from Saved' : 'Save Job'}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Middle Specs Grid: Experience | Job Type | Pay/Salary */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-4 bg-[#f4f4f4]/80 rounded-2xl border border-[#e6e8ec]/80 text-left">
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#717784]">Experience</span>
            <span className="text-xs sm:text-sm font-bold text-[#0a0a0a]">
              {experienceText}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#717784]">Job Type</span>
            <span className="text-xs sm:text-sm font-bold text-[#0a0a0a]">
              <TranslateText text={job.jobType || 'Full-Time'} />
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#717784]">Pay / Salary</span>
            <span className={`text-xs sm:text-sm font-bold ${isExpired ? 'text-slate-500 line-through' : 'text-emerald-700'}`}>
              {salaryText}
            </span>
          </div>
        </div>

        {/* Footer Line: Posted Time & Date & Apply / Status */}
        <div className="flex items-center justify-between pt-3 border-t border-[#e6e8ec] text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#717784]">
            <span className="inline-flex items-center gap-1 font-normal text-[#717784]">
              <Calendar className="w-3.5 h-3.5 text-[#717784]" />
              <span>{postedInfo.relative}</span>
            </span>
            {postedInfo.formattedDate && (
              <>
                <span className="text-[#d1d5db]">•</span>
                <span className="text-[#0a0a0a] font-medium">{postedInfo.formattedDate}</span>
              </>
            )}
            {effectiveExpiry && (
              <>
                <span className="text-[#d1d5db]">•</span>
                <span className={`text-[11px] font-medium ${isExpired ? 'text-rose-600 font-semibold' : 'text-[#717784]'}`}>
                  {isExpired 
                    ? `Expired on ${effectiveExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                    : `Closes ${effectiveExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {job.hasApplied ? (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100 flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Applied ({job.applicationStatus || 'Under Review'})</span>
              </span>
            ) : isExpired ? (
              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 cursor-not-allowed">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Expired</span>
              </span>
            ) : job.isExternal && job.sourceUrl ? (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold uppercase px-4 py-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer no-underline"
              >
                <span>Apply on {job.sourceName || 'Portal'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onApply) {
                    onApply(job.id);
                  } else {
                    navigate(`/job/${job.id}`);
                  }
                }}
                disabled={isApplying}
                className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold uppercase px-4 py-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                {isApplying ? (
                  <AppLoader variant="inline" size="sm" />
                ) : (
                  <>
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
