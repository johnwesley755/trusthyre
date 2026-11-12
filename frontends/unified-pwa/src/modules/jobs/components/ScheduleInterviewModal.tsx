import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Video, 
  Building2, 
  FileText, 
  Loader2, 
  CheckCircle2,
  CalendarCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { interviewService } from '../../../services/interview.service';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  defaultLocation?: string;
  onSuccess?: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  jobTitle,
  defaultLocation = '',
  onSuccess
}) => {
  const queryClient = useQueryClient();

  // Form states
  const [interviewType, setInterviewType] = useState<'IN_PERSON' | 'PHONE' | 'WHATSAPP_VIDEO'>('IN_PERSON');
  
  // Set default date to tomorrow 10:00 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState('10:00');
  const [locationAddress, setLocationAddress] = useState(defaultLocation);
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [instructions, setInstructions] = useState('');

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      if (!date || !time) {
        throw new Error('Please select both a date and time for the interview');
      }

      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

      return interviewService.scheduleInterview({
        applicationId,
        scheduledAt,
        interviewType,
        locationAddress: interviewType === 'IN_PERSON' ? locationAddress : undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        instructions: instructions.trim() || undefined
      });
    },
    onSuccess: () => {
      toast.success(`Interview invitation dispatched to ${candidateName}!`);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to schedule interview.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scheduleMutation.mutate();
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-hidden select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#121215] text-[#0A1931] dark:text-zinc-100 rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] select-text transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-[#0f2f63] dark:bg-[#09090b] text-white flex items-start justify-between gap-4 shrink-0 border-b border-transparent dark:border-zinc-800">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-sky-500/10 border border-white/15 dark:border-sky-500/20 flex items-center justify-center text-white dark:text-[#38BDF8] shrink-0 mt-0.5">
              <CalendarCheck className="w-5 h-5 text-sky-300 dark:text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 dark:text-emerald-400">
                  Direct Interview Coordination
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                Schedule Interview
              </h2>
              <p className="text-xs text-white/80 dark:text-zinc-400 leading-relaxed mt-0.5">
                Invite <strong className="text-white font-semibold">{candidateName}</strong> for <span className="text-sky-200 dark:text-sky-300">{jobTitle}</span>
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Interview Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              Interview Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'IN_PERSON' as const, label: 'In-Person', icon: Building2 },
                { type: 'PHONE' as const, label: 'Phone Call', icon: Phone },
                { type: 'WHATSAPP_VIDEO' as const, label: 'Video Call', icon: Video },
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInterviewType(type)}
                  className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    interviewType === type
                      ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white border-[#0f2f63] dark:border-blue-500 shadow-xs'
                      : 'bg-slate-50 dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date and Time Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Interview Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-3.5 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Time Slot *
              </label>
              <div className="relative">
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-3.5 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                />
              </div>
            </div>
          </div>

          {/* In-Person Venue Address */}
          {interviewType === 'IN_PERSON' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Venue Address & Landmark *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="e.g. Plot 42, Industrial Estate, Guindy, Chennai"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                />
              </div>
            </div>
          )}

          {/* Contact Person Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Ramesh (HR / Site Supervisor)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Contact Phone / WhatsApp
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Instructions for Candidate
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Bring original Aadhaar card and safety shoes. Ask for Ramesh at Gate 2."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all resize-none"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={scheduleMutation.isPending}
              className="px-4 py-2.5 rounded-full border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={scheduleMutation.isPending}
              className="px-6 py-2.5 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-blue-600 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {scheduleMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Send Interview Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

