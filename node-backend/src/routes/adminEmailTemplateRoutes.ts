import { Hono } from 'hono';
import * as controller from '../controllers/adminEmailTemplateController';
import { requireAdmin, requireSuperAdmin } from '../middlewares/auth';
import { adminEmailTestLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

// All routes require authenticated ADMIN by default (inherited from admin router)
router.get('/', controller.getTemplateInventory);
router.post('/sync', controller.syncBrevoTemplates);
router.get('/:id', controller.getTemplateById);
router.post('/', controller.createTemplate);
router.put('/:id', controller.updateDraft);
router.post('/:id/duplicate', controller.duplicateTemplate);
router.post('/:id/preview', controller.renderLocalPreview);

// Test dispatch endpoints protected by dedicated rate limiter (10 emails / 5 min)
router.post('/test', adminEmailTestLimiter, controller.sendTestEmail);
router.post('/:id/test', adminEmailTestLimiter, controller.sendTestEmail);

router.post('/import/:brevoTemplateId', controller.importBrevoTemplate);

// Super-Admin only gated operations (Production Publishing & Rollback)
router.post('/:id/publish', requireSuperAdmin, controller.publishTemplate);
router.post('/:id/rollback', requireSuperAdmin, controller.rollbackTemplate);

export default router;
