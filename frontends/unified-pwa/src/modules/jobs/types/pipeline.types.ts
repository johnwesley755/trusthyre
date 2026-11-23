import type { JobApplication } from '../../../services/application.service';

export type PipelineStage = 'NEW' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER_SENT' | 'HIRED' | 'REJECTED';

export interface PipelineStageConfig {
  key: PipelineStage;
  label: string;
  badgeLabel: string;
  color: string;
  textColor: string;
  borderColor: string;
  bgLight: string;
  dotColor: string;
  description: string;
}

export const PIPELINE_STAGES: Record<PipelineStage, PipelineStageConfig> = {
  NEW: {
    key: 'NEW',
    label: 'New',
    badgeLabel: 'New Applicants',
    color: 'sky',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800/60',
    bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    dotColor: 'bg-sky-500',
    description: 'Fresh applications awaiting initial review'
  },
  SHORTLISTED: {
    key: 'SHORTLISTED',
    label: 'Shortlisted',
    badgeLabel: 'Shortlisted Candidates',
    color: 'indigo',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-200 dark:border-indigo-800/60',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    dotColor: 'bg-indigo-500',
    description: 'Profiles that meet job criteria'
  },
  INTERVIEW: {
    key: 'INTERVIEW',
    label: 'Interview',
    badgeLabel: 'Interview Scheduled',
    color: 'amber',
    textColor: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800/60',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    dotColor: 'bg-amber-500',
    description: 'Call or video meeting scheduled'
  },
  OFFER_SENT: {
    key: 'OFFER_SENT',
    label: 'Offer Sent',
    badgeLabel: 'Offer Dispatched',
    color: 'purple',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800/60',
    bgLight: 'bg-purple-50 dark:bg-purple-950/40',
    dotColor: 'bg-purple-500',
    description: 'Offer sent, awaiting candidate response'
  },
  HIRED: {
    key: 'HIRED',
    label: 'Hired',
    badgeLabel: 'Confirmed & Hired',
    color: 'emerald',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    dotColor: 'bg-emerald-500',
    description: 'Offer accepted, ready for work order'
  },
  REJECTED: {
    key: 'REJECTED',
    label: 'Declined',
    badgeLabel: 'Not Selected / Declined',
    color: 'rose',
    textColor: 'text-rose-700 dark:text-rose-400',
    borderColor: 'border-rose-200 dark:border-rose-900/50',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    dotColor: 'bg-rose-500',
    description: 'Declined by candidate or employer'
  }
};

export interface JobHiringPipelineResponse {
  job: any;
  counts: Record<PipelineStage | 'TOTAL', number>;
  candidates: (JobApplication & { pipelineStage: PipelineStage })[];
}
