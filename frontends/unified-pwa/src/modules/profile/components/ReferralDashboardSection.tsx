import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  UserCheck, 
  Building2, 
  Briefcase, 
  ArrowUpRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../../api/apiClient';
import { openWhatsAppShare } from '../../../utils/whatsappTemplate.utils';

interface ReferralStats {
  totalReferrals: number;
  totalWorkers: number;
  totalEmployers: number;
  workerOnboardingCompleted: number;
  employerFirstJobPosted: number;
}

interface ReferralDashboardData {
  referralCode: string;
  shareUrl: string;
  stats: ReferralStats;
}

interface ReferralDashboardSectionProps {
  userRole?: string;
  className?: string;
}

export const ReferralDashboardSection: React.FC<ReferralDashboardSectionProps> = ({
  userRole = 'WORKER',
  className = ''
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const { data, isLoading, error } = useQuery<ReferralDashboardData>({
    queryKey: ['referrals', 'me'],
    queryFn: async () => {
      const res = await apiClient.get('/referrals/me');
      return res.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const referralCode = data?.referralCode || '...';
  const shareUrl = data?.shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${referralCode}` : '');
  const stats = data?.stats || {
    totalReferrals: 0,
    totalWorkers: 0,
    totalEmployers: 0,
    workerOnboardingCompleted: 0,
    employerFirstJobPosted: 0,
  };

  const handleCopyCode = async () => {
    if (!referralCode || referralCode === '...') return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      toast.success('Referral code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Failed to copy code');
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleWhatsAppInvite = () => {
    const isEmployer = userRole === 'EMPLOYER';
    const message = isEmployer
      ? `🏢 Join me on *TrustHyre* — direct hiring with 0% middleman fees and biometric verification!\n\nSign up using my invite code *${referralCode}*:\n${shareUrl}`
      : `🤝 Join me on *TrustHyre* to get verified daily work & enterprise job openings directly from employers!\n\nUse my invite code *${referralCode}* to register:\n${shareUrl}`;

    openWhatsAppShare(message);
  };

  return (
    <div className={`bg-white dark:bg-[#0a0a0a] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-zinc-800/80 shadow-xs relative overflow-hidden transition-colors ${className}`}>
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-blue-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Community Referral Network</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0A1931] dark:text-white flex items-center gap-2">
            Invite Your Community
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1 max-w-xl">
            Invite workers and employers to TrustHyre. Track how your network expands and when your referrals complete onboarding or publish jobs.
          </p>
        </div>

        {/* Quick Action */}
        <button
          onClick={handleWhatsAppInvite}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
        >
          <Share2 className="w-4 h-4 fill-white" />
          <span>Invite on WhatsApp</span>
        </button>
      </div>

      {/* Referral Code & Link Box */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        {/* Unique Code */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
              Your Referral Code
            </span>
            <span className="text-lg font-mono font-extrabold text-[#0A1931] dark:text-white tracking-widest">
              {isLoading ? '...' : referralCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-[#0A1931] dark:text-white border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer shadow-2xs"
            title="Copy Referral Code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedCode ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Share Link */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#121215] border border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
              Personal Referral Link
            </span>
            <span className="text-xs font-mono text-slate-600 dark:text-zinc-400 truncate block">
              {isLoading ? '...' : shareUrl}
            </span>
          </div>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-[#0A1931] dark:text-white border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-all cursor-pointer shadow-2xs shrink-0"
            title="Copy Referral Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedLink ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
        {/* Total Attributed */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#121215]/80 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Total Joined
            </span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-2xl font-black text-[#0A1931] dark:text-white">
            {stats.totalReferrals}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
            From all share channels
          </span>
        </div>

        {/* Workers Joined */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#121215]/80 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Workers
            </span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-[#0A1931] dark:text-white">
            {stats.totalWorkers}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
            Registered candidates
          </span>
        </div>

        {/* Employers Joined */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#121215]/80 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Employers
            </span>
            <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-2xl font-black text-[#0A1931] dark:text-white">
            {stats.totalEmployers}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
            Registered businesses
          </span>
        </div>

        {/* Worker Onboarded */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#121215]/80 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Onboarded
            </span>
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <span className="text-2xl font-black text-[#0A1931] dark:text-white">
            {stats.workerOnboardingCompleted}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
            Completed worker setup
          </span>
        </div>

        {/* Employer Jobs Posted */}
        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#121215]/80 border border-slate-200/70 dark:border-zinc-800/70 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
              Jobs Posted
            </span>
            <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-2xl font-black text-[#0A1931] dark:text-white">
            {stats.employerFirstJobPosted}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
            Employers with 1st job
          </span>
        </div>
      </div>
    </div>
  );
};
