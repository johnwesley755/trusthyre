import { Hono } from 'hono';
import { recommendationController } from '../controllers/recommendationController';
import { authenticateJWT } from '../middlewares/auth';
import { writeActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

// Candidate: Personalized recommended jobs
router.get('/jobs', authenticateJWT, recommendationController.getRecommendedJobs);

// Employer: Recommended talent across active jobs or specific jobId
router.get('/workers', authenticateJWT, recommendationController.getRecommendedWorkers);

// Telemetry: Record interactions (views, clicks, applies, dismissals)
router.post('/telemetry', authenticateJWT, writeActionLimiter, recommendationController.recordTelemetry);

export default router;

