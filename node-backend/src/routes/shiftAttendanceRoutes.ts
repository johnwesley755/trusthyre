import { Hono } from 'hono';
import { requireAuth, requireEmployer, requireShiftSupervisorOrEmployer } from '../middlewares/auth';
import { shiftAttendanceController } from '../controllers/shiftAttendanceController';

const shiftRoutes = new Hono();
const attendanceRoutes = new Hono();

// All shift & attendance endpoints require authenticated session
shiftRoutes.use('*', requireAuth);
attendanceRoutes.use('*', requireAuth);

// ----------------------------------------------------------------------------
// Shift Endpoints (/api/shifts)
// ----------------------------------------------------------------------------
shiftRoutes.post('/', requireEmployer, shiftAttendanceController.createShifts);
shiftRoutes.get('/employer', requireShiftSupervisorOrEmployer, shiftAttendanceController.getEmployerShifts);
shiftRoutes.get('/worker', shiftAttendanceController.getWorkerShifts);
shiftRoutes.get('/:id', shiftAttendanceController.getShiftById);

// ----------------------------------------------------------------------------
// Attendance Endpoints (/api/attendance)
// ----------------------------------------------------------------------------
// Credential generation strictly restricted to Employer / Assigned Supervisor role
attendanceRoutes.post('/qr-token', requireShiftSupervisorOrEmployer, shiftAttendanceController.generateQrToken);
attendanceRoutes.post('/otp', requireShiftSupervisorOrEmployer, shiftAttendanceController.generateOtpPin);

// Manual attendance recording strictly restricted to Employer / Assigned Supervisor role
attendanceRoutes.post('/manual-record', requireShiftSupervisorOrEmployer, shiftAttendanceController.recordManualAttendance);

// Worker check-in, breaks, check-out, and correction requests
attendanceRoutes.post('/check-in', shiftAttendanceController.checkIn);
attendanceRoutes.post('/break', shiftAttendanceController.recordBreak);
attendanceRoutes.post('/check-out', shiftAttendanceController.checkOut);
attendanceRoutes.post('/:id/correction', shiftAttendanceController.requestCorrection);

// Employer/Assigned Supervisor approval & correction resolution
attendanceRoutes.post('/:id/approve', requireShiftSupervisorOrEmployer, shiftAttendanceController.approveAttendance);
attendanceRoutes.post('/:id/resolve-correction', requireShiftSupervisorOrEmployer, shiftAttendanceController.resolveCorrection);
attendanceRoutes.get('/register', requireShiftSupervisorOrEmployer, shiftAttendanceController.getAttendanceRegister);

export { shiftRoutes, attendanceRoutes };
