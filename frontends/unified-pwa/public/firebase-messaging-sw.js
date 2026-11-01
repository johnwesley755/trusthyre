// Firebase Cloud Messaging (FCM) Background Service Worker for TrustHyre
/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Instantly activate new service worker versions
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Dynamically extract Firebase configuration passed securely via Service Worker registration URL parameters
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
    console.warn('[FCM SW] App init notice:', initErr);
  }
}

let messaging = null;
try {
  if (firebase.apps && firebase.apps.length > 0) {
    messaging = firebase.messaging();
  }
} catch (swInitErr) {
  console.warn('[FCM SW] Messaging init notice:', swInitErr);
}

// Background push handler via Firebase Messaging
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    // Extract title, body, icon, and destination link
    const title = payload.notification?.title || payload.data?.title || 'TrustHyre';
    const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'New update available on TrustHyre!';
    const icon = payload.notification?.icon || payload.data?.icon || '/logo.png';
    const image = payload.notification?.image || payload.data?.image;
    const clickAction = payload.fcmOptions?.link || payload.data?.url || payload.data?.link || '/notifications';

    const notificationOptions = {
      body,
      icon,
      image,
      badge: '/logo.png',
      data: {
        url: clickAction,
        timestamp: Date.now(),
        ...(payload.data || {})
      },
      vibrate: [100, 50, 100],
      tag: payload.data?.id || `trusthyre-${Date.now()}`,
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
    const title = raw.notification?.title || raw.data?.title || 'TrustHyre Update';
    const body = raw.notification?.body || raw.data?.body || raw.data?.message || 'New update received.';
    const icon = raw.notification?.icon || raw.data?.icon || '/logo.png';
    const image = raw.notification?.image || raw.data?.image;
    const clickAction = raw.fcmOptions?.link || raw.data?.url || raw.data?.link || '/notifications';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        image,
        badge: '/logo.png',
        data: { url: clickAction, timestamp: Date.now() },
        vibrate: [100, 50, 100],
        tag: raw.data?.id || `trusthyre-push-${Date.now()}`,
        renotify: true
      })
    );
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('TrustHyre', {
        body: text || 'You have a new update.',
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url: '/notifications', timestamp: Date.now() }
      })
    );
  }
});

// Handle notification click to focus or open target page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
