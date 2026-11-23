import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';
import { NotificationDispatcher } from '../services/notificationDispatcher';

const formatNotification = (n: any) => ({
  id: n.id,
  userId: n.user_id,
  user_id: n.user_id,
  title: n.title,
  message: n.message,
  link: n.link || null,
  type: n.type,
  isRead: Boolean(n.is_read),
  is_read: Boolean(n.is_read),
  createdAt: n.created_at,
  created_at: n.created_at,
  updatedAt: n.updated_at,
  updated_at: n.updated_at
});

export const getMyNotifications = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    return c.json(ApiResponse.ok("Notifications fetched", notifications.map(formatNotification)));
  } catch (err: any) {
    console.error("getMyNotifications error:", err);
    return c.json(ApiResponse.ok("Notifications fetched", []));
  }
};

export const getUnreadCount = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const count = await prisma.notifications.count({
      where: { user_id: userId, is_read: false }
    });
    return c.json(ApiResponse.ok("Unread count fetched", { count, unreadCount: count }));
  } catch (err: any) {
    console.error("getUnreadCount error:", err);
    return c.json(ApiResponse.ok("Unread count fetched", { count: 0, unreadCount: 0 }));
  }
};

export const markAsRead = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const id = c.req.param('id') as string;
    if (id === 'read-all' || id === 'all') {
      return markAllAsRead(c);
    }

    const result = await prisma.notifications.updateMany({
      where: { id, user_id: userId },
      data: { is_read: true, updated_at: new Date() }
    });

    if (result.count === 0) {
      return c.json(ApiResponse.error("Notification not found or access denied"), 404 as any);
    }

    return c.json(ApiResponse.ok("Notification marked as read", { id, is_read: true, isRead: true }));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const markAllAsRead = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    await prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true, updated_at: new Date() }
    });
    return c.json(ApiResponse.ok("All notifications marked as read", null));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const deleteNotification = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const id = c.req.param('id') as string;
    if (id === 'all') {
      return deleteAllNotifications(c);
    }

    const result = await prisma.notifications.deleteMany({
      where: { id, user_id: userId }
    });

    if (result.count === 0) {
      return c.json(ApiResponse.error("Notification not found or access denied"), 404 as any);
    }

    return c.json(ApiResponse.ok("Notification deleted", null));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const deleteAllNotifications = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    await prisma.notifications.deleteMany({ where: { user_id: userId } });
    return c.json(ApiResponse.ok("All notifications deleted", null));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * Register / update Firebase Cloud Messaging (FCM) device token
 */
/**
 * Register / update Firebase Cloud Messaging (FCM) device token
 */
export const registerFcmToken = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) {
      console.warn('❌ [FCM-BACKEND:TOKEN-REGISTER] Unauthorized token registration attempt.');
      return c.json(ApiResponse.error("Unauthorized"), 401 as any);
    }

    const body = await c.req.json().catch(() => ({}));
    const { token, deviceType = 'web' } = body;

    if (!token || typeof token !== 'string') {
      console.warn(`❌ [FCM-BACKEND:TOKEN-REGISTER] Invalid token payload received from userId=${userId}`);
      return c.json(ApiResponse.error("Valid FCM token is required"), 400 as any);
    }


    try {
      if ((prisma as any).user_fcm_tokens) {
        await (prisma as any).user_fcm_tokens.upsert({
          where: { token },
          update: { user_id: userId, device_type: deviceType, updated_at: new Date() },
          create: { user_id: userId, token, device_type: deviceType, created_at: new Date(), updated_at: new Date() }
        });
      } else {
        await prisma.$executeRaw`
          INSERT INTO user_fcm_tokens (user_id, token, device_type, created_at, updated_at)
          VALUES (${userId}, ${token}, ${deviceType}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (token) DO UPDATE 
          SET user_id = EXCLUDED.user_id, device_type = EXCLUDED.device_type, updated_at = CURRENT_TIMESTAMP;
        `;
      }
    } catch {
      await prisma.$executeRaw`
        INSERT INTO user_fcm_tokens (user_id, token, device_type, created_at, updated_at)
        VALUES (${userId}, ${token}, ${deviceType}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (token) DO UPDATE 
        SET user_id = EXCLUDED.user_id, device_type = EXCLUDED.device_type, updated_at = CURRENT_TIMESTAMP;
      `;
    }

    return c.json(ApiResponse.ok("FCM device token registered successfully", { token, deviceType }));
  } catch (err: any) {
    console.error('❌ [FCM-BACKEND:TOKEN-REGISTER] Error upserting token:', err.message);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * Unregister Firebase Cloud Messaging (FCM) device token upon logout
 */
export const unregisterFcmToken = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const body = await c.req.json().catch(() => ({}));
    const token = body.token || c.req.query('token');

    if (!token) {
      return c.json(ApiResponse.error("Token is required to unregister"), 400 as any);
    }


    try {
      if ((prisma as any).user_fcm_tokens) {
        await (prisma as any).user_fcm_tokens.deleteMany({
          where: { token, user_id: userId }
        });
      } else {
        await prisma.$executeRaw`DELETE FROM user_fcm_tokens WHERE token = ${token} AND user_id = ${userId}`;
      }
    } catch {
      await prisma.$executeRaw`DELETE FROM user_fcm_tokens WHERE token = ${token} AND user_id = ${userId}`;
    }

    return c.json(ApiResponse.ok("FCM device token unregistered successfully", null));
  } catch (err: any) {
    console.error('❌ [FCM-BACKEND:TOKEN-UNREGISTER] Error deleting token:', err.message);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

/**
 * Instant diagnostic push notification endpoint for testing
 */
export const testPushNotification = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);


    const tokens = await prisma.user_fcm_tokens.findMany({
      where: { user_id: userId }
    }).catch(() => []);


    const notification = await NotificationDispatcher.dispatch({
      userId,
      title: "🔔 TrustHyre Test Notification",
      message: "Your real-time notification pipeline is working successfully!",
      type: "SYSTEM_ALERT",
      link: "/notifications"
    });

    return c.json(ApiResponse.ok("Test notification dispatched", {
      userId,
      registeredTokensCount: tokens.length,
      tokensSummary: tokens.map((t: any) => ({
        id: t.id,
        tokenPrefix: t.token.slice(0, 16) + '...',
        deviceType: t.device_type,
        updatedAt: t.updated_at
      })),
      notification
    }));
  } catch (err: any) {
    console.error('❌ [FCM-BACKEND:TEST-PUSH] Error in test push:', err.message);
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
