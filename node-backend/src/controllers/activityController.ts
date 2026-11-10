import { Context } from 'hono';
import prisma from '../config/prisma';
import { ApiResponse } from '../utils/ApiResponse';

export const getRecentActivities = async (c: Context) => {
  try {
    const userId = c.get('user')?.sub;
    const rawLimit = parseInt(c.req.query('limit') as string, 10);
    const limit = Math.min(Math.max(isNaN(rawLimit) ? 10 : rawLimit, 1), 100);

    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const activities = await prisma.user_activities.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit
    });

    return c.json(ApiResponse.ok(activities));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};
