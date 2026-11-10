import { Hono } from 'hono';
import * as adminController from '../controllers/adminController';
import * as diagnosticController from '../controllers/diagnosticController';
import { authenticateJWT, requireAdmin, requireSuperAdmin } from '../middlewares/auth';

const router = new Hono();

/**
 * Public Invitation Endpoints (Accessible with valid token by prospective admin)
 */
router.get('/invitations/verify', adminController.getAdminInvitationByToken);
router.post('/invitations/accept', adminController.acceptAdminInvitation);

/**
 * Security Boundary: All other administrative endpoints require valid authentication and ADMIN role.
 */
const publicGuard = (middleware: (c: any, next: any) => Promise<any>) => async (c: any, next: any) => {
  const path = c.req.path;
  if (path.endsWith('/invitations/verify') || path.endsWith('/invitations/accept')) {
    return next();
  }
  return middleware(c, next);
};

router.use('*', publicGuard(authenticateJWT));
router.use('*', publicGuard(requireAdmin));

/**
 * Super-Admin Gated Endpoints
 */
router.use('/diagnostics/*', requireSuperAdmin);
router.post('/invitations/create', requireSuperAdmin, adminController.createAdminInvitation);
router.post('/users/create-admin', requireSuperAdmin, adminController.createAdminUser);
router.delete('/users/:id', requireSuperAdmin, adminController.deleteUserByAdmin);
router.get('/diagnostics/brevo', requireSuperAdmin, diagnosticController.getBrevoDiagnostics);

/**
 * General Administrative Endpoints (Admin & Super Admin)
 */
router.get('/stats', adminController.getAdminStats);
router.get('/analytics/visitors', adminController.getVisitorAnalytics);
router.get('/analytics', adminController.getVisitorAnalytics);
router.get('/visitors', adminController.getVisitorAnalytics);
router.get('/verifications', adminController.getVerifications);
router.patch('/verifications/:id/status', adminController.updateVerificationStatus);

// User Registry (Read operations for all admins)
router.get('/users', adminController.getAllUsers);

// Jobs & Scraper operations (Full CRUD granted to both SUPER_ADMIN and ADMIN per operational policy)
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
