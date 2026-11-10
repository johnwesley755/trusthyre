import { Hono } from 'hono';
import * as jobApplicationController from '../controllers/jobApplicationController';
import { authenticateJWT } from '../middlewares/auth';
import { writeActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

router.post('/', authenticateJWT, writeActionLimiter, jobApplicationController.applyForJob);
router.post('/dispatch-offer', authenticateJWT, writeActionLimiter, jobApplicationController.dispatchOffer);
router.get('/my', authenticateJWT, jobApplicationController.getMyApplications);
router.get('/employer-status/:workerId', authenticateJWT, jobApplicationController.getEmployerWorkerStatus);
router.get('/job/:jobId', authenticateJWT, jobApplicationController.getJobApplications);
router.post('/by-jobs', authenticateJWT, jobApplicationController.getApplicationsByJobs);
router.patch('/:applicationId/status', authenticateJWT, jobApplicationController.updateApplicationStatus);

export default router;

