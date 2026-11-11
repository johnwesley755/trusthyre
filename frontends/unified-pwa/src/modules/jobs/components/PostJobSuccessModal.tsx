import React, { useState } from 'react';
import { CheckCircle2, Copy, ArrowRight, X, Sparkles, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { buildEmployerBroadcastMessage, openWhatsAppShare } from '../../../utils/whatsappTemplate.utils';

interface PostJobSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    title: string;
    companyName?: string;
    city?: string;
    location?: string;
    budget?: number;
    coverImageUrl?: string | null;
  };
}

export const PostJobSuccessModal: React.FC<PostJobSuccessModalProps> = ({
  isOpen,
  onClose,
  job,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const jobUrl = `${window.location.origin}/job/${job.id}?utm_source=whatsapp&utm_medium=employer_broadcast`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(jobUrl);
      setCopied(true);
      toast.success('Application link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy link.');
    }
  };

  const handleWhatsAppBroadcast = () => {
    const message = buildEmployerBroadcastMessage({
      id: job.id,
      title: job.title,
      companyName: job.companyName,
      city: job.city || job.location,
      budget: job.budget,
    });
    openWhatsAppShare(message);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm font-['Onest',system-ui,sans-serif]">
      <div className="w-full max-w-lg bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-white dark:text-zinc-100 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative border border-slate-200 dark:border-zinc-800 border-[#e6e8ec] animate-[fadeRise_0.3s_ease-out]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Celebration Badge */}
        <div className="text-center space-y-2">
          {job.coverImageUrl ? (
            <div className="w-full h-32 sm:h-36 rounded-2xl overflow-hidden border border-[#e6e8ec] relative shadow-inner mb-2 bg-slate-900">
              <img
                src={job.coverImageUrl}
                alt={job.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute bottom-2 left-3 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>Custom Workplace Photo</span>
              </span>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          )}
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 text-[#0f2f63] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Job Opening Published Live!
          </span>
          <h2 className="text-2xl font-extrabold text-[#0a0a0a] tracking-tight">
            {job.title}
          </h2>
          <p className="text-xs text-[#717784] dark:text-zinc-400 flex items-center justify-center gap-2">
            <span>{job.companyName || 'Verified Employer'}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3 text-[#0f2f63]" />
              {job.city || job.location || 'India'}
            </span>
          </p>
        </div>

        {/* WhatsApp Broadcast Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-emerald-50/40 to-slate-50 border border-emerald-200/80 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Receive Applicants 3x Faster via WhatsApp
              </h3>
              <p className="text-xs text-emerald-900/80 leading-relaxed mt-0.5">
                Broadcast this opening directly to your trade groups, contractors, and local vendor circles. Workers can tap and apply instantly without registration barriers.
              </p>
            </div>
          </div>

          <button
            onClick={handleWhatsAppBroadcast}
            className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>Broadcast Opening to WhatsApp</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={handleCopyLink}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0a0a0a] font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
            <span>{copied ? 'Link Copied!' : 'Copy Direct Link'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-[#0f2f63] hover:bg-[#2563c9] text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 shadow-xs"
          >
            <span>Manage Candidates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};

