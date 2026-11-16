import React, { useState } from 'react';
import { Clock, Coffee, MapPin, Check, AlertTriangle, Trash2, X } from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { shiftAttendanceService, type ShiftRegisterItem, type UpdateShiftPayload } from '../../../services/shiftAttendance.service';
import { toast } from 'sonner';

interface EditShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftItem: ShiftRegisterItem;
  onShiftUpdated: () => void;
  onShiftCancelled?: () => void;
}

const SHIFT_PRESETS = [
  { label: 'General Shift', start: '09:00', end: '18:00', icon: '☀️' },
  { label: 'Early Shift', start: '07:00', end: '15:00', icon: '🌅' },
  { label: 'Night Shift', start: '21:00', end: '06:00', icon: '🌙' },
];

export const EditShiftModal: React.FC<EditShiftModalProps> = ({
  isOpen,
  onClose,
  shiftItem,
  onShiftUpdated,
  onShiftCancelled
}) => {
  const [startTime, setStartTime] = useState(shiftItem.startTime || '09:00');
  const [endTime, setEndTime] = useState(shiftItem.endTime || '18:00');
  const [breakDurationMinutes, setBreakDurationMinutes] = useState(60);
  const [worksiteName, setWorksiteName] = useState(shiftItem.worksiteName || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const applyPreset = (start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      toast.error('Please enter valid start and end times.');
      return;
    }

    try {
      setIsSubmitting(true);
      await shiftAttendanceService.updateShift(shiftItem.shiftId, {
        startTime,
        endTime,
        breakDurationMinutes: Number(breakDurationMinutes) || 60,
        worksiteName: worksiteName || undefined,
        notes: notes || undefined
      });

      toast.success('Shift timing updated successfully!');
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to update shift:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to update shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelShift = async () => {
    if (!window.confirm(`Are you sure you want to cancel this shift for ${shiftItem.worker.name}?`)) {
      return;
    }

    try {
      setIsCancelling(true);
      await shiftAttendanceService.cancelShift(shiftItem.shiftId);
      toast.success('Shift cancelled successfully.');
      if (onShiftCancelled) onShiftCancelled();
      onShiftUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to cancel shift:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel shift');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Shift Timing"
      subtitle={`Reschedule or adjust shift for ${shiftItem.worker.name}`}
      maxWidth="md"
    >
      <form onSubmit={handleUpdate} className="space-y-4">
        {/* Worker & Shift Info */}
        <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase">
              {shiftItem.orderNumber}
            </span>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              {shiftItem.worker.name} • {shiftItem.jobTitle}
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
              Date: {new Date(shiftItem.shiftDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/50">
            ₹{Number(shiftItem.wageAmount).toLocaleString('en-IN')}/{shiftItem.wageFrequency?.toLowerCase()}
          </span>
        </div>

        {/* 1-Click Timing Presets */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
            Quick Shift Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SHIFT_PRESETS.map((preset) => {
              const isSelected = startTime === preset.start && endTime === preset.end;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.start, preset.end)}
                  className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0f2f63] dark:border-sky-400 bg-blue-50/60 dark:bg-sky-950/30 font-bold text-[#0f2f63] dark:text-sky-300'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="mr-1">{preset.icon}</span>
                  <span className="block text-[11px] font-semibold">{preset.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">{preset.start} - {preset.end}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start & End Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Start Time (24h) *
            </label>
            <div className="relative">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              End Time (24h) *
            </label>
            <div className="relative">
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Break Duration & Worksite */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Break (Minutes)
            </label>
            <input
              type="number"
              min="0"
              max="240"
              value={breakDurationMinutes}
              onChange={(e) => setBreakDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Worksite Location
            </label>
            <input
              type="text"
              value={worksiteName}
              onChange={(e) => setWorksiteName(e.target.value)}
              placeholder="e.g. Main Warehouse"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Change Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
            Change Note / Reason (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Adjusted start time due to morning delivery schedule"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancelShift}
            disabled={isCancelling || isSubmitting}
            className="px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isCancelling ? 'Cancelling...' : 'Cancel Shift'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCancelling}
              className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Timing'}</span>
            </button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
