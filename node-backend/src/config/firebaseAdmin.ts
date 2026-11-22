import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { getFirebaseServiceAccount } from './firebase';

let appInstance: App | null = null;
let messagingInstance: Messaging | null = null;

export function initializeFirebaseAdmin(): { app: App | null; messaging: Messaging | null } {
  if (appInstance && messagingInstance) {
    return { app: appInstance, messaging: messagingInstance };
  }

  try {
    const serviceAccount = getFirebaseServiceAccount();
    if (serviceAccount) {
      const existingApps = getApps();
      if (!existingApps.length) {
        appInstance = initializeApp({
          credential: cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key
          })
        });
      } else {
        appInstance = existingApps[0];
      }

      messagingInstance = getMessaging(appInstance);
      return { app: appInstance, messaging: messagingInstance };
    } else {
      console.warn('⚠️ [FirebaseAdmin] Firebase Service Account credentials not provided. Push notifications via FCM will be skipped, but in-app notifications will continue working normally.');
    }
  } catch (err: any) {
    console.error('❌ [FirebaseAdmin] Failed to initialize Firebase Admin SDK:', err.message);
  }

  return { app: null, messaging: null };
}

export function getFirebaseMessaging(): Messaging | null {
  if (!messagingInstance) {
    const res = initializeFirebaseAdmin();
    return res.messaging;
  }
  return messagingInstance;
}

export const isFirebaseAdminReady = (): boolean => {
  return getApps().length > 0 && messagingInstance !== null;
};

export const getFirebaseAdminStatus = () => {
  const serviceAccount = getFirebaseServiceAccount();
  return {
    isReady: isFirebaseAdminReady(),
    hasApp: Boolean(appInstance),
    hasMessaging: Boolean(messagingInstance),
    projectId: serviceAccount?.project_id || null,
    clientEmail: serviceAccount?.client_email || null,
    hasPrivateKey: Boolean(serviceAccount?.private_key)
  };
};
