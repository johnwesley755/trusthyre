import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  User, 
  Phone, 
  Briefcase, 
  ShieldCheck, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
      dates?: string;
      timing?: string;
      venueAddress?: string;
      contactPerson?: string;
      landmark?: string;
    } | null;
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
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Onest',system-ui,sans-serif]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#e6e8ec] shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8ec] bg-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] truncate tracking-tight">
                  Official Walk-In Admit Pass
                </h3>
                <p className="text-[11px] text-[#717784] truncate">
                  Direct entry verification for physical interview
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pass Body / Boarding Pass Style Card */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#f8f9fa]">
            
            {/* The Ticket Pass */}
            <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-5 shadow-sm space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b pb-3 border-amber-100">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
                    TrustHyre FastTrack
                  </span>
                  <h4 className="font-extrabold text-[#0a0a0a] text-base leading-tight mt-0.5">
                    {job.title}
                  </h4>
                  <p className="text-xs text-[#717784] font-medium">{job.companyName}</p>
                </div>
                <div className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-full text-[10px] font-bold border border-amber-300">
                  Confirmed Pass
                </div>
              </div>

              {/* Candidate credentials block */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/60 space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-semibold">Candidate:</span>
                  <span className="font-bold text-[#0a0a0a]">{candidate.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-semibold">Trade & Skill:</span>
                  <span className="font-bold text-[#0f2f63]">{candidate.trade}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600 font-semibold">Mobile:</span>
                  <span className="font-bold text-emerald-800">{candidate.phone}</span>
                </div>
              </div>

              {/* Venue & Timing specs */}
              <div className="space-y-2 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0a0a0a] block">Dates: {dates}</span>
                    <span className="text-[11px] text-slate-500">Timing: {timing}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-[#0a0a0a] block">Venue / Landmark:</span>
                    <p className="text-[11px] text-slate-600 leading-snug">{venue}</p>
                  </div>
                </div>

                {hrName && (
                  <div className="flex items-center gap-2 pt-1">
                    <User className="w-4 h-4 text-[#0f2f63] shrink-0" />
                    <span className="text-[11px] text-slate-600">
                      Report to: <strong className="font-bold text-[#0a0a0a]">{hrName}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Google Maps link */}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors no-underline"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#0f2f63]" />
                <span>Open Walk-in Venue on Google Maps</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              💡 Sending this pass directly to the HR manager alerts them that you are traveling for the interview.
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 sm:p-5 border-t border-[#e6e8ec] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyPass}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-[#0a0a0a] hover:bg-slate-100 rounded-xl sm:rounded-full transition-colors cursor-pointer border border-[#e6e8ec] flex items-center justify-center gap-1.5 order-2 sm:order-1"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
              <span>{isCopied ? 'Pass Copied' : 'Copy Pass Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-xl sm:rounded-full transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 order-1 sm:order-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send Pass to HR on WhatsApp</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

