import { Hono } from 'hono';
import * as notificationController from '../controllers/notificationController';
import { authenticateJWT } from '../middlewares/auth';
import { fcmLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

// Static collection & bulk action routes (MUST come before :id routes)
router.get('/', authenticateJWT, notificationController.getMyNotifications);
router.get('/unread-count', authenticateJWT, notificationController.getUnreadCount);
router.get('/unread/count', authenticateJWT, notificationController.getUnreadCount);
router.patch('/read-all', authenticateJWT, notificationController.markAllAsRead);
router.delete('/all', authenticateJWT, notificationController.deleteAllNotifications);

// Firebase Cloud Messaging (FCM) device token management & testing
router.post('/fcm-token', authenticateJWT, fcmLimiter, notificationController.registerFcmToken);
router.delete('/fcm-token', authenticateJWT, fcmLimiter, notificationController.unregisterFcmToken);
router.post('/test-push', authenticateJWT, fcmLimiter, notificationController.testPushNotification);
router.post('/trigger-digest', authenticateJWT, async (c) => {
  const { DailyDigestService } = await import('../services/dailyDigestService');
  const result = await DailyDigestService.sendDailyDigests();
  return c.json({ success: true, message: 'Daily digest evaluation complete', ...result });
});

// Individual item parameter routes
router.patch('/:id/read', authenticateJWT, notificationController.markAsRead);
router.delete('/:id', authenticateJWT, notificationController.deleteNotification);

export default router;
