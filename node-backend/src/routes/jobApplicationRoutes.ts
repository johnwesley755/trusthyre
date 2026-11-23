import { Hono } from 'hono';
import * as jobApplicationController from '../controllers/jobApplicationController';
import { authenticateJWT } from '../middlewares/auth';
import { writeActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

router.post('/', authenticateJWT, writeActionLimiter, jobApplicationController.applyForJob);
router.post('/dispatch-offer', authenticateJWT, writeActionLimiter, jobApplicationController.dispatchOffer);
router.get('/my', authenticateJWT, jobApplicationController.getMyApplications);
router.get('/match/:jobId/:workerId?', authenticateJWT, jobApplicationController.getCandidateJobMatch);
router.get('/employer-status/:workerId', authenticateJWT, jobApplicationController.getEmployerWorkerStatus);
router.get('/job/:jobId', authenticateJWT, jobApplicationController.getJobApplications);
router.post('/by-jobs', authenticateJWT, jobApplicationController.getApplicationsByJobs);
router.patch('/:applicationId/status', authenticateJWT, jobApplicationController.updateApplicationStatus);
router.patch('/:applicationId/stage', authenticateJWT, writeActionLimiter, jobApplicationController.updateApplicationStage);
router.get('/:jobId/pipeline', authenticateJWT, jobApplicationController.getJobHiringPipeline);

// Candidate Activity Timeline, Notes & Follow-ups
router.get('/:applicationId/timeline', authenticateJWT, jobApplicationController.getApplicationTimeline);
router.post('/:applicationId/notes', authenticateJWT, writeActionLimiter, jobApplicationController.addApplicationNote);
router.post('/:applicationId/follow-ups', authenticateJWT, writeActionLimiter, jobApplicationController.createApplicationFollowUp);
router.patch('/follow-ups/:followUpId', authenticateJWT, writeActionLimiter, jobApplicationController.updateApplicationFollowUp);
router.get('/jobs/:jobId/follow-up-summary', authenticateJWT, jobApplicationController.getJobFollowUpSummary);

export default router;

