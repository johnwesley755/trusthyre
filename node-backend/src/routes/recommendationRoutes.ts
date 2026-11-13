import { Hono } from 'hono';
import { recommendationController } from '../controllers/recommendationController';
import { authenticateJWT, requireWorker, requireEmployer } from '../middlewares/auth';
import { writeActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

// Candidate: Personalized recommended jobs (WORKER-only)
router.get('/jobs', authenticateJWT, requireWorker, recommendationController.getRecommendedJobs);

// Employer: Recommended talent across active jobs or specific jobId (EMPLOYER-only)
router.get('/workers', authenticateJWT, requireEmployer, recommendationController.getRecommendedWorkers);

// Telemetry: Record interactions (views, clicks, applies, dismissals)
router.post('/telemetry', authenticateJWT, writeActionLimiter, recommendationController.recordTelemetry);

export default router;

