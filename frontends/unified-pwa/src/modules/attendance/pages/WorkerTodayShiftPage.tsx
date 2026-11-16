import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  MapPin, 
  KeyRound, 
  Coffee, 
  CheckCircle2, 
  Calendar,
  AlertCircle,
  CalendarClock,
  ArrowRight,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { shiftAttendanceService, type Shift } from '../../../services/shiftAttendance.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { useUser } from '../../../providers/AuthContext';
import { toast } from 'sonner';

// Deterministic Asia/Kolkata date helper (YYYY-MM-DD)
function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getShiftDateString(shiftDate: string): string {
  if (!shiftDate) return '';
  if (shiftDate.length === 10 && shiftDate.includes('-')) return shiftDate;
  const d = new Date(shiftDate);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getRelativeDateLabel(shiftDateStr: string, todayStr: string): string {
  if (shiftDateStr === todayStr) return 'Today';
  
  const [tY, tM, tD] = todayStr.split('-').map(Number);
  const [sY, sM, sD] = shiftDateStr.split('-').map(Number);
  
  const todayDate = new Date(Date.UTC(tY, tM - 1, tD));
  const targetDate = new Date(Date.UTC(sY, sM - 1, sD));
  
  const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  
  return targetDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function WorkerTodayShiftPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'MONTH' | 'HISTORY'>('UPCOMING');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [proposedCheckIn, setProposedCheckIn] = useState('');
  const [proposedCheckOut, setProposedCheckOut] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);

  const todayStr = getTodayIST();

  // Fetch shifts based on active view
  const { data: shifts = [], isLoading, refetch } = useQuery({
    queryKey: ['workerShifts', activeTab, activeTab === 'MONTH' ? selectedMonth : 'active'],
    queryFn: () => {
      if (activeTab === 'UPCOMING') {
        return shiftAttendanceService.getWorkerShifts({ upcoming: true });
      }
      if (activeTab === 'MONTH') {
        return shiftAttendanceService.getWorkerShifts({ month: selectedMonth });
      }
      // HISTORY: fetch all shifts
      return shiftAttendanceService.getWorkerShifts({});
    }
  });

  // Filter out cancelled shifts
  const activeShifts = useMemo(() => {
    return shifts.filter(s => s.status !== 'CANCELLED');
  }, [shifts]);

  // Separate Today's shifts vs Future/Upcoming shifts
  const { todayShifts, futureShifts } = useMemo(() => {
    const todayList: Shift[] = [];
    const futureList: Shift[] = [];

    for (const shift of activeShifts) {
      const shiftDateFormatted = getShiftDateString(shift.shift_date);
      if (shiftDateFormatted === todayStr) {
        todayList.push(shift);
      } else if (shiftDateFormatted > todayStr) {
        futureList.push(shift);
      }
    }

    return { todayShifts: todayList, futureShifts: futureList };
  }, [activeShifts, todayStr]);

  const handlePinChange = (shiftId: string, val: string) => {
    setPinInputs(prev => ({ ...prev, [shiftId]: val.replace(/\D/g, '') }));
  };

  // 1-Tap Check-In via PIN
  const handlePinCheckIn = async (shift: Shift) => {
    const pin = pinInputs[shift.id];
    if (!pin || pin.length !== 6) {
      toast.error('Please enter the 6-digit PIN provided by your supervisor.');
      return;
    }

    try {
      setIsSubmitting(true);
      await shiftAttendanceService.checkIn({
        shiftId: shift.id,
        method: 'ONE_TIME_PIN',
        otp: pin
      });
      toast.success('Check-in recorded! Shift active.');
      setPinInputs(prev => ({ ...prev, [shift.id]: '' }));
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Check-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Break
  const handleToggleBreak = async (shiftId: string, action: 'START' | 'END') => {
    try {
      setIsSubmitting(true);
      await shiftAttendanceService.recordBreak(shiftId, action);
      toast.success(action === 'START' ? 'Break started' : 'Break ended. Back on shift.');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update break');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check-Out
  const handleCheckOut = async (shift: Shift) => {
    const pin = pinInputs[shift.id];
    if (!pin || pin.length !== 6) {
      toast.error('Please enter supervisor 6-digit PIN to verify checkout.');
      return;
    }

    try {
      setIsSubmitting(true);
      await shiftAttendanceService.checkOut({
        shiftId: shift.id,
        method: 'ONE_TIME_PIN',
        otp: pin
      });
      toast.success('Checked out! Attendance submitted for supervisor approval.');
      setPinInputs(prev => ({ ...prev, [shift.id]: '' }));
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Check-out failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request Correction
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceId || !correctionReason) return;

    try {
      setIsSubmitting(true);
      await shiftAttendanceService.requestCorrection(selectedAttendanceId, {
        reason: correctionReason,
        proposedCheckIn: proposedCheckIn || undefined,
        proposedCheckOut: proposedCheckOut || undefined
      });
      toast.success('Correction request submitted to supervisor');
      setSelectedAttendanceId(null);
      setCorrectionReason('');
      setProposedCheckIn('');
      setProposedCheckOut('');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit correction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] dark:text-zinc-100">
              Shifts & Attendance
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-400 border border-blue-200 dark:border-sky-800">
              Worker Portal
            </span>
          </div>
          <p className="text-xs text-[#717784] dark:text-zinc-400 mt-0.5">
            View upcoming schedule and verify site attendance with supervisor PINs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'MONTH' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer"
            />
          )}

          <div className="flex items-center gap-1 bg-[#f4f4f4] dark:bg-[#121215] p-1 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('UPCOMING')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'UPCOMING'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-400 shadow-2xs'
                  : 'text-[#717784]'
              }`}
            >
              Upcoming & Today
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MONTH')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'MONTH'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-400 shadow-2xs'
                  : 'text-[#717784]'
              }`}
            >
              Monthly Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-400 shadow-2xs'
                  : 'text-[#717784]'
              }`}
            >
              All History
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <AppLoader variant="skeleton" message="Loading shift schedules..." />
      ) : activeTab === 'UPCOMING' ? (
        <div className="space-y-6">
          {/* Section 1: Today's Active Shifts */}
          {todayShifts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                  Today's Active Shift ({new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })})
                </h2>
              </div>

              {todayShifts.map((shift) => {
                const attendance = shift.attendances?.[0] || null;
                const status = attendance?.status || 'NOT_STARTED';
                const pinVal = pinInputs[shift.id] || '';

                return (
                  <div key={shift.id} className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-6 shadow-sm space-y-4">
                    {/* Shift Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e6e8ec] dark:border-zinc-800">
                      <div>
                        <span className="text-[10px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase tracking-wider block">
                          {shift.work_orders?.order_number}
                        </span>
                        <h2 className="text-lg font-extrabold text-[#0a0a0a] dark:text-zinc-100">
                          {shift.work_orders?.job_title}
                        </h2>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 block">
                          ₹{Number(shift.work_orders?.wage_amount).toLocaleString('en-IN')} / {shift.work_orders?.wage_frequency?.toLowerCase()}
                        </span>
                        <span className="text-[10px] text-[#717784]">Agreed Compensation</span>
                      </div>
                    </div>

                    {/* Worksite & Timing Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#717784] dark:text-zinc-400">
                      <div className="flex items-start gap-2 bg-[#f4f4f4] dark:bg-[#121215] p-3 rounded-2xl">
                        <Clock className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#0a0a0a] dark:text-zinc-200 block">
                            {shift.start_time} - {shift.end_time}
                          </span>
                          <span className="text-[10px]">Break Duration: {shift.break_duration_minutes} mins</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-[#f4f4f4] dark:bg-[#121215] p-3 rounded-2xl">
                        <MapPin className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[#0a0a0a] dark:text-zinc-200 block">
                            {shift.worksite_name}
                          </span>
                          <span className="text-[10px]">{shift.worksite_address}, {shift.city}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-semibold text-slate-500">Attendance Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800' :
                        status === 'ON_BREAK' ? 'bg-amber-100 text-amber-800' :
                        status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        status === 'PENDING_APPROVAL' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Shift Actions */}
                    {status === 'NOT_STARTED' && (
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                        <div className="p-3 bg-blue-50/70 dark:bg-sky-950/20 border border-blue-200/80 dark:border-sky-900/40 rounded-2xl flex items-start gap-2.5">
                          <KeyRound className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0 mt-0.5" />
                          <div className="text-xs space-y-0.5">
                            <span className="font-bold text-[#0f2f63] dark:text-sky-300 block">
                              How to get your 6-digit Check-In PIN:
                            </span>
                            <p className="text-slate-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                              When you arrive at the worksite, ask your site supervisor or employer for today's check-in PIN. The supervisor generates this 6-digit PIN in real-time from their <b>Shift Attendance Register</b> by tapping <b>"QR / PIN"</b> on this shift. PINs expire in 10 minutes.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                            Enter 6-Digit PIN from Supervisor
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="• • • • • •"
                              value={pinVal}
                              onChange={(e) => handlePinChange(shift.id, e.target.value)}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-center tracking-widest text-base font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
                            />
                            <button
                              type="button"
                              onClick={() => handlePinCheckIn(shift)}
                              disabled={isSubmitting || pinVal.length !== 6}
                              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase shadow-sm cursor-pointer disabled:opacity-50"
                            >
                              Check In
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {attendance && (status === 'CHECKED_IN' || status === 'ON_BREAK') && (
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                              Active Shift
                            </span>
                            <span className="text-[11px] text-[#717784]">
                              Checked in at {attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                          </div>
                          {status === 'CHECKED_IN' ? (
                            <button
                              type="button"
                              onClick={() => handleToggleBreak(shift.id, 'START')}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                            >
                              <Coffee className="w-3.5 h-3.5" />
                              <span>Take Break</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleBreak(shift.id, 'END')}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
                            >
                              <Coffee className="w-3.5 h-3.5" />
                              <span>End Break</span>
                            </button>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Supervisor PIN to Check Out"
                            value={pinVal}
                            onChange={(e) => handlePinChange(shift.id, e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-center tracking-widest text-base font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
                          />
                          <button
                            type="button"
                            onClick={() => handleCheckOut(shift)}
                            disabled={isSubmitting || pinVal.length !== 6}
                            className="px-5 py-2.5 rounded-xl bg-[#0f2f63] hover:bg-[#2563c9] text-white font-bold text-xs uppercase cursor-pointer disabled:opacity-50"
                          >
                            Check Out
                          </button>
                        </div>
                      </div>
                    )}

                    {attendance && status === 'PENDING_APPROVAL' && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded-xl text-center space-y-1">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                          Shift Complete • Awaiting Supervisor Approval
                        </span>
                        <span className="text-[11px] text-amber-800 dark:text-amber-300">
                          Recorded: {attendance.total_work_minutes} work minutes, {attendance.total_break_minutes} break minutes.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Banner when no shift is scheduled for today */
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 bg-[#f8f9fa] dark:bg-[#09090b] p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100">
                    No Shifts Scheduled for Today ({new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                  </h3>
                  <p className="text-xs text-[#717784] dark:text-zinc-400">
                    {futureShifts.length > 0 
                      ? `You have ${futureShifts.length} upcoming scheduled shift${futureShifts.length > 1 ? 's' : ''} listed below.` 
                      : 'Your employer will schedule your shifts after work order agreement.'}
                  </p>
                </div>
              </div>
              {futureShifts.length > 0 && (
                <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                  Next Shift: {getRelativeDateLabel(getShiftDateString(futureShifts[0].shift_date), todayStr)}
                </span>
              )}
            </div>
          )}

          {/* Section 2: Upcoming Scheduled Shifts */}
          {futureShifts.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                    Upcoming Scheduled Shifts ({futureShifts.length})
                  </h2>
                </div>
                <span className="text-xs text-[#717784]">
                  Check-in unlocks on shift date
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {futureShifts.map((shift, idx) => {
                  const shiftDateStr = getShiftDateString(shift.shift_date);
                  const relativeLabel = getRelativeDateLabel(shiftDateStr, todayStr);
                  const isNextShift = idx === 0 && todayShifts.length === 0;

                  return (
                    <div
                      key={shift.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 shadow-2xs transition-all ${
                        isNextShift 
                          ? 'border-[#0f2f63]/40 dark:border-sky-500/40 bg-linear-to-br from-blue-50/40 via-white to-white dark:from-sky-950/10 dark:via-[#0c0c0e] dark:to-[#0c0c0e] ring-1 ring-[#0f2f63]/20 dark:ring-sky-500/20' 
                          : 'border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e]'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Badges strip */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              relativeLabel === 'Tomorrow'
                                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                                : 'bg-slate-100 dark:bg-zinc-800 text-[#0f2f63] dark:text-sky-400'
                            }`}>
                              {relativeLabel} • {new Date(shift.shift_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            {isNextShift && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#0f2f63] text-white dark:bg-sky-500 dark:text-black">
                                Next Shift
                              </span>
                            )}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                            {shift.status}
                          </span>
                        </div>

                        {/* Shift Info */}
                        <div>
                          <span className="text-[10px] font-bold text-[#717784] uppercase tracking-wider block">
                            {shift.work_orders?.order_number}
                          </span>
                          <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">
                            {shift.work_orders?.job_title}
                          </h3>
                        </div>

                        {/* Timings and Worksite */}
                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                            <span className="font-semibold text-slate-900 dark:text-zinc-200">
                              {shift.start_time} - {shift.end_time}
                            </span>
                            <span className="text-[#717784]">({shift.break_duration_minutes}m break)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                            <span className="truncate">{shift.worksite_name} • {shift.city}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Compensation & PIN Instruction */}
                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            ₹{Number(shift.work_orders?.wage_amount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-[#717784]"> / {shift.work_orders?.wage_frequency?.toLowerCase()}</span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-[#0f2f63] dark:text-sky-400" />
                          <span>PIN at Site Check-In</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* If completely empty (no today and no future) */}
          {todayShifts.length === 0 && futureShifts.length === 0 && (
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 text-[#717784] mx-auto" />
              <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">No Upcoming Shifts Scheduled</h3>
              <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
                Your employer will schedule your shifts after work order agreement. Check the <b>Monthly Schedule</b> tab or view past history.
              </p>
            </div>
          )}
        </div>
      ) : activeTab === 'MONTH' ? (
        activeShifts.length === 0 ? (
          <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-3">
            <Calendar className="w-10 h-10 text-[#717784] mx-auto" />
            <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">
              No Shifts Scheduled for {new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </h3>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
              Shifts scheduled by your employer for this month will appear here with dates, timings, and status.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeShifts.map((s) => {
              const att = s.attendances?.[0];
              const shiftStatus = att?.status || s.status;
              const shiftDateStr = getShiftDateString(s.shift_date);
              const isToday = shiftDateStr === todayStr;

              return (
                <div
                  key={s.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between gap-3 shadow-2xs ${
                    isToday ? 'border-[#0f2f63]/50 dark:border-sky-500/50 bg-blue-50/20' : 'border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        isToday ? 'bg-[#0f2f63] text-white dark:bg-sky-500 dark:text-black' : 'bg-slate-100 dark:bg-zinc-800 text-[#0f2f63] dark:text-sky-400'
                      }`}>
                        {new Date(s.shift_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} {isToday ? '(Today)' : ''}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        shiftStatus === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        shiftStatus === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800' :
                        shiftStatus === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {shiftStatus.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100">
                        {s.work_orders?.job_title}
                      </h4>
                      <p className="text-xs text-[#717784]">
                        {s.worksite_name} • {s.city}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400 pt-1">
                      <Clock className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                      <span>{s.start_time} - {s.end_time}</span>
                      <span className="text-[#717784]">• ₹{Number(s.work_orders?.wage_amount).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {att && (att.status === 'PENDING_APPROVAL' || att.status === 'CHECKED_OUT') && (
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedAttendanceId(att.id)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-[#0f2f63] dark:text-sky-400 bg-slate-100 dark:bg-zinc-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                      >
                        Request Correction
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* History View */
        <div className="space-y-3">
          {shifts.length === 0 ? (
            <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-3">
              <Calendar className="w-10 h-10 text-[#717784] mx-auto" />
              <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">No Shift History Found</h3>
              <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
                Completed shifts and past attendance records will be catalogued here.
              </p>
            </div>
          ) : (
            shifts.map((s) => {
              const att = s.attendances?.[0];
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <span className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100 block">
                      {new Date(s.shift_date).toLocaleDateString('en-IN', { dateStyle: 'medium' })} • {s.work_orders?.job_title}
                    </span>
                    <span className="text-[11px] text-[#717784]">
                      {s.worksite_name} ({s.start_time} - {s.end_time})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                        {att?.total_work_minutes ? `${att.total_work_minutes} mins` : '--'}
                      </span>
                      <span className="text-[10px] text-[#717784] uppercase font-bold">
                        {att?.status?.replace('_', ' ') || s.status}
                      </span>
                    </div>

                    {att && (att.status === 'PENDING_APPROVAL' || att.status === 'CHECKED_OUT') && (
                      <button
                        type="button"
                        onClick={() => setSelectedAttendanceId(att.id)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-[#0f2f63] dark:text-sky-400 bg-slate-100 dark:bg-zinc-800 rounded-lg hover:bg-slate-200 cursor-pointer"
                      >
                        Request Correction
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Correction Modal */}
      {selectedAttendanceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C21] rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Request Attendance Correction</h3>
            <p className="text-xs text-slate-500">Provide reason and optional proposed times for supervisor review.</p>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">Proposed Check-In</label>
                <input
                  type="time"
                  value={proposedCheckIn}
                  onChange={(e) => setProposedCheckIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400 block mb-1">Proposed Check-Out</label>
                <input
                  type="time"
                  value={proposedCheckOut}
                  onChange={(e) => setProposedCheckOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <textarea
              rows={3}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Worked till 18:30 due to site handover"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAttendanceId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCorrection}
                disabled={isSubmitting || !correctionReason}
                className="px-4 py-2 rounded-xl bg-[#0f2f63] text-white text-xs font-bold cursor-pointer"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
