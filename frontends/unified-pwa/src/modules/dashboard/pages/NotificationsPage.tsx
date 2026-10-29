import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { notificationService, type AppNotification } from '../../../services/notification.service';
import { AppLoader } from '../../../components/common/AppLoader';

export const NotificationsPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading, isRefetching, refetch } = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const data = await notificationService.getNotifications();
      return data;
    },
    staleTime: 15 * 1000,
  });

  const unreadCount = notifications.filter(n => !n.isRead && !(n as any).is_read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old = []) =>
        old.map(n => n.id === id ? { ...n, isRead: true, is_read: true } : n)
      );
      queryClient.setQueryData<number>(['unreadCount'], (c = 0) => Math.max(0, (c || 0) - 1));
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old = []) =>
        old.map(n => ({ ...n, isRead: true, is_read: true }))
      );
      queryClient.setQueryData<number>(['unreadCount'], 0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppNotification[]>(['notifications'], (old = []) =>
        old.filter(n => n.id !== id)
      );
      queryClient.setQueryData<number>(['unreadCount'], (c = 0) => Math.max(0, (c || 0) - 1));
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => notificationService.deleteAllNotifications(),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(['notifications'], []);
      queryClient.setQueryData<number>(['unreadCount'], 0);
    }
  });

  const handleNotificationClick = (n: AppNotification) => {
    markReadMutation.mutate(n.id);

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

  const getNotificationIcon = (type?: string) => {
    const t = type?.toUpperCase();
    if (t?.includes('APPLICATION') || t?.includes('JOB')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-2xs">
          <Briefcase className="w-5 h-5" />
        </div>
      );
    }
    if (t?.includes('KYC') || t?.includes('VERIF')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 shadow-2xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
      );
    }
    if (t?.includes('SKILL') || t?.includes('BADGE')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 shadow-2xs">
          <Award className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
        <Info className="w-5 h-5" />
      </div>
    );
  };

  const filteredNotifications = notifications.filter(n => {
    const isUnread = !n.isRead && !(n as any).is_read;
    if (filter === 'unread') return isUnread;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-6 px-4 sm:px-6 lg:px-8 font-['Onest',system-ui,sans-serif]">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-[#0A1931] bg-white hover:bg-slate-100 border border-slate-200/80 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={() => navigate('/settings?tab=notifications')}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0f2f63] hover:bg-blue-50/80 bg-white border border-blue-200/70 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Notification Preferences</span>
          </button>
        </div>

        {/* Header Banner */}
        <div className="bg-white rounded-[1.75rem] border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0f2f63]">
                Activity & Updates
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#0A1931] flex items-center gap-2.5">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold tabular-nums">
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
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 text-xs font-semibold transition-all cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear all notifications?")) {
                    deleteAllMutation.mutate();
                  }
                }}
                disabled={deleteAllMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Updates <span className="tabular-nums">({notifications.length})</span>
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'unread'
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Unread <span className="tabular-nums">({unreadCount})</span>
          </button>
        </div>

        {/* Notifications Feed */}
        {isLoading ? (
          <AppLoader variant="page" message="Loading notifications..." />
        ) : filteredNotifications.length > 0 ? (
          <div className="bg-white rounded-[1.75rem] border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {filteredNotifications.map((n) => {
              const isUnread = !n.isRead && !(n as any).is_read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors cursor-pointer group ${
                    isUnread ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {getNotificationIcon(n.type)}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`text-sm font-bold truncate ${isUnread ? 'text-[#0A1931]' : 'text-slate-800'}`}>
                        {n.title}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">
                        {n.createdAt || (n as any).created_at
                          ? formatDistanceToNow(new Date(n.createdAt || (n as any).created_at), { addSuffix: true })
                          : 'Just now'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      {n.link && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 group-hover:underline">
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(n.id);
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
                          deleteMutation.mutate(n.id);
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
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-12 text-center max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-2xs">
              <BellOff className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#0A1931]">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              {filter === 'unread' 
                ? 'You are all caught up! When you receive job updates or messages, they will appear here.'
                : 'When employers message you, candidates apply, or status changes occur, real-time alerts will be delivered here.'}
            </p>
            {filter === 'unread' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                View all notifications
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationsPage;
