import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { getMessagingInstance } from '../lib/firebase';
import apiClient from '../api/apiClient';

const LOCAL_STORAGE_FCM_KEY = 'trusthyre_fcm_token';

export interface PushPermissionResult {
  status: 'granted' | 'denied' | 'default' | 'unsupported';
  token?: string | null;
  error?: string;
}

export const fcmService = {
  /**
   * Checks whether the current browser environment supports Push & Web Notifications.
   */
  isPushSupported: (): boolean => {
    const isWindow = typeof window !== 'undefined';
    const hasNotification = isWindow && 'Notification' in window;
    const hasSW = isWindow && 'serviceWorker' in navigator;
    const hasPush = isWindow && 'PushManager' in window;
    return Boolean(isWindow && hasNotification && hasSW && hasPush);
  },

  /**
   * Returns current browser notification permission ('granted' | 'denied' | 'default').
   */
  getPermissionState: (): NotificationPermission | 'unsupported' => {
    if (!fcmService.isPushSupported()) return 'unsupported';
    return Notification.permission;
  },

  /**
   * Requests notification permissions from user, retrieves Firebase VAPID token,
   * and synchronizes it with the TrustHyre backend.
   */
  requestPushPermissionAndRegister: async (userId?: string, forceRefresh = false): Promise<PushPermissionResult> => {
    if (!fcmService.isPushSupported()) {
      return { status: 'unsupported' };
    }

    try {
      // 1. Check or prompt browser permission
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        return { status: permission as 'denied' | 'default' };
      }

      // 2. Initialize Firebase Messaging
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.error('[FCM] Firebase messaging not supported or failed to initialize.');
        return { status: 'unsupported', error: 'Firebase messaging not supported' };
      }

      // 3. Ensure background service worker is registered with dynamic env params (zero hardcoded secrets in sw file)
      let swRegistration: ServiceWorkerRegistration | undefined;
      const swParams = new URLSearchParams({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
      }).toString();
      const swUrl = `/firebase-messaging-sw.js?${swParams}`;

      try {
        swRegistration = await navigator.serviceWorker.register(swUrl);
      } catch {
        swRegistration = await navigator.serviceWorker.ready;
      }

      // 4. Retrieve FCM registration token
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, {
        vapidKey: vapidKey || undefined,
        serviceWorkerRegistration: swRegistration
      });

      if (!token) {
        console.error('[FCM] getToken returned an empty or null token.');
        return { status: 'granted', token: null, error: 'Failed to retrieve FCM token' };
      }

      // 5. Synchronize token with backend for user session (silent background sync)
      const userTokenKey = userId ? `trusthyre_fcm_registered_${userId}` : 'trusthyre_fcm_registered_current';
      const lastRegisteredToken = localStorage.getItem(userTokenKey);

      if (forceRefresh || lastRegisteredToken !== token) {
        try {
          await apiClient.post('/api/notifications/fcm-token', {
            token,
            deviceType: 'web'
          });
          localStorage.setItem(userTokenKey, token);
          localStorage.setItem(LOCAL_STORAGE_FCM_KEY, token);
        } catch (apiErr: any) {
          // Log error to console only, never show toast in UI
          console.error('[FCM] Failed to sync push token with backend:', apiErr?.response?.data || apiErr.message);
          localStorage.removeItem(userTokenKey);
        }
      }

      return { status: 'granted', token };
    } catch (err: any) {
      console.error('[FCM] Push registration exception:', err.name, err.message);
      return { status: 'denied', error: err.message };
    }
  },

  /**
   * Unregisters device token on user logout
   */
  unregisterPushToken: async (userId?: string): Promise<void> => {
    try {
      const token = localStorage.getItem(LOCAL_STORAGE_FCM_KEY);
      if (token) {
        await apiClient.delete(`/api/notifications/fcm-token?token=${encodeURIComponent(token)}`).catch(() => {});
        localStorage.removeItem(LOCAL_STORAGE_FCM_KEY);
        if (userId) {
          localStorage.removeItem(`trusthyre_fcm_registered_${userId}`);
        }
      }
    } catch (err: any) {
      console.error('[FCM] Error unregistering token:', err.message);
    }
  },

  /**
   * Attaches a foreground listener to receive incoming push messages in real-time
   * when the user is actively viewing the TrustHyre web application.
   */
  listenToForegroundMessages: async (
    callback: (payload: MessagePayload) => void
  ): Promise<(() => void) | null> => {
    if (!fcmService.isPushSupported()) return null;

    try {
      const messaging = await getMessagingInstance();
      if (!messaging) return null;

      const unsubscribe = onMessage(messaging, (payload) => {
        callback(payload);
      });

      return unsubscribe;
    } catch (err: any) {
      console.error('[FCM] Error attaching foreground listener:', err.message);
      return null;
    }
  },

  /**
   * Diagnostic helper that returns current push state
   */
  diagnoseFcmStatus: async () => {
    const isSupported = fcmService.isPushSupported();
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
    const token = localStorage.getItem(LOCAL_STORAGE_FCM_KEY);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    return { isSupported, permission, hasVapidKey: Boolean(vapidKey), hasToken: Boolean(token) };
  }
};
