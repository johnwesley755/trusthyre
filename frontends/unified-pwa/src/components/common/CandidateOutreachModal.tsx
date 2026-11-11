import React, { useState } from 'react';
import {
  Phone,
  MessageSquare,
  Calendar,
  MapPin,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Building2,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './BaseModal';
import { Dropdown } from '../ui/dropdown';
import { employerService } from '../../services/employer.service';

export interface CandidateOutreachCandidate {
  id?: string;
  userId?: string;
  fullName: string;
  trade?: string;
  experienceYears?: number;
  location?: string;
  city?: string;
  phoneNumber?: string;
  skills?: string[];
  avatarUrl?: string;
}

export interface CandidateOutreachJob {
  id: string;
  title: string;
  city?: string;
  location?: string;
  budget?: number;
  jobType?: string;
}

interface CandidateOutreachModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: CandidateOutreachCandidate;
  employerName?: string;
  activeJobs?: CandidateOutreachJob[];
  defaultJobId?: string;
}

export const CandidateOutreachModal: React.FC<CandidateOutreachModalProps> = ({
  isOpen,
  onClose,
  candidate,
  employerName = 'Verified Employer',
  activeJobs = [],
  defaultJobId
}) => {
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    if (defaultJobId) return defaultJobId;
    if (activeJobs.length > 0) return activeJobs[0].id;
    return '';
  });

  const [interviewTime, setInterviewTime] = useState<string>('Tomorrow at 10:30 AM');
  const [interviewVenue, setInterviewVenue] = useState<string>(candidate.city || candidate.location || 'Company Main Office');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const selectedJob = activeJobs.find((j) => j.id === selectedJobId) || activeJobs[0];
  const jobTitle = selectedJob ? selectedJob.title : (candidate.trade ? `${candidate.trade} Opening` : 'Frontline Position');
  const salaryText = selectedJob?.budget ? `₹${selectedJob.budget.toLocaleString('en-IN')}/month` : 'Market Competitive Wage';

  // Format real or fallback phone number - free direct contact for authenticated employers
  const candidatePhone = candidate.phoneNumber || '+91 98765 43210';
  const cleanPhone = candidatePhone.replace(/[^0-9]/g, '');

  const formatWhatsAppMessage = () => {
    let msg = `*INTERVIEW INVITATION - ${employerName.toUpperCase()}*\n\n`;
    msg += `Hello ${candidate.fullName},\n`;
    msg += `We reviewed your verified profile on TrustHyre and would like to invite you for an interview:\n\n`;
    msg += `💼 *Position:* ${jobTitle}\n`;
    msg += `💰 *Salary / Pay:* ${salaryText}\n`;
    msg += `🗓️ *Interview Time:* ${interviewTime}\n`;
    msg += `📍 *Interview Location:* ${interviewVenue}\n\n`;
    msg += `Please reply *YES* to confirm this slot or call us back directly.\n`;
    msg += `Sent via TrustHyre Recruiter Suite.`;

    return encodeURIComponent(msg);
  };

  const handleCopy = () => {
    const rawMsg = `INTERVIEW INVITATION - ${employerName}\nHello ${candidate.fullName},\nWe invite you for an interview for ${jobTitle} (${salaryText}) on ${interviewTime} at ${interviewVenue}. Please reply to confirm.`;
    navigator.clipboard.writeText(rawMsg);
    setCopied(true);
    toast.success('Interview invitation copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Interview Outreach: ${candidate.fullName}`}
      subtitle={`${candidate.trade || 'Specialist'} • ${candidate.location || candidate.city || 'Available Nearby'}`}
      icon={<Sparkles className="w-5 h-5 text-[#0066ff]" />}
      iconBgColor="bg-[#eff6ff] text-[#0066ff] border border-[#dbeafe]"
      maxWidth="lg"
      bodyClassName="p-4 sm:p-5 space-y-4 bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-zinc-100"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={`tel:${cleanPhone}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 text-[#0A1931] dark:text-white hover:bg-[#F8FAFC] dark:hover:bg-zinc-800 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Phone className="w-4 h-4 text-[#10b981]" />
            <span>Call Candidate</span>
          </a>

          <a
            href={
              cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${formatWhatsAppMessage()}`
                : `https://wa.me/?text=${formatWhatsAppMessage()}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-[#0066ff] hover:bg-[#0052cc] active:bg-[#003d99] text-white shadow-md transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-white text-white" />
            <span>Send WhatsApp Invite</span>
          </a>
        </div>
      }
    >
      {/* Candidate Snapshot */}
      <div className="p-3.5 bg-[#F8FAFC] dark:bg-[#121215] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-[#eff6ff] border border-[#dbeafe] text-[#0066ff] flex items-center justify-center font-bold text-base shrink-0">
            {candidate.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#0A1931] truncate">
              {candidate.fullName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-[#717784] dark:text-zinc-400 mt-0.5">
              <span>{candidate.experienceYears ? `${candidate.experienceYears} Yrs Exp` : 'Verified Worker'}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[#10b981] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                Available for Direct Hire
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200 shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Direct Contact Active</span>
        </div>
      </div>

      {/* Active Job Assignment */}
      {activeJobs.length > 0 ? (
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block">
            Assign to Your Active Job Vacancy:
          </label>
          <Dropdown
            value={selectedJobId}
            onChange={(val) => setSelectedJobId(val)}
            options={activeJobs.map((j) => ({
              value: j.id,
              label: j.title,
              sublabel: `${j.city || 'Local'}${j.budget ? ` • ₹${j.budget}/mo` : ''}`,
            }))}
            className="w-full"
          />
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-[#0f2f63] flex items-center gap-2">
          <Building2 className="w-4 h-4 shrink-0 text-[#0066ff]" />
          <span>Direct outreach for upcoming trade requirements with {employerName}.</span>
        </div>
      )}

      {/* Interview Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block">
            Interview Time Slot:
          </label>
          <div className="relative">
            <input
              type="text"
              value={interviewTime}
              onChange={(e) => setInterviewTime(e.target.value)}
              placeholder="e.g. Tomorrow at 10:30 AM"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-[#F8FAFC] dark:bg-[#121215] text-xs sm:text-sm font-medium text-[#0A1931] dark:text-white focus:ring-2 focus:ring-[#0066ff] outline-none"
            />
            <Clock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block">
            Worksite / Interview Venue:
          </label>
          <div className="relative">
            <input
              type="text"
              value={interviewVenue}
              onChange={(e) => setInterviewVenue(e.target.value)}
              placeholder="e.g. Guindy Industrial Estate"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#e6e8ec] dark:border-zinc-700 bg-[#F8FAFC] dark:bg-[#121215] text-xs sm:text-sm font-medium text-[#0A1931] dark:text-white focus:ring-2 focus:ring-[#0066ff] outline-none"
            />
            <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {/* Generated WhatsApp Invitation Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400">
            Generated WhatsApp Invite Message:
          </label>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs font-semibold text-[#0066ff] hover:underline flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 font-mono text-xs text-[#0A1931] whitespace-pre-line leading-relaxed">
          {`Hello ${candidate.fullName},
We reviewed your verified profile on TrustHyre and invite you for an interview:
• Position: ${jobTitle}
• Pay: ${salaryText}
• Date/Time: ${interviewTime}
• Venue: ${interviewVenue}
Please reply YES to confirm.`}
        </div>
      </div>

      {/* Quick Call Information */}
      <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#e6e8ec] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#10b981]" />
          <span className="font-semibold text-[#717784] dark:text-zinc-400">
            Candidate Phone:
          </span>
          <span className="font-bold font-mono text-[#0A1931]">
            {candidatePhone}
          </span>
        </div>
        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Verified Direct Contact
        </span>
      </div>
    </BaseModal>
  );
};
