import React, { useState, useEffect } from 'react';
import { MapPin, LocateFixed, Loader2, AlertCircle, X } from 'lucide-react';
import { detectCurrentCity } from '../../../utils/geolocation';
import { useUser } from '../../../providers/AuthContext';

interface JobSearchHeroProps {
  title?: string;
  subtitle?: string;
  initialQuery?: string;
  initialCity?: string;
  totalJobs?: number;
  selectedTrade?: string;
  onTradeSelect?: (trade: string) => void;
  onSearch: (query: string, city: string) => void;
  onLocateMe?: (detectedCity?: string) => void;
  isLocating?: boolean;
}

const FEATURED_TRADES = [
  "All",
  "Construction",
  "Facility Management",
  "Logistics",
  "Manufacturing",
  "Hospitality",
  "Security",
  "Retail",
  "Agriculture"
];

export const JobSearchHero: React.FC<JobSearchHeroProps> = ({
  title,
  subtitle,
  initialQuery = '',
  initialCity = '',
  totalJobs = 0,
  selectedTrade = 'All',
  onTradeSelect,
  onSearch,
  onLocateMe,
  isLocating = false,
}) => {
  const { user } = useUser();
  const displayName = user?.firstName || 'Candidate';
  const resolvedTitle = title || (user ? `Welcome back, ${displayName}` : "Verified Job Openings");
  const resolvedSubtitle = subtitle || (user 
    ? "Explore newly posted roles matching your verified trade skills with direct employer connection."
    : "Discover verified roles, verified workplace standards, and background-checked employers.");
  const [internalLocating, setInternalLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  const handleLocateClick = async () => {
    if (internalLocating || isLocating) return;
    setInternalLocating(true);
    setLocationNotice(null);
    try {
      const loc = await detectCurrentCity();
      if (loc.city) {
        onSearch(initialQuery, loc.city);
        if (onLocateMe) {
          onLocateMe(loc.city);
        }
      }
    } catch (err: any) {
      console.error('Location detection error:', err);
      setLocationNotice(err.message || 'Location unavailable. Enter city in the search bar above.');
    } finally {
      setInternalLocating(false);
    }
  };

  const handleClearCity = () => {
    onSearch(initialQuery, '');
  };

  const isDetecting = internalLocating || isLocating;

  return (
    <div className="bg-[#f4f4f4] rounded-[1.75rem] border border-[#e6e8ec] p-5 sm:p-6 mb-6 shadow-xs font-['Onest',system-ui,sans-serif] space-y-4">
      
      {/* Top Row: Section Title, Counter & Location Detector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
            <span className="text-[10px] font-medium uppercase text-[#0f2f63]">
              Verified Job Directory
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-medium uppercase leading-tight text-[#0a0a0a]">
            {resolvedTitle}
          </h1>
          
          <p className="text-xs text-[#717784] font-normal leading-relaxed max-w-xl">
            {resolvedSubtitle}
          </p>
        </div>

        {/* Right Badges: Live Count & Location Detector Chip */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          
          {/* Active Total Openings Badge */}
          {totalJobs > 0 && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#e6e8ec] text-xs font-medium text-[#0a0a0a] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span><strong className="font-semibold text-[#0a0a0a] tabular-nums">{totalJobs}</strong> Openings Available</span>
            </div>
          )}

          {/* Quick Location Chip / Detector */}
          {initialCity ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0f2f63] text-white text-xs font-medium shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-white" />
              <span>{initialCity}</span>
              <button
                type="button"
                onClick={handleClearCity}
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors cursor-pointer ml-1"
                title="Clear city filter"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLocateClick}
              disabled={isDetecting}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-white/80 border border-[#e6e8ec] text-xs font-medium text-[#0a0a0a] shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            >
              {isDetecting ? (
                <Loader2 className="w-3.5 h-3.5 text-[#0f2f63] animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5 text-[#2563c9]" />
              )}
              <span>{isDetecting ? 'Detecting City...' : 'Detect Near Me'}</span>
            </button>
          )}

        </div>

      </div>

      {/* Optional Inline Location Notice (No Alert Boxes) */}
      {locationNotice && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{locationNotice}</span>
          <button
            type="button"
            onClick={() => setLocationNotice(null)}
            className="ml-auto text-amber-600 hover:text-amber-800 text-xs font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Horizontal Trade Filter Pills */}
      {onTradeSelect && (
        <div className="pt-2 border-t border-[#e6e8ec]/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[10px] font-medium uppercase text-[#717784] shrink-0 mr-1 hidden sm:inline-block">
            Categories:
          </span>
          {FEATURED_TRADES.map((trade) => {
            const isSelected = selectedTrade === trade;
            return (
              <button
                key={trade}
                onClick={() => onTradeSelect(trade)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white border border-[#e6e8ec] text-[#0a0a0a] hover:border-[#0f2f63]/40'
                }`}
              >
                {trade}
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
};
