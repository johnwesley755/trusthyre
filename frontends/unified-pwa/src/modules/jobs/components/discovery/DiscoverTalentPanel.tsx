import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  Search, 
  Filter, 
  AlertCircle, 
  Users, 
  CheckCircle2, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { recommendationService, type BackendWorkerRecommendationItem } from '../../../../services/recommendation.service';
import { applicationService } from '../../../../services/application.service';
import { TalentCandidateCard } from './TalentCandidateCard';
import { TalentFilters, type TalentFilterState } from './TalentFilters';
import { toast } from 'sonner';

interface DiscoverTalentPanelProps {
  job: any;
  onViewProfile?: (worker: any) => void;
  onCandidateShortlisted?: () => void;
}

export const DiscoverTalentPanel: React.FC<DiscoverTalentPanelProps> = ({
  job,
  onViewProfile,
  onCandidateShortlisted
}) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [shortlistedSet, setShortlistedSet] = useState<Set<string>>(new Set());

  // Filter state
  const [filters, setFilters] = useState<TalentFilterState>({
    searchQuery: '',
    city: '',
    minExp: undefined,
    maxExp: undefined,
    isVerifiedOnly: false,
    minScore: 0
  });

  // Query recommendations for the specific job
  const { 
    data: recData, 
    isLoading, 
    isFetching,
    error,
    refetch 
  } = useQuery({
    queryKey: ['job-talent-discovery', job?.id, page, filters],
    queryFn: () => recommendationService.getRecommendedWorkers({
      jobId: job?.id,
      page,
      limit: 12,
      city: filters.city || undefined,
      skills: filters.searchQuery || undefined,
      minExp: filters.minExp,
      maxExp: filters.maxExp,
      isVerified: filters.isVerifiedOnly ? true : undefined,
      minScore: filters.minScore > 0 ? filters.minScore : undefined
    }),
    enabled: !!job?.id,
    staleTime: 60 * 1000
  });

  // Candidate Sourcing Mutation
  const sourceMutation = useMutation({
    mutationFn: (workerId: string) => applicationService.sourceCandidate({
      jobId: job.id,
      workerId
    }),
    onSuccess: (data, workerId) => {
      setShortlistedSet((prev) => new Set(prev).add(workerId));
      toast.success('Candidate shortlisted into your hiring pipeline!');
      // Invalidate relevant application queries so pipeline tabs stay in sync
      queryClient.invalidateQueries({ queryKey: ['job-hiring-pipeline', job?.id] });
      queryClient.invalidateQueries({ queryKey: ['job-applications', job?.id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      if (onCandidateShortlisted) onCandidateShortlisted();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to shortlist candidate');
    }
  });

  const handleSource = async (workerId: string) => {
    await sourceMutation.mutateAsync(workerId);
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      city: '',
      minExp: undefined,
      maxExp: undefined,
      isVerifiedOnly: false,
      minScore: 0
    });
    setPage(1);
  };

  const recommendations = recData?.recommendations || [];
  const total = recData?.total || 0;
  const totalPages = recData?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Top Sourcing Header Summary Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-transparent border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8]">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Talent Discovery & Smart Shortlisting
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">
            Pre-ranked candidates scored against <span className="font-semibold text-slate-800 dark:text-zinc-200">"{job?.title}"</span> requirements who haven't applied yet.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-semibold text-slate-700 dark:text-zinc-300">
            <span className="text-[#0f2f63] dark:text-[#38BDF8] font-bold">{total}</span> eligible matches
          </div>
        </div>
      </div>

      {/* Main Grid: Filters Sidebar + Candidates Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Filter Sidebar */}
        <div className="lg:col-span-1">
          <TalentFilters
            filters={filters}
            onChange={(updated) => {
              setFilters(updated);
              setPage(1);
            }}
            onReset={handleResetFilters}
            totalResults={total}
            isLoading={isLoading || isFetching}
          />
        </div>

        {/* Right Candidate Grid */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-xs font-medium">Scoring and ranking available candidates for this job...</p>
            </div>
          ) : error ? (
            <div className="py-12 px-4 text-center rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300">Unable to load recommendations</h4>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{(error as any)?.message || 'An error occurred while fetching candidates'}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 text-xs font-semibold text-rose-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-white dark:bg-[#121215] border border-slate-200 dark:border-neutral-800 p-6">
              <Users className="w-10 h-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">No eligible workers found</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                All matching workers have already applied or your filters are too restrictive. Try adjusting your city or skill filters.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0f2f63] text-white text-xs font-bold hover:bg-[#1a4487] transition-all cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Candidates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((rec) => {
                  const workerId = rec.worker.userId || rec.worker.id;
                  const isShortlisted = shortlistedSet.has(workerId);
                  return (
                    <TalentCandidateCard
                      key={workerId}
                      item={rec}
                      isShortlisted={isShortlisted}
                      onSource={handleSource}
                      onViewProfile={onViewProfile}
                    />
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-zinc-400">
                    Page {page} of {totalPages} ({total} candidates)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
