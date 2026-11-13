import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth';
import { shiftAttendanceController } from '../controllers/shiftAttendanceController';

const shiftRoutes = new Hono();
const attendanceRoutes = new Hono();

// All shift & attendance endpoints require authenticated session
shiftRoutes.use('*', requireAuth);
attendanceRoutes.use('*', requireAuth);

// ----------------------------------------------------------------------------
// Shift Endpoints (/api/shifts)
// ----------------------------------------------------------------------------
shiftRoutes.post('/', shiftAttendanceController.createShifts);
shiftRoutes.get('/employer', shiftAttendanceController.getEmployerShifts);
shiftRoutes.get('/worker', shiftAttendanceController.getWorkerShifts);
shiftRoutes.get('/:id', shiftAttendanceController.getShiftById);

// ----------------------------------------------------------------------------
// Attendance Endpoints (/api/attendance)
// ----------------------------------------------------------------------------
attendanceRoutes.post('/qr-token', shiftAttendanceController.generateQrToken);
attendanceRoutes.post('/otp', shiftAttendanceController.generateOtpPin);
attendanceRoutes.post('/check-in', shiftAttendanceController.checkIn);
attendanceRoutes.post('/break', shiftAttendanceController.recordBreak);
attendanceRoutes.post('/check-out', shiftAttendanceController.checkOut);
attendanceRoutes.post('/:id/approve', shiftAttendanceController.approveAttendance);
attendanceRoutes.post('/:id/correction', shiftAttendanceController.requestCorrection);
attendanceRoutes.get('/register', shiftAttendanceController.getAttendanceRegister);

export { shiftRoutes, attendanceRoutes };
