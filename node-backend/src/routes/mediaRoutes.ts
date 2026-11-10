import { Hono } from 'hono';
import * as mediaController from '../controllers/mediaController';
import { authenticateJWT } from '../middlewares/auth';
import { uploadLimiter } from '../middlewares/rateLimiter';

const router = new Hono();

router.post('/upload', authenticateJWT, uploadLimiter, mediaController.upload);
router.delete('/:id', authenticateJWT, mediaController.remove);

export default router;
