import prisma from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { getFirebaseMessaging } from '../config/firebaseAdmin';
import type { SendResponse } from 'firebase-admin/messaging';
import { sendEmail } from './mailer';
import {
  renderCandidateMatchEmail,
  renderJobMatchEmail,
  renderNotificationEmail
} from './emailTemplateService';

export interface DispatchNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, string>;
}

export interface DispatchMulticastParams {
  userIds: string[];
  title: string;
  message: string;
  type: string;
  link?: string;
  data?: Record<string, string>;
}

export class NotificationDispatcher {
  /**
   * Dispatches a synchronized in-app, push, and email notification to a single user.
   */
  public static async dispatch(params: DispatchNotificationParams) {
    try {
      const notificationId = uuidv4();

      // 1. Persist the notification in PostgreSQL as the single source of truth
      const notification = await prisma.notifications.create({
        data: {
          id: notificationId,
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          link: params.link || null,
          is_read: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // 2. Check user's notification preferences
      const settings = await prisma.user_settings.findUnique({
        where: { user_id: params.userId }
      }).catch(() => null);

      const isPushAllowed = settings ? settings.push_notifications !== false : true;
      const isEmailAllowed = settings ? settings.email_notifications !== false : true;

      // 2b. Dispatch Email if email_notifications is enabled
      if (isEmailAllowed) {
        try {
          const userMeta = await prisma.user_metadata.findUnique({
            where: { id: params.userId },
            select: { email: true, first_name: true }
          });

          if (userMeta?.email) {
            const firstName = userMeta.first_name || 'TrustHyre Member';
            const frontendUrl = (process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '');
            const targetLink = params.link
              ? (params.link.startsWith('http') ? params.link : `${frontendUrl}${params.link.startsWith('/') ? '' : '/'}${params.link}`)
              : `${frontendUrl}/notifications`;

            let emailPayload: { html: string; text: string; subject: string };

            if (params.type === 'CANDIDATE_MATCH_ALERT') {
              const candidateName = params.data?.name || params.title.replace(/^Candidate\s*(Alert|Match):\s*/i, '').trim() || 'Verified Candidate';
              const skillMatch = params.message.match(/skills in "([^"]+)"/i);
              const skills = params.data?.skills ? (Array.isArray(params.data.skills) ? params.data.skills : String(params.data.skills).split(',')) : (skillMatch ? skillMatch[1].split(',').map(s => s.trim()) : (params.data?.category ? [params.data.category] : []));
              const locationMatch = params.message.match(/in ([A-Za-z\s]+) is now available/i);
              const location = params.data?.city || (locationMatch ? locationMatch[1].trim() : 'Your Area');

              emailPayload = renderCandidateMatchEmail({
                recipientName: firstName,
                candidateName,
                skills,
                location,
                targetLink
              });
            } else if (params.type === 'JOB_MATCH_ALERT') {
              const jobTitle = params.data?.title || params.title.replace(/^Job\s*(Alert|Match):\s*/i, '').trim() || 'Verified Job';
              const employerMatch = params.message.match(/^(.+?) in /i);
              const companyName = params.data?.company || (employerMatch ? employerMatch[1].trim() : 'Verified Employer');
              const cityMatch = params.message.match(/in ([A-Za-z\s]+) posted/i) || params.message.match(/in ([A-Za-z\s]+) offering/i);
              const location = params.data?.city || (cityMatch ? cityMatch[1].trim() : 'Your Area');
              const skills = params.data?.category ? [params.data.category] : [];

              emailPayload = renderJobMatchEmail({
                recipientName: firstName,
                jobTitle,
                companyName,
                location,
                skills,
                targetLink
              });
            } else {
              emailPayload = renderNotificationEmail({
                recipientName: firstName,
                title: params.title,
                message: params.message,
                targetLink
              });
            }

            const isAlert = params.type === 'JOB_MATCH_ALERT' || params.type === 'CANDIDATE_MATCH_ALERT';
            sendEmail(userMeta.email, emailPayload.subject, emailPayload.html, {
              text: emailPayload.text,
              category: isAlert ? 'alert' : 'transactional',
              unsubscribeUrl: `${frontendUrl}/notifications`
            }).catch(err => {
              console.error(`[NotificationDispatcher] Email dispatch failed for ${userMeta.email}:`, err.message);
            });
          }
        } catch (mailErr: any) {
          console.error(`[NotificationDispatcher] Failed checking email recipient:`, mailErr.message);
        }
      }
      
      if (!isPushAllowed) {
        return notification;
      }

      // 3. Retrieve user's registered FCM device tokens
      let tokenRecords: { token: string }[] = [];
      try {
        if ((prisma as any).user_fcm_tokens) {
          tokenRecords = await (prisma as any).user_fcm_tokens.findMany({
            where: { user_id: params.userId },
            select: { token: true }
          });
        } else {
          tokenRecords = await prisma.$queryRaw<{ token: string }[]>`SELECT token FROM user_fcm_tokens WHERE user_id = ${params.userId}`;
        }
      } catch (err: any) {
        tokenRecords = await prisma.$queryRaw<{ token: string }[]>`SELECT token FROM user_fcm_tokens WHERE user_id = ${params.userId}`.catch(() => []);
      }

      const tokens = (tokenRecords || []).map(r => r.token).filter(Boolean);

      if (tokens.length === 0) {
        return notification;
      }

      // 4. Send FCM Multicast Push via Firebase Admin SDK
      const messaging = getFirebaseMessaging();
      if (!messaging) {
        return notification;
      }

      const targetUrl = params.link || '/notifications';
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const iconUrl = `${frontendUrl}/logo.png`;

      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: params.title,
          body: params.message
        },
        data: {
          id: notificationId,
          type: params.type,
          title: params.title,
          message: params.message,
          url: targetUrl,
          link: targetUrl,
          click_action: targetUrl,
          createdAt: new Date().toISOString(),
          ...(params.data || {})
        },
        webpush: {
          notification: {
            title: params.title,
            body: params.message,
            icon: iconUrl,
            badge: iconUrl
          },
          fcmOptions: {
            link: targetUrl
          }
        }
      }).catch((e: any) => {
        console.error('❌ [FCM-BACKEND:STEP-6:SEND-ERROR] FCM sendEachForMulticast rejected:', e.message);
        return null;
      });

      // 5. Automatic stale token cleanup if any device token is expired/unregistered/mismatched
      if (response) {
        const deadTokens: string[] = [];
        response.responses.forEach((resp: SendResponse, idx: number) => {
          if (resp.error) {
            console.error(`[FCM] Device token failure: code="${resp.error.code}" message="${resp.error.message}"`);
            const code = resp.error.code;
            // Clean up ONLY genuine dead/unregistered tokens, never temporary payload or credential mismatch errors
            if (
              code === 'messaging/registration-token-not-registered' ||
              code === 'messaging/invalid-registration-token'
            ) {
              deadTokens.push(tokens[idx]);
            }
          }
        });

        if (deadTokens.length > 0) {
          try {
            if ((prisma as any).user_fcm_tokens) {
              await (prisma as any).user_fcm_tokens.deleteMany({
                where: { token: { in: deadTokens } }
              });
            } else {
              for (const t of deadTokens) {
                await prisma.$executeRaw`DELETE FROM user_fcm_tokens WHERE token = ${t}`;
              }
            }
          } catch (err: any) {
            console.error('[FCM] Stale token cleanup error:', err.message);
          }
        }
      }

      return notification;
    } catch (err: any) {
      console.error('[NotificationDispatcher] Unexpected error in dispatch:', err.message);
      return null;
    }
  }

  /**
   * Dispatches notifications to multiple users simultaneously (e.g. proximity job alerts).
   */
  public static async dispatchMulticast(params: DispatchMulticastParams) {
    if (!params.userIds || params.userIds.length === 0) return [];
    
    // Process in parallel with concurrency limit
    const results = await Promise.allSettled(
      params.userIds.map(userId =>
        this.dispatch({
          userId,
          title: params.title,
          message: params.message,
          type: params.type,
          link: params.link,
          data: params.data
        })
      )
    );

    return results;
  }
}

// Re-export as standard helper matching previous signature for drop-in compatibility
export const sendNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string,
  link?: string
) => {
  return NotificationDispatcher.dispatch({
    userId,
    title,
    message,
    type,
    link
  });
};
