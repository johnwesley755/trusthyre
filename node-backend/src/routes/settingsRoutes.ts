import { Hono } from 'hono';
import * as settingsController from '../controllers/settingsController';
import { authenticateJWT } from '../middlewares/auth';
import { authActionLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

router.get('/', authenticateJWT, settingsController.getSettings);
router.put('/', authenticateJWT, settingsController.updateSettings);
router.post('/password', authenticateJWT, authActionLimiter, settingsController.changePassword);

export default router;
