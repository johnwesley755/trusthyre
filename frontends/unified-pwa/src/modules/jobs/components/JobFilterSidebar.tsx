import React from 'react';
import { SlidersHorizontal, RotateCcw, Check } from 'lucide-react';

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
  counts,
  onClearAll,
  hasActiveFilters,
}) => {
  return (
    <aside className="w-full space-y-6 font-['Onest',system-ui,sans-serif]">
      
      {/* Filters Title Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e6e8ec]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#0f2f63]" />
          <h2 className="text-sm font-medium uppercase text-[#0a0a0a]">
            Job Filters
          </h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-xs font-medium text-[#2563c9] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 0. OPPORTUNITY SOURCE SECTION */}
      {onSelectSource && (
        <div className="space-y-2">
          <span className="text-[10px] font-medium uppercase text-[#717784]">
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
                      ? 'bg-[#0f2f63] text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
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
          <span className="text-[10px] font-medium uppercase text-[#717784]">
            Job Type
          </span>
          {selectedJobType !== 'All' && (
            <button
              onClick={() => onSelectJobType('All')}
              className="text-[10px] font-medium text-[#2563c9] hover:underline cursor-pointer"
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
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
                }`}
              >
                <span>{type}</span>
                <div className="flex items-center gap-1.5">
                  {count !== undefined && (
                    <span className={`text-[11px] tabular-nums ${isSelected ? 'text-white/80' : 'text-[#717784]'}`}>
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
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784]">
            Location
          </span>
          {selectedLocation && (
            <button
              onClick={() => onSelectLocation('')}
              className="text-[10px] font-medium text-[#2563c9] hover:underline cursor-pointer"
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
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
            }`}
          >
            <span>All Locations</span>
            <div className="flex items-center gap-1.5">
              {counts?.total !== undefined && (
                <span className={`text-[11px] tabular-nums ${!selectedLocation ? 'text-white/80' : 'text-[#717784]'}`}>
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
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
                }`}
              >
                <span>{city}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[11px] tabular-nums ${isSelected ? 'text-white/80' : 'text-[#717784]'}`}>
                    ({count})
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EXPERIENCE SECTION */}
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784]">
            Experience
          </span>
          {selectedExperience !== 'all' && (
            <button
              onClick={() => onSelectExperience('all')}
              className="text-[10px] font-medium text-[#2563c9] hover:underline cursor-pointer"
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
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
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
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784]">
            Salary / Pay
          </span>
          {selectedBudget !== 'all' && (
            <button
              onClick={() => onSelectBudget('all')}
              className="text-[10px] font-medium text-[#2563c9] hover:underline cursor-pointer"
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
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
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
      <div className="space-y-2 pt-4 border-t border-[#e6e8ec]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase text-[#717784]">
            Industry & Category
          </span>
          {selectedTrade !== 'All' && (
            <button
              onClick={() => onSelectTrade('All')}
              className="text-[10px] font-medium text-[#2563c9] hover:underline cursor-pointer"
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
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
                }`}
              >
                <span>{trade}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

    </aside>
  );
};
