import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Calendar, 
  Send, 
  UserCheck, 
  XCircle, 
  MessageSquare, 
  FileText, 
  User, 
  ArrowRight,
  BookmarkPlus,
  Briefcase
} from 'lucide-react';
import { UserAvatar } from '../../../../components/common/UserAvatar';
import { calculateMatchScore, getMatchScoreVisuals } from '../../../../utils/matchScorer';
import type { PipelineStage } from '../../types/pipeline.types';
import { PIPELINE_STAGES } from '../../types/pipeline.types';

interface PipelineCandidateCardProps {
  application: any;
  worker: any;
  onSelectCandidate?: (app: any, worker: any) => void;
  onViewCV: (app: any, worker: any) => void;
  onScheduleInterview: (app: any, worker: any) => void;
  onSendOffer: (app: any) => void;
  onMoveStage: (applicationId: string, stage: PipelineStage) => void;
  onOpenMessage: (applicationId: string) => void;
  onOutreach: (worker: any) => void;
  onIssueWorkOrder?: (app: any, worker: any) => void;
  selectedJob?: any;
}

export const PipelineCandidateCard: React.FC<PipelineCandidateCardProps> = ({
  application,
  worker,
  onSelectCandidate,
  onViewCV,
  onScheduleInterview,
  onSendOffer,
  onMoveStage,
  onOpenMessage,
  onOutreach,
  onIssueWorkOrder,
  selectedJob
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const candidateName = worker?.fullName || worker?.name || 'Candidate';
  const candidateRole = worker?.preferredRoles?.[0] || worker?.trade || (Array.isArray(worker?.skills) ? worker.skills[0] : 'Specialist');
  const isVerified = Boolean(worker?.identityVerified || worker?.isVerified);
  const calculatedMatch = selectedJob && worker ? calculateMatchScore(selectedJob, worker).overallScore : 0;
  const matchScore = application.matchScore ?? (calculatedMatch > 0 ? calculatedMatch : null);
  const visuals = matchScore !== null ? getMatchScoreVisuals(matchScore) : null;
  const currentStage: PipelineStage = application.pipelineStage || 'NEW';

  const expectedWage = worker?.expectedDailyWage || worker?.dailyRate || worker?.hourlyRate;
  const wageText = expectedWage ? `₹${expectedWage}/day` : 'Standard Wage';

  const menuOptions = [
    {
      label: 'View Full CV / Profile',
      icon: <FileText className="w-4 h-4 text-sky-600" />,
      onClick: () => onViewCV(application, worker)
    },
    {
      label: 'Direct Message',
      icon: <MessageSquare className="w-4 h-4 text-emerald-600" />,
      onClick: () => onOpenMessage(application.id)
    },
    {
      label: 'Call / WhatsApp Invite',
      icon: <Send className="w-4 h-4 text-emerald-500" />,
      onClick: () => onOutreach(worker)
    },
    {
      label: 'Schedule Interview',
      icon: <Calendar className="w-4 h-4 text-amber-500" />,
      onClick: () => onScheduleInterview(application, worker)
    },
    ...(currentStage !== 'OFFER_SENT' && currentStage !== 'HIRED' ? [{
      label: 'Send Direct Job Offer',
      icon: <Briefcase className="w-4 h-4 text-purple-600" />,
      onClick: () => onSendOffer(application)
    }] : []),
    ...(currentStage === 'HIRED' && onIssueWorkOrder ? [{
      label: 'Issue Digital Work Order',
      icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
      onClick: () => onIssueWorkOrder(application, worker)
    }] : []),
    {
      label: currentStage === 'SHORTLISTED' ? 'Move to New' : 'Shortlist Candidate',
      icon: <BookmarkPlus className="w-4 h-4 text-indigo-500" />,
      onClick: () => onMoveStage(application.id, currentStage === 'SHORTLISTED' ? 'NEW' : 'SHORTLISTED')
    },
    ...(currentStage !== 'REJECTED' ? [{
      label: 'Decline / Reject',
      icon: <XCircle className="w-4 h-4 text-rose-500" />,
      onClick: () => onMoveStage(application.id, 'REJECTED')
    }] : [{
      label: 'Restore to Pipeline',
      icon: <ArrowRight className="w-4 h-4 text-sky-500" />,
      onClick: () => onMoveStage(application.id, 'NEW')
    }])
  ];

  return (
    <div 
      onClick={() => onSelectCandidate && onSelectCandidate(application, worker)}
      className="bg-white dark:bg-[#121215] rounded-xl p-3.5 border border-[#e6e8ec] dark:border-neutral-800 shadow-2xs hover:shadow-md hover:border-[#0f2f63]/30 dark:hover:border-neutral-700 transition-all text-[#0a0a0a] dark:text-zinc-100 group flex flex-col gap-2.5 cursor-pointer"
    >
      {/* Top Header: Avatar + Name + 3-Dot Action Menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <UserAvatar
            src={worker?.profileImageUrl}
            name={candidateName}
            size="md"
          />
          <div className="min-w-0">
            <h4 
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectCandidate) {
                  onSelectCandidate(application, worker);
                } else {
                  onViewCV(application, worker);
                }
              }}
              className="text-xs font-bold text-[#0a0a0a] dark:text-white truncate cursor-pointer hover:underline"
            >
              {candidateName}
            </h4>
            <div className="flex items-center gap-1.5 text-[11px] text-[#717784] dark:text-zinc-400 truncate">
              <span>{candidateRole}</span>
              <span>•</span>
              <span className="truncate">{worker?.city || worker?.location || 'Local Area'}</span>
            </div>
          </div>
        </div>

        {/* 3-Dot Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Candidate actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-[#121215] z-30">
                {menuOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      opt.onClick();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-[#1c1c20] cursor-pointer"
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Badges: Match Score & Verification */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {visuals && matchScore !== null ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${visuals.bg} ${visuals.text} border ${visuals.border}`}>
            <Sparkles className="w-3 h-3" />
            <span>{matchScore}% Match</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
            <span>Evaluating Match</span>
          </span>
        )}

        {isVerified && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Verified</span>
          </span>
        )}

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 border border-slate-200/80 dark:border-zinc-800">
          <span>{worker?.experienceYears ? `${worker.experienceYears}+ yrs exp` : 'Entry'}</span>
        </span>
      </div>

      {/* Wage & Details Snippet */}
      <div className="flex items-center justify-between text-[11px] text-[#717784] dark:text-zinc-400 pt-1 border-t border-[#e6e8ec]/70 dark:border-neutral-800/80">
        <span className="font-semibold text-slate-800 dark:text-zinc-200">{wageText}</span>
        
        {application.interview ? (
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Interview Scheduled</span>
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
            {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}
          </span>
        )}
      </div>

      {/* Quick Move stage pill buttons for instant desktop/tablet workflow */}
      <div className="flex items-center gap-1 pt-0.5">
        <button
          type="button"
          onClick={() => onViewCV(application, worker)}
          className="flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors text-center cursor-pointer"
        >
          View Profile
        </button>

        {currentStage === 'NEW' && (
          <button
            type="button"
            onClick={() => onMoveStage(application.id, 'SHORTLISTED')}
            className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors text-center cursor-pointer"
          >
            Shortlist
          </button>
        )}

        {currentStage === 'SHORTLISTED' && (
          <button
            type="button"
            onClick={() => onScheduleInterview(application, worker)}
            className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 transition-colors text-center cursor-pointer"
          >
            Interview
          </button>
        )}

        {currentStage === 'INTERVIEW' && (
          <button
            type="button"
            onClick={() => onSendOffer(application)}
            className="flex-1 py-1 px-2 rounded-lg text-[10px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 transition-colors text-center cursor-pointer"
          >
            Send Offer
          </button>
        )}
      </div>
    </div>
  );
};
