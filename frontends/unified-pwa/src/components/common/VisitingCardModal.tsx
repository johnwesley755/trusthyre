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
import darkThemeLogo from '/assets/TrustHyre Logo with Skills Tagline.png';
import lightThemeLogo from '../../assets/TrustHyre Skills and Opportunities Logo.png';

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
    if (!cardRef.current) return;
    try {
      setIsGenerating(true);
      toast.info('Rendering your high-definition visiting card...');

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: themeMode === 'dark' ? '#070f1e' : '#ffffff',
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
      link.download = `${data.fullName.toLowerCase().replace(/\s+/g, '-')}-${themeMode}-card.png`;
      link.click();

      toast.success('Visiting Card downloaded! Share it on WhatsApp groups & status.');
    } catch (err: any) {
      console.error('Error generating card image:', err);
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
    toast.success('Profile link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
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
              <div className="w-9 h-9 rounded-xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 text-[#0f2f63] flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a] truncate tracking-tight">
                  Visiting Card
                </h3>
                <p className="text-[11px] text-[#717784] truncate">
                  Share directly on WhatsApp or download high-res PNG
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {/* Theme Toggle Button (Dark vs Light) */}
              <div className="flex items-center bg-[#f4f4f4] p-0.5 rounded-xl border border-[#e6e8ec]">
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? 'bg-[#0f2f63] text-white shadow-xs font-semibold'
                      : 'text-[#717784] hover:text-[#0a0a0a]'
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
                      : 'text-[#717784] hover:text-[#0a0a0a]'
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Container with Preview Card */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#f8f9fa] overscroll-contain flex flex-col items-center">
            
            {/* 📇 DUAL-THEME VISITING CARD */}
            <div 
              ref={cardRef}
              style={
                themeMode === 'dark'
                  ? {
                      backgroundColor: '#070f1e',
                      backgroundImage: 'radial-gradient(ellipse 90% 60% at 50% -20%, #152e55, transparent)',
                      color: '#ffffff',
                      borderColor: 'rgba(255, 255, 255, 0.12)'
                    }
                  : {
                      backgroundColor: '#ffffff',
                      backgroundImage: 'radial-gradient(ellipse 90% 60% at 50% -20%, #f0f4f9, transparent)',
                      color: '#0a0a0a',
                      borderColor: '#e2e8f0'
                    }
              }
              className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border relative overflow-hidden flex flex-col justify-between aspect-[1.6/1] min-h-[220px] sm:min-h-[250px]"
            >
              {/* Subtle Guilloche / Hairline Geometric Grid */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: themeMode === 'dark' 
                    ? 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)'
                    : 'radial-gradient(circle at 1px 1px, #0f2f63 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              />

              {/* TOP HEADER: Logo & Verified Specialist Pill */}
              <div className={`flex items-center justify-between relative z-10 border-b pb-3 ${
                themeMode === 'dark' ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <img 
                    src={themeMode === 'dark' ? darkThemeLogo : lightThemeLogo} 
                    alt="TrustHyre Logo" 
                    crossOrigin="anonymous"
                    className={`h-7 sm:h-8 w-auto object-contain block ${
                      themeMode === 'dark' ? 'brightness-110' : 'mix-blend-multiply'
                    }`}
                  />
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border ${
                  themeMode === 'dark'
                    ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>VERIFIED SPECIALIST</span>
                </div>
              </div>

              {/* MIDDLE ROW: Avatar + Worker Identity & Trade */}
              <div className="flex items-center gap-4 py-3 relative z-10">
                <div className="relative shrink-0">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden flex items-center justify-center shadow-lg ${
                    themeMode === 'dark' ? 'bg-slate-800 border-white/20' : 'bg-slate-100 border-slate-300'
                  }`}>
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
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 flex items-center justify-center shadow-xs ${
                    themeMode === 'dark' ? 'border-[#070f1e]' : 'border-white'
                  }`}>
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <h4 className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none truncate ${
                    themeMode === 'dark' ? 'text-white' : 'text-[#0a0a0a]'
                  }`}>
                    {data.fullName}
                  </h4>
                  <div className={`inline-block px-2.5 py-0.5 rounded-lg font-extrabold text-xs uppercase tracking-wider border ${
                    themeMode === 'dark'
                      ? 'bg-amber-400/15 border-amber-300/30 text-amber-300'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    {data.trade}
                  </div>
                  <p className={`text-[11px] flex items-center gap-1.5 font-medium pt-0.5 ${
                    themeMode === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>{data.city || 'Pan India'}</span>
                    <span className="opacity-50">•</span>
                    <span>{data.experienceYears || 1}+ Years Experience</span>
                  </p>
                </div>
              </div>

              {/* BOTTOM FOOTER: Verified Trust Ratings & Direct Phone Dial */}
              <div className={`pt-3 border-t flex items-center justify-between text-xs relative z-10 flex-wrap gap-2 ${
                themeMode === 'dark' ? 'border-white/10' : 'border-slate-200'
              }`}>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                  themeMode === 'dark'
                    ? 'bg-white/5 border-white/10 text-white'
                    : 'bg-slate-50 border-slate-200 text-[#0a0a0a]'
                }`}>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-extrabold text-xs">
                    {data.ratingAverage ? Number(data.ratingAverage).toFixed(1) : '5.0'}
                  </span>
                  <span className={`text-[10px] font-medium ${themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    ({data.ratingCount || 0} reviews)
                  </span>
                </div>

                <div className={`flex items-center gap-1.5 font-extrabold text-xs tracking-wide ${
                  themeMode === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
                }`}>
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
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
          <div className="p-4 sm:p-5 border-t border-[#e6e8ec] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-[#0a0a0a] hover:bg-slate-100 rounded-xl sm:rounded-full transition-colors cursor-pointer border border-[#e6e8ec] flex items-center justify-center gap-1.5 order-3 sm:order-1"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'Link Copied' : 'Copy Profile Link'}</span>
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
