import React from 'react';
import { Search, Filter, ShieldCheck, X, RefreshCw } from 'lucide-react';

export interface TalentFilterState {
  searchQuery: string;
  city: string;
  minExp?: number;
  maxExp?: number;
  isVerifiedOnly: boolean;
  minScore: number;
}

interface TalentFiltersProps {
  filters: TalentFilterState;
  onChange: (updated: TalentFilterState) => void;
  onReset: () => void;
  totalResults: number;
  isLoading: boolean;
}

export const TalentFilters: React.FC<TalentFiltersProps> = ({
  filters,
  onChange,
  onReset,
  totalResults,
  isLoading
}) => {
  return (
    <div className="bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-4 space-y-4">
      {/* Search Input */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          Search Skills or Trade
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            placeholder="e.g. Wiring, MCB, Inverter..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Location / City Filter */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          City / Locality
        </label>
        <input
          type="text"
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          placeholder="e.g. Chennai, Tambaram..."
          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Experience Range */}
      <div>
        <label className="block text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
          Min Experience (Years)
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 1, 3, 5].map((exp) => (
            <button
              key={exp}
              type="button"
              onClick={() => onChange({ ...filters, minExp: exp === 0 ? undefined : exp })}
              className={`py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                (exp === 0 && !filters.minExp) || filters.minExp === exp
                  ? 'bg-[#0f2f63] text-white border-[#0f2f63] shadow-2xs'
                  : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
              }`}
            >
              {exp === 0 ? 'Any' : `${exp}+ yrs`}
            </button>
          ))}
        </div>
      </div>

      {/* Min Match Score Threshold */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
            Min Match Score
          </label>
          <span className="text-xs font-bold text-blue-600 dark:text-[#38BDF8]">
            {filters.minScore > 0 ? `${filters.minScore}%+` : 'All matches'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 70, 85].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => onChange({ ...filters, minScore: score })}
              className={`py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                filters.minScore === score
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] border-blue-200 dark:border-blue-800 font-bold'
                  : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-neutral-800'
              }`}
            >
              {score === 0 ? 'All' : score === 70 ? '70%+ Strong' : '85%+ Top'}
            </button>
          ))}
        </div>
      </div>

      {/* Verified KYC Only Toggle */}
      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
        <label className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
              Verified Identity Only
            </span>
          </div>
          <input
            type="checkbox"
            checked={filters.isVerifiedOnly}
            onChange={(e) => onChange({ ...filters, isVerifiedOnly: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
          />
        </label>
      </div>

      {/* Filter Stats & Reset Action */}
      <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
          {isLoading ? 'Searching...' : `${totalResults} candidates`}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
