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
      console.log(`[FCM:CLIENT] 🚀 Initializing Push Registration. UserId=${userId || 'anonymous'}, forceRefresh=${forceRefresh}`);

      // If user comes after a long time or forceRefresh is true, purge existing FCM keys from localStorage and sessionStorage
      if (forceRefresh) {
        console.log('[FCM:CLIENT] 🧹 Purging cached FCM tokens from localStorage & sessionStorage to guarantee fresh registration.');
        localStorage.removeItem(LOCAL_STORAGE_FCM_KEY);
        if (userId) {
          localStorage.removeItem(`trusthyre_fcm_registered_${userId}`);
          sessionStorage.removeItem(`fcm_synced_${userId}`);
        }
        localStorage.removeItem('trusthyre_fcm_registered_current');
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('trusthyre_fcm_')) {
            localStorage.removeItem(k);
          }
        });
      }

      // 1. Check or prompt browser permission
      let permission = Notification.permission;
      console.log(`[FCM:CLIENT] 🔑 Browser permission state: "${permission}"`);
      if (permission !== 'granted') {
        console.log('[FCM:CLIENT] 📣 Requesting browser Notification permission...');
        permission = await Notification.requestPermission();
        console.log(`[FCM:CLIENT] 📣 User answered Notification permission prompt: "${permission}"`);
      }

      if (permission !== 'granted') {
        console.warn(`[FCM:CLIENT] ⚠️ Notification permission not granted (${permission}). Registration halted.`);
        return { status: permission as 'denied' | 'default' };
      }

      // 2. Initialize Firebase Messaging
      console.log('[FCM:CLIENT] ⚡ Getting Firebase Messaging instance...');
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.error('[FCM:CLIENT] ❌ Firebase messaging not supported or failed to initialize.');
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
        console.log(`[FCM:CLIENT] 🛠️ Registering ServiceWorker at ${swUrl}`);
        swRegistration = await navigator.serviceWorker.register(swUrl);
        console.log('[FCM:CLIENT] ✅ ServiceWorker registered successfully. Scope:', swRegistration.scope);
      } catch (swErr: any) {
        console.warn('[FCM:CLIENT] ⚠️ sw register failed, falling back to navigator.serviceWorker.ready:', swErr?.message);
        swRegistration = await navigator.serviceWorker.ready;
      }

      // 4. Retrieve FCM registration token
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      console.log(`[FCM:CLIENT] 🌐 Requesting FCM token via getToken()... (VAPID key provided: ${Boolean(vapidKey)})`);
      const token = await getToken(messaging, {
        vapidKey: vapidKey || undefined,
        serviceWorkerRegistration: swRegistration
      });

      if (!token) {
        console.error('[FCM:CLIENT] ❌ getToken returned an empty or null token.');
        return { status: 'granted', token: null, error: 'Failed to retrieve FCM token' };
      }

      console.log(`[FCM:CLIENT] 🎯 Live FCM Token acquired! (length: ${token.length}, prefix: ${token.substring(0, 15)}...)`);

      // 5. Synchronize token with backend for user session (silent background sync)
      const userTokenKey = userId ? `trusthyre_fcm_registered_${userId}` : 'trusthyre_fcm_registered_current';
      
      console.log(`[FCM:CLIENT] 📡 Posting token to /api/notifications/fcm-token for userId=${userId || 'anonymous'}...`);
      try {
        const resp = await apiClient.post('/api/notifications/fcm-token', {
          token,
          deviceType: 'web'
        });
        localStorage.setItem(userTokenKey, token);
        localStorage.setItem(LOCAL_STORAGE_FCM_KEY, token);
        if (userId) {
          sessionStorage.setItem(`fcm_synced_${userId}`, 'true');
        }
        console.log(`[FCM:CLIENT] ✅ Token successfully registered & linked in DB and cached in localStorage. (HTTP ${resp.status})`);
      } catch (apiErr: any) {
        console.error('[FCM:CLIENT] ❌ Failed to sync push token with backend:', apiErr?.response?.data || apiErr.message);
        localStorage.removeItem(userTokenKey);
      }

      return { status: 'granted', token };
    } catch (err: any) {
      console.error('[FCM:CLIENT] ❌ Push registration exception:', err.name, err.message);
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
