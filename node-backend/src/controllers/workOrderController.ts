import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import { WorkOrderService } from '../services/workOrderService';

export const workOrderController = {

  /**
   * POST /api/work-orders
   * Create a new digital work order (Employer)
   */
  createWorkOrder: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const body = await c.req.json();
      const workOrder = await WorkOrderService.createWorkOrder(authUser.sub, body);
      return c.json(ApiResponse.ok("Work order created successfully", workOrder));
    } catch (err: any) {
      console.error("Error creating work order:", err);
      return c.json(ApiResponse.error(err.message || "Failed to create work order"), 400 as any);
    }
  },

  /**
   * GET /api/work-orders/employer
   * List work orders created by the authenticated employer
   */
  getEmployerWorkOrders: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const status = c.req.query('status');
      const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 15;

      const results = await WorkOrderService.getEmployerWorkOrders(authUser.sub, { status, page, limit });
      return c.json(ApiResponse.ok(results));
    } catch (err: any) {
      console.error("Error getting employer work orders:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve work orders"), 500 as any);
    }
  },

  /**
   * GET /api/work-orders/worker
   * List work orders offered to the authenticated candidate
   */
  getWorkerWorkOrders: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const status = c.req.query('status');
      const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1;
      const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 15;

      const results = await WorkOrderService.getWorkerWorkOrders(authUser.sub, { status, page, limit });
      return c.json(ApiResponse.ok(results));
    } catch (err: any) {
      console.error("Error getting worker work orders:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve work orders"), 500 as any);
    }
  },

  /**
   * GET /api/work-orders/:id
   * Get complete terms and event history of a single work order
   */
  getWorkOrderById: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Work order ID is required"), 400 as any);
      }
      const workOrder = await WorkOrderService.getWorkOrderById(authUser.sub, authUser.role || 'WORKER', id);
      return c.json(ApiResponse.ok(workOrder));
    } catch (err: any) {
      console.error("Error retrieving work order:", err);
      const isForbidden = err.message?.includes('Forbidden');
      return c.json(ApiResponse.error(err.message || "Failed to get work order"), isForbidden ? 403 as any : 404 as any);
    }
  },

  /**
   * POST /api/work-orders/:id/send
   * Transitions a DRAFT work order to SENT and dispatches worker notification
   */
  sendWorkOrder: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Work order ID is required"), 400 as any);
      }
      const updated = await WorkOrderService.sendWorkOrder(authUser.sub, id);
      return c.json(ApiResponse.ok("Work order sent to candidate", updated));
    } catch (err: any) {
      console.error("Error sending work order:", err);
      return c.json(ApiResponse.error(err.message || "Failed to send work order"), 400 as any);
    }
  },

  /**
   * POST /api/work-orders/:id/respond
   * Candidate acceptance, decline, or clarification request
   */
  respondToWorkOrder: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Work order ID is required"), 400 as any);
      }
      const body = await c.req.json();
      const { action, notes } = body;

      if (!['ACCEPT', 'DECLINE', 'CLARIFY'].includes(action)) {
        return c.json(ApiResponse.error("Invalid action. Must be ACCEPT, DECLINE, or CLARIFY"), 400 as any);
      }

      const updated = await WorkOrderService.respondToWorkOrder(authUser.sub, id, action, notes);
      return c.json(ApiResponse.ok(`Work order response recorded: ${action}`, updated));
    } catch (err: any) {
      console.error("Error responding to work order:", err);
      return c.json(ApiResponse.error(err.message || "Failed to respond to work order"), 400 as any);
    }
  },

  /**
   * PUT /api/work-orders/:id
   * Modify authorized terms (Employer)
   */
  updateTerms: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Work order ID is required"), 400 as any);
      }
      const body = await c.req.json();
      const updated = await WorkOrderService.updateTerms(authUser.sub, id, body);
      return c.json(ApiResponse.ok("Work order terms updated successfully", updated));
    } catch (err: any) {
      console.error("Error updating work order terms:", err);
      return c.json(ApiResponse.error(err.message || "Failed to update work order terms"), 400 as any);
    }
  },

  /**
   * POST /api/work-orders/:id/cancel
   * Cancel work order (Employer or Worker)
   */
  cancelWorkOrder: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Work order ID is required"), 400 as any);
      }
      const body = await c.req.json().catch(() => ({}));
      const updated = await WorkOrderService.cancelWorkOrder(authUser.sub, id, body?.reason);
      return c.json(ApiResponse.ok("Work order cancelled", updated));
    } catch (err: any) {
      console.error("Error cancelling work order:", err);
      return c.json(ApiResponse.error(err.message || "Failed to cancel work order"), 400 as any);
    }
  }
};

