import { sendEmail, sendTemplateEmail } from './mailer';
import { getOtpTemplate } from '../utils/emailTemplates';

export const generateAndSendOtp = async (email: string) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const subject = `${otp} is your TrustHyre verification code`;

  await sendTemplateEmail(
    'AUTH_EMAIL_OTP',
    email,
    { otp, email, recipientEmail: email, expiresInMinutes: 15 },
    {
      category: 'auth',
      text: `Your TrustHyre verification code is ${otp}. Valid for 15 minutes.`,
      fallbackFn: async () => {
        const html = getOtpTemplate(otp, email);
        return await sendEmail(email, subject, html, {
          category: 'auth',
          text: `Your TrustHyre verification code is ${otp}. Valid for 15 minutes.`,
        });
      },
    }
  );

  return otp;
};
