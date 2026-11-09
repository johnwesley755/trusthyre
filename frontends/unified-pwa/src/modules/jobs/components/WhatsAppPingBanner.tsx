import React, { useState } from 'react';
import { Send, CheckCircle2, Loader2, Sparkles, Phone, MessageSquare } from 'lucide-react';
import { searchAlertService } from '../../../services/searchAlert.service';
import { toast } from 'sonner';

interface WhatsAppPingBannerProps {
  city?: string;
  taluk?: string;
  trade?: string;
  onSubscribed?: () => void;
  className?: string;
}

export const WhatsAppPingBanner: React.FC<WhatsAppPingBannerProps> = ({
  city = 'Chennai',
  taluk,
  trade,
  onSubscribed,
  className = ''
}) => {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const cleanCity = city || 'Chennai';
  const roleLabel = trade && trade !== 'All' ? trade : 'verified';
  const locationLabel = taluk ? `${taluk}, ${cleanCity}` : cleanCity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digitsOnly = phone.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number for WhatsApp alerts.');
      return;
    }

    try {
      setIsSubmitting(true);
      await searchAlertService.quickSubscribeWhatsApp({
        phone: digitsOnly.slice(-10),
        city: cleanCity,
        talukSlug: taluk ? taluk.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined,
        tradeSlug: trade && trade !== 'All' ? trade.toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined
      });

      setIsDone(true);
      toast.success(`Subscribed! You will receive new ${roleLabel} jobs in ${locationLabel} on WhatsApp.`);
      if (onSubscribed) onSubscribed();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to activate WhatsApp job alerts. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`rounded-2xl p-4 sm:p-5 border shadow-xs transition-all relative overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-800 text-white ${className}`}>
      {/* Background WhatsApp icon watermark */}
      <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
        <svg className="w-40 h-40 fill-white" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>1-Click WhatsApp Job Ping</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            Get instant alerts for <span className="text-emerald-400 font-extrabold">{roleLabel}</span> jobs in <span className="text-emerald-300 underline underline-offset-4 decoration-emerald-500/60">{locationLabel}</span>
          </h3>
          <p className="text-xs text-slate-300 leading-normal">
            No resume or app download needed. Receive direct HR phone numbers and walk-in directions straight to WhatsApp.
          </p>
        </div>

        {/* Form or Success State */}
        <div className="w-full md:w-auto shrink-0">
          {isDone ? (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 border border-emerald-400/50 rounded-xl text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>WhatsApp Alerts Activated!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-md">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  maxLength={10}
                  placeholder="Enter 10-digit WhatsApp"
                  className="w-full pl-11 pr-3 py-2.5 bg-slate-800/80 border border-slate-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 rounded-xl text-xs font-medium text-white placeholder-slate-400 outline-none transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || phone.length < 10}
                className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-slate-950 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 fill-current" />
                    <span>Subscribe</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
