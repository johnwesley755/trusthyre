import apiClient from '../api/apiClient';

export interface Shift {
  id: string;
  work_order_id: string;
  employer_id: string;
  worker_id: string;
  supervisor_id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  worksite_name: string;
  worksite_address: string;
  city: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  recurrence_rule?: string;
  notes?: string;
  work_orders?: {
    order_number: string;
    job_title: string;
    wage_amount: number;
    wage_frequency: string;
    worksite_name?: string;
    worksite_address?: string;
    city?: string;
  };
  attendances?: ShiftAttendance[];
}

export interface ShiftAttendance {
  id: string;
  shift_id: string;
  work_order_id: string;
  worker_id: string;
  employer_id: string;
  supervisor_id?: string;
  status: 'NOT_STARTED' | 'CHECKED_IN' | 'ON_BREAK' | 'CHECKED_OUT' | 'PENDING_APPROVAL' | 'APPROVED' | 'CORRECTION_REQUESTED' | 'DISPUTED';
  verification_method: 'QR_CODE' | 'ONE_TIME_PIN' | 'MANUAL_SUPERVISOR';
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  total_work_minutes: number;
  total_break_minutes: number;
  manual_reason?: string;
  correction_reason?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface ShiftRegisterItem {
  shiftId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  worksiteName: string;
  workOrderId: string;
  orderNumber: string;
  jobTitle: string;
  wageAmount: number;
  wageFrequency: string;
  worker: {
    userId: string;
    name: string;
    phone: string;
    photo: string;
  };
  attendance: {
    id: string;
    status: string;
    verificationMethod: string;
    checkInTime?: string;
    checkOutTime?: string;
    totalWorkMinutes: number;
    totalBreakMinutes: number;
    approvedAt?: string;
    correctionReason?: string;
  } | null;
}

export interface CreateShiftPayload {
  workOrderId: string;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  breakDurationMinutes?: number;
  worksiteName?: string;
  worksiteAddress?: string;
  city?: string;
  notes?: string;
  recurringDays?: number;
  recurrenceRule?: 'DAILY' | 'WEEKDAYS' | 'WEEKLY';
}

export interface CheckInPayload {
  shiftId: string;
  method: 'QR_CODE' | 'ONE_TIME_PIN' | 'MANUAL_SUPERVISOR';
  token?: string;
  otp?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  manualReason?: string;
}

export interface CheckOutPayload {
  shiftId: string;
  method: 'QR_CODE' | 'ONE_TIME_PIN' | 'MANUAL_SUPERVISOR';
  token?: string;
  otp?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  manualReason?: string;
}

export const shiftAttendanceService = {

  // Employer: Create shifts
  createShifts: async (payload: CreateShiftPayload): Promise<Shift[]> => {
    const res = await apiClient.post('/api/shifts', payload);
    return res.data?.data || [];
  },

  // Employer: Get scheduled shifts
  getEmployerShifts: async (params?: { date?: string; status?: string; workOrderId?: string }): Promise<Shift[]> => {
    const res = await apiClient.get('/api/shifts/employer', { params });
    return res.data?.data || [];
  },

  // Worker: Get my shifts
  getWorkerShifts: async (params?: { date?: string; status?: string }): Promise<Shift[]> => {
    const res = await apiClient.get('/api/shifts/worker', { params });
    return res.data?.data || [];
  },

  // Single shift
  getShiftById: async (shiftId: string): Promise<Shift> => {
    const res = await apiClient.get(`/api/shifts/${shiftId}`);
    return res.data?.data;
  },

  // Employer: Generate rolling QR token
  generateQrToken: async (shiftId: string): Promise<{ token: string; expiresAt: number }> => {
    const res = await apiClient.post('/api/attendance/qr-token', { shiftId });
    return res.data?.data;
  },

  // Employer: Generate 6-digit PIN
  generateOtpPin: async (shiftId: string): Promise<{ otp: string; expiresAt: number }> => {
    const res = await apiClient.post('/api/attendance/otp', { shiftId });
    return res.data?.data;
  },

  // Worker: Check In
  checkIn: async (payload: CheckInPayload): Promise<ShiftAttendance> => {
    const res = await apiClient.post('/api/attendance/check-in', payload);
    return res.data?.data;
  },

  // Worker: Break toggle
  recordBreak: async (shiftId: string, action: 'START' | 'END'): Promise<ShiftAttendance> => {
    const res = await apiClient.post('/api/attendance/break', { shiftId, action });
    return res.data?.data;
  },

  // Worker: Check Out
  checkOut: async (payload: CheckOutPayload): Promise<ShiftAttendance> => {
    const res = await apiClient.post('/api/attendance/check-out', payload);
    return res.data?.data;
  },

  // Employer: Approve Attendance
  approveAttendance: async (attendanceId: string): Promise<ShiftAttendance> => {
    const res = await apiClient.post(`/api/attendance/${attendanceId}/approve`);
    return res.data?.data;
  },

  // Worker: Request Attendance Correction
  requestCorrection: async (attendanceId: string, payload: { proposedCheckIn?: string; proposedCheckOut?: string; reason: string }): Promise<ShiftAttendance> => {
    const res = await apiClient.post(`/api/attendance/${attendanceId}/correction`, payload);
    return res.data?.data;
  },

  // Employer: Daily/Weekly Shift Register
  getAttendanceRegister: async (dateStr?: string): Promise<ShiftRegisterItem[]> => {
    const res = await apiClient.get('/api/attendance/register', { params: { date: dateStr } });
    return res.data?.data || [];
  }
};
