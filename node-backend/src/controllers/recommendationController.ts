import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import { recommendationEngineService } from '../services/recommendationEngineService';
import prisma from '../config/prisma';

export const recommendationController = {

  /**
   * GET /api/recommendations/jobs
   * Retrieves personalized, multi-objective ranked jobs for the logged-in candidate.
   * Gated: WORKER-only.
   */
  getRecommendedJobs: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Candidate login required"), 401 as any);
      }

      const latStr = c.req.query('lat');
      const lngStr = c.req.query('lng');
      const radiusKmStr = c.req.query('radiusKm');

      const lat = latStr ? parseFloat(latStr) : undefined;
      const lng = lngStr ? parseFloat(lngStr) : undefined;
      const radiusKm = radiusKmStr ? parseFloat(radiusKmStr) : undefined;

      // Validate coordinates and radius bounds if provided
      if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) {
        return c.json(ApiResponse.error("Invalid latitude (-90 to 90)"), 400 as any);
      }
      if (lng !== undefined && (isNaN(lng) || lng < -180 || lng > 180)) {
        return c.json(ApiResponse.error("Invalid longitude (-180 to 180)"), 400 as any);
      }
      if (radiusKm !== undefined && (isNaN(radiusKm) || radiusKm <= 0 || radiusKm > 1000)) {
        return c.json(ApiResponse.error("Invalid radiusKm (1 to 1000 km)"), 400 as any);
      }

      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 15;
      const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;

      const results = await recommendationEngineService.getRecommendedJobsForWorker(
        authUser.sub,
        { lat, lng, radiusKm, limit, page }
      );

      return c.json(ApiResponse.ok(results));
    } catch (err: any) {
      console.error("Error in getRecommendedJobs controller:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve recommended jobs"), 500 as any);
    }
  },

  /**
   * GET /api/recommendations/workers
   * Retrieves top matched, pre-screened candidate profiles for an employer's active vacancies.
   * Gated: EMPLOYER-only.
   * Enforces job ownership when jobId parameter is provided.
   */
  getRecommendedWorkers: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const jobId = c.req.query('jobId') || undefined;

      // Enforce job ownership check
      if (jobId) {
        const job = await prisma.jobs.findUnique({
          where: { id: jobId },
          select: { id: true, employer_id: true }
        });

        if (!job) {
          return c.json(ApiResponse.error("Job opening not found"), 404 as any);
        }

        const isAdmin = authUser.role === 'ADMIN' || authUser.role === 'SUPER_ADMIN';
        if (job.employer_id !== authUser.sub && !isAdmin) {
          return c.json(ApiResponse.error("Forbidden: You do not have permission to view recommendations for this job posting"), 403 as any);
        }
      }

      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 15;
      const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;

      const results = await recommendationEngineService.getRecommendedWorkersForEmployer(
        authUser.sub,
        { jobId, limit, page }
      );

      return c.json(ApiResponse.ok(results));
    } catch (err: any) {
      console.error("Error in getRecommendedWorkers controller:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve recommended candidates"), 500 as any);
    }
  },

  /**
   * POST /api/recommendations/telemetry
   * Ingests recommendation feedback interactions (VIEW, CLICK, SAVE, APPLY, INVITE, DISMISS)
   */
  recordTelemetry: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const body = await c.req.json();
      const { interactionType, itemType, itemId, matchScore, metadata } = body;

      const validInteractions = ['VIEW', 'CLICK', 'SAVE', 'APPLY', 'INVITE', 'DISMISS'];
      if (!validInteractions.includes(interactionType)) {
        return c.json(ApiResponse.error("Invalid interactionType. Must be VIEW, CLICK, SAVE, APPLY, INVITE, or DISMISS"), 400 as any);
      }

      if (!['JOB', 'WORKER'].includes(itemType)) {
        return c.json(ApiResponse.error("Invalid itemType. Must be JOB or WORKER"), 400 as any);
      }

      if (!itemId) {
        return c.json(ApiResponse.error("itemId is required"), 400 as any);
      }

      try {
        const record = await recommendationEngineService.recordInteraction({
          userId: authUser.sub,
          interactionType,
          itemType,
          itemId,
          matchScore: typeof matchScore === 'number' ? matchScore : undefined,
          metadata
        });

        return c.json(ApiResponse.ok("Telemetry recorded successfully", { id: record.id }));
      } catch (err: any) {
        if (err.message && err.message.includes('does not exist')) {
          return c.json(ApiResponse.error(err.message), 404 as any);
        }
        throw err;
      }
    } catch (err: any) {
      console.error("Error in recordTelemetry controller:", err);
      return c.json(ApiResponse.error(err.message || "Failed to record telemetry"), 500 as any);
    }
  }
};
