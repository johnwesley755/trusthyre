import { Hono } from 'hono';
import * as translationController from '../controllers/translationController';
import { translationLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

// Public endpoint so guest users and registered users can translate jobs/pages dynamically
router.post('/', translationLimiter, translationController.translate);

export default router;
