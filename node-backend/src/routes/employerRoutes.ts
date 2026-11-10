import { Hono } from 'hono';
import * as employerController from '../controllers/employerController';
import * as dashboardController from '../controllers/dashboardController';
import { authenticateJWT } from '../middlewares/auth';

const router = new Hono();

// Profile endpoints
router.get('/profile', authenticateJWT, employerController.getEmployerProfile);
router.get('/profile/:userId', employerController.getEmployerProfile);
router.post('/profile', authenticateJWT, employerController.updateEmployerProfile);
router.put('/profile', authenticateJWT, employerController.updateEmployerProfile);

// Aliases for compatibility
router.get('/me', authenticateJWT, employerController.getEmployerProfile);
router.post('/me', authenticateJWT, employerController.updateEmployerProfile);
router.put('/me', authenticateJWT, employerController.updateEmployerProfile);
router.post('/complete-onboarding', authenticateJWT, employerController.updateEmployerProfile);

// Stats and Tier
router.get('/stats', authenticateJWT, dashboardController.getEmployerStats);
router.put('/tier', authenticateJWT, employerController.updateEmployerTier);

// Candidate contact unlock
router.post('/unlock-contact/:workerId', authenticateJWT, employerController.unlockCandidateContact);
router.post('/unlock-contact', authenticateJWT, employerController.unlockCandidateContact);

// User-ID based endpoints
router.get('/:userId', employerController.getEmployerProfile);
router.put('/:userId', authenticateJWT, employerController.updateEmployerProfile);
router.post('/:userId', authenticateJWT, employerController.updateEmployerProfile);

export default router;
