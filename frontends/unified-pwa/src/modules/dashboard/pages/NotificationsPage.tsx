import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Bell,
  BellOff, 
  CheckCheck, 
  Trash2, 
  RefreshCw, 
  Briefcase, 
  Award, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { type AppNotification } from '../../../services/notification.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { useAppNotifications } from '../../../hooks/useAppNotifications';

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  // Centralized hook - shared cache, direct mutations, zero duplicate GET queries
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefetching,
    refetch,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAll,
    isMarkingAllRead,
    isDeleting,
    isDeletingAll
  } = useAppNotifications();

  const handleNotificationClick = (n: AppNotification) => {
    markRead(n.id);

    let targetLink = n.link;
    if (targetLink && targetLink !== '/notifications') {
      // Map legacy or deep-linked dashboard employer paths to canonical active jobs routes
      if (targetLink.includes('/dashboard/employer/jobs')) {
        const match = targetLink.match(/\/dashboard\/employer\/jobs\/([^/]+)/);
        if (match && match[1] && match[1] !== 'applicants') {
          targetLink = `/jobs/${match[1]}/applicants`;
        } else {
          targetLink = '/jobs';
        }
      }
      navigate(targetLink);
      return;
    }

    const t = n.type?.toUpperCase();
    if (t === 'APPLICATION_SUBMITTED' || t === 'APPLICATION_UPDATE' || t === 'APPLICATION_ACCEPTED' || t === 'APPLICATION_SHORTLISTED') {
      navigate('/applied-jobs');
    } else if (t === 'NEW_APPLICATION') {
      const dataJobId = (n as any).data?.jobId || (n as any).data?.job_id;
      if (dataJobId) {
        navigate(`/jobs/${dataJobId}/applicants`);
      } else {
        navigate('/jobs');
      }
    } else if (t === 'JOB_POSTED') {
      navigate('/jobs');
    } else if (t === 'NEW_JOB' || t === 'JOB_MATCH' || t === 'JOB_MATCH_ALERT' || t === 'APPLICATION_REJECTED') {
      navigate('/search');
    } else if (t === 'CANDIDATE_MATCH_ALERT' || t === 'CANDIDATE_ALERT' || t === 'NEW_CANDIDATE') {
      navigate('/find-workers');
    } else if (t === 'WELCOME' || t === 'KYC_VERIFIED' || t === 'KYC_REJECTED' || t === 'SKILL_BADGE_EARNED') {
      navigate('/profile');
    } else if (t === 'SECURITY_ALERT') {
      navigate('/settings');
    }
  };

  const getIcon = (type?: string) => {
    const t = type?.toUpperCase();
    if (t === 'SUCCESS' || t === 'APPLICATION_ACCEPTED' || t === 'APPLICATION_SUBMITTED' || t === 'NEW_APPLICATION') {
      return <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
    if (t === 'JOB_MATCH_ALERT' || t === 'JOB_POSTED' || t === 'NEW_JOB') {
      return <Briefcase className="w-5 h-5 text-blue-600 dark:text-sky-400" />;
    }
    if (t === 'SKILL_BADGE_EARNED') {
      return <Award className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
    }
    if (t === 'KYC_VERIFIED') {
      return <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-sky-400" />;
    }
    return <Info className="w-5 h-5 text-[#0f2f63] dark:text-sky-400" />;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') {
      return !n.isRead && !(n as any).is_read;
    }
    return true;
  });

  if (isLoading && notifications.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center font-['Onest',system-ui,sans-serif]">
        <AppLoader size="lg" message="Loading your notifications..." />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen pb-24 pt-6 px-4 sm:px-6 lg:px-8 bg-[#F8FAFC] dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation Breadcrumb / Actions Row */}
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-[#09090b] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#0A1931] dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95 font-['Onest',system-ui,sans-serif]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings?tab=notifications')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white dark:bg-[#09090b] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#0A1931] dark:hover:text-white transition-all cursor-pointer shadow-2xs active:scale-95 font-['Onest',system-ui,sans-serif]"
            title="Notification Settings & Preferences"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">Preferences</span>
          </button>
        </div>

        {/* Hallmark Hero Header Card */}
        <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-6 sm:p-8 shadow-xs relative overflow-hidden transition-colors">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400 text-xs font-semibold">
                <Bell className="w-3.5 h-3.5" />
                <span>Alerts & Notifications Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0a0a0a] dark:text-white tracking-tight flex items-center gap-3">
                <span>Notification Center</span>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-[#0f2f63] dark:text-[#38BDF8] border border-blue-200 dark:border-blue-800 text-xs font-bold">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed font-medium">
                Real-time alerts for job applications, interview offers, verifications, and platform updates.
              </p>
            </div>

            {/* Quick Actions in Hero */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-[#121215] hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 active:scale-95 font-['Onest',system-ui,sans-serif]"
                title="Refresh notifications"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-blue-600 dark:text-sky-400' : ''}`} />
                <span>Refresh</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  disabled={isMarkingAllRead}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#1a448a] dark:hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95 font-['Onest',system-ui,sans-serif]"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Delete all notifications? This action cannot be undone.')) {
                      deleteAll();
                    }
                  }}
                  disabled={isDeletingAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 active:scale-95 font-['Onest',system-ui,sans-serif]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer font-['Onest',system-ui,sans-serif] ${
              filter === 'all'
                ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                : 'bg-white dark:bg-[#09090b] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 shadow-2xs'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer font-['Onest',system-ui,sans-serif] ${
              filter === 'unread'
                ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                : 'bg-white dark:bg-[#09090b] hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 shadow-2xs'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3 pt-1">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              const isUnread = !n.isRead && !(n as any).is_read;
              const createdAt = n.createdAt || (n as any).created_at;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 group ${
                    isUnread
                      ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 shadow-xs'
                      : 'bg-white dark:bg-[#09090b] hover:bg-slate-50 dark:hover:bg-[#121215] border-[#e6e8ec] dark:border-zinc-800 opacity-90 hover:opacity-100 shadow-2xs'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-[#1C1C21] border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0 shadow-2xs">
                    {getIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className={`text-sm sm:text-base font-bold truncate ${isUnread ? 'text-[#0A1931] dark:text-white' : 'text-slate-800 dark:text-zinc-200'}`}>
                        {n.title}
                      </h3>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium shrink-0">
                        {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-medium mt-1 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 mt-3.5 pt-2.5 border-t border-slate-100 dark:border-zinc-800/80">
                      <span className="text-xs font-bold text-[#0f2f63] dark:text-[#38BDF8] group-hover:underline flex items-center gap-1 font-['Onest',system-ui,sans-serif]">
                        <span>Take action</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(n.id);
                          }}
                          className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-sky-400 cursor-pointer font-['Onest',system-ui,sans-serif]"
                        >
                          Mark as read
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="text-xs font-semibold text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 ml-auto cursor-pointer font-['Onest',system-ui,sans-serif]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-[#38BDF8] shrink-0 mt-2" title="Unread" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-20 px-4 text-center space-y-4 bg-white dark:bg-[#09090b] rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 shadow-xs transition-colors">
              <div className="w-16 h-16 bg-[#F8FAFC] dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500 border border-slate-200/80 dark:border-zinc-800 shadow-2xs">
                <BellOff className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-[#0A1931] dark:text-white">
                  {filter === 'unread' ? 'No unread notifications' : 'Your notification inbox is empty'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto font-medium leading-relaxed">
                  When employers view your profile, post matching jobs, or schedule interviews, alerts will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
