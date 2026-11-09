import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import { SearchAlertService } from '../services/searchAlertService';

export const createAlert = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const body = await c.req.json();
    const alert = await SearchAlertService.createAlert({
      userId,
      alertType: body.alertType || (authUser.role === 'EMPLOYER' ? 'CANDIDATE_ALERT' : 'JOB_ALERT'),
      title: body.title,
      query: body.query,
      city: body.city,
      category: body.category || body.industry || body.trade,
      minSalary: body.minSalary,
      maxSalary: body.maxSalary,
      experience: body.experience,
      frequency: body.frequency || 'INSTANT'
    });

    return c.json(ApiResponse.ok("Search alert created successfully", alert), 201 as any);
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const getMyAlerts = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const alertType = c.req.query('alertType');
    const alerts = await SearchAlertService.getUserAlerts(userId, alertType);

    return c.json(ApiResponse.ok("Search alerts fetched successfully", alerts));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const toggleAlert = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const alertId = c.req.param('id');
    if (!alertId) return c.json(ApiResponse.error("Alert ID required"), 400 as any);
    const body = await c.req.json();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    await SearchAlertService.toggleAlert(alertId, userId, isActive);
    return c.json(ApiResponse.ok(`Alert ${isActive ? 'activated' : 'paused'} successfully`));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const deleteAlert = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    const alertId = c.req.param('id');
    if (!alertId) return c.json(ApiResponse.error("Alert ID required"), 400 as any);
    await SearchAlertService.deleteAlert(alertId, userId);

    return c.json(ApiResponse.ok("Search alert deleted successfully"));
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};

export const testCandidateMatch = async (c: Context) => {
  try {
    const authUser = c.get('user');
    const userId = authUser?.sub;
    if (!userId) return c.json(ApiResponse.error("Unauthorized"), 401 as any);

    let alertType = c.req.query('alertType');
    if (!alertType) {
      try {
        const body = await c.req.json();
        alertType = body?.alertType;
      } catch {
        // body may be empty
      }
    }

    if (!alertType) {
      alertType = authUser.role === 'EMPLOYER' ? 'CANDIDATE_ALERT' : 'JOB_ALERT';
    }

    let result;
    if (alertType === 'JOB_ALERT') {
      result = await SearchAlertService.simulateJobMatchForUser(userId);
      return c.json(ApiResponse.ok("Test job match simulated successfully", result));
    } else {
      result = await SearchAlertService.simulateCandidateMatchForUser(userId);
      return c.json(ApiResponse.ok("Test candidate match simulated successfully", result));
    }
  } catch (err: any) {
    return c.json(ApiResponse.error(err.message), 500 as any);
  }
};


