import { sendEmail } from './mailer';
import { getOtpTemplate } from '../utils/emailTemplates';

export const generateAndSendOtp = async (email: string) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const subject = `${otp} is your TrustHyre verification code`;
  const html = getOtpTemplate(otp, email);
  await sendEmail(email, subject, html, {
    category: 'auth',
    text: `Your TrustHyre verification code is ${otp}. Valid for 15 minutes.`
  });
  return otp;
};
