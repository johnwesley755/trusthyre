import { Hono } from 'hono';
import { authenticateJWT } from '../middlewares/auth';
import {
  scheduleInterview,
  getInterviewByApplication,
  getMyInterviews,
  respondToInterview,
  updateInterviewStatus
} from '../controllers/interviewController';

const router = new Hono();

router.use('*', authenticateJWT);

router.post('/schedule', scheduleInterview);
router.get('/my', getMyInterviews);
router.get('/application/:applicationId', getInterviewByApplication);
router.post('/:id/respond', respondToInterview);
router.patch('/:id/status', updateInterviewStatus);

export default router;
