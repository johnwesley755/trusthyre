import { Hono } from 'hono';
import * as ratingController from '../controllers/ratingController';
import { authenticateJWT } from '../middlewares/auth';

const router = new Hono();

router.post('/', authenticateJWT, ratingController.submitRating);
router.get('/eligibility', authenticateJWT, ratingController.checkEligibility);
router.get('/user/:rateeId', ratingController.getForUser);
router.get('/user/:rateeId/average', ratingController.getAverage);
router.get('/my', authenticateJWT, ratingController.getMyRatings);
router.get('/:id', ratingController.getById);

export default router;
