import { Hono } from 'hono';
import * as jobController from '../controllers/jobController';
import { authenticateJWT, optionalAuth } from '../middlewares/auth';

const router = new Hono();

router.post('/', authenticateJWT, jobController.createJob);
router.get('/', optionalAuth, jobController.getAllJobs);
router.get('/employer', authenticateJWT, jobController.getMyJobs);
router.get('/stats', jobController.getStats);
router.get('/:id', optionalAuth, jobController.getJobById);
router.put('/:id', authenticateJWT, jobController.updateJob);
router.delete('/:id', authenticateJWT, jobController.deleteJob);
router.post('/by-ids', optionalAuth, jobController.getJobsByIds);

export default router;
