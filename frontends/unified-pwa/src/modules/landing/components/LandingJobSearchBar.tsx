import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  LocateFixed, 
  Loader2, 
  ArrowRight
} from 'lucide-react';
import { detectCurrentCity } from '../../../utils/geolocation';
import { useTranslation } from '../../../providers/TranslationContext';

interface LandingJobSearchBarProps {
  onSearchSubmit?: (params: { query: string; city: string; experience: string; trade: string }) => void;
}

const TOP_BLUE_COLLAR_TRADES = [
  { id: 'all', label: 'All Trades' },
  { id: 'electrician', label: 'Electrician' },
  { id: 'cook', label: 'Cook / Chef' },
  { id: 'driver', label: 'Delivery / Driver' },
  { id: 'warehouse', label: 'Warehouse & Logistics' },
  { id: 'plumber', label: 'Plumber' },
  { id: 'security', label: 'Security Guard' },
  { id: 'carpenter', label: 'Carpenter & Mason' },
];

const EXPERIENCE_LEVELS = [
  { value: 'all', label: 'Any Experience' },
  { value: 'fresher', label: 'Fresher (0-1 Yr)' },
  { value: '1to3', label: '1 - 3 Years' },
  { value: '3to5', label: '3 - 5 Years' },
  { value: 'above5', label: '5+ Years' },
];

const POPULAR_CITIES = [
  'Chennai',
  'Bengaluru',
  'Coimbatore',
  'Hyderabad',
  'Mumbai',
  'Delhi NCR',
  'Pune'
];

export const LandingJobSearchBar: React.FC<LandingJobSearchBarProps> = ({ onSearchSubmit }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState('all');
  const [selectedTrade, setSelectedTrade] = useState('all');
  const [isLocating, setIsLocating] = useState(false);
  const [citySuggestionsVisible, setCitySuggestionsVisible] = useState(false);

  // Auto-detect location
  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const detected = await detectCurrentCity();
      if (detected?.city) {
        setCity(detected.city);
      }
    } catch {
      // Fallback
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCitySuggestionsVisible(false);
    
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city.trim()) params.set('city', city.trim());
    if (experience !== 'all') params.set('exp', experience);
    if (selectedTrade !== 'all') {
      const tradeObj = TOP_BLUE_COLLAR_TRADES.find(t => t.id === selectedTrade);
      if (tradeObj) params.set('trade', tradeObj.label);
    }

    if (onSearchSubmit) {
      onSearchSubmit({
        query: query.trim(),
        city: city.trim(),
        experience,
        trade: selectedTrade
      });
    }

    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="relative z-30 w-full max-w-4xl transition-all duration-300">
      
      {/* 1. Main Search Container Card */}
      <form 
        onSubmit={handleSearch}
        className="relative z-30 bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-full p-2 sm:p-2 border border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-1 text-[#0a0a0a]"
      >
        
        {/* Segment A: Job Title / Keyword Input */}
        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-1.5 sm:py-1 border-b sm:border-b-0 sm:border-r border-slate-200/80">
          <Search className="w-4 h-4 text-[#0f2f63] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by trade, skill or job title...", "Search by trade, skill or job title...")}
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="Job Search Keyword"
          />
        </div>

        {/* Segment B: Experience Dropdown */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 sm:py-1 border-b sm:border-b-0 sm:border-r border-slate-200/80 min-w-[140px] shrink-0">
          <Briefcase className="w-4 h-4 text-[#0f2f63] shrink-0" />
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3"
            aria-label="Experience Level"
          >
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl.value} value={lvl.value} className="text-slate-900 bg-white">
                {lvl.label}
              </option>
            ))}
          </select>
        </div>

        {/* Segment C: Location / City with Geolocation */}
        <div className="relative flex-1 flex items-center gap-2 px-3.5 py-1.5 sm:py-1">
          <MapPin className="w-4 h-4 text-[#0f2f63] shrink-0" />
          <input
            type="text"
            value={city}
            onFocus={() => setCitySuggestionsVisible(true)}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t("City / Worksite area...", "City / Worksite area...")}
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
            aria-label="City or Location"
          />

          {/* Quick GPS button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            title={t("Detect My Current City", "Detect My Current City")}
            className="p-1.5 rounded-full hover:bg-slate-100 text-[#0f2f63] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            aria-label="Detect Location"
          >
            {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Cities Popup with High Z-Index & Solid White Opaque Styling */}
          {citySuggestionsVisible && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setCitySuggestionsVisible(false)} 
              />
              <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 overflow-hidden font-['Onest',system-ui,sans-serif]">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                  Popular Hubs
                </div>
                {POPULAR_CITIES.map((popCity) => (
                  <button
                    key={popCity}
                    type="button"
                    onClick={() => {
                      setCity(popCity);
                      setCitySuggestionsVisible(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#0f2f63]/10 hover:text-[#0f2f63] transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span>{popCity}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Verified</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action Button: Search Jobs */}
        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl sm:rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <span>{t("Search Jobs", "Search Jobs")}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

      </form>

      {/* 2. Visual Trade Chips - Rendered under search bar with z-10 so dropdown appears entirely on top */}
      <div className="relative z-10 mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 whitespace-nowrap hidden sm:inline-flex items-center gap-1 mr-1">
          <span>Top Trades:</span>
        </span>
        {TOP_BLUE_COLLAR_TRADES.map((trade) => {
          const isSelected = selectedTrade === trade.id;
          return (
            <button
              key={trade.id}
              type="button"
              onClick={() => {
                setSelectedTrade(trade.id);
              }}
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-white text-[#0f2f63] shadow-xs scale-102 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/15 backdrop-blur-xs'
              }`}
            >
              <span>{trade.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
