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
  Send,
  Paperclip,
  Download,
  PenTool
} from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { workOrderService, type WorkOrder } from '../../../services/workOrder.service';
import { SignatureCanvas } from '../../../components/common/SignatureCanvas';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { conversationService } from '../../../services/conversation.service';

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
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const [clarificationNotes, setClarificationNotes] = useState('');
  const [isClarifyOpen, setIsClarifyOpen] = useState(false);
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [workerSignature, setWorkerSignature] = useState<string | null>(null);

  const handleOpenChat = async () => {
    try {
      setIsOpeningChat(true);
      const convo = await conversationService.getOrCreateByWorkOrder(workOrder.id);
      onClose();
      navigate(`/messages/${convo.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not open conversation');
    } finally {
      setIsOpeningChat(false);
    }
  };

  const handleWorkerAction = async (action: 'ACCEPT' | 'DECLINE' | 'CLARIFY') => {
    try {
      setIsSubmitting(true);
      await workOrderService.respondToWorkOrder(
        workOrder.id,
        action,
        action === 'CLARIFY' ? clarificationNotes : undefined,
        action === 'ACCEPT' ? (workerSignature || undefined) : undefined
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
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-xs font-semibold text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 transition-colors cursor-pointer text-center"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isOpeningChat}
              onClick={handleOpenChat}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-[#0f2f63]/30 dark:border-sky-500/30 text-[#0f2f63] dark:text-sky-400 hover:bg-[#0f2f63]/10 dark:hover:bg-sky-500/10 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{isOpeningChat ? 'Connecting...' : isEmployer ? 'Message Candidate' : 'Message Employer'}</span>
            </button>
          </div>

          {/* Role Action Controls */}
          {!isEmployer && workOrder.status === 'SENT' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsClarifyOpen(!isClarifyOpen)}
                  className="px-3.5 py-2.5 rounded-full border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap"
                >
                  Request Clarification
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleWorkerAction('DECLINE')}
                  className="px-3.5 py-2.5 rounded-full border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer text-center whitespace-nowrap"
                >
                  Decline
                </button>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  const nextState = !isSignOpen;
                  setIsSignOpen(nextState);
                  if (nextState) {
                    setTimeout(() => {
                      document.getElementById('worker-signature-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{isSignOpen ? 'Hide Signature' : 'Sign & Accept Terms'}</span>
              </button>
            </div>
          )}

          {isEmployer && workOrder.status === 'DRAFT' && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSendDraft}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
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

      {/* Candidate Clarification Request Banner (Prominently visible to Employer & Worker) */}
      {workOrder.worker_response_notes && (
        <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Candidate Requested Clarification</span>
          </div>
          <p className="text-xs text-amber-950 dark:text-amber-200 font-medium leading-relaxed bg-white/60 dark:bg-black/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
            "{workOrder.worker_response_notes}"
          </p>
          {isEmployer && (
            <p className="text-[11px] text-amber-800 dark:text-amber-400 italic">
              💡 The candidate submitted this note before accepting. You can review their points, update the order terms, and re-send.
            </p>
          )}
        </div>
      )}

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

      {/* Custom Terms & Conditions */}
      {workOrder.custom_terms_and_conditions && (
        <div className="space-y-2 pt-2 border-t border-[#e6e8ec] dark:border-zinc-800">
          <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider">
            Contractual Clauses & Milestones
          </h4>
          <div className="p-3.5 bg-white dark:bg-[#0c0c0e] rounded-xl border border-[#e6e8ec] dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">
            {workOrder.custom_terms_and_conditions}
          </div>
        </div>
      )}

      {/* Document Attachments */}
      {workOrder.attachment_urls && workOrder.attachment_urls.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#e6e8ec] dark:border-zinc-800">
          <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
            <span>Attached Annexures & Documents</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {workOrder.attachment_urls.map((url, idx) => {
              const fileName = url.split('/').pop()?.split('?')[0] || `Annexure-${idx + 1}.pdf`;
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] hover:border-[#0f2f63] dark:hover:border-sky-500 transition-colors flex items-center justify-between gap-2 text-xs font-bold text-[#0f2f63] dark:text-sky-400"
                >
                  <span className="truncate">{fileName}</span>
                  <Download className="w-3.5 h-3.5 shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Digital Signatures Box */}
      <div className="space-y-3 pt-2 border-t border-[#e6e8ec] dark:border-zinc-800">
        <h4 className="text-xs font-black uppercase text-[#717784] dark:text-zinc-400 tracking-wider">
          Digital Signatures & Legal Verification
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl border border-dashed border-[#e6e8ec] dark:border-zinc-800 bg-slate-50/50 dark:bg-[#121215]">
            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
              Employer Authorized Seal
            </span>
            {workOrder.employer_signature_url ? (
              <div className="p-2 bg-white rounded-lg border border-slate-200 dark:border-zinc-700 max-w-[220px]">
                <img src={workOrder.employer_signature_url} alt="Employer Signature" className="h-12 w-full object-contain" />
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">Signature on corporate file</span>
            )}
            {workOrder.employer_signed_at && (
              <span className="text-[10px] text-slate-400 block mt-1">
                Signed on {new Date(workOrder.employer_signed_at).toLocaleDateString()}
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-[#e6e8ec] dark:border-zinc-800 bg-slate-50/50 dark:bg-[#121215]">
            <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
              Candidate Counter-Signature
            </span>
            {workOrder.worker_signature_url ? (
              <div className="p-2 bg-white rounded-lg border border-slate-200 dark:border-zinc-700 max-w-[220px]">
                <img src={workOrder.worker_signature_url} alt="Candidate Signature" className="h-12 w-full object-contain" />
              </div>
            ) : workOrder.status === 'ACCEPTED' ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Digitally Confirmed
              </span>
            ) : !isEmployer ? (
              <button
                type="button"
                onClick={() => {
                  setIsSignOpen(true);
                  setTimeout(() => {
                    document.getElementById('worker-signature-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
              >
                <PenTool className="w-3 h-3" />
                <span>Tap to Sign & Accept</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Pending signature upon acceptance</span>
            )}
            {workOrder.worker_signed_at && (
              <span className="text-[10px] text-slate-400 block mt-1">
                Signed on {new Date(workOrder.worker_signed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Candidate In-Modal Signature Drawer */}
      {isSignOpen && !isEmployer && workOrder.status === 'SENT' && (
        <div id="worker-signature-section" className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 space-y-3 shadow-md scroll-mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                Candidate Digital Acceptance
              </h5>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                Sign inside the box to accept the terms of this work order and finalize your shift agreement.
              </p>
            </div>
          </div>
          <SignatureCanvas
            label="Draw Your Counter-Signature"
            required
            height={160}
            onSignatureChange={(sig) => setWorkerSignature(sig)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSignOpen(false)}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#717784] hover:text-[#0a0a0a] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !workerSignature}
              onClick={() => handleWorkerAction('ACCEPT')}
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Confirm & Accept Work Order
            </button>
          </div>
        </div>
      )}

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

