import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  KeyRound, 
  Coffee, 
  CheckCircle2, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { shiftAttendanceService, type Shift } from '../../../services/shiftAttendance.service';
import { AppLoader } from '../../../components/common/AppLoader';
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

export default function WorkerTodayShiftPage() {
  const [activeTab, setActiveTab] = useState<'TODAY' | 'HISTORY'>('TODAY');
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const [proposedCheckIn, setProposedCheckIn] = useState('');
  const [proposedCheckOut, setProposedCheckOut] = useState('');
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<string | null>(null);

  const todayStr = getTodayIST();

  // Fetch shifts
  const { data: shifts = [], isLoading, refetch } = useQuery({
    queryKey: ['workerShifts', activeTab, todayStr],
    queryFn: () => shiftAttendanceService.getWorkerShifts({
      date: activeTab === 'TODAY' ? todayStr : undefined
    })
  });

  // Filter out cancelled shifts for active working list
  const activeTodayShifts = shifts.filter(s => s.status !== 'CANCELLED');

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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] dark:text-zinc-100">
            Shifts & Attendance
          </h1>
          <p className="text-xs text-[#717784] dark:text-zinc-400">
            Verify attendance with your site supervisor using single-use PINs
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#f4f4f4] dark:bg-[#121215] p-1 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('TODAY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'TODAY'
                ? 'bg-white dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-400 shadow-2xs'
                : 'text-[#717784]'
            }`}
          >
            Today's Shifts ({activeTodayShifts.length})
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
            Attendance History
          </button>
        </div>
      </div>

      {isLoading ? (
        <AppLoader variant="skeleton" message="Loading shift schedules..." />
      ) : activeTab === 'TODAY' ? (
        activeTodayShifts.length === 0 ? (
          <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-3">
            <Calendar className="w-10 h-10 text-[#717784] mx-auto" />
            <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">No Shifts Scheduled for Today</h3>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
              Your employer will schedule your shifts after work order agreement. Check back later or view past history.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTodayShifts.map((shift) => {
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
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                        <span>Enter Supervisor 6-Digit PIN to Check In</span>
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="6-digit PIN"
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
        )
      ) : (
        /* History View */
        <div className="space-y-3">
          {shifts.map((s) => {
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
                      {att?.status?.replace('_', ' ') || 'SCHEDULED'}
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
          })}
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
