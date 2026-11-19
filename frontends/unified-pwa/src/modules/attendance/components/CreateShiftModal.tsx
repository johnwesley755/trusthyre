import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  X, 
  Loader2, 
  Plus, 
  Coffee, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { Button } from '../../../components/ui/button';
import { shiftAttendanceService, type CreateShiftPayload } from '../../../services/shiftAttendance.service';
import type { WorkOrder } from '../../../services/workOrder.service';
import { toast } from 'sonner';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  onShiftCreated?: () => void;
}

const SHIFT_PRESETS = [
  { label: 'General Shift', start: '09:00', end: '18:00', icon: '☀️' },
  { label: 'Early Shift', start: '07:00', end: '15:00', icon: '🌅' },
  { label: 'Night Shift', start: '21:00', end: '06:00', icon: '🌙' },
];

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onShiftCreated
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [formData, setFormData] = useState<Partial<CreateShiftPayload>>({
    workOrderId: workOrder.id,
    shiftDate: tomorrow,
    startTime: '09:00',
    endTime: '18:00',
    breakDurationMinutes: 60,
    worksiteName: workOrder.worksite_name || '',
    worksiteAddress: workOrder.worksite_address || '',
    city: workOrder.city || '',
    recurringDays: 1,
    recurrenceRule: 'DAILY',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPreset = (start: string, end: string) => {
    setFormData(prev => ({ ...prev, startTime: start, endTime: end }));
  };

  const setDatePreset = (dateVal: string, days: number = 1) => {
    setFormData(prev => ({ ...prev, shiftDate: dateVal, recurringDays: days }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shiftDate || !formData.startTime || !formData.endTime) {
      toast.error('Please specify shift date, start time and end time.');
      return;
    }

    try {
      setIsSubmitting(true);
      await shiftAttendanceService.createShifts({
        ...formData,
        workOrderId: workOrder.id,
        shiftDate: formData.shiftDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        recurringDays: Number(formData.recurringDays) || 1
      } as CreateShiftPayload);

      toast.success(`${formData.recurringDays || 1} Shift(s) scheduled successfully!`);
      if (onShiftCreated) onShiftCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create shift:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to schedule shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Shift"
      subtitle={`Schedule working shifts for order ${workOrder.order_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Work Order Overview */}
        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase">
                {workOrder.order_number}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {workOrder.status}
              </span>
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 block">{workOrder.job_title}</span>
            <span className="text-[10px] text-slate-500 dark:text-zinc-400">Worker: {workOrder.worker?.full_name || 'Assigned Candidate'}</span>
          </div>
          <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
            ₹{Number(workOrder.wage_amount).toLocaleString('en-IN')} / {workOrder.wage_frequency?.toLowerCase()}
          </span>
        </div>

        {/* 1-Click Timing Presets */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1.5">
            Shift Timing Presets
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {SHIFT_PRESETS.map((preset) => {
              const isSelected = formData.startTime === preset.start && formData.endTime === preset.end;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.start, preset.end)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0f2f63] dark:border-sky-400 bg-blue-50/70 dark:bg-sky-950/40 font-bold text-[#0f2f63] dark:text-sky-300'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="mr-1">{preset.icon}</span>
                  <span className="block text-xs font-semibold">{preset.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">{preset.start} - {preset.end}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Date & Quick Date Buttons */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
              Start Date & Duration *
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDatePreset(today, 1)}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(tomorrow, 1)}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(tomorrow, 7)}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                7 Days
              </button>
              <button
                type="button"
                onClick={() => setDatePreset(tomorrow, 30)}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-zinc-300 cursor-pointer"
              >
                1 Month
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                type="date"
                required
                value={formData.shiftDate}
                onChange={(e) => setFormData(prev => ({ ...prev, shiftDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.recurringDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurringDays: parseInt(e.target.value) || 1 }))}
                  className="w-24 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 text-center"
                />
                <span className="text-xs text-slate-500 dark:text-zinc-400">
                  Total Shift Days ({formData.recurrenceRule?.toLowerCase()})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Start & End Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={formData.startTime}
              onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              End Time *
            </label>
            <input
              type="time"
              required
              value={formData.endTime}
              onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
            />
          </div>
        </div>

        {/* Break Duration & Recurrence Rule */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Break (Minutes)
            </label>
            <input
              type="number"
              step="15"
              min="0"
              value={formData.breakDurationMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, breakDurationMinutes: parseInt(e.target.value) || 0 }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Days Schedule
            </label>
            <select
              value={formData.recurrenceRule}
              onChange={(e) => setFormData(prev => ({ ...prev, recurrenceRule: e.target.value as any }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
            >
              <option value="DAILY">Consecutive Days</option>
              <option value="WEEKDAYS">Weekdays Only (Mon-Fri)</option>
              <option value="WEEKLY">Weekly Recurring</option>
            </select>
          </div>
        </div>

        {/* Worksite Name & Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
            Worksite Location
          </label>
          <input
            type="text"
            value={formData.worksiteName}
            onChange={(e) => setFormData(prev => ({ ...prev, worksiteName: e.target.value }))}
            placeholder="e.g. Metro Phase II Site, Guindy"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={onClose}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="navy"
            size="default"
            disabled={isSubmitting}
            className="rounded-xl flex items-center justify-center gap-1.5 uppercase tracking-wider"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm & Schedule</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};
