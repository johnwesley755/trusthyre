import { Hono } from 'hono';
import * as searchController from '../controllers/searchController';
import { optionalAuth, authenticateJWT, requireAdmin } from '../middlewares/auth';

const router = new Hono();

router.get('/jobs', optionalAuth, searchController.searchJobs);
router.get('/workers', optionalAuth, searchController.searchWorkers);
router.get('/popular-employers', searchController.getPopularEmployers);

// Defect fix 1.15: Protect index mutations behind admin/auth checks
router.post('/index/job', authenticateJWT, requireAdmin, searchController.indexJob);
router.delete('/index/job/:jobId', authenticateJWT, requireAdmin, searchController.removeJob);
router.post('/index/worker', authenticateJWT, requireAdmin, searchController.indexWorker);
router.delete('/index/worker/:userId', authenticateJWT, requireAdmin, searchController.removeWorker);

export default router;
