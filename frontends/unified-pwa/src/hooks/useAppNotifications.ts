import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../providers/AuthContext';
import { notificationService, type AppNotification } from '../services/notification.service';

export const NOTIFICATION_QUERY_KEY = ['notifications'] as const;
export const UNREAD_COUNT_QUERY_KEY = ['unreadCount'] as const;

export const useAppNotifications = () => {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AppNotification[]>({
    queryKey: NOTIFICATION_QUERY_KEY,
    queryFn: async () => {
      return notificationService.getNotifications();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache - prevents background polling
    refetchOnWindowFocus: false,
    enabled: Boolean(user),
  });

  const unreadCount = notifications.filter(
    (n) => !n.isRead && !(n as any).is_read
  ).length;

  // Single notification mark as read mutation with direct cache patching
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppNotification[]>(NOTIFICATION_QUERY_KEY, (old = []) =>
        old.map((n) =>
          n.id === id ? { ...n, isRead: true, is_read: true } : n
        )
      );
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (c = 0) =>
        Math.max(0, (c || 0) - 1)
      );
    },
    onError: (err: any) => {
      console.error('[Notifications] markRead error:', err?.message || err);
    }
  });

  // Mark all read mutation with direct cache patching (zero GET calls)
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(NOTIFICATION_QUERY_KEY, (old = []) =>
        old.map((n) => ({ ...n, isRead: true, is_read: true }))
      );
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, 0);
    },
    onError: (err: any) => {
      console.error('[Notifications] markAllRead error:', err?.message || err);
    }
  });

  // Single delete mutation with direct cache patching
  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<AppNotification[]>(NOTIFICATION_QUERY_KEY, (old = []) =>
        old.filter((n) => n.id !== id)
      );
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (c = 0) =>
        Math.max(0, (c || 0) - 1)
      );
    },
    onError: (err: any) => {
      console.error('[Notifications] delete error:', err?.message || err);
    }
  });

  // Delete all mutation with direct cache patching
  const deleteAllMutation = useMutation({
    mutationFn: () => notificationService.deleteAllNotifications(),
    onSuccess: () => {
      queryClient.setQueryData<AppNotification[]>(NOTIFICATION_QUERY_KEY, []);
      queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, 0);
    },
    onError: (err: any) => {
      console.error('[Notifications] deleteAll error:', err?.message || err);
    }
  });

  // Helper to directly inject a notification received via foreground push (zero network GET)
  const prependPushNotification = (newNotification: AppNotification) => {
    queryClient.setQueryData<AppNotification[]>(NOTIFICATION_QUERY_KEY, (old = []) => {
      const exists = old.some((n) => n.id === newNotification.id);
      return exists ? old : [newNotification, ...old];
    });
    queryClient.setQueryData<number>(UNREAD_COUNT_QUERY_KEY, (c = 0) => (c || 0) + 1);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefetching,
    refetch,
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    deleteAll: () => deleteAllMutation.mutate(),
    prependPushNotification,
    isMarkingAllRead: markAllReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

