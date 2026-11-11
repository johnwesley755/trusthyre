import React, { useState } from 'react';
import { SlidersHorizontal, RotateCcw, Check, MapPin, IndianRupee, TrendingUp } from 'lucide-react';
import { getTaluksForCity } from '../../../constants/regionalTaluks';
import { WageBenchmarkModal } from '../../../components/common/WageBenchmarkModal';

export interface FilterCounts {
  jobTypes: Record<string, number>;
  locations: Record<string, number>;
  trades: Record<string, number>;
  total: number;
}

interface JobFilterSidebarProps {
  selectedJobType: string;
  onSelectJobType: (type: string) => void;
  
  selectedLocation: string;
  onSelectLocation: (loc: string) => void;
  
  selectedBudget: string;
  onSelectBudget: (budget: string) => void;

  selectedTrade: string;
  onSelectTrade: (trade: string) => void;

  selectedExperience: string;
  onSelectExperience: (exp: string) => void;

  selectedSource?: string;
  onSelectSource?: (source: string) => void;

  selectedTaluk?: string;
  onSelectTaluk?: (taluk: string) => void;

  onSelectBenchmarkFilter?: (trade: string, minBudget?: number) => void;

  counts?: FilterCounts;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export const JOB_SOURCE_OPTIONS = [
  { label: 'All Opportunities', value: 'all' },
  { label: 'TrustHyre Direct', value: 'internal' },
  { label: 'Verified Partners', value: 'external' }
];

export const JOB_TYPE_OPTIONS = [
  'All',
  'Full Time',
  'Part Time',
  'Contract',
  'Internship',
  'Freelance',
  'Daily Gig'
];

export const BUDGET_RANGE_OPTIONS = [
  { label: 'All Pay Ranges', value: 'all' },
  { label: 'Under ₹1,000 / day', value: 'under1000' },
  { label: '₹1,000 - ₹2,500 / day', value: '1000to2500' },
  { label: '₹2,500 - ₹5,000 / day', value: '2500to5000' },
  { label: '₹5,000+ / day', value: 'above5000' }
];

export const EXPERIENCE_OPTIONS = [
  { label: 'All Experience', value: 'all' },
  { label: '0 to 1 Year (Entry)', value: '0-1' },
  { label: '1 to 3 Years (Junior)', value: '1-3' },
  { label: '3 to 5 Years (Mid)', value: '3-5' },
  { label: '5+ Years (Senior)', value: '5+' }
];

export const TRADE_CATEGORIES = [
  'All',
  'Construction',
  'Facility Management',
  'Logistics',
  'Manufacturing',
  'Security',
  'Hospitality',
  'Retail',
  'Agriculture'
];

export const JobFilterSidebar: React.FC<JobFilterSidebarProps> = ({
  selectedJobType,
  onSelectJobType,
  selectedLocation,
  onSelectLocation,
  selectedBudget,
  onSelectBudget,
  selectedTrade,
  onSelectTrade,
  selectedExperience,
  onSelectExperience,
  selectedSource = 'all',
  onSelectSource,
  selectedTaluk = '',
  onSelectTaluk,
  onSelectBenchmarkFilter,
  counts,
  onClearAll,
  hasActiveFilters,
}) => {
  const [isWageModalOpen, setIsWageModalOpen] = useState(false);
  const dynamicTaluks = getTaluksForCity(selectedLocation);
  return (
    <aside className="w-full space-y-6 font-['Onest',system-ui,sans-serif]">
      
      {/* Filters Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec] dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
          <h2 className="text-sm font-medium uppercase text-[#0a0a0a] dark:text-zinc-100">
            Job Filters
          </h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-xs font-medium text-[#2563c9] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 0. OPPORTUNITY SOURCE SECTION */}
      {onSelectSource && (
        <div className="space-y-2">
          <span className="text-[10px] font-medium uppercase text-[#717784] dark:text-zinc-400">
            Hiring Channel
          </span>
          <div className="grid grid-cols-1 gap-1">
            {JOB_SOURCE_OPTIONS.map((opt) => {
              const isSelected = selectedSource === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onSelectSource(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. JOB TYPE SECTION */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784] dark:text-zinc-400">
            Job Type
          </span>
          {selectedJobType !== 'All' && (
            <button
              onClick={() => onSelectJobType('All')}
              className="text-[10px] font-medium text-[#2563c9] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-1">
          {JOB_TYPE_OPTIONS.map((type) => {
            const isSelected = selectedJobType === type;
            const count = counts?.jobTypes?.[type] ?? (type === 'All' ? counts?.total : undefined);

            return (
              <button
                key={type}
                onClick={() => onSelectJobType(type)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                }`}
              >
                <span>{type}</span>
                <div className="flex items-center gap-1.5">
                  {count !== undefined && (
                    <span className={`text-[11px] tabular-nums ${isSelected ? 'text-white/80' : 'text-[#717784] dark:text-zinc-400'}`}>
                      ({count})
                    </span>
                  )}
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. LOCATION SECTION */}
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784] dark:text-zinc-400">
            Location
          </span>
          {selectedLocation && (
            <button
              onClick={() => onSelectLocation('')}
              className="text-[10px] font-medium text-[#2563c9] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onSelectLocation('')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
              !selectedLocation
                ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
            }`}
          >
            <span>All Locations</span>
            <div className="flex items-center gap-1.5">
              {counts?.total !== undefined && (
                <span className={`text-[11px] tabular-nums ${!selectedLocation ? 'text-white/80' : 'text-[#717784] dark:text-zinc-400'}`}>
                  ({counts.total})
                </span>
              )}
              {!selectedLocation && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
          </button>
          {counts?.locations && Object.entries(counts.locations).slice(0, 5).map(([city, count]) => {
            const isSelected = selectedLocation.toLowerCase() === city.toLowerCase();
            return (
              <button
                key={city}
                onClick={() => onSelectLocation(city)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                }`}
              >
                <span>{city}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] tabular-nums ${isSelected ? 'text-white/80' : 'text-[#717784] dark:text-zinc-400'}`}>
                    ({count})
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2B. DYNAMIC TALUKS / SUB-AREAS SECTION (Shown only when city has mapped taluks) */}
      {selectedLocation && dynamicTaluks.length > 0 && onSelectTaluk && (
        <div className="space-y-2 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#0f2f63] dark:text-sky-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600 dark:text-sky-400" />
              <span>Taluks in {selectedLocation}</span>
            </span>
            {selectedTaluk && (
              <button
                onClick={() => onSelectTaluk('')}
                className="text-[10px] font-medium text-[#2563c9] dark:text-sky-400 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <button
              onClick={() => onSelectTaluk('')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                !selectedTaluk
                  ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800'
              }`}
            >
              <span>All {selectedLocation} Areas</span>
              {!selectedTaluk && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
            {dynamicTaluks.map((tName) => {
              const isSelected = selectedTaluk.toLowerCase() === tName.toLowerCase();
              return (
                <button
                  key={tName}
                  onClick={() => onSelectTaluk(tName)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                  }`}
                >
                  <span>{tName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. EXPERIENCE SECTION */}
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784] dark:text-zinc-400">
            Experience
          </span>
          {selectedExperience !== 'all' && (
            <button
              onClick={() => onSelectExperience('all')}
              className="text-[10px] font-medium text-[#2563c9] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-1">
          {EXPERIENCE_OPTIONS.map((opt) => {
            const isSelected = selectedExperience === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onSelectExperience(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. PAY / SALARY SECTION */}
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784] dark:text-zinc-400">
            Salary / Pay
          </span>
          {selectedBudget !== 'all' && (
            <button
              onClick={() => onSelectBudget('all')}
              className="text-[10px] font-medium text-[#2563c9] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-1">
          {BUDGET_RANGE_OPTIONS.map((opt) => {
            const isSelected = selectedBudget === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onSelectBudget(opt.value)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. INDUSTRY & CATEGORY SECTION */}
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784] dark:text-zinc-400">
            Industry & Category
          </span>
          {selectedTrade !== 'All' && (
            <button
              onClick={() => onSelectTrade('All')}
              className="text-[10px] font-medium text-[#2563c9] dark:text-sky-400 hover:underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="space-y-1">
          {TRADE_CATEGORIES.map((trade) => {
            const isSelected = selectedTrade === trade;
            return (
              <button
                key={trade}
                onClick={() => onSelectTrade(trade)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] dark:bg-sky-600 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-[#121215] hover:bg-white dark:hover:bg-[#1C1C21] text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec]/80 dark:border-zinc-800 hover:border-[#0f2f63]/30 dark:hover:border-zinc-700'
                }`}
              >
                <span>{trade}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. REAL-TIME WAGE BENCHMARK CALLOUT (Apna & Snagajob Viral Tool) */}
      <div className="pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 leading-tight">
                Market Wage Calculator
              </h4>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Check real take-home rates</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-snug">
            Compare base salaries, overtime rates, and food allowances for your trade in {selectedLocation || 'your area'}.
          </p>
          <button
            type="button"
            onClick={() => setIsWageModalOpen(true)}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Check Market Wages</span>
          </button>
        </div>
      </div>

      {/* Wage Benchmark Explorer Modal */}
      {isWageModalOpen && (
        <WageBenchmarkModal
          isOpen={isWageModalOpen}
          onClose={() => setIsWageModalOpen(false)}
          defaultTrade={selectedTrade !== 'All' ? selectedTrade : 'Electrician'}
          currentCity={selectedLocation || 'Chennai'}
          onSelectBenchmarkFilter={(trade, minBudget) => {
            if (onSelectBenchmarkFilter) {
              onSelectBenchmarkFilter(trade, minBudget);
            } else {
              onSelectTrade(trade);
            }
          }}
        />
      )}

    </aside>
  );
};
