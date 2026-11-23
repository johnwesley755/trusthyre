import React from 'react';
import { PipelineCandidateCard } from './PipelineCandidateCard';
import type { PipelineStage } from '../../types/pipeline.types';
import { PIPELINE_STAGES } from '../../types/pipeline.types';
import { Users } from 'lucide-react';

interface PipelineKanbanColumnProps {
  stage: PipelineStage;
  candidates: any[];
  workersById: Map<string, any>;
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

export const PipelineKanbanColumn: React.FC<PipelineKanbanColumnProps> = ({
  stage,
  candidates,
  workersById,
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
  const config = PIPELINE_STAGES[stage];

  return (
    <div className="flex flex-col w-72 sm:w-80 shrink-0 bg-slate-50/70 dark:bg-[#09090b]/80 border border-slate-200/80 dark:border-neutral-800 rounded-2xl max-h-[calc(100vh-14rem)] min-h-[500px]">
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
          <h3 className="text-xs font-bold text-[#0a0a0a] dark:text-white uppercase tracking-wider">
            {config.label}
          </h3>
        </div>

        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${config.bgLight} ${config.textColor} border ${config.borderColor}`}>
          {candidates.length}
        </span>
      </div>

      {/* Column Cards Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar overscroll-contain">
        {candidates.length > 0 ? (
          candidates.map((app) => {
            const worker = workersById.get(app.workerId);
            return (
              <PipelineCandidateCard
                key={app.id}
                application={app}
                worker={worker}
                onSelectCandidate={onSelectCandidate}
                onViewCV={onViewCV}
                onScheduleInterview={onScheduleInterview}
                onSendOffer={onSendOffer}
                onMoveStage={onMoveStage}
                onOpenMessage={onOpenMessage}
                onOutreach={onOutreach}
                onIssueWorkOrder={onIssueWorkOrder}
                selectedJob={selectedJob}
              />
            );
          })
        ) : (
          <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-xl space-y-1.5 mt-2">
            <Users className="w-5 h-5 mx-auto text-slate-300 dark:text-zinc-600" />
            <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">No candidates</p>
            <p className="text-[10px] text-slate-400 dark:text-zinc-600">in {config.label}</p>
          </div>
        )}
      </div>
    </div>
  );
};
