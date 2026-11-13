import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  IndianRupee, 
  FileText, 
  ShieldCheck, 
  Check, 
  X,
  AlertCircle,
  HelpCircle,
  Coffee,
  Home,
  Truck,
  MessageSquare,
  ArrowRight,
  Send
} from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { workOrderService, type WorkOrder } from '../../../services/workOrder.service';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface WorkOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: WorkOrder;
  isEmployer: boolean;
  onStatusChange?: () => void;
}

export const WorkOrderDetailModal: React.FC<WorkOrderDetailModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  isEmployer,
  onStatusChange
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clarificationNotes, setClarificationNotes] = useState('');
  const [isClarifyOpen, setIsClarifyOpen] = useState(false);

  const handleWorkerAction = async (action: 'ACCEPT' | 'DECLINE' | 'CLARIFY') => {
    try {
      setIsSubmitting(true);
      await workOrderService.respondToWorkOrder(
        workOrder.id,
        action,
        action === 'CLARIFY' ? clarificationNotes : undefined
      );

      toast.success(
        action === 'ACCEPT' 
          ? 'Work order terms accepted successfully.' 
          : action === 'DECLINE' 
          ? 'Work order declined' 
          : 'Clarification request sent to employer'
      );

      queryClient.invalidateQueries({ queryKey: ['workerWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['employerWorkOrders'] });
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      onStatusChange?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendDraft = async () => {
    try {
      setIsSubmitting(true);
      await workOrderService.sendWorkOrder(workOrder.id);
      toast.success('Work order sent to candidate for signature!');
      queryClient.invalidateQueries({ queryKey: ['employerWorkOrders'] });
      onStatusChange?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusColors = {
    DRAFT: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    SENT: 'bg-blue-50 text-[#0f2f63] dark:bg-sky-950/40 dark:text-sky-300 border border-blue-200 dark:border-sky-800',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    DECLINED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    CANCELLED: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    DISPUTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Work Order ${workOrder.order_number}`}
      subtitle={`${workOrder.job_title} • ${workOrder.worksite_name}`}
      icon={<FileText className="w-5 h-5 text-[#0f2f63] dark:text-sky-400" />}
      iconBgColor="bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63]"
      maxWidth="2xl"
      bodyClassName="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto font-['Onest',system-ui,sans-serif]"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-xs font-semibold text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Close
          </button>

          {/* Role Action Controls */}
          {!isEmployer && workOrder.status === 'SENT' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsClarifyOpen(!isClarifyOpen)}
                className="px-3.5 py-2.5 rounded-full border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 text-xs font-bold transition-all cursor-pointer"
              >
                Request Clarification
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleWorkerAction('DECLINE')}
                className="px-3.5 py-2.5 rounded-full border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
              >
                Decline
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleWorkerAction('ACCEPT')}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Accept Work Order Terms</span>
              </button>
            </div>
          )}

          {isEmployer && workOrder.status === 'DRAFT' && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSendDraft}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send to Candidate</span>
            </button>
          )}
        </div>
      }
    >
      {/* Status & Parties Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#f4f4f4] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800">
        <div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusColors[workOrder.status] || 'bg-zinc-100'}`}>
            <span>Status: {workOrder.status.replace('_', ' ')}</span>
          </span>
          <p className="text-xs text-[#717784] dark:text-zinc-400 mt-1">
            Issued on {new Date(workOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>

        <div className="text-left sm:text-right text-xs">
          <p className="font-bold text-[#0a0a0a] dark:text-zinc-100">
            {isEmployer ? `Assigned to: ${workOrder.worker?.full_name || 'Specialist'}` : `Employer: ${workOrder.employer?.company_name || 'Verified Works'}`}
          </p>
          <p className="text-[#717784] dark:text-zinc-400">
            {isEmployer ? (workOrder.worker?.city || 'Tamil Nadu') : (workOrder.employer?.city || 'Tamil Nadu')}
          </p>
        </div>
      </div>

      {/* Clarification Input Box (If toggled by Worker) */}
      {isClarifyOpen && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
          <label className="text-xs font-bold text-amber-900 dark:text-amber-300 block">
            What terms would you like the employer to clarify or amend?
          </label>
          <textarea
            value={clarificationNotes}
            onChange={(e) => setClarificationNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Please clarify if safety gear is provided, or if overtime transport is arranged."
            className="w-full p-2.5 text-xs rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsClarifyOpen(false)}
              className="px-3 py-1.5 rounded-full text-xs text-[#717784]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !clarificationNotes.trim()}
              onClick={() => handleWorkerAction('CLARIFY')}
              className="px-4 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* 1. Agreed Terms Grid */}
      <div className="space-y-4">
        <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider">
          Agreed Working Conditions
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] space-y-1">
            <span className="text-[11px] font-bold text-[#717784] dark:text-zinc-400 uppercase block">Compensation</span>
            <div className="text-lg font-bold text-[#0a0a0a] dark:text-zinc-100">
              ₹{Number(workOrder.wage_amount).toLocaleString('en-IN')}{' '}
              <span className="text-xs font-semibold text-[#717784]">/ {workOrder.wage_frequency.toLowerCase()}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] space-y-1">
            <span className="text-[11px] font-bold text-[#717784] dark:text-zinc-400 uppercase block">Working Schedule</span>
            <div className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">
              {workOrder.shift_timing} ({Number(workOrder.daily_working_hours)} hrs/day)
            </div>
            <div className="text-[11px] text-[#717784]">Weekly off: {workOrder.weekly_rest_day || 'Sunday'}</div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] space-y-1 sm:col-span-2">
            <span className="text-[11px] font-bold text-[#717784] dark:text-zinc-400 uppercase block">Worksite & Coordinates</span>
            <div className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400 shrink-0" />
              <span>{workOrder.worksite_name}</span>
            </div>
            <p className="text-xs text-[#717784] dark:text-zinc-400 pl-5">
              {workOrder.worksite_address}, {workOrder.city}
              {workOrder.district ? `, ${workOrder.district}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Welfare & Amenities */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider">
          Welfare & Amenities
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${workOrder.food_provided ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-[#f4f4f4] dark:bg-[#121215] border-[#e6e8ec] text-[#717784]'}`}>
            <Coffee className="w-4 h-4" />
            <span>Food: {workOrder.food_provided ? 'Provided' : 'Not Included'}</span>
          </div>

          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${workOrder.accommodation_provided ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-[#f4f4f4] dark:bg-[#121215] border-[#e6e8ec] text-[#717784]'}`}>
            <Home className="w-4 h-4" />
            <span>Stay: {workOrder.accommodation_provided ? 'Provided' : 'Not Included'}</span>
          </div>

          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${workOrder.transport_provided ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300' : 'bg-[#f4f4f4] dark:bg-[#121215] border-[#e6e8ec] text-[#717784]'}`}>
            <Truck className="w-4 h-4" />
            <span>Transport: {workOrder.transport_provided ? 'Provided' : 'Not Included'}</span>
          </div>
        </div>

        {workOrder.overtime_terms && (
          <div className="p-3 bg-white dark:bg-[#0c0c0e] rounded-xl border border-[#e6e8ec] dark:border-zinc-800 text-xs">
            <strong className="text-[#0a0a0a] dark:text-zinc-100">Overtime Policy: </strong>
            <span className="text-[#717784] dark:text-zinc-400">{workOrder.overtime_terms}</span>
          </div>
        )}
      </div>

      {/* 3. Event History & Audit Trail */}
      {workOrder.events && workOrder.events.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800">
          <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider">
            Lifecycle & Agreement History
          </h4>

          <div className="space-y-2">
            {workOrder.events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between p-2.5 rounded-xl bg-[#f4f4f4] dark:bg-[#121215] text-xs"
              >
                <div>
                  <span className="font-bold text-[#0a0a0a] dark:text-zinc-200">
                    {evt.event_type.replace('_', ' ')}
                  </span>
                  <span className="text-[#717784] ml-2">by {evt.actor_role}</span>
                  {evt.notes && <p className="text-[#717784] text-[11px] mt-0.5">{evt.notes}</p>}
                </div>
                <span className="text-[10px] text-[#717784] shrink-0">
                  {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </BaseModal>
  );
};

