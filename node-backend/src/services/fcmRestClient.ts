import jwt from 'jsonwebtoken';
import { getFirebaseServiceAccount } from '../config/firebase';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedOAuthToken: CachedToken | null = null;

/**
 * Retrieves a Google OAuth2 access token with Firebase Cloud Messaging scope.
 * Uses RSA-SHA256 JWT assertion via standard fetch (100% Cloudflare Worker & edge compatible).
 */
export async function getFcmAccessToken(): Promise<string | null> {
  const serviceAccount = getFirebaseServiceAccount();
  if (!serviceAccount || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.warn('⚠️ [FcmRestClient] Missing Firebase service account credentials for FCM REST.');
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least 5 more minutes
  if (cachedOAuthToken && cachedOAuthToken.expiresAt > now + 300) {
    return cachedOAuthToken.accessToken;
  }

  try {
    const formattedPrivateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
    const signedJwt = jwt.sign(
      {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
        scope: 'https://www.googleapis.com/auth/firebase.messaging'
      },
      formattedPrivateKey,
      { algorithm: 'RS256' }
    );

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signedJwt
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('❌ [FcmRestClient] Google OAuth token request failed:', res.status, errText);
      return null;
    }

    const data: any = await res.json();
    if (!data.access_token) {
      console.error('❌ [FcmRestClient] No access_token returned by Google OAuth');
      return null;
    }

    cachedOAuthToken = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in || 3600)
    };

    return cachedOAuthToken.accessToken;
  } catch (err: any) {
    console.error('❌ [FcmRestClient] Error obtaining FCM OAuth token:', err.message);
    return null;
  }
}

export interface FcmPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, string>;
}

export interface FcmSendResult {
  success: boolean;
  unregisteredTokens: string[];
}

/**
 * Sends FCM push notification to tokens via FCM v1 REST API.
 * Uses HTTP/1.1 standard fetch without requiring http2.connect!
 */
export async function sendFcmMessagesV1(
  tokens: string[],
  payload: FcmPayload
): Promise<FcmSendResult> {
  const serviceAccount = getFirebaseServiceAccount();
  if (!serviceAccount?.project_id) {
    console.warn('⚠️ [FcmRestClient] Project ID missing; skipping FCM dispatch.');
    return { success: false, unregisteredTokens: [] };
  }

  const accessToken = await getFcmAccessToken();
  if (!accessToken) {
    console.error('❌ [FcmRestClient] Unable to acquire OAuth access token; aborting push.');
    return { success: false, unregisteredTokens: [] };
  }

  const projectId = serviceAccount.project_id;
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const unregisteredTokens: string[] = [];

  const targetUrl = payload.url || '/notifications';
  const frontendUrl = (process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '');
  const iconUrl = `${frontendUrl}/logo.png`;

  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const body = {
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body
          },
          data: {
            title: payload.title,
            message: payload.body,
            url: targetUrl,
            link: targetUrl,
            click_action: targetUrl,
            createdAt: new Date().toISOString(),
            ...(payload.data || {})
          },
          webpush: {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: iconUrl,
              badge: iconUrl
            },
            fcm_options: {
              link: targetUrl
            }
          }
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorCode = errorData?.error?.details?.[0]?.errorCode || errorData?.error?.status || '';
        const errorMessage = errorData?.error?.message || '';

        console.error(`[FcmRestClient] Push error for token ${token.slice(0, 10)}...:`, errorCode, errorMessage);

        if (
          errorCode === 'UNREGISTERED' ||
          errorMessage.includes('not registered') ||
          errorMessage.includes('invalid registration token')
        ) {
          unregisteredTokens.push(token);
        }
        return false;
      }

      return true;
    })
  );

  const anySuccess = results.some(r => r.status === 'fulfilled' && r.value === true);
  return { success: anySuccess, unregisteredTokens };
}

