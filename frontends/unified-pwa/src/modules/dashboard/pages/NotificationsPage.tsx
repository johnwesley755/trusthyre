import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
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
    isDeleting
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
      return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
    }
    if (t === 'JOB_MATCH_ALERT' || t === 'JOB_POSTED' || t === 'NEW_JOB') {
      return <Briefcase className="w-5 h-5 text-blue-600" />;
    }
    if (t === 'SKILL_BADGE_EARNED') {
      return <Award className="w-5 h-5 text-amber-500" />;
    }
    if (t === 'KYC_VERIFIED') {
      return <ShieldCheck className="w-5 h-5 text-blue-600" />;
    }
    return <Info className="w-5 h-5 text-[#0f2f63]" />;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') {
      return !n.isRead && !(n as any).is_read;
    }
    return true;
  });

  if (isLoading && notifications.length === 0) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center">
        <AppLoader size="lg" message="Loading your notifications..." />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white font-['Onest',system-ui,sans-serif] text-[#0A1931] pb-24">
      {/* Top Banner Header */}
      <div className="border-b border-slate-100 bg-slate-50/60 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0A1931] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings?tab=notifications')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Notification Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Main Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0A1931] flex items-center gap-2.5">
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0f2f63] border border-blue-200 text-xs font-bold">
                  {unreadCount} unread
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Real-time alerts for job applications, interview offers, verifications, and platform updates.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-600 hover:text-[#0A1931] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                disabled={isMarkingAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-xs font-semibold transition-all cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => deleteAll()}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 pt-6 pb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'unread'
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5 pt-2">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              const isUnread = !n.isRead && !(n as any).is_read;
              const createdAt = n.createdAt || (n as any).created_at;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group ${
                    isUnread
                      ? 'bg-blue-50/20 hover:bg-blue-50/40 border-blue-200/80 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                    {getIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-bold truncate ${isUnread ? 'text-[#0A1931]' : 'text-slate-700'}`}>
                        {n.title}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium shrink-0">
                        {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true }) : 'just now'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-[#0f2f63] group-hover:underline flex items-center gap-1">
                        <span>Take action</span>
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(n.id);
                          }}
                          className="text-[11px] font-medium text-slate-500 hover:text-blue-600"
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
                        className="text-[11px] font-medium text-slate-400 hover:text-rose-600 ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-1.5" title="Unread" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center space-y-3 bg-slate-50/50 rounded-2xl border border-slate-200/60">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto text-slate-400 shadow-2xs">
                <BellOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#0A1931]">
                {filter === 'unread' ? 'No unread notifications' : 'Your notification inbox is empty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                When employers view your profile, post matching jobs, or schedule interviews, alerts will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
