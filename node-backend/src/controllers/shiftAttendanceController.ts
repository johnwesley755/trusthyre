import { Context } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';
import { ShiftAttendanceService } from '../services/shiftAttendanceService';

export const shiftAttendanceController = {

  /**
   * POST /api/shifts
   * Create shift(s) for accepted work order (Employer)
   */
  createShifts: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const body = await c.req.json();
      const shifts = await ShiftAttendanceService.createShifts(authUser.sub, body);
      return c.json(ApiResponse.ok("Shifts created successfully", shifts));
    } catch (err: any) {
      console.error("Error creating shifts:", err);
      return c.json(ApiResponse.error(err.message || "Failed to create shifts"), 400 as any);
    }
  },

  /**
   * GET /api/shifts/employer
   * List employer shifts
   */
  getEmployerShifts: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const date = c.req.query('date');
      const status = c.req.query('status');
      const workOrderId = c.req.query('workOrderId');

      const shifts = await ShiftAttendanceService.getEmployerShifts(authUser.sub, { date, status, workOrderId });
      return c.json(ApiResponse.ok(shifts));
    } catch (err: any) {
      console.error("Error getting employer shifts:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve shifts"), 500 as any);
    }
  },

  /**
   * GET /api/shifts/worker
   * List worker shifts
   */
  getWorkerShifts: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const date = c.req.query('date');
      const status = c.req.query('status');

      const shifts = await ShiftAttendanceService.getWorkerShifts(authUser.sub, { date, status });
      return c.json(ApiResponse.ok(shifts));
    } catch (err: any) {
      console.error("Error getting worker shifts:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve shifts"), 500 as any);
    }
  },

  /**
   * GET /api/shifts/:id
   * Get single shift detail
   */
  getShiftById: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Shift ID required"), 400 as any);
      }

      const shift = await ShiftAttendanceService.getShiftById(authUser.sub, authUser.role || 'WORKER', id);
      return c.json(ApiResponse.ok(shift));
    } catch (err: any) {
      console.error("Error getting shift by ID:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve shift"), 404 as any);
    }
  },

  /**
   * POST /api/attendance/qr-token
   * Employer generates short-lived HMAC QR token
   */
  generateQrToken: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const body = await c.req.json();
      const { shiftId } = body;
      if (!shiftId) {
        return c.json(ApiResponse.error("shiftId is required"), 400 as any);
      }

      const tokenData = ShiftAttendanceService.generateQrToken(authUser.sub, shiftId);
      return c.json(ApiResponse.ok("QR token generated", tokenData));
    } catch (err: any) {
      console.error("Error generating QR token:", err);
      return c.json(ApiResponse.error(err.message || "Failed to generate QR token"), 400 as any);
    }
  },

  /**
   * POST /api/attendance/otp
   * Employer generates 6-digit one-time PIN
   */
  generateOtpPin: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const body = await c.req.json();
      const { shiftId } = body;
      if (!shiftId) {
        return c.json(ApiResponse.error("shiftId is required"), 400 as any);
      }

      const otpData = ShiftAttendanceService.generateOtpPin(authUser.sub, shiftId);
      return c.json(ApiResponse.ok("One-time PIN generated", otpData));
    } catch (err: any) {
      console.error("Error generating OTP:", err);
      return c.json(ApiResponse.error(err.message || "Failed to generate OTP"), 400 as any);
    }
  },

  /**
   * POST /api/attendance/check-in
   * Worker checks in via QR token, OTP, or manual supervisor approval
   */
  checkIn: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const body = await c.req.json();
      const result = await ShiftAttendanceService.checkIn(authUser.sub, body);
      return c.json(ApiResponse.ok("Checked in successfully", result));
    } catch (err: any) {
      console.error("Error checking in:", err);
      return c.json(ApiResponse.error(err.message || "Failed to check in"), 400 as any);
    }
  },

  /**
   * POST /api/attendance/break
   * Worker toggles break state
   */
  recordBreak: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const body = await c.req.json();
      const { shiftId, action } = body;
      if (!shiftId || !['START', 'END'].includes(action)) {
        return c.json(ApiResponse.error("shiftId and action ('START' | 'END') required"), 400 as any);
      }

      const result = await ShiftAttendanceService.recordBreak(authUser.sub, shiftId, action);
      return c.json(ApiResponse.ok(`Break ${action.toLowerCase()}ed`, result));
    } catch (err: any) {
      console.error("Error recording break:", err);
      return c.json(ApiResponse.error(err.message || "Failed to record break"), 400 as any);
    }
  },

  /**
   * POST /api/attendance/check-out
   * Worker checks out of shift
   */
  checkOut: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const body = await c.req.json();
      const result = await ShiftAttendanceService.checkOut(authUser.sub, body);
      return c.json(ApiResponse.ok("Checked out successfully. Attendance pending approval.", result));
    } catch (err: any) {
      console.error("Error checking out:", err);
      return c.json(ApiResponse.error(err.message || "Failed to check out"), 400 as any);
    }
  },

  /**
   * POST /api/attendance/:id/approve
   * Employer approves verified attendance
   */
  approveAttendance: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Attendance ID required"), 400 as any);
      }

      const result = await ShiftAttendanceService.approveAttendance(authUser.sub, id);
      return c.json(ApiResponse.ok("Attendance approved successfully", result));
    } catch (err: any) {
      console.error("Error approving attendance:", err);
      return c.json(ApiResponse.error(err.message || "Failed to approve attendance"), 400 as any);
    }
  },

  /**
   * POST /api/attendance/:id/correction
   * Worker requests time correction
   */
  requestCorrection: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized"), 401 as any);
      }

      const id = c.req.param('id');
      if (!id) {
        return c.json(ApiResponse.error("Attendance ID required"), 400 as any);
      }

      const body = await c.req.json();
      const result = await ShiftAttendanceService.requestCorrection(authUser.sub, id, body);
      return c.json(ApiResponse.ok("Attendance correction requested", result));
    } catch (err: any) {
      console.error("Error requesting correction:", err);
      return c.json(ApiResponse.error(err.message || "Failed to request correction"), 400 as any);
    }
  },

  /**
   * GET /api/attendance/register
   * Employer daily shift attendance register
   */
  getAttendanceRegister: async (c: Context) => {
    try {
      const authUser = c.get('user');
      if (!authUser || !authUser.sub) {
        return c.json(ApiResponse.error("Unauthorized: Employer login required"), 401 as any);
      }

      const date = c.req.query('date');
      const register = await ShiftAttendanceService.getAttendanceRegister(authUser.sub, date);
      return c.json(ApiResponse.ok(register));
    } catch (err: any) {
      console.error("Error fetching attendance register:", err);
      return c.json(ApiResponse.error(err.message || "Failed to retrieve register"), 500 as any);
    }
  }
};
