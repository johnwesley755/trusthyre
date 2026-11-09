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

  hasFood?: boolean;
  onToggleFood?: (val: boolean) => void;

  hasAccommodation?: boolean;
  onToggleAccommodation?: (val: boolean) => void;

  immediateJoining?: boolean;
  onToggleImmediateJoining?: (val: boolean) => void;

  shiftType?: string;
  onSelectShiftType?: (shift: string) => void;

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
  hasFood = false,
  onToggleFood,
  hasAccommodation = false,
  onToggleAccommodation,
  immediateJoining = false,
  onToggleImmediateJoining,
  shiftType = 'ALL',
  onSelectShiftType,
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

      {/* 🌟 BLUE-COLLAR PERKS & SUBSISTENCE FILTERS (WorkIndia / Nithra Jobs) */}
      <div className="space-y-2 p-3 bg-amber-50/50 rounded-2xl border border-amber-200/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
          Worker Perks & Needs (சலுகைகள்)
        </span>
        <div className="space-y-1.5">
          {/* Free Food */}
          {onToggleFood && (
            <button
              type="button"
              onClick={() => onToggleFood(!hasFood)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                hasFood
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'bg-white hover:bg-amber-50/50 text-[#0a0a0a] border border-amber-200/60'
              }`}
            >
              <span>🍛 Free Food (உணவு உண்டு)</span>
              {hasFood && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          )}

          {/* Accommodation / Room */}
          {onToggleAccommodation && (
            <button
              type="button"
              onClick={() => onToggleAccommodation(!hasAccommodation)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                hasAccommodation
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-white hover:bg-indigo-50/50 text-[#0a0a0a] border border-indigo-200/60'
              }`}
            >
              <span>🏠 Room / Stay (தங்குமிடம்)</span>
              {hasAccommodation && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          )}

          {/* Immediate Joining */}
          {onToggleImmediateJoining && (
            <button
              type="button"
              onClick={() => onToggleImmediateJoining(!immediateJoining)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                immediateJoining
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'bg-white hover:bg-emerald-50/50 text-[#0a0a0a] border border-emerald-200/60'
              }`}
            >
              <span>⚡ Immediate Join (இன்றே சேரலாம்)</span>
              {immediateJoining && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          )}

          {/* Shift Timing */}
          {onSelectShiftType && (
            <div className="pt-1">
              <span className="text-[10px] text-slate-600 font-medium block mb-1">Shift Timing</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: 'All', value: 'ALL' },
                  { label: 'Day', value: 'DAY_SHIFT' },
                  { label: 'Night', value: 'NIGHT_SHIFT' }
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onSelectShiftType(s.value)}
                    className={`py-1 text-center rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      shiftType === s.value
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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

      {/* 2B. DYNAMIC TALUKS / SUB-AREAS SECTION (Shown only when city has mapped taluks) */}
      {selectedLocation && dynamicTaluks.length > 0 && onSelectTaluk && (
        <div className="space-y-2 pt-4 border-t border-[#e6e8ec]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#0f2f63] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600" />
              <span>Taluks in {selectedLocation}</span>
            </span>
            {selectedTaluk && (
              <button
                onClick={() => onSelectTaluk('')}
                className="text-[10px] font-medium text-[#2563c9] hover:underline cursor-pointer"
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
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80'
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
                      ? 'bg-[#0f2f63] text-white shadow-xs'
                      : 'bg-white/80 hover:bg-white text-[#0a0a0a] border border-[#e6e8ec]/80 hover:border-[#0f2f63]/30'
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

      {/* 6. REAL-TIME WAGE BENCHMARK CALLOUT (Apna & Snagajob Viral Tool) */}
      <div className="pt-4 border-t border-[#e6e8ec]">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 leading-tight">
                Market Wage Calculator
              </h4>
              <p className="text-[10px] text-emerald-700">Check real take-home rates</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug">
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
