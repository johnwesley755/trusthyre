export const EMAIL_FONT_STACK = "'Plus Jakarta Sans', 'Google Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const CODE_FONT_STACK = "'Plus Jakarta Sans', 'Google Sans', 'SF Mono', Consolas, 'Courier New', monospace";

export const getOtpTemplate = (otp: string, email?: string) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <title>${otp} is your TrustHyre verification code</title>
        <!--[if !mso]><!-->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" type="text/css">
        <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        </style>
        <!--<![endif]-->
        <!--[if mso]>
        <style type="text/css">
            body, table, td, p, a, h1, span, div, strong {
                font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important;
            }
        </style>
        <![endif]-->
        <style type="text/css">
            body, table, td, p, a, h1, span, div {
                font-family: ${EMAIL_FONT_STACK} !important;
            }
            .otp-code {
                user-select: all !important;
                -webkit-user-select: all !important;
                -moz-user-select: all !important;
            }
            @media only screen and (max-width: 620px) {
                .email-card { width: 100% !important; border-radius: 12px !important; }
                .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
                .pad-left { padding: 24px 20px 14px 20px !important; }
                .pad-right { padding: 14px 20px 24px 20px !important; }
                .header-pad { padding: 16px 20px !important; }
                .footer-pad { padding: 14px 20px !important; }
                .footer-stack { display: block !important; width: 100% !important; text-align: center !important; margin: 4px 0 !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #F8FAFC; -webkit-font-smoothing: antialiased; font-family: ${EMAIL_FONT_STACK};">
        <!-- Hidden Preheader for Native Gmail / Mobile Lock Screen OTP Detection -->
        <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #ffffff; opacity: 0; font-family: ${EMAIL_FONT_STACK};">
            ${otp} is your TrustHyre verification code. Valid for 15 minutes. Use this one-time passcode to complete your sign in.
            &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
        </div>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: ${EMAIL_FONT_STACK};">
            <tr>
                <td align="center" style="font-family: ${EMAIL_FONT_STACK};">
                    <!-- Main Horizontal Framed Canvas matching Landing Page Architecture -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="max-width: 720px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 47, 99, 0.08); font-family: ${EMAIL_FONT_STACK};">
                        
                        <!-- 1. Brand Top Bar: Deep Navy Hero Aesthetic (#0f2f63) with Official Logo -->
                        <tr>
                            <td class="header-pad" style="padding: 20px 36px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a; font-family: ${EMAIL_FONT_STACK};">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="vertical-align: middle;">
                                            <a href="https://trust-hire-one.vercel.app" target="_blank" style="text-decoration: none; display: inline-block;">
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="vertical-align: middle;">
                                                            <!-- Official High-Resolution Hosted Logo Asset -->
                                                            <img src="https://trusthyre.com/logo.png" onerror="this.onerror=null;this.src='https://trust-hire-one.vercel.app/logo.png';" alt="TrustHyre" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                                                        </td>
                                                    </tr>
                                                </table>
                                            </a>
                                        </td>
                                        <td align="right" style="vertical-align: middle;">
                                            <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1.2px; text-transform: uppercase; font-family: ${EMAIL_FONT_STACK};">
                                                Identity Auth
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 2. Main Body: Horizontal 2-Column Split View -->
                        <tr>
                            <td style="padding: 0; background-color: #FFFFFF; font-family: ${EMAIL_FONT_STACK};">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <!-- Left Column: Context & Instructions -->
                                        <td class="stack-col pad-left" width="56%" valign="middle" style="padding: 36px 20px 36px 36px; font-family: ${EMAIL_FONT_STACK};">
                                            <div style="display: inline-block; padding: 4px 10px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; color: #1D4ED8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-family: ${EMAIL_FONT_STACK};">
                                                Verification Required
                                            </div>
                                            <h1 style="margin: 0 0 10px 0; color: #0F2F63; font-size: 24px; font-weight: 800; letter-spacing: -0.4px; line-height: 1.25; font-family: ${EMAIL_FONT_STACK};">
                                                Verify Your Email
                                            </h1>
                                            <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT_STACK};">
                                                Use this secure one-time passcode to confirm your identity and activate your verified portal access on TrustHyre.
                                            </p>
                                            <p style="margin: 0; color: #64748B; font-size: 12px; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
                                                If you did not request this verification, you can safely ignore this message. Your credentials remain completely protected.
                                            </p>
                                        </td>

                                        <!-- Right Column: Prominent Code Card -->
                                        <td class="stack-col pad-right" width="44%" valign="middle" style="padding: 36px 36px 36px 12px; font-family: ${EMAIL_FONT_STACK};">
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F2F63; border-radius: 16px; border: 1px solid #1E3A8A; box-shadow: 0 6px 18px rgba(15, 47, 99, 0.15); font-family: ${EMAIL_FONT_STACK};">
                                                <tr>
                                                    <td style="padding: 24px 20px; text-align: center; font-family: ${EMAIL_FONT_STACK};">
                                                        <div style="color: #93C5FD; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.8px; margin-bottom: 12px; font-family: ${EMAIL_FONT_STACK};">
                                                            One-Time Passcode
                                                        </div>
                                                        <!-- Clean White Code Display Box with 1-Tap Copy Support -->
                                                        <div class="otp-code" style="background-color: #FFFFFF; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); cursor: pointer;" title="Click to copy code">
                                                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0F2F63; font-family: ${CODE_FONT_STACK}; display: block; line-height: 1; text-align: center;">
                                                                ${otp}
                                                            </span>
                                                        </div>
                                                        <div style="color: #94A3B8; font-size: 10px; font-weight: 600; margin-bottom: 10px; font-family: ${EMAIL_FONT_STACK};">
                                                            📋 Tap code to copy all 6 digits
                                                        </div>
                                                        <div style="color: #BFDBFE; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; font-family: ${EMAIL_FONT_STACK};">
                                                            ⏱️ Valid for 15 minutes • Single Use
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 3. Footer Bar: Minimal Clean Landing Style -->
                        <tr>
                            <td class="footer-pad" style="padding: 16px 36px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-family: ${EMAIL_FONT_STACK};">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td class="footer-stack" align="left" style="color: #94A3B8; font-size: 11px; font-weight: 500; font-family: ${EMAIL_FONT_STACK};">
                                            &copy; ${new Date().getFullYear()} TrustHyre Technologies Pvt. Ltd. &bull; <a href="https://trusthyre.com/notifications" target="_blank" style="color: #0066FF; text-decoration: underline;">Preferences</a> &bull; <a href="https://trusthyre.com/privacy" target="_blank" style="color: #0066FF; text-decoration: underline;">Privacy</a>
                                        </td>
                                        <td class="footer-stack" align="right" style="color: #94A3B8; font-size: 11px; font-weight: 600; font-family: ${EMAIL_FONT_STACK};">
                                            🛡️ 256-Bit SSL Encrypted
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
};

export const getResetPasswordTemplate = (token: string, email?: string) => {
    const baseUrl = process.env.FRONTEND_URL || 'https://trust-hire-one.vercel.app';
    const resetUrl = email 
        ? `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
        : `${baseUrl}/reset-password?token=${token}`;

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
        <title>${token} is your TrustHyre password reset code</title>
        <!--[if !mso]><!-->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" type="text/css">
        <style type="text/css">
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        </style>
        <!--<![endif]-->
        <!--[if mso]>
        <style type="text/css">
            body, table, td, p, a, h1, span, div, strong {
                font-family: 'Segoe UI', Arial, Helvetica, sans-serif !important;
            }
        </style>
        <![endif]-->
        <style type="text/css">
            body, table, td, p, a, h1, span, div {
                font-family: ${EMAIL_FONT_STACK} !important;
            }
            .otp-code {
                user-select: all !important;
                -webkit-user-select: all !important;
                -moz-user-select: all !important;
            }
            @media only screen and (max-width: 620px) {
                .email-card { width: 100% !important; border-radius: 12px !important; }
                .stack-col { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
                .pad-left { padding: 24px 20px 14px 20px !important; }
                .pad-right { padding: 14px 20px 24px 20px !important; }
                .header-pad { padding: 16px 20px !important; }
                .footer-pad { padding: 14px 20px !important; }
                .footer-stack { display: block !important; width: 100% !important; text-align: center !important; margin: 4px 0 !important; }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #F8FAFC; -webkit-font-smoothing: antialiased; font-family: ${EMAIL_FONT_STACK};">
        <!-- Hidden Preheader for Native Gmail / Mobile Lock Screen OTP Detection -->
        <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #ffffff; opacity: 0; font-family: ${EMAIL_FONT_STACK};">
            ${token} is your TrustHyre password reset code. Valid for 15 minutes. Use this code to recover your account.
            &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy; &#847; &zwnj; &nbsp; &#8199; &shy;
        </div>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family: ${EMAIL_FONT_STACK};">
            <tr>
                <td align="center" style="font-family: ${EMAIL_FONT_STACK};">
                    <!-- Main Horizontal Framed Canvas matching Landing Page Architecture -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-card" style="max-width: 720px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 47, 99, 0.08); font-family: ${EMAIL_FONT_STACK};">
                        
                        <!-- 1. Brand Top Bar: Deep Navy Hero Aesthetic (#0f2f63) with Official Logo -->
                        <tr>
                            <td class="header-pad" style="padding: 20px 36px; background-color: #0f2f63; border-bottom: 1px solid #1e3a8a; font-family: ${EMAIL_FONT_STACK};">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="vertical-align: middle;">
                                            <a href="https://trust-hire-one.vercel.app" target="_blank" style="text-decoration: none; display: inline-block;">
                                                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td style="vertical-align: middle;">
                                                            <!-- Official High-Resolution Hosted Logo Asset -->
                                                            <img src="https://trusthyre.com/logo.png" onerror="this.onerror=null;this.src='https://trust-hire-one.vercel.app/logo.png';" alt="TrustHyre" height="36" style="height: 36px; width: auto; max-width: 160px; display: block; border: 0; outline: none; object-fit: contain;" />
                                                        </td>
                                                    </tr>
                                                </table>
                                            </a>
                                        </td>
                                        <td align="right" style="vertical-align: middle;">
                                            <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #FFFFFF; font-size: 10px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.22); letter-spacing: 1.2px; text-transform: uppercase; font-family: ${EMAIL_FONT_STACK};">
                                                Password Recovery
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 2. Main Body: Horizontal 2-Column Split View -->
                        <tr>
                            <td style="padding: 0; background-color: #FFFFFF; font-family: ${EMAIL_FONT_STACK};">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <!-- Left Column: Context, Instructions & 1-Click Action Link -->
                                        <td class="stack-col pad-left" width="56%" valign="middle" style="padding: 36px 20px 36px 36px; font-family: ${EMAIL_FONT_STACK};">
                                            <div style="display: inline-block; padding: 4px 10px; background-color: #EFF6FF; border: 1px solid #DBEAFE; border-radius: 6px; color: #1D4ED8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-family: ${EMAIL_FONT_STACK};">
                                                Account Security
                                            </div>
                                            <h1 style="margin: 0 0 10px 0; color: #0F2F63; font-size: 24px; font-weight: 800; letter-spacing: -0.4px; line-height: 1.25; font-family: ${EMAIL_FONT_STACK};">
                                                Reset Your Password
                                            </h1>
                                            <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT_STACK};">
                                                We received a request to reset your password. Use the authorization code opposite or click the direct button below to proceed securely.
                                            </p>
                                            
                                            <!-- Direct 1-Click Action Button -->
                                            <div style="margin: 20px 0 16px 0;">
                                                <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #0F2F63; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(15, 47, 99, 0.22); font-family: ${EMAIL_FONT_STACK};">
                                                    Reset Password Directly &rarr;
                                                </a>
                                            </div>

                                            <p style="margin: 0; color: #64748B; font-size: 12px; line-height: 1.5; font-family: ${EMAIL_FONT_STACK};">
                                                If you did not request a password reset, you can safely ignore this email. Your account credentials remain fully protected.
                                            </p>
                                        </td>

                                        <!-- Right Column: Prominent Code Card -->
                                        <td class="stack-col pad-right" width="44%" valign="middle" style="padding: 36px 36px 36px 12px; font-family: ${EMAIL_FONT_STACK};">
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0F2F63; border-radius: 16px; border: 1px solid #1E3A8A; box-shadow: 0 6px 18px rgba(15, 47, 99, 0.15); font-family: ${EMAIL_FONT_STACK};">
                                                <tr>
                                                    <td style="padding: 24px 20px; text-align: center; font-family: ${EMAIL_FONT_STACK};">
                                                        <div style="color: #93C5FD; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.8px; margin-bottom: 12px; font-family: ${EMAIL_FONT_STACK};">
                                                            Authorization Code
                                                        </div>
                                                        <!-- Clean White Code Display Box with 1-Tap Copy Support -->
                                                        <div class="otp-code" style="background-color: #FFFFFF; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); cursor: pointer;" title="Click to copy code">
                                                            <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0F2F63; font-family: ${CODE_FONT_STACK}; display: block; line-height: 1; text-align: center;">
                                                                ${token}
                                                            </span>
                                                        </div>
                                                        <div style="color: #94A3B8; font-size: 10px; font-weight: 600; margin-bottom: 10px; font-family: ${EMAIL_FONT_STACK};">
                                                            📋 Tap code to copy all 6 digits
                                                        </div>
                                                        <div style="color: #BFDBFE; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; font-family: ${EMAIL_FONT_STACK};">
                                                            ⏱️ Valid for 15 minutes • Single Use
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 3. Footer Bar: Minimal Clean Landing Style -->
                        <tr>
                            <td class="footer-pad" style="padding: 16px 36px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; font-family: ${EMAIL_FONT_STACK};">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td class="footer-stack" align="left" style="color: #94A3B8; font-size: 11px; font-weight: 500; font-family: ${EMAIL_FONT_STACK};">
                                            &copy; ${new Date().getFullYear()} TrustHyre Technologies Pvt. Ltd. &bull; <a href="https://trusthyre.com/notifications" target="_blank" style="color: #0066FF; text-decoration: underline;">Preferences</a> &bull; <a href="https://trusthyre.com/privacy" target="_blank" style="color: #0066FF; text-decoration: underline;">Privacy</a>
                                        </td>
                                        <td class="footer-stack" align="right" style="color: #94A3B8; font-size: 11px; font-weight: 600; font-family: ${EMAIL_FONT_STACK};">
                                            🛡️ 256-Bit SSL Encrypted
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
};
