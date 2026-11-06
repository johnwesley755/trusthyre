import { Hono } from 'hono';
import * as workerController from '../controllers/workerController';
import { authenticateJWT, optionalAuth } from '../middlewares/auth';

const router = new Hono();

router.get('/profile', authenticateJWT, workerController.getMyProfile);
router.get('/me', authenticateJWT, workerController.getMyProfile);
router.put('/profile', authenticateJWT, workerController.updateProfile);
router.put('/me', authenticateJWT, workerController.updateProfile);
router.get('/internal/profiles/:userId/completion', workerController.getProfileCompletion);
router.post('/profiles/by-user-ids', optionalAuth, workerController.getProfilesByUserIds);
router.post('/profile/:userId/view', workerController.incrementProfileView);
router.get('/trust-score/:userId', workerController.getTrustScore);
router.get('/stats', workerController.getGlobalStats);

// ⚡ Digital Labour Chowk Standby Pool endpoints
router.get('/standby-pool', optionalAuth, workerController.getStandbyPoolWorkers);
router.post('/standby-pool', authenticateJWT, workerController.joinStandbyPool);
router.delete('/standby-pool/me', authenticateJWT, workerController.leaveStandbyPool);

router.get('/:id', optionalAuth, workerController.getWorkerById);

export default router;
