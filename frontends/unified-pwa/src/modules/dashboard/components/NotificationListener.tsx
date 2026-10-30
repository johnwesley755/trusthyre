import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, CheckCircle2, Info, AlertTriangle, Briefcase, Award, ShieldCheck, Users } from 'lucide-react';
import { fcmService } from '../../../services/fcm.service';
import { useAuth } from '../../../providers/AuthContext';

export const NotificationListener = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let promptTimer: ReturnType<typeof setTimeout> | null = null;

    if (fcmService.isPushSupported()) {
      const currentPerm = Notification.permission;
      
      if (currentPerm === 'granted') {
        // Token refresh and keep alive with active user ID
        fcmService.requestPushPermissionAndRegister(user.id, true).catch(() => {});
      } else if (currentPerm === 'default') {
        // Show non-intrusive prompt once per session so user can opt-in to instant alerts
        const hasPrompted = sessionStorage.getItem('push_prompt_dismissed');
        if (!hasPrompted) {
          promptTimer = setTimeout(() => {
            toast('Enable Push Notifications', {
              description: 'Stay updated on new verified job matches, shifts, and application responses.',
              icon: <Bell className="w-5 h-5 text-[#0f2f63] animate-bounce" />,
              duration: 10000,
              className: "bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xl p-4 font-sans",
              action: {
                label: 'Enable Alerts',
                onClick: async () => {
                  sessionStorage.setItem('push_prompt_dismissed', 'true');
                  const res = await fcmService.requestPushPermissionAndRegister(user.id, true);
                  if (res.status === 'granted') {
                    toast.success('Push notifications successfully activated!');
                  }
                }
              },
              cancel: {
                label: 'Later',
                onClick: () => {
                  sessionStorage.setItem('push_prompt_dismissed', 'true');
                }
              }
            });
          }, 3500);
        }
      }
    }

    // Attach real-time foreground listener for FCM push notifications
    let cleanupListener: (() => void) | null = null;

    fcmService.listenToForegroundMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'TrustHyre Notification';
      const message = payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new update.';
      const link = payload.data?.url || payload.data?.link || '/notifications';
      const type = (payload.data?.type || 'SYSTEM').toUpperCase();
      const notificationId = payload.data?.notificationId || payload.data?.id || `fcm-${Date.now()}`;

      // Patch TanStack query cache directly - ZERO GET calls to backend
      const newNotification = {
        id: notificationId,
        userId: user?.id || '',
        title,
        message,
        type,
        link,
        isRead: false,
        is_read: false,
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData<any[]>(['notifications'], (old = []) => {
        const exists = old.some((n: any) => n.id === newNotification.id);
        return exists ? old : [newNotification, ...old];
      });
      queryClient.setQueryData<number>(['unreadCount'], (c = 0) => (c || 0) + 1);

      // Gentle vibration feedback on mobile devices
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {
          // ignore
        }
      }

      // Display rich, actionable in-app toast with deep link navigation
      toast(title, {
        description: message,
        icon: getNotificationIcon(type),
        duration: 6000,
        className: "bg-[#FFFFFF] dark:bg-[#0f2f63] text-slate-900 dark:text-white rounded-2xl border border-slate-200 dark:border-blue-900 shadow-xl p-4 font-sans",
        action: {
          label: 'View',
          onClick: () => {
            let targetLink = link || '/notifications';
            if (targetLink.includes('/dashboard/employer/jobs')) {
              const match = targetLink.match(/\/dashboard\/employer\/jobs\/([^/]+)/);
              if (match && match[1] && match[1] !== 'applicants') {
                targetLink = `/jobs/${match[1]}/applicants`;
              } else {
                targetLink = '/jobs';
              }
            }
            // Mark as read in cache directly before navigating
            queryClient.setQueryData<any[]>(['notifications'], (old = []) =>
              old.map((n: any) => n.id === notificationId ? { ...n, isRead: true, is_read: true } : n)
            );
            queryClient.setQueryData<number>(['unreadCount'], (c = 0) => Math.max(0, (c || 0) - 1));
            navigate(targetLink);
          }
        }
      });
    }).then((unsub) => {
      cleanupListener = unsub;
    });

    return () => {
      if (promptTimer) {
        clearTimeout(promptTimer);
      }
      if (cleanupListener) {
        cleanupListener();
      }
    };
  }, [user, queryClient, navigate]);

  return null;
};

const getNotificationIcon = (type?: string) => {
  const t = (type || '').toUpperCase();
  if (t === 'APPLICATION_ACCEPTED' || t === 'NEW_APPLICATION' || t === 'APPLICATION_SUBMITTED') {
    return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  }
  if (t === 'JOB_MATCH_ALERT' || t === 'JOB_POSTED') {
    return <Briefcase className="w-5 h-5 text-blue-500" />;
  }
  if (t === 'CANDIDATE_MATCH_ALERT' || t === 'CANDIDATE_ALERT') {
    return <Users className="w-5 h-5 text-indigo-500" />;
  }
  if (t === 'SKILL_BADGE_EARNED') {
    return <Award className="w-5 h-5 text-amber-500" />;
  }
  if (t === 'KYC_VERIFIED' || t === 'SECURITY_ALERT') {
    return <ShieldCheck className="w-5 h-5 text-blue-600" />;
  }
  if (t === 'KYC_REJECTED' || t === 'WARNING') {
    return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  }
  if (t === 'INFO' || t === 'APPLICATION_UPDATE') {
    return <Info className="w-5 h-5 text-blue-400" />;
  }
  return <Bell className="w-5 h-5 text-[#0F2F63] dark:text-white" />;
};
