import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import { ReferralService } from '../services/referralService';

export const getMyReferralStats = async (c: Context) => {
  try {
    const user = c.get('user');
    const userId = user?.sub || user?.id;

    if (!userId) {
      return c.json(ApiResponse.error('Unauthorized'), 401);
    }

    // Determine host / origin URL from request headers
    const forwardedProto = c.req.header('x-forwarded-proto') || 'https';
    const host = c.req.header('host') || 'trusthyre.com';
    const originUrl = `${forwardedProto}://${host}`;

    const stats = await ReferralService.getReferralStats(userId, originUrl);
    return c.json(ApiResponse.ok('Referral statistics retrieved successfully', stats));
  } catch (err: any) {
    console.error('[referralController.getMyReferralStats] Error:', err);
    return c.json(ApiResponse.error(err.message || 'Failed to retrieve referral statistics'), 500);
  }
};
