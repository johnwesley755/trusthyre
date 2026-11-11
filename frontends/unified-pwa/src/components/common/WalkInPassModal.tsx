import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Printer, 
  Sparkles,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { BaseModal } from './BaseModal';

interface WalkInPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    companyName: string;
    city?: string;
    location?: string;
    walkInDetails?: {
      venueAddress?: string;
      dates?: string;
      timing?: string;
      contactPerson?: string;
      requirements?: string[];
      instructions?: string;
    };
    contactPhone?: string | null;
  };
  candidate: {
    fullName: string;
    trade: string;
    phone: string;
    experienceYears?: number;
    profileId?: string;
  };
}

export const WalkInPassModal: React.FC<WalkInPassModalProps> = ({
  isOpen,
  onClose,
  job,
  candidate
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const walkIn = job.walkInDetails;
  const venue = walkIn?.venueAddress || job.location || job.city || 'Company Works';
  const dates = walkIn?.dates || 'Ongoing this week';
  const timing = walkIn?.timing || '10:00 AM - 04:00 PM';
  const hrName = walkIn?.contactPerson || 'HR Manager';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${job.city || ''}`)}`;

  const passMessage = `🎫 *OFFICIAL WALKIN INTERVIEW PASS — TRUSTHYRE*\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏢 *Company:* ${job.companyName}\n` +
    `💼 *Role:* ${job.title}\n` +
    `📅 *Walk-in Window:* ${dates}\n` +
    `⏰ *Timing:* ${timing}\n` +
    `📍 *Venue:* ${venue}\n\n` +
    `👤 *CANDIDATE DETAILS:*\n` +
    `• Name: ${candidate.fullName}\n` +
    `• Trade: ${candidate.trade}\n` +
    `• Exp: ${candidate.experienceYears || 1}+ Years\n` +
    `• Phone: ${candidate.phone}\n\n` +
    `🗺️ *Google Maps Venue Directions:*\n${mapsUrl}\n\n` +
    `🛡️ Verified on TrustHyre (Zero Middlemen & No Agency Fees)\n` +
    `Candidate Profile: ${window.location.origin}/worker/${candidate.profileId || ''}`;

  const handleShareToWhatsApp = () => {
    const targetPhone = job.contactPhone ? job.contactPhone.replace(/\D/g, '') : '';
    const whatsappUrl = targetPhone 
      ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(passMessage)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(passMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyPass = () => {
    navigator.clipboard.writeText(passMessage);
    setIsCopied(true);
    toast.success('Interview Pass copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Walk-In Admit Pass"
      subtitle="Direct entry verification for physical interview"
      icon={<ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
      iconBgColor="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
      maxWidth="md"
      bodyClassName="p-4 sm:p-5 space-y-4 bg-[#F8FAFC] dark:bg-[#1C1C21] text-[#0A1931] dark:text-zinc-100"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyPass}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-700 text-[#0A1931] dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Copied!' : 'Copy Pass'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-white dark:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-700 text-[#0A1931] dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareToWhatsApp}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm bg-[#0066ff] hover:bg-[#0052cc] active:bg-[#003d99] text-white shadow-md transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Send to WhatsApp</span>
          </button>
        </div>
      }
    >
      {/* The Ticket Pass */}
      <div className="bg-white dark:bg-[#121215] rounded-2xl border-2 border-dashed border-[#e6e8ec] dark:border-zinc-800 p-4 sm:p-5 relative overflow-hidden shadow-xs space-y-4">
        {/* Top Header of Ticket */}
        <div className="flex items-start justify-between gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/60 uppercase tracking-wider inline-block mb-1">
              ✓ Verified Gate Pass
            </span>
            <h4 className="text-base font-bold text-[#0A1931] dark:text-white leading-tight">
              {job.title}
            </h4>
            <p className="text-xs font-semibold text-[#717784] dark:text-zinc-400 mt-0.5 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#0066ff] dark:text-[#38BDF8]" />
              <span>{job.companyName}</span>
            </p>
          </div>

          <div className="w-14 h-14 bg-slate-900 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-white shrink-0 p-1 border border-zinc-700">
            <QrCode className="w-full h-full text-white" />
          </div>
        </div>

        {/* Candidate Credentials Box */}
        <div className="bg-[#F8FAFC] dark:bg-[#16161A] rounded-xl p-3 border border-[#e6e8ec] dark:border-zinc-800 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 block">Candidate</span>
            <span className="font-bold text-[#0A1931] dark:text-white truncate block mt-0.5">
              {candidate.fullName}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 block">Verified Trade</span>
            <span className="font-bold text-[#0066ff] dark:text-[#38BDF8] truncate block mt-0.5">
              {candidate.trade}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 block">Contact</span>
            <span className="font-mono text-[#0A1931] dark:text-white block mt-0.5">
              {candidate.phone}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 block">Experience</span>
            <span className="font-bold text-[#0A1931] dark:text-white block mt-0.5">
              {candidate.experienceYears || 1}+ Years
            </span>
          </div>
        </div>

        {/* Walk-in Timing & Address */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <span className="font-bold text-amber-950 dark:text-amber-200">{dates}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#717784] dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
              <span className="font-semibold text-[#0A1931] dark:text-white">{timing}</span>
            </div>
          </div>

          <div className="p-3 bg-[#F8FAFC] dark:bg-[#16161A] rounded-xl border border-[#e6e8ec] dark:border-zinc-800 space-y-1.5">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 block">Interview Worksite Venue:</span>
                <p className="text-xs font-semibold text-[#0A1931] dark:text-white mt-0.5 leading-relaxed">
                  {venue}
                </p>
              </div>
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0066ff] dark:text-[#38BDF8] hover:underline pl-6"
            >
              <span>Open in Google Maps Directions</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>

        {/* Gate Instructions Alert */}
        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2 text-[11px] text-[#0f2f63] dark:text-blue-200">
          <ShieldCheck className="w-4 h-4 text-[#0066ff] dark:text-[#38BDF8] shrink-0 mt-0.5" />
          <p>
            Show this digital screen pass at the company security gate. No registration charges or contractor cuts allowed.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
