import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Zap, 
  Sparkles,
  Loader2,
  Utensils,
  Home,
  Clock3,
  Fuel,
  Gift,
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { parsePhoneNumber } from './PhoneDisplay';

export interface JobPamphletData {
  id?: string;
  title: string;
  companyName: string;
  city?: string;
  location?: string;
  budget?: number | string | null;
  experienceYearsRequired?: number;
  perks?: string[];
  contactPhone?: string | null;
  isUrgentSpotHire?: boolean;
}

interface JobPamphletModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobPamphletData;
}

export const JobPamphletModal: React.FC<JobPamphletModalProps> = ({
  isOpen,
  onClose,
  job
}) => {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const parsedPhone = parsePhoneNumber(job.contactPhone);
  const formattedPhone = parsedPhone
    ? `${parsedPhone.countryCode} ${parsedPhone.formattedNumber}`
    : job.contactPhone || 'Apply via TrustHyre';

  const shareUrl = `${window.location.origin}/job/${job.id || ''}`;

  const perksList: string[] = Array.isArray(job.perks) ? job.perks : [];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.success('Job link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    try {
      setIsGenerating(true);
      toast.info('Rendering your high-definition hiring flyer...');

      // Sanitize oklab/oklch colors on the cloned DOM so standard html2canvas parses reliably
      const canvas = await html2canvas(flyerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: (clonedDoc) => {
          const oklabRegex = /okla(?:b|ch)\([^)]+\)/gi;
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach((style) => {
            if (style.textContent && oklabRegex.test(style.textContent)) {
              style.textContent = style.textContent.replace(oklabRegex, 'rgb(15, 47, 99)');
            }
          });
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${job.title.toLowerCase().replace(/\s+/g, '-')}-hiring-poster.png`;
      link.click();

      toast.success('Hiring Flyer downloaded! Share it on WhatsApp groups and status.');
    } catch (err: any) {
      console.error('Error generating pamphlet image:', err);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    const perksText = perksList.length > 0 ? `\n🎁 Perks: ${perksList.join(', ')}` : '';
    const text = `🚨 *URGENT HIRING: ${job.title}*\n\n` +
      `🏢 Company: ${job.companyName}\n` +
      `💰 Salary / Wages: ${job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Market Standard'}\n` +
      `📍 Location: ${job.location || job.city || 'Pan India'}` +
      `${perksText}\n` +
      `📞 Direct HR Contact: ${formattedPhone}\n\n` +
      `Apply directly with verified profile (Zero Middlemen & No Fees):\n` +
      `${shareUrl}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Onest',system-ui,sans-serif]"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isGenerating) onClose();
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
          className="bg-white rounded-2xl sm:rounded-3xl border border-[#e6e8ec] shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8ec] bg-white shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] truncate tracking-tight">
                  Instant Hiring Flyer & Pamphlet
                </h3>
                <p className="text-[11px] text-[#717784] truncate">
                  High-contrast visual poster optimized for WhatsApp Status & local groups
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 ml-2 cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Container with Flyer Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/70 overscroll-contain flex flex-col items-center">
            
            {/* The WorkIndia-style High-Contrast Flyer Canvas */}
            <div 
              ref={flyerRef}
              className="w-full max-w-md bg-white border-4 border-[#0f2f63] rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-4"
            >
              {/* Top Banner: Brand + Urgent Tag */}
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-[#0f2f63] tracking-tight">
                    Trust<span className="text-emerald-600">Hyre</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    Direct Verified Hire
                  </span>
                </div>

                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-xs animate-pulse">
                  ⚡ Immediate Joining
                </span>
              </div>

              {/* Title & Employer */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Wanted Urgently:
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#0a0a0a] leading-tight">
                  {job.title}
                </h2>
                <p className="text-xs font-semibold text-slate-600">
                  {job.companyName} • <span className="text-slate-500 font-normal">{job.location || job.city || 'Pan India'}</span>
                </p>
              </div>

              {/* Salary Hero Box */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 text-center space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Guaranteed Compensation:
                </span>
                <p className="text-2xl font-black text-emerald-700 tracking-tight">
                  {job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Best Market Wages'}
                  <span className="text-xs font-bold text-emerald-800 ml-1">/ month</span>
                </p>
              </div>

              {/* Perks Highlights Grid */}
              {perksList.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Facilities & Benefits:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {perksList.map((p, idx) => {
                      const lower = String(p).toLowerCase();
                      let icon = <Gift className="w-3 h-3 text-emerald-600" />;
                      let label = p;
                      let bg = "bg-emerald-50 text-emerald-900 border-emerald-200";

                      if (lower.includes('food') || lower.includes('meal')) {
                        icon = <Utensils className="w-3 h-3 text-amber-600" />;
                        label = "Free Food / Meals";
                        bg = "bg-amber-50 text-amber-900 border-amber-200";
                      } else if (lower.includes('room') || lower.includes('accommodation') || lower.includes('lodging')) {
                        icon = <Home className="w-3 h-3 text-indigo-600" />;
                        label = "Room / Stay Provided";
                        bg = "bg-indigo-50 text-indigo-900 border-indigo-200";
                      } else if (lower.includes('daily') || lower.includes('weekly')) {
                        icon = <Zap className="w-3 h-3 text-emerald-600" />;
                        label = "Daily / Weekly Pay";
                        bg = "bg-emerald-50 text-emerald-900 border-emerald-200";
                      } else if (lower.includes('ot') || lower.includes('overtime')) {
                        icon = <Clock3 className="w-3 h-3 text-blue-600" />;
                        label = "Overtime (OT) Pay";
                        bg = "bg-blue-50 text-blue-900 border-blue-200";
                      } else if (lower.includes('travel') || lower.includes('fuel')) {
                        icon = <Fuel className="w-3 h-3 text-purple-600" />;
                        label = "Travel Allowance";
                        bg = "bg-purple-50 text-purple-900 border-purple-200";
                      }

                      return (
                        <span 
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs ${bg}`}
                        >
                          {icon}
                          <span>{label}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Call to Action Footer Box */}
              <div className="pt-2 border-t-2 border-slate-100 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    To Apply Instantly Call:
                  </span>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-sm sm:text-base">
                    <Phone className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                    <span>{formattedPhone}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                    Zero Fees
                  </span>
                  <span className="text-[10px] font-extrabold text-[#0f2f63]">
                    TrustHyre Verified
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center max-w-sm">
              💡 Visual flyers shared on WhatsApp Status get <strong>10x more views</strong> than regular web links from frontline candidates.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="p-4 sm:p-5 border-t border-[#e6e8ec] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-[#0a0a0a] hover:bg-slate-100 rounded-xl sm:rounded-full transition-colors cursor-pointer border border-[#e6e8ec] flex items-center justify-center gap-1.5 order-3 sm:order-1"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'Link Copied' : 'Copy Job Link'}</span>
            </button>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-[#0f2f63] bg-[#0f2f63]/8 hover:bg-[#0f2f63]/15 rounded-xl sm:rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download Flyer</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-[#25D366] hover:bg-[#20ba59] rounded-xl sm:rounded-full transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share to WhatsApp</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

