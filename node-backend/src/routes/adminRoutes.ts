import { Hono } from 'hono';
import * as adminController from '../controllers/adminController';
import * as diagnosticController from '../controllers/diagnosticController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = new Hono();

/**
 * Public Invitation Endpoints (Accessible with valid token by prospective admin)
 */
router.get('/invitations/verify', adminController.getAdminInvitationByToken);
router.post('/invitations/accept', adminController.acceptAdminInvitation);

/**
 * Authenticated Administrative Endpoints
 */
router.use('/diagnostics/*', authenticateJWT, requireAdmin);
router.use('/stats', authenticateJWT, requireAdmin);
router.use('/analytics/*', authenticateJWT, requireAdmin);
router.use('/verifications/*', authenticateJWT, requireAdmin);
router.use('/users/*', authenticateJWT, requireAdmin);
router.use('/jobs/*', authenticateJWT, requireAdmin);
router.use('/invitations/create', authenticateJWT, requireAdmin);

router.get('/diagnostics/brevo', diagnosticController.getBrevoDiagnostics);
router.get('/stats', adminController.getAdminStats);
router.get('/analytics/visitors', adminController.getVisitorAnalytics);
router.get('/analytics', adminController.getVisitorAnalytics);
router.get('/visitors', adminController.getVisitorAnalytics);
router.get('/verifications', adminController.getVerifications);
router.patch('/verifications/:id/status', adminController.updateVerificationStatus);

// User & Admin Provisioning
router.get('/users', adminController.getAllUsers);
router.post('/users/create-admin', adminController.createAdminUser);
router.delete('/users/:id', adminController.deleteUserByAdmin);
router.post('/invitations/create', adminController.createAdminInvitation);

// Jobs moderation
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
