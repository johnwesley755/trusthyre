import { useState, useEffect } from 'react';
import { Bookmark, MapPin, CheckCircle2, ArrowRight, ShieldCheck, Clock, Calendar, ExternalLink, Globe, Phone, Utensils, Home, Zap, Clock3, Fuel, Gift, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppLoader } from '../../../components/common/AppLoader';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { useAuth } from '../../../providers/AuthContext';
import { useTranslation } from '../../../providers/TranslationContext';
import { buildJobWhatsAppMessage, openWhatsAppShare } from '../../../utils/whatsappTemplate.utils';
import { TranslateText } from '../../../components/common/TranslateText';
import { getEffectiveCoverUrl, resolveJobCategoryLabel } from '../../../utils/coverImage.utils';
import { generateJobSeoSlug, generateHierarchicalJobUrl } from '../../../utils/seoSlug.utils';
import { JobPamphletModal } from '../../../components/common/JobPamphletModal';
import { WalkInPassModal } from '../../../components/common/WalkInPassModal';
import { InterviewPrepKitModal } from '../../../components/common/InterviewPrepKitModal';
import { audioBriefing } from '../../../utils/audioBriefing.utils';

export interface JobCardData {
  id: string;
  title: string;
  description?: string;
  industry?: string;
  jobType?: string;
  location?: string;
  city?: string;
  budget?: number;
  dailyRate?: number | null;
  wageViewMode?: 'monthly' | 'daily';
  experienceYearsRequired?: number;
  status?: string;
  createdAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  isExternal?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  alternateSources?: Array<{ sourceName: string; sourceUrl: string; dateSeen?: string }>;
  coverImageUrl?: string | null;
  cover_image_url?: string | null;
  employerProfile?: {
    id?: string;
    companyName?: string;
    isVerified?: boolean;
    city?: string;
    logoUrl?: string;
  } | null;
  hasApplied?: boolean;
  applicationStatus?: string;
  perks?: string[];
  allowDirectCall?: boolean;
  allow_direct_call?: boolean;
  allowDirectWhatsapp?: boolean;
  allow_direct_whatsapp?: boolean;
  contactPhone?: string | null;
  contact_phone?: string | null;
  contactWhatsapp?: string | null;
  contact_whatsapp?: string | null;
  additionalDetails?: any;
  isUrgentSpotHire?: boolean;
  isWalkInInterview?: boolean;
  walkInDetails?: any;
  requiredDocuments?: string[];
  required_documents?: string[];
  payoutFrequency?: string;
  payout_frequency?: string;
  payoutGuaranteeBadge?: boolean;
  payout_guarantee_badge?: boolean;
}

interface JobSearchResultCardProps {
  job: JobCardData;
  onApply?: (jobId: string) => void;
  isApplying?: boolean;
}

export const JobSearchResultCard: React.FC<JobSearchResultCardProps> = ({
  job,
  onApply,
  isApplying = false,
}) => {
  const navigate = useNavigate();
  const { isJobSaved, toggleSaveJob } = useSavedStore();
  const isSaved = isJobSaved(job.id);
  const { user } = useAuth();
  const isEmployer = Boolean(user && user.role === 'EMPLOYER');
  const [imageError, setImageError] = useState(false);
  const [isPamphletOpen, setIsPamphletOpen] = useState(false);
  const [isWalkInPassOpen, setIsWalkInPassOpen] = useState(false);
  const [isPrepKitOpen, setIsPrepKitOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const effectiveCoverUrl = !imageError ? getEffectiveCoverUrl(job) : null;

  useEffect(() => {
    const unsubscribe = audioBriefing.subscribe((speaking) => {
      if (!speaking) setIsPlayingAudio(false);
    });
    return () => unsubscribe();
  }, []);

  const effectiveExpiry = job.expiresAt
    ? new Date(job.expiresAt)
    : (job.createdAt ? new Date(new Date(job.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null);

  const isExpired = Boolean(
    job.isExpired || 
    job.status === 'EXPIRED' || 
    job.status === 'CLOSED' ||
    (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
  );

  const companyName = job.employerProfile?.companyName || 'Verified Employer';
  const locationText = job.city || job.location || 'Local Area';
  const isVerified = job.employerProfile?.isVerified ?? true;

  // Format experience
  const expYears = job.experienceYearsRequired ?? (job as any).experience_years_required ?? 0;
  const experienceText = expYears === 0 
    ? 'Fresher (0 Yrs)' 
    : expYears === 1
      ? '1 Year Exp' 
      : `${expYears} Years Exp`;

  // Format salary
  const budget = job.budget ?? 0;
  const viewMode = job.wageViewMode || 'monthly';
  const computedDailyRate = job.dailyRate || (budget > 0 ? Math.round(budget / 26) : null);

  const salaryText = budget > 0 
    ? (viewMode === 'daily' && computedDailyRate
        ? `₹${computedDailyRate.toLocaleString('en-IN')} / day`
        : (budget > 10000 
            ? `₹${(budget / 1000).toFixed(0)}k - ₹${((budget * 1.3) / 1000).toFixed(0)}k / mo` 
            : `₹${budget.toLocaleString('en-IN')} / day`))
    : 'Competitive Pay';

  // Format posted time and calendar date
  const getPostedInfo = (dateStr?: string) => {
    if (!dateStr) return { relative: 'Recently', formattedDate: null };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { relative: 'Recently', formattedDate: null };

      const diffMs = Date.now() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      let relative = 'Posted just now';
      if (diffHours >= 1 && diffHours < 24) {
        relative = `Posted ${diffHours}h ago`;
      } else if (diffHours >= 24) {
        const diffDays = Math.floor(diffHours / 24);
        relative = `Posted ${diffDays}d ago`;
      }

      const formattedDate = d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return { relative, formattedDate };
    } catch {
      return { relative: 'Recently', formattedDate: null };
    }
  };

  const postedInfo = getPostedInfo(job.createdAt);
  const companyInitial = companyName.charAt(0).toUpperCase();
  const { language } = useTranslation();

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = buildJobWhatsAppMessage(
      {
        id: job.id,
        title: job.title,
        companyName,
        city: job.city,
        location: locationText,
        budget: job.budget,
        experienceYearsRequired: job.experienceYearsRequired,
        industry: job.industry,
      },
      language
    );
    openWhatsAppShare(msg);
  };

  const handleVoiceBriefing = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingAudio) {
      audioBriefing.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      audioBriefing.playJobBriefing(
        {
          title: job.title,
          companyName,
          city: job.city,
          location: locationText,
          budget: job.budget,
          perks: Array.isArray(job.perks) ? job.perks : (Array.isArray(job.additionalDetails?.perks) ? job.additionalDetails.perks : []),
          allowDirectCall: job.allowDirectCall
        },
        language
      );
    }
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveJob({
      id: job.id,
      title: job.title,
      companyName,
      logoUrl: job.employerProfile?.logoUrl,
      location: locationText,
      city: job.city,
      budget: job.budget,
      salaryText,
      jobType: job.jobType,
      experienceText,
      experienceYearsRequired: job.experienceYearsRequired,
      status: job.status,
      createdAt: job.createdAt,
      expiresAt: job.expiresAt,
    });
  };

  const jobDetailUrl = generateHierarchicalJobUrl({
    id: job.id,
    title: job.title,
    city: job.city,
    location: job.location,
    created_at: job.createdAt,
  }) || `/job/${job.id}`;

  return (
    <div 
      onClick={() => navigate(jobDetailUrl)}
      className={`bg-white rounded-[2rem] border transition-all duration-300 group cursor-pointer shadow-xs relative overflow-hidden font-['Onest',system-ui,sans-serif] flex flex-col md:flex-row items-stretch ${
        isExpired 
          ? 'border-rose-200/80 bg-slate-50/50 hover:border-rose-300' 
          : 'border-[#e6e8ec] hover:border-[#0f2f63]/50 hover:shadow-xl hover:-translate-y-0.5'
      }`}
    >
      {/* Left: Cover Image Vertical Panel (Exact 20% on Desktop like JobDetailPage) */}
      {effectiveCoverUrl ? (
        <div className="w-full md:w-[22%] md:min-w-[210px] md:max-w-[250px] h-44 sm:h-52 md:h-auto min-h-[200px] overflow-hidden relative border-b md:border-b-0 md:border-r border-[#e6e8ec] bg-slate-900 group shrink-0">
          <img 
            src={effectiveCoverUrl} 
            alt={job.title} 
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block" 
          />
          <div className="absolute inset-0 w-full h-full bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/25 to-transparent pointer-events-none" />

          {/* Badges on Cover Image Panel */}
          <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-10">
            <span className="px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
              {resolveJobCategoryLabel(job.title, job.industry)}
            </span>
            {isVerified && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Worksite</span>
              </span>
            )}
          </div>

          {/* Top-Right Action Buttons on Mobile (when image is rendered on top) */}
          <div className="md:hidden absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleVoiceBriefing}
              className={`p-2 rounded-full backdrop-blur-xs transition-all cursor-pointer shadow-xs ${
                isPlayingAudio 
                  ? 'bg-amber-500 text-slate-950 animate-pulse' 
                  : 'bg-black/50 hover:bg-black/80 text-white hover:scale-105'
              }`}
              title={isPlayingAudio ? 'Stop audio briefing' : 'Listen to job briefing'}
            >
              {isPlayingAudio ? (
                <VolumeX className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="p-2 rounded-full backdrop-blur-xs transition-all cursor-pointer shadow-xs bg-[#25D366] text-white hover:scale-105"
              title="Share Opening on WhatsApp"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`p-2 rounded-full backdrop-blur-xs transition-all cursor-pointer shadow-xs ${
                isSaved 
                  ? 'bg-[#0f2f63] text-white shadow-sm ring-2 ring-white/50' 
                  : 'bg-black/50 hover:bg-black/80 text-white hover:scale-105'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save Job'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Right: Content Details Area (Exact 80% on Desktop) */}
      <div className="p-5 sm:p-6 lg:p-7 flex-1 w-full min-w-0 flex flex-col justify-between gap-4 sm:gap-5">
        
        {/* Top Header Row: Monogram + Title + Employer + Top Action Buttons */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {/* Company Monogram / Logo Badge */}
            <div className="w-12 h-12 rounded-2xl bg-[#f4f4f4] border border-[#e6e8ec] flex items-center justify-center text-[#0a0a0a] font-semibold text-base shrink-0 group-hover:border-[#0f2f63]/30 transition-all overflow-hidden">
              {job.employerProfile?.logoUrl ? (
                <img src={job.employerProfile.logoUrl} alt={companyName} className="w-full h-full object-contain rounded-2xl" />
              ) : (
                <span>{companyInitial}</span>
              )}
            </div>

            {/* Job Title & Company Line */}
            <div className="min-w-0 space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors truncate">
                  <TranslateText text={job.title} />
                </h3>
                {isExpired ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200">
                    <Clock className="w-3 h-3 text-rose-600" />
                    <span>Expired</span>
                  </span>
                ) : (
                  <>
                    {(job.isWalkInInterview || (job.additionalDetails as any)?.isWalkInInterview) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-extrabold border border-amber-300 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Walk-in Open</span>
                      </span>
                    )}
                    {job.isUrgentSpotHire && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[10px] font-extrabold border border-rose-300 shadow-2xs">
                        <Zap className="w-3 h-3 text-rose-600 fill-rose-600" />
                        <span>Urgent Spot Hire</span>
                      </span>
                    )}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[#717784] font-medium truncate flex-wrap">
                <span className="text-[#0a0a0a] font-semibold">{companyName}</span>
                {job.isExternal ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200 shadow-2xs">
                    <Globe className="w-3 h-3 text-blue-600" />
                    <span>{job.sourceName || 'Verified Partner'}</span>
                  </span>
                ) : null}
                {job.alternateSources && job.alternateSources.length > 1 ? (
                  <span 
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200"
                    title={`Also cross-verified on: ${job.alternateSources.map((s) => s.sourceName).join(', ')}`}
                  >
                    <span>+{job.alternateSources.length - 1} Sources</span>
                  </span>
                ) : null}
                <span className="text-[#e6e8ec]">•</span>
                <span className="inline-flex items-center gap-1 text-[#717784] truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#2563c9]" />
                  <span className="truncate"><TranslateText text={locationText} /></span>
                </span>
                {/* ⚡ High-Trust Employer Response Speed Badge (JobToday Model) */}
                {!isExpired && (
                  <>
                    <span className="text-[#e6e8ec]">•</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Zap className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                      <span>Responds fast</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Desktop/Default Action Buttons */}
          <div className={`${effectiveCoverUrl ? 'hidden md:flex' : 'flex'} items-center gap-1.5 shrink-0`}>
            {/* 🔊 1-Tap Vernacular Audio Job Briefing (WorkIndia / Apna Accessibility Winner) */}
            <button
              type="button"
              onClick={handleVoiceBriefing}
              className={`p-2.5 rounded-full border transition-all cursor-pointer items-center justify-center flex shadow-2xs active:scale-95 ${
                isPlayingAudio
                  ? 'bg-amber-500 border-amber-600 text-slate-950 animate-pulse ring-2 ring-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              }`}
              title={isPlayingAudio ? 'Stop audio briefing' : 'Listen to 15s job briefing in your language'}
            >
              {isPlayingAudio ? (
                <VolumeX className="w-4 h-4 fill-current" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            {/* 1-Click WhatsApp Viral Share */}
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="p-2.5 rounded-full border border-[#25D366]/30 bg-[#25D366]/10 hover:bg-[#25D366]/25 text-[#128C7E] transition-all cursor-pointer items-center justify-center flex shadow-2xs active:scale-95"
              title="Share Opening on WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
            </button>

            {/* Bookmark Button */}
            <button
              type="button"
              onClick={handleBookmarkClick}
              className={`p-2.5 rounded-full border transition-all cursor-pointer items-center justify-center flex ${
                isSaved 
                  ? 'bg-[#0f2f63] border-[#0f2f63] text-white shadow-xs' 
                  : 'bg-[#f4f4f4] border-[#e6e8ec] text-[#717784] hover:text-[#0a0a0a] hover:bg-white'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save Job'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Middle Specs Grid: Experience | Job Type | Pay/Salary */}
        <div className="grid grid-cols-3 gap-2 py-2.5 px-4 bg-[#f4f4f4]/80 rounded-2xl border border-[#e6e8ec]/80 text-left">
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#717784]">Experience</span>
            <span className="text-xs sm:text-sm font-bold text-[#0a0a0a]">
              {experienceText}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#717784]">Job Type</span>
            <span className="text-xs sm:text-sm font-bold text-[#0a0a0a]">
              <TranslateText text={job.jobType || 'Full-Time'} />
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-[#717784]">
              {viewMode === 'daily' ? 'Daily Wage' : 'Monthly Salary'}
            </span>
            <div className="flex flex-col">
              <span className={`text-xs sm:text-sm font-bold ${isExpired ? 'text-slate-500 line-through' : 'text-emerald-700'}`}>
                {salaryText}
              </span>
            </div>
          </div>
        </div>

        {/* Blue-Collar Perks & Benefits Highlights (WorkIndia & Apna viral features) */}
        {(() => {
          const perksList: string[] = Array.isArray(job.perks) && job.perks.length > 0 
            ? job.perks 
            : (Array.isArray(job.additionalDetails?.perks) ? job.additionalDetails.perks : []);
          
          const payoutFreq = job.payoutFrequency || job.payout_frequency || job.additionalDetails?.payoutFrequency;
          const hasGuarantee = job.payoutGuaranteeBadge ?? job.payout_guarantee_badge ?? job.additionalDetails?.payoutGuaranteeBadge;

          if (perksList.length === 0 && !payoutFreq && !hasGuarantee) return null;

          return (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {payoutFreq && payoutFreq !== 'MONTHLY' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs bg-emerald-50 text-emerald-900 border-emerald-200">
                  <Zap className="w-3 h-3 text-emerald-600" />
                  <span>{payoutFreq} Payout</span>
                </span>
              )}

              {hasGuarantee && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border shadow-2xs bg-[#eff6ff] text-[#0066ff] border-[#dbeafe]">
                  <ShieldCheck className="w-3 h-3 text-[#0066ff]" />
                  <span>Joining Guarantee</span>
                </span>
              )}

              {perksList.map((p, idx) => {
                const perk = String(p).toLowerCase();
                let icon = <Gift className="w-3 h-3 text-emerald-600" />;
                let label = p;
                let bg = "bg-emerald-50 text-emerald-800 border-emerald-200";

                if (perk.includes('food') || perk.includes('meal')) {
                  icon = <Utensils className="w-3 h-3 text-amber-600" />;
                  label = "Free Food / Meals";
                  bg = "bg-amber-50 text-amber-900 border-amber-200";
                } else if (perk.includes('room') || perk.includes('accommodation') || perk.includes('lodging')) {
                  icon = <Home className="w-3 h-3 text-indigo-600" />;
                  label = "Room / Stay Provided";
                  bg = "bg-indigo-50 text-indigo-900 border-indigo-200";
                } else if (perk.includes('daily') || perk.includes('weekly')) {
                  icon = <Zap className="w-3 h-3 text-emerald-600" />;
                  label = "Daily / Weekly Pay";
                  bg = "bg-emerald-50 text-emerald-900 border-emerald-200";
                } else if (perk.includes('ot') || perk.includes('overtime')) {
                  icon = <Clock3 className="w-3 h-3 text-blue-600" />;
                  label = "Overtime (OT) Pay";
                  bg = "bg-blue-50 text-blue-900 border-blue-200";
                } else if (perk.includes('travel') || perk.includes('petrol') || perk.includes('fuel')) {
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
          );
        })()}

        {/* Footer Line: Posted Time & Date & Apply / Status */}
        <div className="flex items-center justify-between pt-3 border-t border-[#e6e8ec] text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#717784]">
            <span className="inline-flex items-center gap-1 font-normal text-[#717784]">
              <Calendar className="w-3.5 h-3.5 text-[#717784]" />
              <span>{postedInfo.relative}</span>
            </span>
            {postedInfo.formattedDate && (
              <>
                <span className="text-[#d1d5db]">•</span>
                <span className="text-[#0a0a0a] font-medium">{postedInfo.formattedDate}</span>
              </>
            )}
            {effectiveExpiry && (
              <>
                <span className="text-[#d1d5db]">•</span>
                <span className={`text-[11px] font-medium ${isExpired ? 'text-rose-600 font-semibold' : 'text-[#717784]'}`}>
                  {isExpired 
                    ? `Expired on ${effectiveExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                    : `Closes ${effectiveExpiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 📱 1-Tap Hiring Flyer / Visiting Card Generator (Available for Employers) */}
            {isEmployer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPamphletOpen(true);
                }}
                className="p-2 rounded-full bg-[#f4f4f4] hover:bg-amber-100 text-amber-700 hover:text-amber-800 border border-[#e6e8ec] transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                title="Share as visual WhatsApp hiring flyer"
              >
                <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              </button>
            )}

            {/* 🎟️ 1-Tap Walk-In Admit Pass Button (When Walk-In is active) */}
            {!isExpired && (job.isWalkInInterview || (job.additionalDetails as any)?.isWalkInInterview) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsWalkInPassOpen(true);
                }}
                className="rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold uppercase px-3.5 py-2 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                title="Get 1-Tap Walk-In Interview Pass"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                <span>Walk-In Pass</span>
              </button>
            )}

            {/* 📋 1-Tap Interview Prep & Document Checklist Modal */}
            {!isExpired && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPrepKitOpen(true);
                }}
                className="rounded-full bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase px-3.5 py-2 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                title="View Required Documents & 5 Trial Interview Questions"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Prep Kit</span>
              </button>
            )}

            {/* 📞 One-Tap Direct Call HR (WorkIndia & Apna Viral Conversion Feature) */}
            {!isExpired && (job.allowDirectCall ?? true) && (job.contactPhone || (job as any).phoneNumber || (job as any).employerProfile?.phoneNumber) && (
              <div className="flex items-center gap-1">
                <a
                  href={`tel:${job.contactPhone || (job as any).phoneNumber || (job as any).employerProfile?.phoneNumber}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold uppercase px-3.5 py-2 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer no-underline shrink-0"
                  title="Call Recruiter Directly (10 AM - 5 PM)"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Call HR</span>
                </a>
                <span className="hidden lg:inline-flex items-center px-2 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200" title="Active Recruiter Window">
                  10am-5pm
                </span>
              </div>
            )}

            {job.hasApplied ? (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-xs border border-emerald-100 flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Applied ({job.applicationStatus || 'Under Review'})</span>
              </span>
            ) : isExpired ? (
              <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 cursor-not-allowed">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Expired</span>
              </span>
            ) : job.isExternal && job.sourceUrl ? (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold uppercase px-4 py-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer no-underline"
              >
                <span>Apply on {job.sourceName || 'Portal'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onApply) {
                    onApply(job.id);
                  } else {
                    navigate(jobDetailUrl);
                  }
                }}
                disabled={isApplying}
                className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-bold uppercase px-4 py-2 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                {isApplying ? (
                  <AppLoader variant="inline" size="sm" />
                ) : (
                  <>
                    <span>Apply Now</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* HIRING PAMPHLET MODAL */}
      {isPamphletOpen && (
        <JobPamphletModal
          isOpen={isPamphletOpen}
          onClose={() => setIsPamphletOpen(false)}
          job={{
            id: job.id,
            title: job.title,
            companyName: companyName,
            city: job.city,
            location: job.location,
            budget: job.budget,
            perks: Array.isArray(job.perks) ? job.perks : (Array.isArray(job.additionalDetails?.perks) ? job.additionalDetails.perks : []),
            contactPhone: job.contactPhone || (job as any).phoneNumber || (job as any).employerProfile?.phoneNumber,
            isUrgentSpotHire: Boolean(job.isUrgentSpotHire || job.additionalDetails?.isUrgentSpotHire)
          }}
        />
      )}

      {/* 🎟️ 1-TAP WALKIN PASS MODAL */}
      {isWalkInPassOpen && (
        <WalkInPassModal
          isOpen={isWalkInPassOpen}
          onClose={() => setIsWalkInPassOpen(false)}
          job={{
            id: job.id,
            title: job.title,
            companyName: companyName,
            city: job.city,
            location: locationText,
            walkInDetails: job.walkInDetails || (job.additionalDetails as any)?.walkInDetails,
            contactPhone: job.contactPhone || (job as any).phoneNumber || (job as any).employerProfile?.phoneNumber
          }}
          candidate={{
            fullName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Verified Candidate',
            trade: job.industry || 'Specialist',
            phone: user?.phoneNumber || user?.phone || 'Contact via TrustHyre',
            experienceYears: 1,
            profileId: user?.id
          }}
        />
      )}

      {/* 📋 1-TAP INTERVIEW PREP & DOCUMENT CHECKLIST MODAL */}
      {isPrepKitOpen && (
        <InterviewPrepKitModal
          isOpen={isPrepKitOpen}
          onClose={() => setIsPrepKitOpen(false)}
          jobTitle={job.title}
          trade={job.industry}
          companyName={companyName}
          locationCity={locationText}
          contactPhone={job.contactPhone || (job as any).phoneNumber || (job as any).employerProfile?.phoneNumber}
          requiredDocuments={job.requiredDocuments || job.required_documents || job.additionalDetails?.requiredDocuments || job.additionalDetails?.required_documents}
          payoutFrequency={job.payoutFrequency || job.payout_frequency || job.additionalDetails?.payoutFrequency}
          payoutGuaranteeBadge={job.payoutGuaranteeBadge ?? job.payout_guarantee_badge ?? job.additionalDetails?.payoutGuaranteeBadge}
        />
      )}
    </div>
  );
};
