import React from 'react';
import { Clock, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';

interface PipelineFollowUpBarProps {
  summary?: {
    overdue: number;
    dueToday: number;
    upcoming7Days: number;
    totalPending: number;
  } | null;
  activeFilter: 'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  onFilterChange: (filter: 'ALL' | 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING') => void;
  isLoading?: boolean;
}

export const PipelineFollowUpBar: React.FC<PipelineFollowUpBarProps> = ({
  summary,
  activeFilter,
  onFilterChange,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 dark:bg-zinc-900 rounded-xl animate-pulse">
        <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  const overdue = summary?.overdue || 0;
  const dueToday = summary?.dueToday || 0;
  const upcoming = summary?.upcoming7Days || 0;

  if (overdue === 0 && dueToday === 0 && upcoming === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 px-3.5 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xs">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
        <Clock className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
        <span>Candidate Follow-ups:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* Overdue */}
        {overdue > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Overdue ({overdue})</span>
          </button>
        )}

        {/* Due Today */}
        {dueToday > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'DUE_TODAY'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Due Today ({dueToday})</span>
          </button>
        )}

        {/* Upcoming 7 Days */}
        {upcoming > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange(activeFilter === 'UPCOMING' ? 'ALL' : 'UPCOMING')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'UPCOMING'
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900/50 hover:bg-sky-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Next 7 Days ({upcoming})</span>
          </button>
        )}

        {activeFilter !== 'ALL' && (
          <button
            type="button"
            onClick={() => onFilterChange('ALL')}
            className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline px-1.5 cursor-pointer"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
};
