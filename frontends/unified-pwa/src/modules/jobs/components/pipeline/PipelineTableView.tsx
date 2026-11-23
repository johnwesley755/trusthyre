import React, { useState } from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';
import { UserAvatar } from '../../../../components/common/UserAvatar';
import { MoreHorizontal, Sparkles, ShieldCheck, Clock, Calendar, Briefcase, FileText, Send, MessageSquare, UserCheck, XCircle } from 'lucide-react';
import { getMatchScoreVisuals } from '../../../../utils/matchScorer';
import type { PipelineStage } from '../../types/pipeline.types';
import { PIPELINE_STAGES } from '../../types/pipeline.types';

interface PipelineTableViewProps {
  candidates: any[];
  workersById: Map<string, any>;
  onViewCV: (app: any, worker: any) => void;
  onScheduleInterview: (app: any, worker: any) => void;
  onSendOffer: (app: any) => void;
  onMoveStage: (applicationId: string, stage: PipelineStage) => void;
  onOpenMessage: (applicationId: string) => void;
  onOutreach: (worker: any) => void;
  onIssueWorkOrder?: (app: any, worker: any) => void;
}

export const PipelineTableView: React.FC<PipelineTableViewProps> = ({
  candidates,
  workersById,
  onViewCV,
  onScheduleInterview,
  onSendOffer,
  onMoveStage,
  onOpenMessage,
  onOutreach,
  onIssueWorkOrder
}) => {
  const [activeMenuAppId, setActiveMenuAppId] = useState<string | null>(null);
  return (
    <div className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#e6e8ec] dark:border-neutral-800 bg-slate-50/70 dark:bg-[#16161a]">
              <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-zinc-400 py-3.5">Candidate</TableHead>
              <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-zinc-400 py-3.5">Match</TableHead>
              <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-zinc-400 py-3.5">Trade & Exp</TableHead>
              <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-zinc-400 py-3.5">Expected Wage</TableHead>
              <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-zinc-400 py-3.5">Current Stage</TableHead>
              <TableHead className="font-bold text-xs uppercase text-slate-500 dark:text-zinc-400 py-3.5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e6e8ec] dark:divide-neutral-800">
            {candidates.map((app) => {
              const worker = workersById.get(app.workerId);
              const candidateName = worker?.fullName || worker?.name || 'Candidate';
              const candidateRole = worker?.preferredRoles?.[0] || worker?.trade || (Array.isArray(worker?.skills) ? worker.skills[0] : 'Specialist');
              const isVerified = Boolean(worker?.identityVerified || worker?.isVerified);
              const matchScore = app.matchScore ?? 85;
              const visuals = getMatchScoreVisuals(matchScore);
              const stage: PipelineStage = app.pipelineStage || 'NEW';
              const stageConfig = PIPELINE_STAGES[stage];

              const expectedWage = worker?.expectedDailyWage || worker?.dailyRate;
              const wageText = expectedWage ? `₹${expectedWage}/day` : 'Standard Wage';

              const menuItems = [
                {
                  label: 'View Full CV / Profile',
                  icon: <FileText className="w-4 h-4 text-sky-600" />,
                  onClick: () => onViewCV(app, worker)
                },
                {
                  label: 'Direct Message',
                  icon: <MessageSquare className="w-4 h-4 text-emerald-600" />,
                  onClick: () => onOpenMessage(app.id)
                },
                {
                  label: 'Call / WhatsApp Invite',
                  icon: <Send className="w-4 h-4 text-emerald-500" />,
                  onClick: () => onOutreach(worker)
                },
                {
                  label: 'Schedule Interview',
                  icon: <Calendar className="w-4 h-4 text-amber-500" />,
                  onClick: () => onScheduleInterview(app, worker)
                },
                ...(stage !== 'OFFER_SENT' && stage !== 'HIRED' ? [{
                  label: 'Send Direct Job Offer',
                  icon: <Briefcase className="w-4 h-4 text-purple-600" />,
                  onClick: () => onSendOffer(app)
                }] : []),
                ...(stage === 'HIRED' && onIssueWorkOrder ? [{
                  label: 'Issue Digital Work Order',
                  icon: <UserCheck className="w-4 h-4 text-emerald-600" />,
                  onClick: () => onIssueWorkOrder(app, worker)
                }] : []),
                {
                  label: stage === 'SHORTLISTED' ? 'Move to New' : 'Shortlist Candidate',
                  icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
                  onClick: () => onMoveStage(app.id, stage === 'SHORTLISTED' ? 'NEW' : 'SHORTLISTED')
                },
                ...(stage !== 'REJECTED' ? [{
                  label: 'Decline / Reject',
                  icon: <XCircle className="w-4 h-4 text-rose-500" />,
                  onClick: () => onMoveStage(app.id, 'REJECTED')
                }] : [])
              ];

              return (
                <TableRow key={app.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/50 transition-colors">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar src={worker?.profileImageUrl} name={candidateName} size="md" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onViewCV(app, worker)}
                          className="text-xs font-bold text-[#0a0a0a] dark:text-white hover:underline block truncate text-left"
                        >
                          {candidateName}
                        </button>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block truncate">
                          {worker?.city || worker?.location || 'Local Area'}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${visuals.bg} ${visuals.text} border ${visuals.border}`}>
                      <Sparkles className="w-3 h-3" />
                      <span>{matchScore}%</span>
                    </span>
                  </TableCell>

                  <TableCell className="py-3">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 block truncate max-w-[150px]">
                        {candidateRole}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                        {worker?.experienceYears ? `${worker.experienceYears}+ years exp` : 'Entry level'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="py-3">
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      {wageText}
                    </span>
                  </TableCell>

                  <TableCell className="py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${stageConfig.bgLight} ${stageConfig.textColor} border ${stageConfig.borderColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stageConfig.dotColor}`} />
                      <span>{stageConfig.label}</span>
                    </span>
                  </TableCell>

                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onViewCV(app, worker)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        View CV
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuAppId(activeMenuAppId === app.id ? null : app.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {activeMenuAppId === app.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={() => setActiveMenuAppId(null)} 
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-[#121215] z-30">
                              {menuItems.map((opt, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuAppId(null);
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
