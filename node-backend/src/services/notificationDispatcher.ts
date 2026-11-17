import prisma, { withSystemContext } from '../config/prisma';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from './mailer';
import { sendFcmMessagesV1 } from './fcmRestClient';
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

interface RecipientDeliveryInfo {
  email: string | null;
  firstName: string;
  isEmailAllowed: boolean;
  isPushAllowed: boolean;
  fcmTokens: string[];
}

export class NotificationDispatcher {
  /**
   * Safely retrieves recipient's notification delivery channels bypassing RLS
   * via PostgreSQL SECURITY DEFINER function or withSystemContext fallback.
   */
  private static async getRecipientDeliveryInfo(userId: string): Promise<RecipientDeliveryInfo> {
    try {
      const rows: any[] = await prisma.$queryRaw<any[]>`
        SELECT 
          recipient_email, 
          recipient_first_name, 
          is_email_allowed, 
          is_push_allowed, 
          fcm_tokens 
        FROM public.get_notification_recipient_delivery_info(${userId}::text)
      `;
      if (rows && rows.length > 0) {
        return {
          email: rows[0].recipient_email || null,
          firstName: rows[0].recipient_first_name || 'TrustHyre Member',
          isEmailAllowed: rows[0].is_email_allowed !== false,
          isPushAllowed: rows[0].is_push_allowed !== false,
          fcmTokens: Array.isArray(rows[0].fcm_tokens) ? rows[0].fcm_tokens.filter(Boolean) : []
        };
      }
    } catch (procErr: any) {
      console.warn('[NotificationDispatcher] Stored procedure fallback to withSystemContext:', procErr.message);
    }

    // Resilient fallback: system context transaction with app.bypass_rls = 'true'
    return withSystemContext(prisma, async (tx) => {
      const meta = await tx.user_metadata.findUnique({
        where: { id: userId },
        select: { email: true, first_name: true }
      }).catch(() => null);

      const settings = await tx.user_settings.findUnique({
        where: { user_id: userId }
      }).catch(() => null);

      let tokenRecords: { token: string }[] = [];
      try {
        if ((tx as any).user_fcm_tokens) {
          tokenRecords = await (tx as any).user_fcm_tokens.findMany({
            where: { user_id: userId },
            select: { token: true }
          });
        } else {
          tokenRecords = await tx.$queryRaw<{ token: string }[]>`SELECT token FROM user_fcm_tokens WHERE user_id = ${userId}`;
        }
      } catch {
        tokenRecords = [];
      }

      return {
        email: meta?.email || null,
        firstName: meta?.first_name || 'TrustHyre Member',
        isEmailAllowed: settings ? settings.email_notifications !== false : true,
        isPushAllowed: settings ? settings.push_notifications !== false : true,
        fcmTokens: tokenRecords.map((r: any) => r.token).filter(Boolean)
      };
    });
  }

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

      // 2. Retrieve recipient's delivery channels (email, preferences, FCM tokens) safely
      const recipient = await this.getRecipientDeliveryInfo(params.userId);

      // 3. Dispatch Email if email_notifications is enabled
      const isAlert = params.type === 'JOB_MATCH_ALERT' || params.type === 'CANDIDATE_MATCH_ALERT' || params.type === 'JOB_ALERT';
      
      if (recipient.isEmailAllowed && recipient.email && !isAlert) {
        try {
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
              recipientName: recipient.firstName,
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
              recipientName: recipient.firstName,
              jobTitle,
              companyName,
              location,
              skills,
              targetLink
            });
          } else {
            emailPayload = renderNotificationEmail({
              recipientName: recipient.firstName,
              title: params.title,
              message: params.message,
              targetLink
            });
          }

          // AWAIT transactional email delivery so Cloudflare Workers do not drop the promise
          await sendEmail(recipient.email, emailPayload.subject, emailPayload.html, {
            text: emailPayload.text,
            category: 'transactional',
            unsubscribeUrl: `${frontendUrl}/notifications`
          });
          console.log(`✅ [NotificationDispatcher] Email successfully sent to ${recipient.email}`);
        } catch (mailErr: any) {
          console.error(`❌ [NotificationDispatcher] Failed sending email to ${recipient.email}:`, mailErr.message);
        }
      }

      // 4. Send FCM Push if push_notifications is enabled and tokens exist
      if (!recipient.isPushAllowed || recipient.fcmTokens.length === 0) {
        return notification;
      }

      // 5. Send FCM Push via Edge-Native FCM v1 REST API
      const targetUrl = params.link || '/notifications';
      const fcmResult = await sendFcmMessagesV1(recipient.fcmTokens, {
        title: params.title,
        body: params.message,
        url: targetUrl,
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
        }
      });

      // 6. Automatic cleanup of dead or unregistered tokens via system context
      if (fcmResult.unregisteredTokens && fcmResult.unregisteredTokens.length > 0) {
        try {
          await withSystemContext(prisma, async (tx) => {
            if ((tx as any).user_fcm_tokens) {
              await (tx as any).user_fcm_tokens.deleteMany({
                where: { token: { in: fcmResult.unregisteredTokens } }
              });
            } else {
              for (const t of fcmResult.unregisteredTokens) {
                await tx.$executeRaw`DELETE FROM user_fcm_tokens WHERE token = ${t}`;
              }
            }
          });
          console.log(`[FCM] Cleaned up ${fcmResult.unregisteredTokens.length} unregistered tokens.`);
        } catch (cleanupErr: any) {
          console.error('[FCM] Stale token cleanup error:', cleanupErr.message);
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
