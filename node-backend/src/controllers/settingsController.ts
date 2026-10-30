import { Context } from 'hono';
import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { ApiResponse } from '../utils/ApiResponse';
import { validatePasswordStrength } from '../utils/validators';

export const getSettings = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    let settings = await prisma.user_settings.findUnique({ where: { user_id: userId } });
    if (!settings) {
      settings = await prisma.user_settings.create({
        data: {
          user_id: userId,
          email_notifications: true,
          push_notifications: true,
          marketing_emails: false,
          language: 'en',
          updated_at: new Date()
        }
      });
    }
    return c.json(ApiResponse.ok(settings));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const updateSettings = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const data = (await c.req.json().catch(() => ({})));
    
    // Fetch existing settings first to ensure partial updates do not overwrite other preferences
    const existing = await prisma.user_settings.findUnique({ where: { user_id: userId } });

    const parseBoolean = (val: any, fallback: boolean): boolean => {
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'false' || lower === '0') return false;
        if (lower === 'true' || lower === '1') return true;
      }
      return fallback;
    };

    const emailNotifications = 
      data.email_notifications !== undefined ? parseBoolean(data.email_notifications, true) :
      data.emailNotifications !== undefined ? parseBoolean(data.emailNotifications, true) :
      (existing ? existing.email_notifications : true);

    const pushNotifications = 
      data.push_notifications !== undefined ? parseBoolean(data.push_notifications, true) :
      data.pushNotifications !== undefined ? parseBoolean(data.pushNotifications, true) :
      (existing ? existing.push_notifications : true);

    const marketingEmails = 
      data.marketing_emails !== undefined ? parseBoolean(data.marketing_emails, false) :
      data.marketingEmails !== undefined ? parseBoolean(data.marketingEmails, false) :
      (existing ? existing.marketing_emails : false);

    const language = data.language || existing?.language || 'en';
    const theme = data.theme || existing?.theme || 'light';

    const settings = await prisma.user_settings.upsert({
      where: { user_id: userId },
      update: {
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        marketing_emails: marketingEmails,
        language,
        theme,
        updated_at: new Date()
      },
      create: {
        user_id: userId,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        marketing_emails: marketingEmails,
        language,
        theme,
        updated_at: new Date()
      }
    });

    return c.json(ApiResponse.ok("Settings updated", settings));
  } catch (err: any) {
    console.error('❌ [SettingsController] updateSettings error:', err.message);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const changePassword = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const { oldPassword, newPassword } = (await c.req.json());
    const user = await prisma.user_metadata.findUnique({ where: { id: userId } });

    if (!user || !user.password_hash) {
       return c.json(ApiResponse.error("Cannot change password for this account type"), 400 as any);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) return c.json(ApiResponse.error("Incorrect old password"), 400 as any);

    // Security Gate: Enforce password complexity policy
    const passwordCheck = validatePasswordStrength(newPassword);
    if (!passwordCheck.valid) {
      return c.json(ApiResponse.error(passwordCheck.error || "Password does not meet complexity requirements"), 400 as any);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user_metadata.update({
      where: { id: userId },
      data: { password_hash: hash, updated_at: new Date() }
    });

    return c.json(ApiResponse.ok("Password changed successfully", "success"));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
