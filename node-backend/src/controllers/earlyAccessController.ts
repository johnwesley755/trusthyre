import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import { sendEmail } from '../services/mailer';
import { renderEmailShell } from '../services/emailTemplateService';

const escapeHtml = (str: string): string => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const requestEarlyAccess = async (c: Context) => {
  try {
    const { email, name, role, companyName, phoneNumber } = (await c.req.json());
    if (!email || !email.includes('@')) {
      return c.json(ApiResponse.error("Valid email address is required"), 400 as any);
    }

    const safeName = name ? escapeHtml(name) : 'there';
    const priorityId = `TH-${Date.now().toString(36).toUpperCase()}`;
    const frontendUrl = (process.env.FRONTEND_URL || "https://trusthyre.com").replace(/\/$/, "");

    const bodyHtml = `
      <p style="margin: 0 0 16px 0; color: #475569; font-size: 15px; line-height: 1.6;">
        Thank you for requesting early access to TrustHyre! We've reserved your position on our priority onboarding list for India's verified skilled workforce network.
      </p>

      <!-- Priority Access Card -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1.5px solid #DBEAFE; border-radius: 12px; margin: 20px 0;">
        <tr>
          <td style="padding: 16px 20px;">
            <div style="color: #64748B; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
              Your Priority Access ID
            </div>
            <div style="font-size: 20px; font-weight: 800; color: #0066FF; letter-spacing: 1px;">
              ${priorityId}
            </div>
          </td>
        </tr>
      </table>

      <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6;">
        Our team is actively rolling out beta access in batches. You will receive an exclusive onboarding invite with your preview credentials shortly.
      </p>
    `;

    const subject = "Welcome to TrustHyre Early Access - Priority Confirmation";
    const preheader = `Your early access request has been confirmed. Priority ID: ${priorityId}`;

    const htmlContent = renderEmailShell({
      title: "Welcome to TrustHyre Early Access",
      preheader: preheader,
      badgeText: "🚀 EARLY ACCESS CONFIRMED",
      recipientName: safeName,
      bodyHtml: bodyHtml,
      targetLink: `${frontendUrl}/`,
      buttonText: "Explore TrustHyre Platform",
      secondaryInfo: "Direct employer connections • 100% Verified trade profiles • Zero brokerage"
    });

    const textContent = `
Welcome to TrustHyre Early Access
------------------------------------------------------
Hello ${safeName},

Thank you for requesting early access to TrustHyre!
Your Priority Access ID: ${priorityId}

Our team is rolling out preview access in batches. You will receive an invitation shortly.

Explore TrustHyre: ${frontendUrl}/

TrustHyre Technologies Pvt. Ltd.
    `.trim();

    await sendEmail(email, subject, htmlContent, {
      text: textContent,
      category: 'transactional'
    }).catch((e: any) => console.warn("Early access mail send notice:", e.message));

    return c.json(ApiResponse.ok("Early access requested successfully! Please check your email for confirmation.", { email, status: 'CONFIRMED' }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
