import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Plus,
  Compass,
  DollarSign
} from 'lucide-react';
import { UserAvatar } from '../../../../components/common/UserAvatar';
import type { BackendWorkerRecommendationItem } from '../../../../services/recommendation.service';

interface TalentCandidateCardProps {
  item: BackendWorkerRecommendationItem;
  isShortlisted?: boolean;
  onSource: (workerId: string) => Promise<void>;
  onViewProfile?: (worker: any) => void;
}

export const TalentCandidateCard: React.FC<TalentCandidateCardProps> = ({
  item,
  isShortlisted = false,
  onSource,
  onViewProfile
}) => {
  const [isSourcing, setIsSourcing] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { worker, overallScore, scoreBand, distanceKm, matchReasons, matchingSkills, missingSkills, breakdown } = item;

  const handleSourceClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isShortlisted || isSourcing) return;
    try {
      setIsSourcing(true);
      await onSource(worker.userId || worker.id);
    } finally {
      setIsSourcing(false);
    }
  };

  // Score band color accents
  const scoreColors = overallScore >= 85
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
    : overallScore >= 70
    ? 'bg-blue-50 text-[#0f2f63] border-blue-200 dark:bg-blue-950/60 dark:text-[#38BDF8] dark:border-blue-800'
    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';

  const progressBg = overallScore >= 85
    ? 'bg-emerald-500'
    : overallScore >= 70
    ? 'bg-blue-600'
    : 'bg-amber-500';

  return (
    <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Top Header: Candidate Identity & Score */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <UserAvatar 
              src={worker.profileImageUrl} 
              name={worker.name || 'Candidate'} 
              size="md" 
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {worker.name || 'Candidate'}
                </h4>
                {worker.isVerified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="Identity KYC Verified">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* Sub-meta: Location & Experience */}
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-zinc-400 flex-wrap">
                {(worker.city || worker.district) && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    {[worker.city, worker.district].filter(Boolean).join(', ')}
                  </span>
                )}
                {typeof worker.experienceYears === 'number' && worker.experienceYears > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                    {worker.experienceYears}y experience
                  </span>
                )}
                {distanceKm !== null && distanceKm !== undefined && (
                  <span className="inline-flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                    <Compass className="w-3 h-3 text-slate-400 shrink-0" />
                    {distanceKm.toFixed(1)} km away
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Match Score Badge */}
          <div className={`shrink-0 px-2.5 py-1.5 rounded-xl border flex flex-col items-end ${scoreColors}`}>
            <span className="text-base font-black leading-none">{overallScore}%</span>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">{scoreBand}</span>
          </div>
        </div>

        {/* Match Reasons Pill Highlights */}
        {matchReasons && matchReasons.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {matchReasons.slice(0, 2).map((reason, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-neutral-700"
              >
                <Sparkles className="w-2.5 h-2.5 text-blue-600 dark:text-[#38BDF8]" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Skills Alignment */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-neutral-800/80 space-y-1.5">
          {matchingSkills && matchingSkills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matched:</span>
              {matchingSkills.map((sk, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/50"
                >
                  ✓ {sk}
                </span>
              ))}
            </div>
          )}

          {missingSkills && missingSkills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Missing:</span>
              {missingSkills.slice(0, 3).map((sk, idx) => (
                <span 
                  key={idx} 
                  className="px-2 py-0.5 rounded-md text-[10px] font-normal bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-800"
                >
                  {sk}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Expandable Match Breakdown Details */}
        {showBreakdown && breakdown && (
          <div className="mt-3 p-3 bg-slate-50 dark:bg-neutral-900/80 rounded-xl border border-slate-200/60 dark:border-neutral-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-zinc-200">
              <span>Match Scoring Breakdown</span>
              <button 
                onClick={() => setShowBreakdown(false)}
                className="text-[10px] text-blue-600 dark:text-[#38BDF8] hover:underline cursor-pointer"
              >
                Hide
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 dark:text-zinc-400">
              <div>
                <span className="text-slate-400 block">Skills Fit:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.skills}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Location Fit:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.geo}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Experience Fit:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.experience}%</span>
              </div>
              <div>
                <span className="text-slate-400 block">Compensation:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{breakdown.compensation}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          {showBreakdown ? 'Hide details' : 'Why recommended?'}
        </button>

        <div className="flex items-center gap-2">
          {onViewProfile && (
            <button
              type="button"
              onClick={() => onViewProfile(worker)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              View Profile
            </button>
          )}

          <button
            type="button"
            onClick={handleSourceClick}
            disabled={isShortlisted || isSourcing}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isShortlisted
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700 cursor-default'
                : 'bg-[#0f2f63] hover:bg-[#1a4487] text-white shadow-xs active:scale-98'
            }`}
          >
            {isShortlisted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Shortlisted</span>
              </>
            ) : isSourcing ? (
              <span>Shortlisting...</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Shortlist</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
