import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Briefcase, RefreshCw, AlertCircle, Compass } from 'lucide-react';
import { recommendationService, type BackendJobRecommendationItem } from '../../../services/recommendation.service';
import { RecommendedJobCard } from './RecommendedJobCard';
import { useTranslation } from '../../../providers/TranslationContext';
import { Link } from 'react-router-dom';

export const RecommendedJobsSection: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['recommendedJobsBackend'],
    queryFn: () => recommendationService.getRecommendedJobs({ limit: 8 }),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: false // Prevent duplicate background fetches/views
  });

  const handleDismiss = (jobId: string) => {
    // Optimistic UI removal
    setDismissedIds((prev) => new Set([...prev, jobId]));
  };

  const rawRecommendations = data?.recommendations || [];
  const visibleRecommendations = rawRecommendations.filter(
    (item: BackendJobRecommendationItem) => !dismissedIds.has(item.job.id)
  );

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0a0a0a] dark:text-zinc-100 flex items-center gap-2">
              <span>{t('Personalized Job Recommendations', 'Personalized Job Recommendations')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400">
                AI Match
              </span>
            </h2>
            <p className="text-xs text-[#717784] dark:text-zinc-400">
              Ranked dynamically by verified trade skills, wage compatibility, and geographic proximity
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-full border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/search"
            className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:underline px-2 py-1"
          >
            {t('Explore All Openings', 'Explore All Openings')} →
          </Link>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4]/60 dark:bg-[#0c0c0e]/60 p-6 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-full" />
                <div className="h-4 w-12 bg-slate-200 dark:bg-zinc-800 rounded-full" />
              </div>
              <div className="h-6 w-3/4 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              <div className="h-10 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Error Fallback */}
      {isError && !isLoading && (
        <div className="rounded-[1.75rem] border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300">
            Unable to load personalized job recommendations
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
            Please make sure you are signed in as a verified worker or try refreshing your feed.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
          >
            Retry Recommendation Scan
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && visibleRecommendations.length === 0 && (
        <div className="rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">
              No matching jobs found right now
            </h3>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-md mx-auto">
              Add more skills to your profile or broaden your location preferences to unlock more high-scoring openings.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/profile"
              className="px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold shadow-xs"
            >
              Update Profile Skills
            </Link>
            <Link
              to="/search"
              className="px-4 py-2 rounded-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-[#0a0a0a] dark:text-zinc-200 text-xs font-semibold"
            >
              Browse All Jobs
            </Link>
          </div>
        </div>
      )}

      {/* Active Grid of Recommended Jobs */}
      {!isLoading && !isError && visibleRecommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleRecommendations.map((item) => (
            <RecommendedJobCard
              key={item.job.id}
              item={item}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </section>
  );
};

