/* Hallmark · component: JobAlertModal · genre: modern-minimal · theme: navy-slate
 * states: default · hover · focus-visible · active · disabled · loading · error · success
 * contrast: pass (46–50)
 */
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
  AlertCircle,
  IndianRupee
} from 'lucide-react';
import { detectCurrentCity } from '../../../utils/geolocation';
import { toast } from 'sonner';

interface JobAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery?: string;
  currentCity?: string;
  currentTrade?: string;
  currentMinSalary?: number;
  onOpenManageAlerts?: () => void;
}

const TRADES = [
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

const SALARY_PRESETS = [
  { label: 'Any Salary', value: 0 },
  { label: '₹15,000+/mo', value: 15000 },
  { label: '₹25,000+/mo', value: 25000 },
  { label: '₹40,000+/mo', value: 40000 }
];

export const JobAlertModal: React.FC<JobAlertModalProps> = ({
  isOpen,
  onClose,
  currentQuery = '',
  currentCity = '',
  currentTrade = 'All',
  currentMinSalary,
  onOpenManageAlerts
}) => {
  const queryClient = useQueryClient();

  // Form State
  const [locationType, setLocationType] = useState<'all' | 'specific'>(
    currentCity ? 'specific' : 'all'
  );
  const [cityInput, setCityInput] = useState(currentCity || '');
  const [selectedTrade, setSelectedTrade] = useState(currentTrade || 'All');
  const [keywords, setKeywords] = useState(currentQuery || '');
  const [selectedMinSalary, setSelectedMinSalary] = useState<number>(currentMinSalary || 0);
  const [isLocating, setIsLocating] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setLocationType(currentCity ? 'specific' : 'all');
      setCityInput(currentCity || '');
      setSelectedTrade(currentTrade || 'All');
      setKeywords(currentQuery || '');
      setSelectedMinSalary(currentMinSalary || 0);
      setTestNotice(null);
    }
  }, [isOpen, currentCity, currentTrade, currentQuery, currentMinSalary]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Query existing active alerts for current candidate
  const { data: userAlerts = [] } = useQuery<SearchAlert[]>({
    queryKey: ['searchAlerts', 'JOB_ALERT'],
    queryFn: () => searchAlertService.getMyAlerts('JOB_ALERT'),
    enabled: isOpen
  });

  // Check if an alert matching current configuration already exists
  const matchingAlert = userAlerts.find((alert) => {
    if (!alert.is_active) return false;
    const alertCity = alert.city?.trim().toLowerCase() || null;
    const targetCity = locationType === 'specific' ? cityInput.trim().toLowerCase() || null : null;
    const alertCategory = (alert.category && alert.category !== 'All') ? alert.category.trim().toLowerCase() : null;
    const targetCategory = (selectedTrade && selectedTrade !== 'All') ? selectedTrade.trim().toLowerCase() : null;
    return alertCity === targetCity && alertCategory === targetCategory;
  }) || userAlerts[0];

  // Save / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Prompt native push notification permission if available
      if (fcmService.isPushSupported() && Notification.permission !== 'granted') {
        await fcmService.requestPushPermissionAndRegister().catch(() => {});
      }

      const effectiveCity = locationType === 'specific' ? cityInput.trim() || undefined : undefined;
      const effectiveCategory = (selectedTrade && selectedTrade !== 'All') ? selectedTrade : undefined;
      const effectiveQuery = keywords.trim() || undefined;
      const effectiveMinSalary = selectedMinSalary > 0 ? selectedMinSalary : undefined;

      // Auto title
      const parts: string[] = [];
      if (effectiveQuery) parts.push(`"${effectiveQuery}"`);
      if (effectiveCategory) parts.push(effectiveCategory);
      if (effectiveCity) parts.push(`in ${effectiveCity}`);
      if (effectiveMinSalary) parts.push(`(₹${effectiveMinSalary.toLocaleString('en-IN')}+)`);
      const title = parts.length > 0 ? parts.join(' ') : 'All New Jobs';

      return searchAlertService.createAlert({
        alertType: 'JOB_ALERT',
        title,
        query: effectiveQuery,
        city: effectiveCity,
        category: effectiveCategory,
        minSalary: effectiveMinSalary,
        frequency: 'INSTANT'
      });
    },
    onSuccess: (savedAlert) => {
      toast.success("Job alert configured successfully!", {
        description: `You will be notified instantly when new jobs matching "${savedAlert.title || 'your criteria'}" are posted.`
      });
      queryClient.invalidateQueries({ queryKey: ['searchAlerts'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error("Failed to save job alert", {
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
      toast.success("Job alert removed.");
      queryClient.invalidateQueries({ queryKey: ['searchAlerts'] });
    }
  });

  // Test Job Match Simulation Mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      return searchAlertService.testJobMatch(matchingAlert?.id);
    },
    onSuccess: (data: any) => {
      setTestNotice(`Diagnostic match sent! Job opening "${data.mockJob?.title || 'Verified Job'}" (${data.mockJob?.company || 'Verified Employer'}) was dispatched to your notifications.`);
      toast.success("Test Job Notification Sent!", {
        description: "Check your notification bell 🔔 or push notification to confirm."
      });
      // Invalidate query to pull the real server-persisted notification with real UUID
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (err: any) => {
      toast.error("Test notification failed", {
        description: err.message || "Could not simulate job notification."
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

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-hidden select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-[#0f2f63] text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
              <Bell className="w-5 h-5 text-[#5790e6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Job Opportunity Radar
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                Alert Me on New Jobs
              </h2>
              <p className="text-xs text-white/75 leading-relaxed mt-0.5">
                Get notified instantly when verified employers post high-paying jobs matching your trade and criteria.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer shrink-0 active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Single Scrollable Region */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1 min-h-0 text-slate-800 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
          
          {/* Active Alert Banner if Already Saved */}
          {matchingAlert && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3 text-emerald-800 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </span>
                <div className="min-w-0">
                  <span className="font-bold block text-emerald-950">Active Job Alert Configured</span>
                  <span className="text-[11px] text-emerald-700 truncate block">
                    {matchingAlert.title || 'All New Jobs'} • {matchingAlert.match_count || 0} match(es) so far
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(matchingAlert.id)}
                disabled={deleteMutation.isPending}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                title="Remove this alert"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Alert"}
              </button>
            </div>
          )}

          {/* Location Scope: Nationwide vs Specific City */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>Location Scope</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Option A: Nationwide / All Locations */}
              <button
                type="button"
                onClick={() => setLocationType('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  locationType === 'all'
                    ? 'border-[#0f2f63] bg-blue-50/50 shadow-2xs ring-1 ring-[#0f2f63]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-8 h-8 rounded-xl bg-[#0f2f63]/10 text-[#0f2f63] flex items-center justify-center">
                    <Globe2 className="w-4 h-4" />
                  </span>
                  {locationType === 'all' && (
                    <span className="text-xs text-[#0f2f63] font-bold">✓</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">All Locations</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Alert me for jobs across India (remote, relocation or nationwide openings).
                  </p>
                </div>
              </button>

              {/* Option B: Specific City */}
              <button
                type="button"
                onClick={() => setLocationType('specific')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  locationType === 'specific'
                    ? 'border-[#0f2f63] bg-blue-50/50 shadow-2xs ring-1 ring-[#0f2f63]'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-8 h-8 rounded-xl bg-[#2563c9]/10 text-[#2563c9] flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </span>
                  {locationType === 'specific' && (
                    <span className="text-xs text-[#0f2f63] font-bold">✓</span>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Specific City / Area</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                    Limit alerts strictly to job vacancies in or around your preferred city.
                  </p>
                </div>
              </button>

            </div>

            {/* If Specific City selected, show City input with auto-detect */}
            {locationType === 'specific' && (
              <div className="pt-2 animate-in fade-in duration-150">
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="e.g. Chennai, Bengaluru, Mumbai, Hyderabad..."
                    className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isLocating}
                    className="absolute right-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <LocateFixed className={`w-3 h-3 text-[#2563c9] ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detecting...' : 'Detect'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Specialist Trade & Industry */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>Target Trade & Industry</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TRADES.map((trade) => {
                const isSelected = selectedTrade === trade;
                return (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => setSelectedTrade(trade)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#0f2f63] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {trade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role / Skill Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>Role / Skill Keywords <span className="font-normal text-slate-400 lowercase">(optional)</span></span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. Electrician, Wireman, HVAC, Forklift, Security"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Minimum Expected Salary */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>Minimum Monthly Salary Expectation</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SALARY_PRESETS.map((preset) => {
                const isSelected = selectedMinSalary === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedMinSalary(preset.value)}
                    className={`py-2 px-2.5 rounded-xl border text-center text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0f2f63] bg-blue-50/70 text-[#0f2f63] shadow-2xs ring-1 ring-[#0f2f63]'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency & Channels Info */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Instant Job Matching & Verified Employers</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              When an employer posts a job matching your filters, TrustHyre will dispatch an instant notification to your app bell 🔔 and mobile device.
            </p>
          </div>

          {/* Diagnostic Simulation Tool */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700 block">
                  Verify Alert & Notification Delivery
                </span>
                <span className="text-[10px] text-slate-500">
                  Send a simulated matching job dispatch to your bell badge and push notification.
                </span>
              </div>
              <button
                type="button"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0f2f63] border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-[#2563c9]" />
                )}
                <span>Test Alert</span>
              </button>
            </div>

            {testNotice && (
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>{testNotice}</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenManageAlerts) onOpenManageAlerts();
            }}
            className="text-xs font-bold text-[#0f2f63] hover:underline cursor-pointer"
          >
            Manage all alerts ({userAlerts.length})
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#0f2f63] hover:bg-[#0c244d] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Alert...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>{matchingAlert ? 'Update Alert' : 'Save Job Alert'}</span>
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
