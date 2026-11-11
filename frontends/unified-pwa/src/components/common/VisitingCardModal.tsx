import React, { useRef, useState } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  ShieldCheck, 
  Star, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { parsePhoneNumber } from './PhoneDisplay';
import { sanitizeClonedDocumentForHtml2Canvas } from '../../utils/html2canvasSanitizer';
import { darkThemeLogoDataUrl, lightThemeLogoDataUrl } from '../../assets/logoBase64';

export interface VisitingCardData {
  id?: string;
  fullName: string;
  trade: string;
  profileImageUrl?: string;
  phoneNumber?: string;
  city?: string;
  experienceYears?: number;
  ratingAverage?: number;
  ratingCount?: number;
  trustScore?: number;
  isVerified?: boolean;
}

interface VisitingCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: VisitingCardData;
}

export const VisitingCardModal: React.FC<VisitingCardModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const parsedPhone = parsePhoneNumber(data.phoneNumber);
  const formattedPhone = parsedPhone
    ? `${parsedPhone.countryCode} ${parsedPhone.formattedNumber}`
    : data.phoneNumber || 'Available on TrustHyre';

  const shareUrl = `${window.location.origin}/worker/${data.id || ''}`;

  const handleDownload = async () => {
    if (!cardRef.current || isGenerating) return;
    try {
      setIsGenerating(true);

      const element = cardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: themeMode === 'dark' ? '#070f1e' : '#ffffff',
        logging: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          sanitizeClonedDocumentForHtml2Canvas(clonedDoc);
        }
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${(data.fullName || 'candidate').toLowerCase().replace(/\s+/g, '-')}-${themeMode}-card.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Single clean notification (dismiss previous ones to prevent stacking)
      toast.dismiss();
      toast.success('Visiting Card downloaded! Share it on WhatsApp groups & status.');
    } catch (err: any) {
      console.error('Error generating card image:', err);
      toast.dismiss();
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    const text = `📇 *${data.fullName}* - Verified *${data.trade}* on TrustHyre\n\n` +
      `⭐ Rating: ${data.ratingAverage ? `${Number(data.ratingAverage).toFixed(1)}/5 (${data.ratingCount || 0} reviews)` : 'Verified Specialist'}\n` +
      `📍 Location: ${data.city || 'Pan India'}\n` +
      `🛠️ Experience: ${data.experienceYears || 1}+ Years\n` +
      `📞 Direct Phone: ${formattedPhone}\n\n` +
      `View verified credentials & hire directly on TrustHyre (Zero Middlemen):\n` +
      `${shareUrl}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    toast.dismiss();
    toast.success('Profile link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif]"
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
          className="bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-white dark:text-zinc-100 rounded-2xl sm:rounded-3xl border border-[#e6e8ec] dark:border-zinc-800 shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#1C1C21] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 text-[#0f2f63] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] truncate tracking-tight">
                  Visiting Card
                </h3>
                <p className="text-[11px] text-[#717784] dark:text-zinc-400 truncate">
                  Share directly on WhatsApp or download high-res PNG
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Theme Toggle Button (Dark vs Light) */}
              <div className="flex items-center bg-[#f4f4f4] dark:bg-[#121215] p-0.5 rounded-xl border border-[#e6e8ec] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? 'bg-[#0f2f63] text-white shadow-xs font-semibold'
                      : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a]'
                  }`}
                  title="Dark theme"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? 'bg-[#0f2f63] text-white shadow-xs font-semibold'
                      : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a]'
                  }`}
                  title="Light theme"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Light</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-300 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container with Preview Card */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8f9fa] dark:bg-[#000000] overscroll-contain flex flex-col items-center">
            
            {/* 📇 DUAL-THEME VISITING CARD */}
            <div 
              ref={cardRef}
              style={{
                backgroundColor: themeMode === 'dark' ? '#070f1e' : '#ffffff',
                backgroundImage: themeMode === 'dark'
                  ? 'linear-gradient(135deg, #091326 0%, #102544 50%, #070f1e 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)',
                color: themeMode === 'dark' ? '#ffffff' : '#0a0a0a',
                borderColor: themeMode === 'dark' ? '#1e293b' : '#cbd5e1'
              }}
              className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border relative overflow-hidden flex flex-col justify-between min-h-[250px] sm:min-h-[265px]"
            >
              {/* TOP HEADER: Logo & Verified Specialist Pill */}
              <div 
                style={{
                  borderBottomColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                }}
                className="flex items-center justify-between relative z-10 border-b pb-3.5"
              >
                <div className="flex items-center gap-2">
                  <img 
                    src={themeMode === 'dark' ? darkThemeLogoDataUrl : lightThemeLogoDataUrl} 
                    alt="TrustHyre" 
                    className="h-7 sm:h-8 w-auto object-contain block"
                  />
                </div>

                <div 
                  style={{
                    backgroundColor: themeMode === 'dark' ? '#064e3b' : '#ecfdf5',
                    borderColor: themeMode === 'dark' ? '#059669' : '#a7f3d0',
                    color: themeMode === 'dark' ? '#6ee7b7' : '#065f46'
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>VERIFIED SPECIALIST</span>
                </div>
              </div>

              {/* MIDDLE ROW: Avatar + Worker Identity & Trade */}
              <div className="flex items-center gap-4 py-4 relative z-10">
                <div className="relative shrink-0">
                  <div 
                    style={{
                      backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f1f5f9',
                      borderColor: themeMode === 'dark' ? '#334155' : '#cbd5e1'
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center shadow-lg"
                  >
                    {data.profileImageUrl ? (
                      <img 
                        src={data.profileImageUrl} 
                        alt={data.fullName}
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0f2f63] flex items-center justify-center font-bold text-xl text-white">
                        {data.fullName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div 
                    style={{
                      borderColor: themeMode === 'dark' ? '#070f1e' : '#ffffff'
                    }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 flex items-center justify-center shadow-xs"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="min-w-0 space-y-1.5 flex-1">
                  <h4 
                    style={{
                      color: themeMode === 'dark' ? '#ffffff' : '#0f172a'
                    }}
                    className="text-lg sm:text-xl font-black tracking-tight leading-normal"
                  >
                    {data.fullName}
                  </h4>
                  <div>
                    <span 
                      style={{
                        backgroundColor: themeMode === 'dark' ? '#451a03' : '#fef3c7',
                        borderColor: themeMode === 'dark' ? '#b45309' : '#fcd34d',
                        color: themeMode === 'dark' ? '#fcd34d' : '#92400e'
                      }}
                      className="inline-block px-2.5 py-0.5 rounded-lg font-black text-xs uppercase tracking-wider border shadow-2xs"
                    >
                      {data.trade}
                    </span>
                  </div>
                  <p 
                    style={{
                      color: themeMode === 'dark' ? '#cbd5e1' : '#475569'
                    }}
                    className="text-[11px] flex items-center gap-1.5 font-semibold"
                  >
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{data.city || 'Pan India'}</span>
                    <span className="opacity-40">•</span>
                    <span>{data.experienceYears || 1}+ Years Experience</span>
                  </p>
                </div>
              </div>

              {/* BOTTOM FOOTER: Verified Trust Ratings & Direct Phone Dial */}
              <div 
                style={{
                  borderTopColor: themeMode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                }}
                className="pt-3.5 border-t flex items-center justify-between text-xs relative z-10 flex-wrap gap-2"
              >
                <div 
                  style={{
                    backgroundColor: themeMode === 'dark' ? '#0f172a' : '#ffffff',
                    borderColor: themeMode === 'dark' ? '#334155' : '#e2e8f0',
                    color: themeMode === 'dark' ? '#ffffff' : '#0f172a'
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-2xs"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-extrabold text-xs">
                    {data.ratingAverage ? Number(data.ratingAverage).toFixed(1) : '5.0'}
                  </span>
                  <span 
                    style={{
                      color: themeMode === 'dark' ? '#94a3b8' : '#64748b'
                    }}
                    className="text-[10px] font-medium"
                  >
                    ({data.ratingCount || 0} reviews)
                  </span>
                </div>

                <div 
                  style={{
                    color: themeMode === 'dark' ? '#6ee7b7' : '#047857'
                  }}
                  className="flex items-center gap-1.5 font-extrabold text-xs tracking-wide"
                >
                  <div 
                    style={{
                      backgroundColor: themeMode === 'dark' ? '#064e3b' : '#ecfdf5',
                      borderColor: themeMode === 'dark' ? '#059669' : '#a7f3d0'
                    }}
                    className="w-6 h-6 rounded-lg border flex items-center justify-center"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span>{formattedPhone}</span>
                </div>
              </div>
            </div>

            {/* Helper Info Note */}
            <div className="flex items-center gap-2 p-3 bg-blue-50/80 border border-blue-200/80 rounded-2xl max-w-md w-full">
              <ShieldCheck className="w-4 h-4 text-[#0f2f63] shrink-0" />
              <p className="text-[11px] text-[#0a0a0a] leading-relaxed">
                <strong className="font-bold">Zero Agency Fees:</strong> Employers and contractors who view this card can call you directly with verified wage protection.
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="p-4 sm:p-5 border-t border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#16161A] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl sm:rounded-full transition-colors cursor-pointer border border-[#e6e8ec] dark:border-zinc-700 flex items-center justify-center gap-1.5 order-3 sm:order-1"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />}
              <span>{isCopied ? 'Link Copied' : 'Copy Profile Link'}</span>
            </button>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-[#0f2f63] dark:text-[#38BDF8] bg-[#0f2f63]/8 dark:bg-blue-950/40 hover:bg-[#0f2f63]/15 dark:hover:bg-blue-900/40 rounded-xl sm:rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download {themeMode === 'dark' ? 'Dark' : 'Light'} Card</span>
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
