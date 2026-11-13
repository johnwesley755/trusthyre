import { Hono } from 'hono';
import { requireAuth, requireEmployer } from '../middlewares/auth';
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
shiftRoutes.get('/employer', requireEmployer, shiftAttendanceController.getEmployerShifts);
shiftRoutes.get('/worker', shiftAttendanceController.getWorkerShifts);
shiftRoutes.get('/:id', shiftAttendanceController.getShiftById);

// ----------------------------------------------------------------------------
// Attendance Endpoints (/api/attendance)
// ----------------------------------------------------------------------------
// P4.1 FIX: Credential generation strictly restricted to Employer / Supervisor role
attendanceRoutes.post('/qr-token', requireEmployer, shiftAttendanceController.generateQrToken);
attendanceRoutes.post('/otp', requireEmployer, shiftAttendanceController.generateOtpPin);

// P4.3 FIX: Manual attendance recording strictly restricted to Employer / Supervisor role
attendanceRoutes.post('/manual-record', requireEmployer, shiftAttendanceController.recordManualAttendance);

// Worker check-in, breaks, check-out, and correction requests
attendanceRoutes.post('/check-in', shiftAttendanceController.checkIn);
attendanceRoutes.post('/break', shiftAttendanceController.recordBreak);
attendanceRoutes.post('/check-out', shiftAttendanceController.checkOut);
attendanceRoutes.post('/:id/correction', shiftAttendanceController.requestCorrection);

// Employer/Supervisor approval & correction resolution
attendanceRoutes.post('/:id/approve', requireEmployer, shiftAttendanceController.approveAttendance);
attendanceRoutes.post('/:id/resolve-correction', requireEmployer, shiftAttendanceController.resolveCorrection);
attendanceRoutes.get('/register', requireEmployer, shiftAttendanceController.getAttendanceRegister);

export { shiftRoutes, attendanceRoutes };
