import { Hono } from 'hono';
import * as adminController from '../controllers/adminController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = new Hono();

// Enforce authentication & ADMIN role for all routes in this router
router.use('*', authenticateJWT);
router.use('*', requireAdmin);

router.get('/stats', adminController.getAdminStats);
router.get('/analytics/visitors', adminController.getVisitorAnalytics);
router.get('/analytics', adminController.getVisitorAnalytics);
router.get('/visitors', adminController.getVisitorAnalytics);
router.get('/verifications', adminController.getVerifications);
router.patch('/verifications/:id/status', adminController.updateVerificationStatus);
router.get('/users', adminController.getAllUsers);
router.post('/users/create-admin', adminController.createAdminUser);
router.get('/jobs', adminController.getAllJobs);
router.post('/jobs/sync-external', adminController.syncExternalJobs);
router.get('/jobs/scan-status/:id', adminController.getScanStatus);
router.get('/jobs/sources', adminController.getScraperSources);
router.patch('/jobs/:id/moderate', adminController.moderateJobByAdmin);
router.post('/jobs/freshness-cycle', adminController.runJobFreshnessCycle);
router.delete('/jobs/:id', adminController.deleteJobByAdmin);

/**
 * Dedicated Admin Analytics Sub-Router (mounted directly at /api/admin/analytics)
 */
export const adminAnalyticsRouter = new Hono();
adminAnalyticsRouter.use('*', authenticateJWT);
adminAnalyticsRouter.use('*', requireAdmin);
adminAnalyticsRouter.get('/', adminController.getVisitorAnalytics);
adminAnalyticsRouter.get('/visitors', adminController.getVisitorAnalytics);

export default router;
