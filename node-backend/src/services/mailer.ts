export interface SendEmailOptions {
  text?: string;
  replyTo?: { email: string; name?: string };
  headers?: Record<string, string>;
  category?: 'transactional' | 'alert' | 'auth';
  unsubscribeUrl?: string;
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

function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|lt|gt|quot|#39|apos|amp);/g, (match) => ENTITY_MAP[match] || match)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
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
    const textContent = (options?.text || htmlToPlainText(html)).trim();

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

    // Extract OTP if present in subject for console visibility
    const otpMatch = subject.match(/\b\d{6}\b/);
    const extractedOtp = otpMatch ? otpMatch[0] : 'N/A';

    console.log(`\n======================================================================`);
    console.log(`📧 [BREVO:EMAIL-DISPATCH] Dispatching Email via Brevo API`);
    console.log(`----------------------------------------------------------------------`);
    console.log(`From:    ${senderName} <${senderEmail}>`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    if (extractedOtp !== 'N/A') {
      console.log(`🔑 Verification Code: ${extractedOtp}`);
    }
    console.log(`======================================================================`);

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
        console.warn(`[DEV NOTE] In local environment, verification code ${extractedOtp} is preserved in DB for testing.\n`);
        return true;
      }

      throw new Error(`Brevo API Error: ${errorText}`);
    }

    const responseData = await response.json().catch(() => ({}));
    console.log(`✅ [BREVO:EMAIL-SENT] Successfully delivered to ${to} (MessageId: ${responseData.messageId || 'OK'})\n`);
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
