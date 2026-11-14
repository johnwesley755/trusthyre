import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Check, 
  Sparkles, 
  Bookmark, 
  BookmarkCheck,
  Send, 
  X, 
  ShieldCheck,
  Clock,
  Star,
  ArrowRight
} from 'lucide-react';
import type { BackendWorkerRecommendationItem } from '../../../services/recommendation.service';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { useRecommendationTelemetry } from '../../../hooks/useRecommendationTelemetry';
import { useTranslation } from '../../../providers/TranslationContext';
import { UserAvatar } from '../../../components/common/UserAvatar';

interface RecommendedWorkerCardProps {
  item: BackendWorkerRecommendationItem;
  selectedJob?: any;
  onDismiss?: (workerId: string) => void;
  onInviteClick?: (worker: any) => void;
}

export const RecommendedWorkerCard: React.FC<RecommendedWorkerCardProps> = ({
  item,
  selectedJob,
  onDismiss,
  onInviteClick
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isWorkerSaved, toggleSaveWorker } = useSavedStore();
  const { recordView, recordAction } = useRecommendationTelemetry();

  const { worker, overallScore, scoreBand, distanceKm, matchReasons, matchingSkills, missingSkills } = item;
  const isSaved = isWorkerSaved(worker.userId || worker.id);

  // Deduplicated view tracking upon mount
  useEffect(() => {
    if (worker?.userId || worker?.id) {
      recordView('WORKER', worker.userId || worker.id, overallScore);
    }
  }, [worker?.userId, worker?.id, overallScore, recordView]);

  const handleCardClick = () => {
    recordAction('CLICK', 'WORKER', worker.userId || worker.id, overallScore);
    navigate(`/worker/${worker.userId || worker.id}`, { state: { job: selectedJob } });
  };

  const handleToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveWorker({
      userId: worker.userId || worker.id,
      name: worker.name,
      city: worker.city || 'Tamil Nadu',
      location: worker.city,
      trustScore: worker.trustScore ?? 85,
      isVerified: worker.isVerified,
      skills: worker.skills || [],
      experience: worker.experienceYears || 0,
      profileImageUrl: worker.profileImageUrl
    });
    recordAction('SAVE', 'WORKER', worker.userId || worker.id, overallScore, { isSaved: !isSaved });
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordAction('DISMISS', 'WORKER', worker.userId || worker.id, overallScore);
    onDismiss?.(worker.userId || worker.id);
  };

  const handleInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    // INVITE telemetry is strictly emitted server-side on successful offer dispatch
    onInviteClick?.(worker);
  };

  const scoreBadgeColors = 
    overallScore >= 80 
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/50' 
      : overallScore >= 60 
      ? 'bg-blue-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-300 border-blue-200/80 dark:border-sky-800/50' 
      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/50';

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-5 sm:p-6 shadow-xs hover:border-[#0f2f63]/40 dark:hover:border-zinc-700 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
    >
      {/* Top Header: Candidate Snapshot & Dismiss Button */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              src={worker.profileImageUrl}
              name={worker.name}
              size="md"
              className="shrink-0 border border-[#e6e8ec] dark:border-zinc-800 shadow-2xs"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100 group-hover:text-[#0f2f63] dark:group-hover:text-sky-400 transition-colors truncate">
                  {worker.name}
                </h3>
                {worker.isVerified && (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </div>
              <p className="text-xs text-[#717784] dark:text-zinc-400 truncate">
                {worker.level || 'Certified Specialist'} • {worker.skills?.[0] || 'Technical Trade'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${scoreBadgeColors}`}>
              <Sparkles className="w-3 h-3" />
              <span>{overallScore}% Match</span>
            </span>

            <button
              type="button"
              onClick={handleDismiss}
              title={t('Not Interested', 'Not Interested')}
              className="p-1 rounded-full text-[#717784] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Location & Experience Meta Strip */}
        <div className="flex items-center gap-3 text-xs text-[#717784] dark:text-zinc-400 flex-wrap">
          {worker.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#717784]" />
              <span>
                {worker.city}
                {typeof distanceKm === 'number' && ` (${distanceKm.toFixed(1)} km away)`}
              </span>
            </span>
          )}

          {typeof worker.experienceYears === 'number' && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#717784]" />
              <span>{worker.experienceYears} yrs exp</span>
            </span>
          )}

          {worker.isAvailable && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Immediate Hire
            </span>
          )}
        </div>
      </div>

      {/* Skills Comparison Strip */}
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
            onClick={handleInvite}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Send className="w-3 h-3" />
            <span>Invite to Interview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
