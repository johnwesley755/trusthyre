import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Sparkles, RefreshCw, AlertCircle, Briefcase, PlusCircle } from 'lucide-react';
import { recommendationService, type BackendWorkerRecommendationItem } from '../../../services/recommendation.service';
import { jobService } from '../../../services/job.service';
import { RecommendedWorkerCard } from './RecommendedWorkerCard';
import { useTranslation } from '../../../providers/TranslationContext';
import { Link } from 'react-router-dom';
import { CandidateOutreachModal, type CandidateOutreachCandidate } from '../../../components/common/CandidateOutreachModal';
import { queryKeys } from '../../../lib/queryKeys';

export const RecommendedWorkersSection: React.FC = () => {
  const { t } = useTranslation();
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [outreachCandidate, setOutreachCandidate] = useState<CandidateOutreachCandidate | null>(null);
  const [isOutreachOpen, setIsOutreachOpen] = useState(false);

  // 1. Fetch Employer Active Jobs
  const { data: employerJobs = [], isLoading: isJobsLoading } = useQuery<any[]>({
    queryKey: queryKeys.jobs.employerJobs,
    queryFn: jobService.getEmployerJobs
  });

  const activeJobs = useMemo(() => {
    return employerJobs.filter((j: any) => j.status === 'OPEN' || !j.status);
  }, [employerJobs]);

  // Set default selected active job once loaded
  const effectiveJobId = selectedJobId || activeJobs[0]?.id || '';

  // 2. Fetch Recommended Candidates for selected active job
  const {
    data,
    isLoading: isWorkersLoading,
    isError,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['recommendedWorkersBackend', effectiveJobId],
    queryFn: () => recommendationService.getRecommendedWorkers({ jobId: effectiveJobId || undefined, limit: 8 }),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false
  });

  const handleDismiss = (workerId: string) => {
    setDismissedIds((prev) => new Set([...prev, workerId]));
  };

  const handleInviteClick = (worker: any) => {
    setOutreachCandidate({
      id: worker.id,
      userId: worker.userId,
      fullName: worker.name,
      trade: worker.skills?.[0] || 'Technician',
      experienceYears: worker.experienceYears,
      city: worker.city,
      location: worker.city,
      skills: worker.skills,
      avatarUrl: worker.profileImageUrl
    });
    setIsOutreachOpen(true);
  };

  const selectedJob = activeJobs.find((j: any) => j.id === effectiveJobId);
  const rawRecommendations = data?.recommendations || [];
  const visibleRecommendations = rawRecommendations.filter(
    (item: BackendWorkerRecommendationItem) => !dismissedIds.has(item.worker.userId || item.worker.id)
  );

  return (
    <section className="space-y-4">
      {/* Section Header & Job Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0a0a0a] dark:text-zinc-100 flex items-center gap-2">
              <span>{t('Recommended Talent For Your Openings', 'Recommended Talent For Your Openings')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400">
                AI Match
              </span>
            </h2>
            <p className="text-xs text-[#717784] dark:text-zinc-400">
              Screened candidates matching required trades, years of experience, and geographic radius
            </p>
          </div>
        </div>

        {/* Active Job Selector Dropdown */}
        <div className="flex items-center gap-3 flex-wrap">
          {activeJobs.length > 0 ? (
            <div className="flex items-center gap-2 bg-white dark:bg-[#121215] px-3.5 py-2 rounded-full border border-[#e6e8ec] dark:border-zinc-800 shadow-2xs">
              <Briefcase className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <label htmlFor="active-job-select" className="sr-only">Select Active Job</label>
              <select
                id="active-job-select"
                aria-label="Filter recommendations by active job opening"
                value={effectiveJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-[#0a0a0a] dark:text-zinc-100 focus:ring-0 cursor-pointer pr-4"
              >
                {activeJobs.map((j: any) => (
                  <option key={j.id} value={j.id} className="bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100">
                    {j.title} ({j.city || 'Tamil Nadu'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Link
              to="/post-job"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Job to Match Talent</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-full border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {isWorkersLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4]/60 dark:bg-[#0c0c0e]/60 p-6 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                  <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                </div>
              </div>
              <div className="h-8 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Error Fallback */}
      {isError && !isWorkersLoading && (
        <div className="rounded-[1.75rem] border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300">
            Unable to load candidate recommendations
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
            Please make sure you have active open jobs or try refreshing.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
          >
            Retry Candidate Scan
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isWorkersLoading && !isError && visibleRecommendations.length === 0 && (
        <div className="rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">
              No matching candidates found for this position
            </h3>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-md mx-auto">
              Our automated crawler is screening new talent daily. You can also explore the full verified talent directory.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/find-workers"
              className="px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold shadow-xs"
            >
              Explore All Candidates
            </Link>
          </div>
        </div>
      )}

      {/* Active Grid of Recommended Candidates */}
      {!isWorkersLoading && !isError && visibleRecommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleRecommendations.map((item) => (
            <RecommendedWorkerCard
              key={item.worker.userId || item.worker.id}
              item={item}
              selectedJob={selectedJob}
              onDismiss={handleDismiss}
              onInviteClick={handleInviteClick}
            />
          ))}
        </div>
      )}

      {/* Interview Outreach Modal Integration */}
      {outreachCandidate && (
        <CandidateOutreachModal
          isOpen={isOutreachOpen}
          onClose={() => {
            setIsOutreachOpen(false);
            setOutreachCandidate(null);
          }}
          candidate={outreachCandidate}
          employerName="Verified Employer"
          activeJobs={activeJobs}
          defaultJobId={effectiveJobId}
        />
      )}
    </section>
  );
};

