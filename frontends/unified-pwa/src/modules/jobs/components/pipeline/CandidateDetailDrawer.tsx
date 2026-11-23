import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  User, 
  Clock, 
  Calendar, 
  FileText, 
  MessageSquare, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  Plus,
  Loader2,
  Briefcase
} from 'lucide-react';
import { UserAvatar } from '../../../../components/common/UserAvatar';
import { applicationService } from '../../../../services/application.service';
import { PIPELINE_STAGES, type PipelineStage } from '../../types/pipeline.types';
import { toast } from 'sonner';

interface CandidateDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  worker: any;
  selectedJob: any;
  onMoveStage: (applicationId: string, stage: PipelineStage) => void;
  onOpenMessage: (applicationId: string) => void;
  onOutreach: (worker: any) => void;
  onScheduleInterview: (app: any, worker: any) => void;
  onSendOffer: (app: any) => void;
}

export const CandidateDetailDrawer: React.FC<CandidateDetailDrawerProps> = ({
  isOpen,
  onClose,
  application,
  worker,
  selectedJob,
  onMoveStage,
  onOpenMessage,
  onOutreach,
  onScheduleInterview,
  onSendOffer
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'NOTES' | 'FOLLOW_UPS' | 'PROFILE'>('TIMELINE');
  const [newNote, setNewNote] = useState('');
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  const applicationId = application?.id;

  const { data: timelineData, isLoading: isTimelineLoading } = useQuery({
    queryKey: ['applications', applicationId, 'timeline'],
    queryFn: () => applicationService.getApplicationTimeline(applicationId),
    enabled: isOpen && Boolean(applicationId),
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => applicationService.addApplicationNote(applicationId, content),
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['applications', applicationId, 'timeline'] });
      toast.success('Internal note added');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add note');
    }
  });

  const followUpMutation = useMutation({
    mutationFn: (payload: { title: string; dueAt: string; note?: string }) =>
      applicationService.createApplicationFollowUp(applicationId, payload),
    onSuccess: () => {
      setFollowUpTitle('');
      setFollowUpDate('');
      setFollowUpNote('');
      queryClient.invalidateQueries({ queryKey: ['applications', applicationId, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedJob?.id, 'follow-ups'] });
      toast.success('Follow-up scheduled');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to schedule follow-up');
    }
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: (followUpId: string) =>
      applicationService.updateApplicationFollowUp(followUpId, { status: 'COMPLETED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', applicationId, 'timeline'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', selectedJob?.id, 'follow-ups'] });
      toast.success('Follow-up marked completed');
    }
  });

  if (!isOpen || !application) return null;

  const candidateName = worker?.fullName || worker?.name || 'Candidate';
  const candidateRole = worker?.preferredRoles?.[0] || worker?.trade || (Array.isArray(worker?.skills) ? worker.skills[0] : 'Specialist');
  const isVerified = Boolean(worker?.identityVerified || worker?.isVerified);
  const currentStage: PipelineStage = application.pipelineStage || 'NEW';

  const timelineItems = timelineData?.data?.timeline || timelineData?.timeline || [];
  const notesList = timelineData?.data?.notes || timelineData?.notes || [];
  const followUpsList = timelineData?.data?.followUps || timelineData?.followUps || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-[#121215] shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-3 bg-slate-50/70 dark:bg-[#16161a]">
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar src={worker?.profileImageUrl} name={candidateName} size="lg" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#0a0a0a] dark:text-white truncate">
                    {candidateName}
                  </h3>
                  {isVerified && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-bold">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  <span>{candidateRole}</span>
                  <span>•</span>
                  <span>{worker?.city || worker?.location || 'Local Area'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Stage Progression Bar */}
          <div className="px-4 py-2.5 bg-white dark:bg-[#121215] border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold uppercase text-slate-400 dark:text-zinc-500">Stage:</span>
            <div className="flex items-center gap-1.5">
              {(Object.keys(PIPELINE_STAGES) as PipelineStage[]).map((stg) => {
                const conf = PIPELINE_STAGES[stg];
                const isCurrent = currentStage === stg;
                return (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => onMoveStage(application.id, stg)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? `${conf.bgLight} ${conf.textColor} border ${conf.borderColor} ring-1 ring-black/5 shadow-2xs`
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                    }`}
                  >
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-4 bg-slate-50/40 dark:bg-zinc-900/40 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('TIMELINE')}
              className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'TIMELINE'
                  ? 'border-[#0f2f63] text-[#0f2f63] dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline ({timelineItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('NOTES')}
              className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'NOTES'
                  ? 'border-[#0f2f63] text-[#0f2f63] dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes ({notesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FOLLOW_UPS')}
              className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'FOLLOW_UPS'
                  ? 'border-[#0f2f63] text-[#0f2f63] dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Follow-ups ({followUpsList.filter((f: any) => f.status === 'PENDING').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`py-3 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PROFILE'
                  ? 'border-[#0f2f63] text-[#0f2f63] dark:border-sky-400 dark:text-sky-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {isTimelineLoading ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-[#0f2f63] dark:text-sky-400" />
              </div>
            ) : null}

            {/* TAB: TIMELINE */}
            {activeTab === 'TIMELINE' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500">
                  Chronological Hiring Activity
                </h4>

                {timelineItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500">
                    No activity recorded yet for this application.
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-slate-200 dark:border-zinc-800 space-y-6">
                    {timelineItems.map((item: any, idx: number) => {
                      const isNote = item.type === 'NOTE';
                      const isFollowUp = item.type === 'FOLLOW_UP';

                      return (
                        <div key={item.id || idx} className="relative group">
                          {/* Indicator Dot */}
                          <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#121215] ${
                            isNote ? 'bg-purple-500' : isFollowUp ? 'bg-amber-500' : 'bg-[#0f2f63] dark:bg-sky-400'
                          }`} />

                          <div className="bg-slate-50/70 dark:bg-zinc-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800 text-xs space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[#0a0a0a] dark:text-white">
                                {item.eventType?.replace(/_/g, ' ') || 'Hiring Event'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(item.timestamp).toLocaleString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>

                            {item.content && (
                              <p className="text-slate-700 dark:text-zinc-300 italic pt-1">
                                "{item.content}"
                              </p>
                            )}

                            {item.title && (
                              <p className="text-slate-800 dark:text-zinc-200 font-semibold pt-0.5">
                                Follow-up: {item.title} ({item.status})
                              </p>
                            )}

                            {item.metadata?.stage && (
                              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300">
                                Stage: {item.metadata.stage}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: NOTES */}
            {activeTab === 'NOTES' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                    Add Private Team Note (Visible only to employers)
                  </label>
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="e.g. Discussed wage expectations, candidate has experience on high-voltage lines..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-[#0a0a0a] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2f63]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newNote.trim()) return;
                      noteMutation.mutate(newNote);
                    }}
                    disabled={noteMutation.isPending || !newNote.trim()}
                    className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {noteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Save Note</span>
                  </button>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800">
                  <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500">
                    Previous Notes ({notesList.length})
                  </h4>

                  {notesList.length === 0 ? (
                    <p className="text-xs text-slate-400">No private notes yet.</p>
                  ) : (
                    notesList.map((note: any) => (
                      <div key={note.id} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Employer Note</span>
                          <span>{new Date(note.created_at || note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </div>
                        <p className="text-slate-800 dark:text-zinc-200 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB: FOLLOW_UPS */}
            {activeTab === 'FOLLOW_UPS' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                    <span>Schedule Candidate Follow-up</span>
                  </h4>

                  <input
                    type="text"
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    placeholder="e.g. Call candidate to confirm arrival time"
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs text-zinc-900 dark:text-zinc-100"
                  />

                  <div className="flex items-center gap-2">
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!followUpTitle.trim() || !followUpDate) return;
                        followUpMutation.mutate({
                          title: followUpTitle,
                          dueAt: followUpDate,
                          note: followUpNote
                        });
                      }}
                      disabled={followUpMutation.isPending || !followUpTitle.trim() || !followUpDate}
                      className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {followUpMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Set Reminder'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-zinc-500">
                    Follow-up Reminders ({followUpsList.length})
                  </h4>

                  {followUpsList.length === 0 ? (
                    <p className="text-xs text-slate-400">No scheduled reminders for this candidate.</p>
                  ) : (
                    followUpsList.map((f: any) => {
                      const isCompleted = f.status === 'COMPLETED';
                      const isOverdue = !isCompleted && new Date(f.due_at || f.dueAt) < new Date();

                      return (
                        <div
                          key={f.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                            isCompleted
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-75'
                              : isOverdue
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                              : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-zinc-200'}`}>
                                {f.title}
                              </span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                                  Overdue
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Due: {new Date(f.due_at || f.dueAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={() => completeFollowUpMutation.mutate(f.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB: PROFILE */}
            {activeTab === 'PROFILE' && (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">Bio & Experience</h4>
                  <p className="text-slate-600 dark:text-zinc-400">{worker?.bio || 'Verified trade professional on TrustHyre.'}</p>
                  <p className="font-semibold text-slate-700 dark:text-zinc-300 pt-1">
                    Experience: {worker?.experienceYears ? `${worker.experienceYears} Years` : 'Fresher'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-800 dark:text-zinc-200">Verified Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(worker?.skills) ? worker.skills : []).map((sk: string) => (
                      <span key={sk} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#16161a]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onOutreach(worker)}
                className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Contact</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenMessage(application.id)}
                className="px-3.5 py-2 bg-white dark:bg-[#121215] text-[#0f2f63] dark:text-sky-400 border border-slate-200 dark:border-zinc-800 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onScheduleInterview(application, worker)}
                className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-400 border border-sky-200 dark:border-sky-800 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Interview</span>
              </button>

              <button
                type="button"
                onClick={() => onSendOffer(application)}
                className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Send Offer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
