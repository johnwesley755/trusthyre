import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchAlertService, type SearchAlert } from '../../../services/searchAlert.service';
import { fcmService } from '../../../services/fcm.service';
import { 
  X, 
  Bell, 
  MapPin, 
  Globe2, 
  Briefcase, 
  Sparkles, 
  Check, 
  Loader2, 
  Send, 
  ShieldCheck,
  LocateFixed,
  AlertCircle
} from 'lucide-react';
import { detectCurrentCity } from '../../../utils/geolocation';
import { toast } from 'sonner';

interface TalentAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery?: string;
  currentCity?: string;
  currentTrade?: string;
  currentExperience?: string;
  onOpenManageAlerts?: () => void;
}

const JOB_CATEGORIES = [
  "All",
  "Construction",
  "Facility Management",
  "Logistics",
  "Manufacturing",
  "Security",
  "Hospitality",
  "Retail",
  "Agriculture"
];

export const TalentAlertModal: React.FC<TalentAlertModalProps> = ({
  isOpen,
  onClose,
  currentQuery = '',
  currentCity = '',
  currentTrade = 'All',
  currentExperience = 'all',
  onOpenManageAlerts
}) => {
  const queryClient = useQueryClient();

  const [locationType, setLocationType] = useState<'all' | 'specific'>(currentCity ? 'specific' : 'all');
  const [cityInput, setCityInput] = useState(currentCity);
  const [category, setCategory] = useState(currentTrade);
  const [keywords, setKeywords] = useState(currentQuery);
  const [frequency, setFrequency] = useState<'INSTANT' | 'DAILY'>('INSTANT');
  const [isLocating, setIsLocating] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Sync state if props change when opened
  useEffect(() => {
    if (isOpen) {
      setLocationType(currentCity ? 'specific' : 'all');
      setCityInput(currentCity);
      setCategory(currentTrade || 'All');
      setKeywords(currentQuery || '');
      setTestNotice(null);
    }
  }, [isOpen, currentCity, currentTrade, currentQuery]);

  // Query existing active talent alerts for the user
  const { data: userAlerts = [] } = useQuery<SearchAlert[]>({
    queryKey: ['searchAlerts', 'CANDIDATE_ALERT'],
    queryFn: () => searchAlertService.getMyAlerts('CANDIDATE_ALERT'),
    enabled: isOpen
  });

  // Check if an alert matching the current configuration is already active
  const effectiveCity = locationType === 'specific' ? cityInput.trim() : '';
  const matchingAlert = userAlerts.find(a => {
    const alertCity = (a.city || '').trim().toLowerCase();
    const targetCity = effectiveCity.toLowerCase();
    const alertCat = (a.category || 'All').trim().toLowerCase();
    const targetCat = (category || 'All').trim().toLowerCase();
    const alertQuery = (a.query || '').trim().toLowerCase();
    const targetQuery = (keywords || '').trim().toLowerCase();

    return a.is_active && alertCity === targetCity && alertCat === targetCat && alertQuery === targetQuery;
  });

  // Save/Create Alert Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Prompt push permission if supported and not yet granted
      if (fcmService.isPushSupported() && Notification.permission !== 'granted') {
        await fcmService.requestPushPermissionAndRegister().catch(() => {});
      }

      return searchAlertService.createAlert({
        alertType: 'CANDIDATE_ALERT',
        city: locationType === 'specific' && cityInput.trim() ? cityInput.trim() : undefined,
        category: category !== 'All' ? category : undefined,
        query: keywords.trim() || undefined,
        experience: currentExperience !== 'all' ? currentExperience : undefined,
        frequency
      });
    },
    onSuccess: () => {
      toast.success("Talent Alert Saved!", {
        description: locationType === 'all' 
          ? "You will receive instant alerts for verified specialists across India." 
          : `You will be alerted when matching talent in ${cityInput.trim()} becomes available.`
      });
      queryClient.invalidateQueries({ queryKey: ['searchAlerts'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error("Failed to save alert", {
        description: err.message || "An error occurred while saving your alert."
      });
    }
  });

  // Delete Alert Mutation
  const deleteMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return searchAlertService.deleteAlert(alertId);
    },
    onSuccess: () => {
      toast.success("Talent alert removed.");
      queryClient.invalidateQueries({ queryKey: ['searchAlerts'] });
    }
  });

  // Test Candidate Match Simulation Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      return searchAlertService.testCandidateMatch(matchingAlert?.id);
    },
    onSuccess: (data: any) => {
      setTestNotice(`Diagnostic match sent! Candidate "${data.mockCandidate?.name || 'Verified Specialist'}" was dispatched to your notifications.`);
      toast.success("Test Candidate Notification Sent!", {
        description: "Check your in-app notification bell 🔔 or push notification to confirm."
      });
      // Invalidate query to pull the real server-persisted notification with real UUID
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      toast.error("Test notification failed", {
        description: err.message || "Could not simulate candidate notification."
      });
    }
  });

  const handleDetectLocation = async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const loc = await detectCurrentCity();
      if (loc.city) {
        setCityInput(loc.city);
        setLocationType('specific');
      }
    } catch {
      toast.error("Could not automatically detect location. Please type your city.");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-hidden select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#1C1C21] rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-[#0f2f63] dark:bg-[#121215] text-white flex items-start justify-between gap-4 shrink-0 border-b border-transparent dark:border-zinc-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-zinc-800 border border-white/15 dark:border-zinc-700 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Bell className="w-5 h-5 text-[#5790e6] dark:text-[#38BDF8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 dark:text-emerald-400">
                  Resdex Talent Radar
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                Alert Me on New Talent
              </h2>
              <p className="text-xs text-white/75 dark:text-zinc-400 leading-relaxed mt-0.5">
                Get notified instantly when pre-evaluated, verified specialists matching your hiring criteria join TrustHyre.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 dark:bg-zinc-800 hover:bg-white/20 dark:hover:bg-zinc-700 text-white transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Single Scrollable Region */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1 min-h-0 text-slate-800 dark:text-zinc-100 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600">
          
          {/* Active Alert Banner if Already Saved */}
          {matchingAlert && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </span>
                <div className="min-w-0">
                  <span className="font-bold block text-emerald-950 dark:text-emerald-100">Active Talent Alert Configured</span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate block">
                    {matchingAlert.title || 'All New Candidates'} • {matchingAlert.match_count || 0} match(es) so far
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(matchingAlert.id)}
                disabled={deleteMutation.isPending}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-colors shrink-0 cursor-pointer"
                title="Remove this alert"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Alert"}
              </button>
            </div>
          )}

          {/* Location Scope: Nationwide vs Specific City */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
              <span>Location Scope</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Nationwide / All Workers */}
              <button
                type="button"
                onClick={() => setLocationType('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  locationType === 'all'
                    ? 'border-[#0f2f63] dark:border-[#0066FF] bg-blue-50/50 dark:bg-blue-950/30 shadow-xs ring-1 ring-[#0f2f63] dark:ring-[#0066FF]'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121215] hover:bg-slate-50/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${locationType === 'all' ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                  <Globe2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">All Locations</span>
                    {locationType === 'all' && <Check className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Alert me for specialists across India (remote, relocation or nationwide dispatch).
                  </p>
                </div>
              </button>

              {/* Option B: Specific Location */}
              <button
                type="button"
                onClick={() => setLocationType('specific')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  locationType === 'specific'
                    ? 'border-[#0f2f63] dark:border-[#0066FF] bg-blue-50/50 dark:bg-blue-950/30 shadow-xs ring-1 ring-[#0f2f63] dark:ring-[#0066FF]'
                    : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121215] hover:bg-slate-50/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className={`p-2 rounded-xl mt-0.5 ${locationType === 'specific' ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-zinc-100">Specific City / Area</span>
                    {locationType === 'specific' && <Check className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                    Limit alerts strictly to candidates in or around your preferred city.
                  </p>
                </div>
              </button>
            </div>

            {/* City Input & Detect Action (Shown when Specific Location is selected) */}
            {locationType === 'specific' && (
              <div className="pt-2 animate-in fade-in duration-200 space-y-1.5">
                <div className="relative">
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="Enter city (e.g. Chennai, Mumbai, Bangalore)"
                    className="w-full px-3.5 py-2.5 pr-28 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121215] text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-1 focus:ring-[#0f2f63] dark:focus:ring-[#0066FF]"
                  />
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-semibold text-[#0f2f63] dark:text-[#38BDF8] bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#0f2f63] dark:text-[#38BDF8]" />
                    ) : (
                      <LocateFixed className="w-3 h-3 text-[#0f2f63] dark:text-[#38BDF8]" />
                    )}
                    <span>Detect</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Trade / Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
              <span>Specialist Trade & Industry</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {JOB_CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white border-[#0f2f63] dark:border-[#0066FF] shadow-xs'
                        : 'bg-slate-50 dark:bg-[#121215] text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Role / Skills Keywords (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
              <span>Role / Skill Keywords <span className="text-slate-400 dark:text-zinc-500 font-normal lowercase">(optional)</span></span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. Electrician, Wireman, HVAC, Forklift"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-[#121215] text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-hidden focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-1 focus:ring-[#0f2f63] dark:focus:ring-[#0066FF]"
            />
          </div>

          {/* Delivery & Channel Indicator */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-[#38BDF8]" />
              <div>
                <span className="font-bold text-slate-900 dark:text-zinc-100 block">Instant In-App & Push Notifications</span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Delivered directly to your top bell icon & browser badge</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] text-[10px] font-bold">
              ⚡ Real-time
            </span>
          </div>

          {/* Diagnostic Test Match Action */}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-slate-500 dark:text-zinc-400 text-[11px]">
              Want to see how candidate alerts appear?
            </div>
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#0f2f63] dark:text-[#38BDF8] text-xs font-semibold transition-colors cursor-pointer"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f2f63] dark:text-[#38BDF8]" />
                  <span>Simulating Match...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                  <span>🧪 Test Alert Notification</span>
                </>
              )}
            </button>
          </div>

          {testNotice && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-[#38BDF8] shrink-0 mt-0.5" />
              <span>{testNotice}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#121215] border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          {onOpenManageAlerts ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenManageAlerts();
              }}
              className="text-xs font-semibold text-[#0f2f63] dark:text-[#38BDF8] hover:underline cursor-pointer"
            >
              Manage all alerts ({userAlerts.length})
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#0c244d] dark:hover:bg-[#0052cc] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Alert...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>{matchingAlert ? 'Update Alert' : 'Save Talent Alert'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
