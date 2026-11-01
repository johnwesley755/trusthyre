export const EMAIL_FONT_STACK = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const BRAND_NAVY = "#0F2F63";
export const BRAND_BLUE = "#0066FF";
export const BRAND_EMERALD = "#10B981";
export const BRAND_SURFACE = "#F8FAFC";
export const BRAND_BORDER = "#E2E8F0";

// Public High-Resolution Logo URL
export const LOGO_URL = (process.env.FRONTEND_URL || "https://trusthyre.com").replace(/\/$/, "") + "/logo.png";
export const FALLBACK_LOGO_URL = "https://trust-hire-one.vercel.app/logo.png";

/**
 * Robust HTML sanitizer to prevent injection / XSS / phishing inside email clients
 */
export const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export interface EmailShellOptions {
  title: string;
  preheader: string;
  badgeText?: string;
  recipientName?: string;
  bodyHtml: string;
  targetLink?: string;
  buttonText?: string;
  secondaryInfo?: string;
}

/**
 * Universal Responsive Email Shell adhering to TrustHyre Brand Guidelines
 * Optimized for cross-client rendering (Gmail, Apple Mail, Outlook, Yahoo)
 * Equipped with Anti-Spam headers, preheaders, and CAN-SPAM / GDPR footer requirements.
 */
export function renderEmailShell(options: EmailShellOptions): string {
  const currentYear = new Date().getFullYear();
  const frontendUrl = (process.env.FRONTEND_URL || "https://trusthyre.com").replace(/\/$/, "");
  const settingsUrl = `${frontendUrl}/notifications`;
  const privacyUrl = `${frontendUrl}/privacy`;
  const supportUrl = `${frontendUrl}/support`;

  const targetLink = options.targetLink || settingsUrl;
  const buttonText = options.buttonText || "View on TrustHyre";
  const recipient = options.recipientName || "TrustHyre Member";
  const badge = options.badgeText || "NOTIFICATION";

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${esc(options.title)}</title>
  <!--[if !mso]><!-->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" type="text/css">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
    * {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
  </style>
  <!--<![endif]-->
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, h1, h2, h3, span, div, strong {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important;
    }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, p, a, h1, h2, h3, span, div {
      font-family: ${EMAIL_FONT_STACK} !important;
    }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 12px !important; margin: 0 !important; }
      .content-padding { padding: 24px 18px !important; }
      .header-padding { padding: 18px 20px !important; }
      .footer-padding { padding: 20px 18px !important; }
      .logo-img { height: 32px !important; }
      .btn-cta { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 28px 12px; background-color: ${BRAND_SURFACE}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: #1E293B; font-family: ${EMAIL_FONT_STACK};">
  
  <!-- Hidden Preheader for Gmail / iOS Lock Screen Preview -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${BRAND_SURFACE}; opacity: 0;">
    ${esc(options.preheader)} &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: ${EMAIL_FONT_STACK};">
    <tr>
      <td align="center" style="font-family: ${EMAIL_FONT_STACK};">
        
        <!-- Main Email Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; background-color: #FFFFFF; border-radius: 18px; border: 1px solid ${BRAND_BORDER}; overflow: hidden; box-shadow: 0 8px 24px rgba(15, 47, 99, 0.06); font-family: ${EMAIL_FONT_STACK};">
          
          <!-- Brand Header: Authority Navy (#0F2F63) with Official Logo -->
          <tr>
            <td class="header-padding" style="background-color: ${BRAND_NAVY}; padding: 20px 32px; border-bottom: 1px solid #1E3A8A; font-family: ${EMAIL_FONT_STACK};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <a href="${frontendUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${LOGO_URL}" onerror="this.onerror=null;this.src='${FALLBACK_LOGO_URL}';" alt="TrustHyre" height="36" class="logo-img" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                    </a>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1px; text-transform: uppercase; font-family: ${EMAIL_FONT_STACK};">
                      Verified Workforce
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="content-padding" style="padding: 32px 32px 28px 32px; background-color: #FFFFFF; font-family: ${EMAIL_FONT_STACK};">
              
              <!-- Category Badge -->
              <div style="display: inline-block; padding: 4px 10px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; color: ${BRAND_BLUE}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px; font-family: ${EMAIL_FONT_STACK};">
                ${esc(badge)}
              </div>

              <!-- Main Title -->
              <h1 style="margin: 0 0 14px 0; color: ${BRAND_NAVY}; font-size: 20px; font-weight: 800; line-height: 1.35; letter-spacing: -0.3px; font-family: ${EMAIL_FONT_STACK};">
                ${esc(options.title)}
              </h1>

              <!-- Greeting -->
              <p style="margin: 0 0 18px 0; color: #475569; font-size: 15px; line-height: 1.6; font-family: ${EMAIL_FONT_STACK};">
                Hello <strong style="color: #0F172A;">${esc(recipient)}</strong>,
              </p>

              <!-- Dynamic Body Section -->
              ${options.bodyHtml}

              <!-- Trust Signal Highlights -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px 0 24px 0; background-color: #F8FAFC; border: 1px solid ${BRAND_BORDER}; border-radius: 12px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 12px; color: #475569; font-weight: 600;">
                    <span style="color: #10B981; font-weight: 700; margin-right: 6px;">✓</span> 100% Identity Verified Candidate Network
                  </td>
                  <td align="right" style="padding: 12px 16px; font-size: 12px; color: #475569; font-weight: 600;">
                    <span style="color: ${BRAND_BLUE}; font-weight: 700; margin-right: 6px;">⚡</span> Direct Hire • Zero Brokerage
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="margin: 24px 0 16px 0; text-align: left;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(targetLink)}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="50%" fillcolor="${BRAND_NAVY}">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">${esc(buttonText)} &rarr;</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${esc(targetLink)}" target="_blank" class="btn-cta" style="display: inline-block; background-color: ${BRAND_NAVY}; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 13px 28px; border-radius: 9999px; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(15, 47, 99, 0.22); font-family: ${EMAIL_FONT_STACK};">
                  ${esc(buttonText)} &nbsp;&rarr;
                </a>
                <!--<![endif]-->
              </div>

              ${options.secondaryInfo ? `<p style="margin: 16px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.5;">${esc(options.secondaryInfo)}</p>` : ''}

            </td>
          </tr>

          <!-- Footer Bar: CAN-SPAM, Postal Address, Preferences -->
          <tr>
            <td class="footer-padding" style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid ${BRAND_BORDER}; font-family: ${EMAIL_FONT_STACK};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: #64748B; font-size: 11px; line-height: 1.6; font-family: ${EMAIL_FONT_STACK};">
                    <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
                      TrustHyre Technologies Pvt. Ltd. • India's Premier Blue-Collar & Skilled Talent Marketplace
                    </p>
                    <p style="margin: 0 0 8px 0;">
                      You received this email because you have notifications active on your TrustHyre account.
                    </p>
                    <p style="margin: 0;">
                      <a href="${settingsUrl}" target="_blank" style="color: ${BRAND_BLUE}; text-decoration: underline; font-weight: 600;">Manage Preferences</a>
                      &nbsp;•&nbsp;
                      <a href="${privacyUrl}" target="_blank" style="color: ${BRAND_BLUE}; text-decoration: underline; font-weight: 600;">Privacy Policy</a>
                      &nbsp;•&nbsp;
                      <a href="${supportUrl}" target="_blank" style="color: ${BRAND_BLUE}; text-decoration: underline; font-weight: 600;">Help Center</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

/**
 * Specialized Template: Candidate Match Alert
 */
export function renderCandidateMatchEmail(data: {
  recipientName?: string;
  candidateName: string;
  roleOrTrade?: string;
  skills?: string[];
  location?: string;
  experienceYears?: number | string;
  targetLink: string;
}): { html: string; text: string; subject: string } {
  const skillsList = data.skills && data.skills.length > 0 ? data.skills : ['Trade Certified', 'Safety Compliant'];
  const skillsHtml = skillsList
    .slice(0, 5)
    .map(
      s =>
        `<span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-right: 6px; margin-bottom: 6px;">${esc(s.trim())}</span>`
    )
    .join('');

  const bodyHtml = `
    <!-- Candidate Highlight Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1.5px solid #DBEAFE; border-radius: 14px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 3px 8px rgba(0,0,0,0.03);">
      <tr>
        <td style="padding: 20px 22px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="vertical-align: top;">
                <div style="font-size: 18px; font-weight: 800; color: #0F2F63; margin-bottom: 4px;">
                  ${esc(data.candidateName)}
                  <span style="display: inline-block; background-color: #ECFDF5; color: #059669; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 9999px; border: 1px solid #A7F3D0; vertical-align: middle; margin-left: 6px;">
                    ✓ VERIFIED PRO
                  </span>
                </div>
                <div style="font-size: 13px; color: #64748B; font-weight: 600; margin-bottom: 12px;">
                  📍 ${esc(data.location || 'Your Region')} &nbsp;•&nbsp; ⏱️ ${data.experienceYears ? `${esc(data.experienceYears)}+ yrs experience` : 'Field-Ready Professional'}
                </div>
                <div style="margin-top: 10px;">
                  ${skillsHtml}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      This professional directly aligns with your active search alert parameters. Direct contact and schedule options are now available in your employer dashboard.
    </p>
  `;

  const subject = `🎯 Candidate Match: ${data.candidateName} (${data.roleOrTrade || 'Verified Pro'})`;
  const preheader = `A verified candidate matching your requirements in ${data.location || 'your area'} is ready for hire.`;

  const html = renderEmailShell({
    title: subject,
    preheader: preheader,
    badgeText: '🎯 CANDIDATE MATCH ALERT',
    recipientName: data.recipientName,
    bodyHtml: bodyHtml,
    targetLink: data.targetLink,
    buttonText: 'Review Candidate Profile',
    secondaryInfo: 'Instant direct hire with biometric check-in tracking and guarantee protection.'
  });

  const text = `
TrustHyre - Verified Candidate Match
------------------------------------------------------
Hello ${data.recipientName || 'Member'},

Candidate Match: ${data.candidateName}
Status: Verified Pro
Location: ${data.location || 'Your Area'}
Experience: ${data.experienceYears ? `${data.experienceYears}+ years` : 'Field-Ready'}
Skills: ${skillsList.join(', ')}

Review Profile & Connect:
${data.targetLink}

TrustHyre Technologies Pvt. Ltd.
Manage Notifications: ${(process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '')}/notifications
  `.trim();

  return { html, text, subject };
}

/**
 * Specialized Template: Job Match Alert
 */
export function renderJobMatchEmail(data: {
  recipientName?: string;
  jobTitle: string;
  companyName?: string;
  location?: string;
  salary?: string;
  skills?: string[];
  targetLink: string;
}): { html: string; text: string; subject: string } {
  const skillsList = data.skills && data.skills.length > 0 ? data.skills : ['Trade Skills Required'];
  const skillsHtml = skillsList
    .slice(0, 5)
    .map(
      s =>
        `<span style="display: inline-block; background-color: #F1F5F9; border: 1px solid #CBD5E1; color: #334155; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-right: 6px; margin-bottom: 6px;">${esc(s.trim())}</span>`
    )
    .join('');

  const bodyHtml = `
    <!-- Job Highlight Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1.5px solid #DBEAFE; border-radius: 14px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 3px 8px rgba(0,0,0,0.03);">
      <tr>
        <td style="padding: 20px 22px;">
          <div style="font-size: 18px; font-weight: 800; color: #0F2F63; margin-bottom: 4px;">
            ${esc(data.jobTitle)}
          </div>
          <div style="font-size: 14px; color: #0066FF; font-weight: 700; margin-bottom: 10px;">
            🏢 ${esc(data.companyName || 'Verified Employer')}
          </div>
          <div style="font-size: 13px; color: #64748B; font-weight: 600; margin-bottom: 12px;">
            📍 ${esc(data.location || 'Immediate Location')} ${data.salary ? `&nbsp;•&nbsp; 💰 ${esc(data.salary)}` : ''}
          </div>
          <div style="margin-top: 10px;">
            ${skillsHtml}
          </div>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">
      A verified employer has posted a role matching your trade skills and preferences. Apply directly without middlemen or placement fees.
    </p>
  `;

  const subject = `💼 New Job Match: ${data.jobTitle} at ${data.companyName || 'Verified Employer'}`;
  const preheader = `A new verified opening matching your criteria in ${data.location || 'your area'} is open for applications.`;

  const html = renderEmailShell({
    title: subject,
    preheader: preheader,
    badgeText: '💼 NEW JOB OPPORTUNITY',
    recipientName: data.recipientName,
    bodyHtml: bodyHtml,
    targetLink: data.targetLink,
    buttonText: 'View Job & Apply',
    secondaryInfo: 'Fast response guaranteed • Verified wage protection included.'
  });

  const text = `
TrustHyre - New Job Match
------------------------------------------------------
Hello ${data.recipientName || 'Member'},

Job: ${data.jobTitle}
Employer: ${data.companyName || 'Verified Employer'}
Location: ${data.location || 'Immediate Area'}
${data.salary ? `Compensation: ${data.salary}\n` : ''}Required Skills: ${skillsList.join(', ')}

Apply Directly on TrustHyre:
${data.targetLink}

TrustHyre Technologies Pvt. Ltd.
Manage Notifications: ${(process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '')}/notifications
  `.trim();

  return { html, text, subject };
}

/**
 * Universal Template: Account, Application, or System Notification
 */
export function renderNotificationEmail(data: {
  recipientName?: string;
  title: string;
  message: string;
  badgeText?: string;
  targetLink: string;
  buttonText?: string;
}): { html: string; text: string; subject: string } {
  const bodyHtml = `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 14px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
      <tr>
        <td style="padding: 20px 22px;">
          <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.65;">
            ${esc(data.message)}
          </p>
        </td>
      </tr>
    </table>
  `;

  const subject = data.title;
  const preheader = data.message.slice(0, 120);

  const html = renderEmailShell({
    title: subject,
    preheader: preheader,
    badgeText: data.badgeText || '🔔 ACCOUNT UPDATE',
    recipientName: data.recipientName,
    bodyHtml: bodyHtml,
    targetLink: data.targetLink,
    buttonText: data.buttonText || 'View Details on TrustHyre'
  });

  const text = `
TrustHyre Notification: ${data.title}
------------------------------------------------------
Hello ${data.recipientName || 'Member'},

${data.message}

View Details:
${data.targetLink}

TrustHyre Technologies Pvt. Ltd.
Manage Notifications: ${(process.env.FRONTEND_URL || 'https://trusthyre.com').replace(/\/$/, '')}/notifications
  `.trim();

  return { html, text, subject };
}


/**
 * Admin Invitation Email Template
 */
export function renderAdminInvitationEmail(data: {
  recipientName?: string;
  email: string;
  inviteLink: string;
  invitedBy?: string;
  expiresInHours?: number;
}): { html: string; text: string; subject: string } {
  const inviter = data.invitedBy || 'A Platform Administrator';
  const hours = data.expiresInHours || 48;
  const subject = "🛡️ Invitation to join TrustHyre as an Administrator";
  const preheader = `You have been invited by ${inviter} to join the TrustHyre Administrative Portal.`;

  const bodyHtml = `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 14px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 47, 99, 0.04); font-family: ${EMAIL_FONT_STACK};">
      <tr>
        <td style="padding: 24px 26px; font-family: ${EMAIL_FONT_STACK};">
          <div style="display: inline-block; padding: 4px 10px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; color: #1D4ED8; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-family: ${EMAIL_FONT_STACK};">
            Administrative Provisioning
          </div>
          <h2 style="margin: 0 0 12px 0; color: #0F2F63; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; line-height: 1.3; font-family: ${EMAIL_FONT_STACK};">
            You're Invited to Manage TrustHyre
          </h2>
          <p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.65; font-family: ${EMAIL_FONT_STACK};">
            <strong>${esc(inviter)}</strong> has authorized administrator privileges for your account (<strong>${esc(data.email)}</strong>).
          </p>
          <p style="margin: 0 0 20px 0; color: #64748B; font-size: 13px; line-height: 1.6; font-family: ${EMAIL_FONT_STACK};">
            As an administrator, you will have secure access to moderate incoming job postings, verify candidate credentials, manage lead workflows, and review platform performance.
          </p>

          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border-radius: 10px; border: 1px solid #E2E8F0; margin-bottom: 8px;">
            <tr>
              <td style="padding: 14px 18px; font-family: ${EMAIL_FONT_STACK};">
                <p style="margin: 0; color: #0F2F63; font-size: 12px; font-weight: 700; font-family: ${EMAIL_FONT_STACK};">
                  🔒 Security Notice
                </p>
                <p style="margin: 4px 0 0 0; color: #64748B; font-size: 12px; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
                  This secure invitation link is single-use and will automatically expire in <strong>${hours} hours</strong>. You will configure your own confidential password upon activation.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmailShell({
    title: subject,
    preheader: preheader,
    badgeText: '🛡️ ADMIN INVITATION',
    recipientName: data.recipientName || 'Administrator',
    bodyHtml: bodyHtml,
    targetLink: data.inviteLink,
    buttonText: 'Accept Invitation & Activate Account'
  });

  const text = `
TrustHyre Administrator Invitation
------------------------------------------------------
Hello ${data.recipientName || 'Administrator'},

${inviter} has authorized an administrator account for ${data.email}.

To accept this invitation and configure your confidential password, open the secure link below:
${data.inviteLink}

Note: This link is single-use and expires in ${hours} hours.

TrustHyre Technologies Pvt. Ltd.
  `.trim();

  return { html, text, subject };
}
