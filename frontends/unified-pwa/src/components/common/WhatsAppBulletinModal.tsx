import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Check, 
  Copy, 
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { Job } from '../../types';

interface WhatsAppBulletinModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  city?: string;
  industry?: string;
}

export const WhatsAppBulletinModal: React.FC<WhatsAppBulletinModalProps> = ({
  isOpen,
  onClose,
  jobs,
  city = 'Local Area',
  industry = 'All Trades'
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const activeJobs = jobs.filter(j => j.status === 'OPEN').slice(0, 5);
  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const bulletinText = `🔥 *TODAY'S URGENT VERIFIED OPENINGS IN ${city.toUpperCase()} (${todayFormatted.toUpperCase()})*\n` +
    `⚡ Direct Company Hiring • Zero Agency Fees • No Middlemen\n\n` +
    activeJobs.map((job, idx) => {
      const num = idx + 1;
      const salary = job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Market Standard';
      const employer = job.employerProfile?.companyName || job.employerName || 'Verified Employer';
      const phone = job.contactPhone || (job.additionalDetails as any)?.contactPhone;
      const phoneLine = phone ? ` | 📞 Call HR: ${phone}` : '';
      return `${num}️⃣ *${job.title}*\n` +
        `   🏢 ${employer}\n` +
        `   💰 Salary: ${salary}\n` +
        `   📍 Location: ${job.location || job.city || city}${phoneLine}\n` +
        `   📲 Apply Link: ${window.location.origin}/job/${job.id}`;
    }).join('\n\n') +
    `\n\n🛡️ *TrustHyre Guarantee:*\n` +
    `All jobs are 100% free. Never pay money for any interview or registration.\n\n` +
    `👉 View all openings & apply in 1 tap:\n${window.location.origin}/search?city=${encodeURIComponent(city)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bulletinText);
    setIsCopied(true);
    toast.success('Job Bulletin copied to clipboard! Ready to paste into WhatsApp groups.');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(bulletinText)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif]"
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
          className="bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-white dark:text-zinc-100 rounded-2xl sm:rounded-3xl border border-[#e6e8ec] dark:border-zinc-800 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] truncate tracking-tight">
                  WhatsApp Daily Job Bulletin
                </h3>
                <p className="text-[11px] text-[#717784] dark:text-zinc-400 truncate">
                  Share verified jobs with local groups & community contacts
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-300 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Bulletin Preview Card */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#f8f9fa] dark:bg-[#1C1C21]">
            <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[#0a0a0a] dark:text-white text-xs">
                    {city} • {industry}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">
                  {todayFormatted}
                </span>
              </div>

              <div className="space-y-3 text-slate-700 dark:text-zinc-300">
                <p className="font-extrabold text-slate-900 dark:text-white text-xs">
                  🔥 TODAY'S URGENT VERIFIED OPENINGS IN {city.toUpperCase()}
                </p>
                <div className="space-y-2">
                  {activeJobs.map((j, i) => (
                    <div key={j.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#16161A] border border-slate-100 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{i + 1}. {j.title}</span>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                          {j.budget ? `₹${Number(j.budget).toLocaleString('en-IN')}` : 'Market Standard'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                        <span>{j.employerProfile?.companyName || j.employerName || 'Verified Employer'}</span>
                        <span>{j.location || j.city || city}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zero Agency Fees • Direct HR Connections • 100% Free Guarantee</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 text-center">
              💡 Sharing this bulletin into local trade WhatsApp groups connects fellow workers with zero-fee livelihoods.
            </p>
          </div>

          {/* Action Row */}
          <div className="p-4 sm:p-5 border-t border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#16161A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl sm:rounded-full transition-colors cursor-pointer border border-[#e6e8ec] dark:border-zinc-700 flex items-center justify-center gap-1.5 order-2 sm:order-1"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />}
              <span>{isCopied ? 'Copied' : 'Copy Bulletin Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-xl sm:rounded-full transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98 order-1 sm:order-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share to WhatsApp Groups</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

