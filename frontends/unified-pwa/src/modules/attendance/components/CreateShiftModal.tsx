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
  AlertCircle 
} from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { shiftAttendanceService, type CreateShiftPayload } from '../../../services/shiftAttendance.service';
import type { WorkOrder } from '../../../services/workOrder.service';
import { toast } from 'sonner';

interface CreateShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  onShiftCreated?: () => void;
}

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onShiftCreated
}) => {
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
      subtitle={`Create working shifts for order ${workOrder.order_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Work Order Overview */}
        <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300 block">{workOrder.job_title}</span>
            <span className="text-[10px] text-blue-700/80 dark:text-blue-400">Assigned Worker: {workOrder.worker?.full_name || 'Verified Candidate'}</span>
          </div>
          <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
            ₹{Number(workOrder.wage_amount).toLocaleString('en-IN')} / {workOrder.wage_frequency?.toLowerCase()}
          </span>
        </div>

        {/* Date & Recurrence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Start Shift Date *
            </label>
            <input
              type="date"
              required
              value={formData.shiftDate}
              onChange={(e) => setFormData(prev => ({ ...prev, shiftDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
              Number of Shifts (Days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={formData.recurringDays}
              onChange={(e) => setFormData(prev => ({ ...prev, recurringDays: parseInt(e.target.value) || 1 }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
            />
          </div>
        </div>

        {/* Shift Timings */}
        <div className="grid grid-cols-2 gap-3">
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
              Recurrence Type
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

        {/* Worksite Override */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
            Worksite Name & Location
          </label>
          <input
            type="text"
            value={formData.worksiteName}
            onChange={(e) => setFormData(prev => ({ ...prev, worksiteName: e.target.value }))}
            placeholder="e.g. Metro Phase II Site, Guindy"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
          />
        </div>

        {/* Shift Notes */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
            Instructions / Required PPE
          </label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g. Report to Supervisor Rajesh at Gate 2. Hard hat required."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-medium text-slate-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Shifts</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
