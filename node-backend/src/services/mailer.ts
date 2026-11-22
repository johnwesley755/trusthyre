import { interpolateTemplate } from '../utils/templateUtils';

export interface SendEmailOptions {
  text?: string;
  replyTo?: { email: string; name?: string };
  headers?: Record<string, string>;
  category?: 'transactional' | 'alert' | 'auth';
  unsubscribeUrl?: string;
  fallbackFn?: () => Promise<boolean>;
}

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&amp;': '&'
};

function stripHtmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:nbsp|lt|gt|quot|#39|apos|amp);/g, (match) => ENTITY_MAP[match] || match)
    .replace(/\s+/g, ' ')
    .trim();
}

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  options?: SendEmailOptions
) => {
  try {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      console.error('\n❌ [BREVO:ERROR] BREVO_API_KEY is not configured in environment variables or Cloudflare secrets.');
      throw new Error('Email delivery is not configured: BREVO_API_KEY is missing.');
    }

    if (apiKey.startsWith('xsmtpsib-')) {
      console.error('\n❌ [BREVO:ERROR] Configuration mismatch: BREVO_API_KEY is set to an SMTP password (xsmtpsib-...) instead of a Brevo v3 REST API key (xkeysib-...).');
      throw new Error('Invalid Brevo API Key: You are using an SMTP relay key. The Brevo REST API requires an API key starting with "xkeysib-".');
    }

    const senderEmail = (process.env.BREVO_SENDER_EMAIL || 'noreply@trusthyre.com').trim();
    const senderName = (process.env.BREVO_SENDER_NAME || 'TrustHyre').trim();
    const frontendUrl = (process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '');
    const unsubscribeUrl = options?.unsubscribeUrl || `${frontendUrl}/notifications`;

    // Plain text fallback (MIME multipart/alternative compliance for anti-spam)
    const textContent = (options?.text || stripHtmlToPlainText(html)).trim();

    // Compliance & Anti-Spam Headers
    // Apply List-Unsubscribe only to alert/marketing emails with explicit opt-out targets (RFC 8058)
    const isAlertEmail = options?.category === 'alert' && Boolean(options?.unsubscribeUrl);
    const headers: Record<string, string> = {
      'X-Entity-Ref-ID': `trusthyre-${Date.now()}`,
      ...(isAlertEmail && options?.unsubscribeUrl
        ? {
            'List-Unsubscribe': `<${options.unsubscribeUrl}>, <mailto:support@trusthyre.com?subject=unsubscribe>`
          }
        : {}),
      ...(options?.headers || {})
    };


    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{ email: to }],
        replyTo: options?.replyTo || {
          email: (process.env.SUPPORT_EMAIL || 'support@trusthyre.com').trim(),
          name: 'TrustHyre Support'
        },
        subject: subject,
        htmlContent: html,
        textContent: textContent,
        headers: headers
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ [BREVO:API-REJECTED] Brevo API responded with HTTP ${response.status}:`);
      console.error(errorText);

      let parsedError: any = {};
      try {
        parsedError = JSON.parse(errorText);
      } catch {}

      console.error(`\n----------------------------------------------------------------------`);
      console.error(`🔍 [BREVO DIAGNOSTIC & FIX]`);
      if (errorText.includes('unrecognised IP address') || parsedError.code === 'unauthorized') {
        console.error(`⚠️ CAUSE: Brevo has IP restriction enabled and blocked this request.`);
        console.error(`👉 HOW TO FIX:`);
        console.error(`   1. Open Brevo: Left Sidebar > Organization settings > Security > Authorized IPs`);
        console.error(`   2. Or visit: https://app.brevo.com/security/authorised_ips`);
        console.error(`   3. Add your current public IP address to the whitelist.`);
      } else if (errorText.includes('sender') || parsedError.code === 'invalid_parameter') {
        console.error(`⚠️ CAUSE: Brevo sender email (${senderEmail}) is not verified.`);
        console.error(`👉 HOW TO FIX:`);
        console.error(`   1. Open Brevo: Left Sidebar > Senders, domains, IPs`);
        console.error(`   2. Ensure "${senderEmail}" is verified and active.`);
      }
      console.error(`----------------------------------------------------------------------\n`);

      // In local dev, allow the flow to proceed while showing the error so developer isn't stuck
      const isLocalDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      if (isLocalDev) {
        console.warn(`[DEV NOTE] In local environment, test dispatch is noted for testing.\n`);
        return true;
      }

      throw new Error(`Brevo API Error: ${errorText}`);
    }

    const responseData = await response.json().catch(() => ({}));
    return true;
  } catch (error: any) {
    console.error('\n❌ [BREVO:ERROR] Failed to send email:', error.message);
    const isLocalDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    if (isLocalDev) {
      console.warn(`[DEV FALLBACK] Allowing flow to proceed in local dev.\n`);
      return true;
    }
    throw error;
  }
};

/**
 * Sends a transactional email using an application-managed, Brevo-synchronized template.
 * @param templateKey Stable logical template key (e.g., 'ONBOARDING_EARLY_ACCESS', 'JOB_MATCH_NOTIFICATION')
 * @param to Target recipient email address
 * @param params Dynamic variable parameters (e.g., { firstName: 'Ravi', jobTitle: 'Electrician' })
 * @param options Additional delivery options (replyTo, headers, category)
 */
/**
 * Sends a transactional email using an application-managed, Brevo-synchronized template.
 * Multi-Tier Resilient Dispatch:
 * 1. Resolves published template from database.
 * 2. If brevo_template_id is active, dispatches via Brevo Template API.
 * 3. If brevo_template_id is null or remote call fails, dynamically renders DB html_content locally and sends via standard SMTP.
 * 4. If database is unreachable or template not published, seamlessly executes fallbackFn (hardcoded code template).
 *
 * @param templateKey Stable logical template key (e.g., 'AUTH_EMAIL_OTP', 'AUTH_PASSWORD_RESET')
 * @param to Target recipient email address
 * @param params Dynamic variable parameters (e.g., { otp: '123456', recipientEmail: 'user@example.com' })
 * @param options Additional delivery options (replyTo, headers, category, fallbackFn)
 */
export const sendTemplateEmail = async (
  templateKey: string,
  to: string,
  params: Record<string, any> = {},
  options?: SendEmailOptions
): Promise<boolean> => {
  const prisma = (await import('../config/prisma')).default;
  const apiKey = (process.env.BREVO_API_KEY || '').trim();

  // Tier 1 & 2: Database Template Resolution & Safe Dispatch
  try {
    const template = await (prisma as any).email_templates.findUnique({
      where: { template_key: templateKey.toUpperCase() },
    });

    if (template && template.status === 'PUBLISHED') {
      // Validate declared required variables schema if defined
      const declaredVariables = (template.variables as Record<string, any>) || {};
      const missingRequired: string[] = [];
      for (const [varName, varDef] of Object.entries(declaredVariables)) {
        if ((varDef as any)?.required && (params[varName] === undefined || params[varName] === null)) {
          missingRequired.push(varName);
        }
      }

      if (missingRequired.length > 0) {
        throw new Error(`Missing required template parameters for "${templateKey}": ${missingRequired.join(', ')}`);
      }

      // 1. Try Brevo remote template engine if template ID is linked and API key is present
      if (template.brevo_template_id && apiKey) {
        try {
          const brevoTemplateIdNum = Number(template.brevo_template_id);
          const payload: any = {
            templateId: isNaN(brevoTemplateIdNum) ? template.brevo_template_id : brevoTemplateIdNum,
            to: [{ email: to.trim() }],
            params: params,
            headers: options?.headers || {},
          };

          if (options?.replyTo) {
            payload.replyTo = options.replyTo;
          }

          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'api-key': apiKey,
              'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const responseData = await response.json().catch(() => ({}));
            return true;
          } else {
            const errorText = await response.text();
            console.warn(`⚠️ [BREVO:TEMPLATE-REMOTE-FAIL] Remote template #${template.brevo_template_id} rejected (HTTP ${response.status}: ${errorText}). Falling back to local HTML rendering.`);
          }
        } catch (remoteErr: any) {
          console.warn(`⚠️ [BREVO:TEMPLATE-REMOTE-ERROR] Failed to dispatch via Brevo template engine: ${remoteErr.message}. Falling back to local HTML rendering.`);
        }
      }

      // 2. Local HTML Rendering Fallback (renders DB html_content with safe parameter interpolation)
      if (template.html_content) {
        const mergedParams: Record<string, any> = {
          logoUrl: 'https://trusthyre.com/logo.png',
          currentYear: new Date().getFullYear(),
          supportEmail: 'support@trusthyre.com',
          portalUrl: 'https://trusthyre.com',
          ...params,
        };

        const renderedSubject = interpolateTemplate(template.subject, mergedParams);
        const renderedHtml = interpolateTemplate(template.html_content, mergedParams);
        const renderedText = template.text_content ? interpolateTemplate(template.text_content, mergedParams) : undefined;

        return await sendEmail(to, renderedSubject, renderedHtml, {
          ...options,
          text: renderedText || options?.text,
        });
      }
    }
  } catch (error: any) {
    console.error(`\n❌ [BREVO:TEMPLATE-ERROR] Error resolving DB template "${templateKey}":`, error.message);
  }

  // Tier 3: Resilient Code Fallback (invokes caller-provided code generator if DB template is missing or errored)
  if (options?.fallbackFn) {
    return await options.fallbackFn();
  }

  const isLocalDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isLocalDev) {
    console.warn(`[DEV FALLBACK] Allowing template send flow to proceed in local dev for "${templateKey}".\n`);
    return true;
  }

  throw new Error(`Email template "${templateKey}" is not published or active.`);
};
