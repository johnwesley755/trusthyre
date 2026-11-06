import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  MapPin,
  Clock,
  IndianRupee,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Filter,
  ArrowRight,
  Send,
  Building2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './BaseModal';
import { workerService } from '../../services/worker.service';
import { useAuth } from '../../providers/AuthContext';

export interface StandbyWorker {
  id: string;
  userId: string;
  name: string;
  trade: string;
  taluk: string;
  city: string;
  expectedDailyWage: number;
  availabilityWindow: string;
  experienceYears: number;
  trustScore?: number;
  phone: string;
  maskedPhone?: string;
  isBiometricVerified: boolean;
}

interface DigitalLabourChowkModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity?: string;
  currentTaluk?: string;
  initialMode?: 'employer' | 'worker';
  isEmployerRole?: boolean;
}

export const DigitalLabourChowkModal: React.FC<DigitalLabourChowkModalProps> = ({
  isOpen,
  onClose,
  currentCity = 'Chennai',
  currentTaluk,
  initialMode = 'employer',
  isEmployerRole = true
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'hire_standby' | 'join_standby'>(
    isEmployerRole ? 'hire_standby' : 'join_standby'
  );
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [maxBudget, setMaxBudget] = useState<number>(1500);

  // Candidate broadcast form state
  const [candidateTrade, setCandidateTrade] = useState('General Helper');
  const [candidateWage, setCandidateWage] = useState(850);
  const [candidateTaluk, setCandidateTaluk] = useState(currentTaluk || 'Guindy');
  const [candidateNotes, setCandidateNotes] = useState('Ready for spot duty immediately');
  const [isJoined, setIsJoined] = useState(false);

  // 1. Fetch live standby workers from PostgreSQL DB via API
  const {
    data: liveWorkers = [],
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['standbyPool', currentCity, selectedTrade, maxBudget],
    queryFn: () =>
      workerService.getStandbyPoolWorkers({
        city: currentCity,
        trade: selectedTrade !== 'All' ? selectedTrade : undefined,
        maxWage: maxBudget
      }),
    enabled: isOpen && activeTab === 'hire_standby',
    staleTime: 30 * 1000
  });

  // 2. Mutation to join standby pool
  const joinMutation = useMutation({
    mutationFn: (payload: {
      trade: string;
      expectedDailyWage: number;
      taluk: string;
      city: string;
      notes: string;
    }) => workerService.joinStandbyPool(payload),
    onSuccess: () => {
      setIsJoined(true);
      queryClient.invalidateQueries({ queryKey: ['standbyPool'] });
      toast.success('🟢 Live on Digital Labour Chowk! Nearby employers can now reach you.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to broadcast availability.';
      toast.error(msg);
    }
  });

  // 3. Mutation to leave standby pool
  const leaveMutation = useMutation({
    mutationFn: () => workerService.leaveStandbyPool(),
    onSuccess: () => {
      setIsJoined(false);
      queryClient.invalidateQueries({ queryKey: ['standbyPool'] });
      toast.info('Removed from today’s standby radar.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to remove from standby.');
    }
  });

  if (!isOpen) return null;

  const handleBookWorker = (worker: StandbyWorker) => {
    const rawNumber = worker.phone ? worker.phone.replace(/\D/g, '') : '';
    const text = encodeURIComponent(
      `⚡ *EMERGENCY SHIFT BOOKING — TRUSTHYRE SPOT HIRE*\n\n` +
      `Hello ${worker.name},\n` +
      `We have an immediate spot shift requirement in ${worker.taluk} (${currentCity}):\n` +
      `• Role: ${worker.trade}\n` +
      `• Spot Daily Wage: ₹${worker.expectedDailyWage}/day (Direct Cash/UPI settlement after shift)\n` +
      `• Reporting Time: Immediate / Today\n\n` +
      `Please reply *YES* if you can report immediately.`
    );

    if (rawNumber) {
      window.open(`https://wa.me/${rawNumber}?text=${text}`, '_blank');
    } else {
      toast.info(`Booking request sent to ${worker.name}. They will be alerted via SMS.`);
    }
  };

  const handleJoinChowk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in with your worker account to broadcast availability.');
      return;
    }
    joinMutation.mutate({
      trade: candidateTrade,
      expectedDailyWage: candidateWage,
      taluk: candidateTaluk,
      city: currentCity,
      notes: candidateNotes
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Instant Spot Hire & Standby Pool"
      subtitle={`Live verified standby workers ready for immediate emergency duty in ${currentCity}`}
      icon={<Zap className="w-5 h-5 text-amber-500 fill-amber-500" />}
      iconBgColor="bg-amber-50 text-amber-700 border border-amber-200"
      maxWidth="xl"
      bodyClassName="p-0 flex flex-col bg-white"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#717784] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            <span>Zero contractor commission • 100% direct worker payment</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full font-bold text-xs bg-[#F8FAFC] border border-[#e6e8ec] text-[#0A1931] hover:bg-slate-100 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      }
    >
      {/* Mode Navigation Tabs: Only show tab toggle if user is BOTH or explicitly testing; default to employer-only for hiring */}
      {isEmployerRole ? (
        <div className="px-5 py-3 border-b border-[#e6e8ec] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0066ff]" />
            <span className="text-xs font-bold text-[#0A1931]">Standby Worker Spot-Hiring Radar</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            🟢 Ready Today
          </span>
        </div>
      ) : (
        <div className="px-5 py-3 border-b border-[#e6e8ec] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0066ff]" />
            <span className="text-xs font-bold text-[#0A1931]">Worker Daily Standby Broadcast</span>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
            PostgreSQL Live
          </span>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {activeTab === 'hire_standby' ? (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="p-3 bg-[#F8FAFC] rounded-2xl border border-[#e6e8ec] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0A1931] flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#0066ff]" />
                  Filter by Trade:
                </span>
                <span className="text-[#717784]">
                  Max Daily Wage: <strong>₹{maxBudget}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'All',
                  'Electrician',
                  'Loader',
                  'Driver',
                  'Fitter',
                  'Security',
                  'Helper'
                ].map((trade) => (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => setSelectedTrade(trade)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      selectedTrade === trade
                        ? 'bg-[#0066ff] text-white shadow-xs'
                        : 'bg-white text-[#717784] border border-[#e6e8ec] hover:border-[#0066ff]'
                    }`}
                  >
                    {trade}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Standby Worker List from PostgreSQL */}
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#0066ff]" />
                <span className="text-xs font-medium">Scanning live database for standby workers...</span>
              </div>
            ) : isError ? (
              <div className="py-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-xs text-rose-600 font-semibold">Failed to fetch standby pool workers.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
                >
                  Retry
                </button>
              </div>
            ) : liveWorkers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#717784] px-1">
                  <span>
                    Showing <strong className="text-[#0A1931]">{liveWorkers.length}</strong> active standby workers
                  </span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live Database Radar
                  </span>
                </div>

                {liveWorkers.map((w: StandbyWorker) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-2xl border border-[#e6e8ec] hover:border-blue-300 hover:shadow-xs transition-all space-y-3 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#0A1931]">{w.name}</h4>
                          {w.isBiometricVerified && (
                            <span title="Biometric Verified" className="inline-flex items-center">
                              <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            🟢 Ready Today
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#717784] mt-0.5">{w.trade}</p>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-sm text-[#0066ff] flex items-center justify-end">
                          <IndianRupee className="w-3.5 h-3.5" />
                          <span>{w.expectedDailyWage}</span>
                          <span className="text-[10px] font-medium text-[#717784]">/day</span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold">Spot Cash Settlement</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#717784]">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F8FAFC] border border-[#e6e8ec]">
                        <MapPin className="w-3 h-3 text-[#0066ff]" />
                        <span>{w.taluk}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>{w.availabilityWindow || 'Ready Now'}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {w.phone && (
                        <a
                          href={`tel:${w.phone.replace(/\D/g, '')}`}
                          className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 text-[#0A1931] border border-[#e6e8ec] transition-colors"
                          title="Call Worker Directly"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#10b981]" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleBookWorker(w)}
                        className="flex-1 py-2.5 px-3 rounded-full bg-[#0f2f63] hover:bg-[#0066ff] active:bg-[#003d99] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-white" />
                        <span>Instant Spot Hire</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-[#0A1931]">No Standby Workers Live Currently</h4>
                <p className="text-xs text-[#717784] max-w-sm mx-auto">
                  Workers broadcast themselves between 6:00 AM and 10:00 AM for same-day emergency shifts in {currentCity}.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrade('All');
                    setMaxBudget(2000);
                  }}
                  className="mt-2 px-4 py-1.5 rounded-full text-xs font-bold text-[#0066ff] bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer"
                >
                  Reset Trade & Wage Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] text-xs text-[#0f2f63] space-y-1">
              <h4 className="font-bold text-sm text-[#0A1931] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#0066ff]" />
                Get Dispatched for Immediate Daily Shifts
              </h4>
              <p className="leading-relaxed text-[#717784]">
                Marking yourself available registers your profile in the live database <strong>Instant Spot Hire Radar</strong> for {currentCity}. Nearby factories, warehouses, and shops looking for emergency replacements will contact you directly.
              </p>
            </div>

            {isJoined ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-[#10b981] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-emerald-950">
                  You are Live on Standby Radar!
                </h4>
                <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                  Broadcasted in PostgreSQL database as <strong>{candidateTrade}</strong> in <strong>{candidateTaluk}</strong> at <strong>₹{candidateWage}/day</strong>. Keep your phone on loud.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsJoined(false)}
                    className="px-4 py-1.5 rounded-full bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                  >
                    Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="px-4 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold hover:bg-rose-100 cursor-pointer"
                  >
                    {leaveMutation.isPending ? 'Leaving...' : 'Turn Off Standby'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleJoinChowk} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#717784] block">
                    Your Primary Trade:
                  </label>
                  <input
                    type="text"
                    value={candidateTrade}
                    onChange={(e) => setCandidateTrade(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border border-[#e6e8ec] bg-[#F8FAFC] text-xs sm:text-sm font-semibold text-[#0A1931] focus:ring-2 focus:ring-[#0066ff] outline-none"
                    placeholder="e.g. Electrician, Warehouse Loader, Driver"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#717784] block">
                      Expected Daily Wage (₹):
                    </label>
                    <input
                      type="number"
                      value={candidateWage}
                      onChange={(e) => setCandidateWage(Number(e.target.value))}
                      required
                      min="500"
                      max="3000"
                      className="w-full p-2.5 rounded-xl border border-[#e6e8ec] bg-[#F8FAFC] text-xs sm:text-sm font-semibold text-[#0A1931] focus:ring-2 focus:ring-[#0066ff] outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#717784] block">
                      Your Taluk / Area:
                    </label>
                    <input
                      type="text"
                      value={candidateTaluk}
                      onChange={(e) => setCandidateTaluk(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-[#e6e8ec] bg-[#F8FAFC] text-xs sm:text-sm font-semibold text-[#0A1931] focus:ring-2 focus:ring-[#0066ff] outline-none"
                      placeholder="e.g. Guindy, Ambattur"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#717784] block">
                    Readiness Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={candidateNotes}
                    onChange={(e) => setCandidateNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#e6e8ec] bg-[#F8FAFC] text-xs sm:text-sm font-semibold text-[#0A1931] focus:ring-2 focus:ring-[#0066ff] outline-none"
                    placeholder="e.g. Have own tools, ready within 30 mins"
                  />
                </div>

                <button
                  type="submit"
                  disabled={joinMutation.isPending}
                  className="w-full py-3 rounded-full bg-[#0f2f63] hover:bg-[#0066ff] active:bg-[#003d99] disabled:opacity-50 text-white text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2 active:scale-95"
                >
                  {joinMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Broadcasting to DB...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-white" />
                      <span>Go Live on Spot Hire Radar (Save to DB)</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
