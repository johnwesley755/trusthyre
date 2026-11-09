import { Hono } from 'hono';
import * as searchAlertController from '../controllers/searchAlertController';
import { authenticateJWT, optionalAuth } from '../middlewares/auth';

const router = new Hono();

router.post('/', authenticateJWT, searchAlertController.createAlert);
router.post('/quick-subscribe', optionalAuth, searchAlertController.quickSubscribeWhatsAppAlert);
router.post('/test-match', authenticateJWT, searchAlertController.testCandidateMatch);
router.get('/', authenticateJWT, searchAlertController.getMyAlerts);
router.patch('/:id/toggle', authenticateJWT, searchAlertController.toggleAlert);
router.delete('/:id', authenticateJWT, searchAlertController.deleteAlert);

export default router;
