import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Check, 
  Sparkles, 
  Bookmark, 
  BookmarkCheck,
  Send, 
  X, 
  ShieldCheck,
  ArrowRight,
  Clock
} from 'lucide-react';
import type { BackendJobRecommendationItem } from '../../../services/recommendation.service';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { useRecommendationTelemetry } from '../../../hooks/useRecommendationTelemetry';
import { useTranslation } from '../../../providers/TranslationContext';

interface RecommendedJobCardProps {
  item: BackendJobRecommendationItem;
  onDismiss?: (jobId: string) => void;
  onApplySuccess?: (jobId: string) => void;
}

export const RecommendedJobCard: React.FC<RecommendedJobCardProps> = ({
  item,
  onDismiss,
  onApplySuccess
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isJobSaved, toggleSaveJob } = useSavedStore();
  const { recordView, recordAction } = useRecommendationTelemetry();

  const { job, overallScore, scoreBand, distanceKm, matchReasons, matchingSkills, missingSkills } = item;
  const isSaved = isJobSaved(job.id);

  // Record a single deduplicated view upon component mount
  useEffect(() => {
    if (job?.id) {
      recordView('JOB', job.id, overallScore);
    }
  }, [job?.id, overallScore, recordView]);

  const handleCardClick = () => {
    recordAction('CLICK', 'JOB', job.id, overallScore);
    navigate(`/job/${job.id}`);
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveJob({
      id: job.id,
      title: job.title,
      companyName: job.employerProfile?.companyName || 'Verified Employer',
      location: job.location || job.city || 'Tamil Nadu',
      city: job.city,
      salaryText: job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : undefined,
      budget: job.budget ? Number(job.budget) : undefined,
      jobType: job.payoutFrequency || 'Fixed',
      createdAt: job.createdAt || new Date().toISOString()
    });
    recordAction('SAVE', 'JOB', job.id, overallScore, { isSaved: !isSaved });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordAction('DISMISS', 'JOB', job.id, overallScore);
    onDismiss?.(job.id);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // P2.2 FIX: Record CLICK on navigation; actual APPLY event is recorded upon application submission in job detail page
    recordAction('CLICK', 'JOB', job.id, overallScore, { intent: 'APPLY_NAVIGATE' });
    navigate(`/job/${job.id}`);
  };

  // Score band color styling
  const scoreBadgeColors = 
    overallScore >= 80 
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50' 
      : overallScore >= 60 
      ? 'bg-blue-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-300 border-blue-200/80 dark:border-sky-800/50' 
      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/50';

  const formattedWage = job.budget
    ? `₹${Number(job.budget).toLocaleString('en-IN')}${
        job.payoutFrequency ? ` / ${job.payoutFrequency.toLowerCase().replace('_', ' ')}` : ''
      }`
    : null;

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-5 sm:p-6 shadow-xs hover:border-[#0f2f63]/40 dark:hover:border-zinc-700 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
    >
      {/* Top Header: Title, Employer & Dismiss Button */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${scoreBadgeColors}`}>
                <Sparkles className="w-3 h-3" />
                <span>{overallScore}% Match</span>
              </span>
              <span className="text-[11px] font-semibold text-[#717784] dark:text-zinc-400 uppercase tracking-wider">
                {scoreBand}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] dark:text-zinc-100 group-hover:text-[#0f2f63] dark:group-hover:text-sky-400 transition-colors line-clamp-1">
              {job.title}
            </h3>

            <div className="flex items-center gap-2 text-xs text-[#717784] dark:text-zinc-400 flex-wrap">
              <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#717784]" />
                <span>{job.employerProfile?.companyName || 'Verified Hiring Partner'}</span>
              </span>

              {job.employerProfile?.isVerified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Works</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            title={t('Not Interested', 'Not Interested')}
            className="p-1.5 rounded-full text-[#717784] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Location & Wage Strip */}
        <div className="flex items-center gap-3 text-xs text-[#717784] dark:text-zinc-400 flex-wrap pt-1">
          {(job.location || job.city) && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#717784]" />
              <span>
                {job.location || job.city}
                {typeof distanceKm === 'number' && ` (${distanceKm.toFixed(1)} km away)`}
              </span>
            </span>
          )}

          {formattedWage && (
            <span className="font-bold text-[#0a0a0a] dark:text-zinc-100 bg-[#f4f4f4] dark:bg-zinc-800/60 px-2.5 py-0.5 rounded-md">
              {formattedWage}
            </span>
          )}

          {typeof job.experienceYearsRequired === 'number' && job.experienceYearsRequired > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{job.experienceYearsRequired}+ yrs experience</span>
            </span>
          )}
        </div>
      </div>

      {/* Matching Skills vs Gap Skills Badges */}
      <div className="space-y-2 pt-2 border-t border-[#e6e8ec]/70 dark:border-zinc-800/70">
        <div className="flex flex-wrap gap-1.5">
          {matchingSkills.slice(0, 3).map((skill) => (
            <span
              key={`match-${skill}`}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 px-2.5 py-0.5 rounded-full"
            >
              <Check className="w-2.5 h-2.5" />
              <span>{skill}</span>
            </span>
          ))}

          {missingSkills.slice(0, 2).map((skill) => (
            <span
              key={`miss-${skill}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 px-2.5 py-0.5 rounded-full"
            >
              <span>• Needs {skill}</span>
            </span>
          ))}
        </div>

        {/* Highlight Reason snippet */}
        {matchReasons.length > 0 && (
          <p className="text-[11px] text-[#717784] dark:text-zinc-400 line-clamp-1 italic">
            "{matchReasons[0]}"
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={handleToggleSave}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-[#0a0a0a] dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
        >
          {isSaved ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5 text-[#717784]" />
              <span>Save</span>
            </>
          )}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 px-2.5 py-1.5 transition-colors cursor-pointer"
          >
            {t('Not Interested', 'Not Interested')}
          </button>

          <button
            type="button"
            onClick={handleApplyClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span>View & Apply</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
