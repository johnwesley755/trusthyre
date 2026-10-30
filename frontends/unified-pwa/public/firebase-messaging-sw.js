// Firebase Cloud Messaging (FCM) Background Service Worker for TrustHyre
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Dynamically extract Firebase configuration passed securely via Service Worker registration URL parameters
// Zero hardcoded credentials in public static files
const urlParams = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId')
};

// Initialize Firebase App only when valid runtime configuration is provided
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (initErr) {
    // Silent fail in production
  }
}

let messaging = null;
try {
  if (firebase.apps && firebase.apps.length > 0) {
    messaging = firebase.messaging();
  }
} catch (swInitErr) {
  // Silent fallback
}

// Background push handler via Firebase Messaging
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    // If the push already has a top-level notification object, browser displays it automatically
    if (payload.notification) {
      return;
    }

    const title = payload.data?.title || 'TrustHyre Notification';
    const body = payload.data?.body || payload.data?.message || 'You have a new update on TrustHyre.';
    const link = payload.data?.url || payload.data?.link || '/notifications';

    const notificationOptions = {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: {
        url: link,
        timestamp: Date.now(),
        ...(payload.data || {})
      },
      vibrate: [100, 50, 100],
      tag: payload.data?.id || 'trusthyre-push',
      renotify: true,
      actions: [
        { action: 'open', title: 'Open TrustHyre' }
      ]
    };

    return self.registration.showNotification(title, notificationOptions);
  });
}

// Fallback raw Web Push event listener
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const raw = event.data.json();
    if (raw.notification) return; // Handled by browser push service

    const title = raw.data?.title || 'TrustHyre Update';
    const body = raw.data?.body || raw.data?.message || 'New update received.';
    const link = raw.data?.url || raw.data?.link || '/notifications';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: link, timestamp: Date.now() },
        vibrate: [100, 50, 100]
      })
    );
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('TrustHyre', {
        body: text || 'You have a new update.',
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: '/notifications' }
      })
    );
  }
});

// Handle notification click to focus existing tab or navigate
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetPath = '/notifications';
  const data = event.notification.data;
  if (data) {
    targetPath = data.url || 
                 data.link || 
                 data.click_action || 
                 data?.FCM_MSG?.notification?.click_action || 
                 data?.FCM_MSG?.fcmOptions?.link || 
                 targetPath;
  }

  const fullTargetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetPath) {
            client.navigate(targetPath);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullTargetUrl);
      }
    })
  );
});
