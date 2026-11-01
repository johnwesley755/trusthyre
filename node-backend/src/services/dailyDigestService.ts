import prisma from '../config/prisma';
import { sendEmail } from './mailer';
// import { renderCandidateMatchEmail, renderJobMatchEmail } from '../templates/emailTemplates';

export interface PendingDigestItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: any;
  createdAt: Date;
}

export class DailyDigestService {
  /**
   * Evaluates and dispatches daily email digests for all users who have accumulated match alerts.
   * Can be triggered on a schedule (Cloudflare Cron) or manually via API.
   */
  public static async sendDailyDigests(): Promise<{ sentCount: number; errors: number }> {
    console.log('\n📬 [DailyDigestService] Beginning scheduled daily email digest evaluation...');

    const frontendUrl = (process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '');
    let sentCount = 0;
    let errors = 0;

    try {
      // Find unread alert notifications from the last 24 hours that haven't been emailed yet
      const unreadAlerts = await prisma.notifications.findMany({
        where: {
          is_read: false,
          type: { in: ['JOB_MATCH_ALERT', 'CANDIDATE_MATCH_ALERT', 'JOB_ALERT', 'CANDIDATE_ALERT'] },
          created_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        orderBy: { created_at: 'desc' }
      });

      if (!unreadAlerts || unreadAlerts.length === 0) {
        console.log('[DailyDigestService] No pending alert notifications found for today\'s digest.');
        return { sentCount: 0, errors: 0 };
      }

      // Group alerts by user_id
      const alertsByUser = new Map<string, typeof unreadAlerts>();
      for (const alert of unreadAlerts) {
        const list = alertsByUser.get(alert.user_id) || [];
        list.push(alert);
        alertsByUser.set(alert.user_id, list);
      }

      console.log(`[DailyDigestService] Aggregated alerts for ${alertsByUser.size} user(s).`);

      for (const [userId, alerts] of alertsByUser.entries()) {
        try {
          // Check user settings and email preferences
          const settings = await prisma.user_settings.findUnique({
            where: { user_id: userId }
          }).catch(() => null);

          if (settings && settings.email_notifications === false) {
            continue;
          }

          const userMeta = await prisma.user_metadata.findUnique({
            where: { id: userId },
            select: { email: true, first_name: true }
          });

          if (!userMeta?.email) continue;

          const firstName = userMeta.first_name || 'Member';
          const topAlert = alerts[0];
          const hasMultiple = alerts.length > 1;

          let subject = `🎯 Your Daily TrustHyre Match Digest (${alerts.length} New Openings)`;
          if (!hasMultiple) {
            subject = `🎯 Daily Match: ${topAlert.title}`;
          }

          // Build a clean HTML list of the day's matches
          const itemsHtml = alerts.slice(0, 5).map(a => `
            <div style="background:#ffffff; border:1px solid #e6e8ec; border-radius:12px; padding:14px; margin-bottom:12px;">
              <h4 style="margin:0 0 4px 0; color:#0a0a0a; font-size:14px;">${a.title}</h4>
              <p style="margin:0 0 8px 0; color:#717784; font-size:12px; line-height:1.4;">${a.message}</p>
              <a href="${frontendUrl}${a.link || '/notifications'}" style="display:inline-block; font-size:11px; font-weight:bold; color:#0f2f63; text-decoration:none;">
                View Details & Apply &rarr;
              </a>
            </div>
          `).join('');

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f4f5f8; padding:20px; margin:0;">
              <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; border:1px solid #e6e8ec; overflow:hidden;">
                <div style="background:#0f2f63; padding:20px 24px; color:#ffffff;">
                  <h2 style="margin:0; font-size:18px;">TrustHyre Daily Digest</h2>
                  <p style="margin:4px 0 0 0; font-size:12px; opacity:0.85;">Your daily summary of matching openings and verified talent</p>
                </div>
                <div style="padding:24px;">
                  <p style="margin-top:0; color:#0a0a0a; font-size:13px;">Hi <strong>${firstName}</strong>,</p>
                  <p style="color:#717784; font-size:12px; line-height:1.5;">Here are the latest matching opportunities detected on TrustHyre over the last 24 hours:</p>
                  
                  <div style="margin:20px 0;">
                    ${itemsHtml}
                  </div>

                  ${alerts.length > 5 ? `<p style="text-align:center; font-size:11px; color:#717784;">+ ${alerts.length - 5} more updates available in your notification center.</p>` : ''}

                  <div style="text-align:center; margin-top:24px;">
                    <a href="${frontendUrl}/notifications" style="background:#0f2f63; color:#ffffff; padding:10px 24px; border-radius:999px; font-size:12px; font-weight:bold; text-decoration:none; display:inline-block;">
                      Open Notification Center
                    </a>
                  </div>
                </div>
                <div style="background:#fafafa; border-top:1px solid #e6e8ec; padding:14px; text-align:center; font-size:10px; color:#9ea3ae;">
                  You are receiving this digest because email alerts are enabled in your TrustHyre account.<br/>
                  <a href="${frontendUrl}/settings" style="color:#717784; text-decoration:underline;">Manage Preferences</a>
                </div>
              </div>
            </body>
            </html>
          `;

          await sendEmail(userMeta.email, subject, emailHtml, {
            category: 'alert',
            unsubscribeUrl: `${frontendUrl}/settings`
          });

          sentCount++;
          console.log(`[DailyDigestService] Successfully dispatched digest to ${userMeta.email} (${alerts.length} items).`);
        } catch (itemErr: any) {
          errors++;
          console.error(`[DailyDigestService] Failed dispatching digest for user ${userId}:`, itemErr.message);
        }
      }

      return { sentCount, errors };
    } catch (err: any) {
      console.error('[DailyDigestService] Unexpected failure in daily digest:', err.message);
      return { sentCount, errors: errors + 1 };
    }
  }

  /**
   * Checks whether the current time matches the configured DAILY_DIGEST_TIME (e.g. "09:00" in 24hr format)
   */
  public static shouldRunNow(): boolean {
    const targetTime = (process.env.DAILY_DIGEST_TIME || '09:00').trim();
    const now = new Date();
    // Use IST timezone (UTC+5:30)
    const istHours = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
    const istMinutes = (now.getUTCMinutes() + 30) % 60;
    
    const [targetH, targetM] = targetTime.split(':').map(Number);
    return istHours === targetH && Math.abs(istMinutes - (targetM || 0)) <= 30;
  }
}

