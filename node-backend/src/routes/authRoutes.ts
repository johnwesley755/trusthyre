import { Hono } from 'hono';
import crypto from 'crypto';
import * as authController from '../controllers/authController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';
import { otpLimiter, loginLimiter, authActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

router.post('/register', authActionLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/send-otp', otpLimiter, authController.sendOtp);
router.post('/verify-otp', loginLimiter, authController.verifyEmployerOtp);
router.post('/verify-employer-otp', loginLimiter, authController.verifyEmployerOtp);
router.post('/forgot-password', authActionLimiter, authController.forgotPassword);
router.post('/verify-reset-code', authActionLimiter, authController.verifyResetCode);
router.post('/reset-password', authActionLimiter, authController.resetPassword);

router.get('/me', authenticateJWT, authController.getCurrentUser);
router.post('/sync', authenticateJWT, authController.syncUser);
router.post('/oauth-sync', loginLimiter, authController.oauthSync);

// Security Gate: Restrict internal endpoints to authenticated administrators
router.post('/internal/users/by-ids', authenticateJWT, requireAdmin, authController.getUsersByIds);
router.post('/webhooks/sync', async (c, next) => {
  const secret = c.req.header('x-internal-secret');
  const envObj = (c.env || {}) as Record<string, string>;
  const expectedSecret = envObj.INTERNAL_SERVICE_SECRET || 
                         process.env.INTERNAL_SERVICE_SECRET || 
                         envObj.INTERNAL_WEBHOOK_SECRET || 
                         process.env.INTERNAL_WEBHOOK_SECRET;

  // Fail-closed: Never allow access if service secret is not configured
  if (!expectedSecret || !secret) {
    return c.json({ success: false, message: "Forbidden: Invalid service secret" }, 403 as any);
  }

  // Timing-safe constant-time string comparison to prevent side-channel timing attacks
  const secretBuf = Buffer.from(secret);
  const expectedBuf = Buffer.from(expectedSecret);

  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return c.json({ success: false, message: "Forbidden: Invalid service secret" }, 403 as any);
  }

  await next();
}, authController.handleLegacyWebhook);

export default router;
