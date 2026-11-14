import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth';
import { getMyReferralStats } from '../controllers/referralController';

const referralRoutes = new Hono();

// GET /api/referrals/me - Authenticated endpoint to retrieve user's referral code and metrics
referralRoutes.get('/me', requireAuth, getMyReferralStats);

export default referralRoutes;
