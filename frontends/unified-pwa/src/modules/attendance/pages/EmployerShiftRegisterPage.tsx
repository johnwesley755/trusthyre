import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  QrCode, 
  KeyRound, 
  Plus, 
  Users, 
  ChevronRight, 
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftAttendanceService, type ShiftRegisterItem } from '../../../services/shiftAttendance.service';
import { workOrderService, type WorkOrder } from '../../../services/workOrder.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { ShowQrOtpModal } from '../components/ShowQrOtpModal';
import { CreateShiftModal } from '../components/CreateShiftModal';
import { toast } from 'sonner';

export default function EmployerShiftRegisterPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [activeShiftForQr, setActiveShiftForQr] = useState<ShiftRegisterItem | null>(null);
  const [selectedWorkOrderForShift, setSelectedWorkOrderForShift] = useState<WorkOrder | null>(null);

  // 1. Fetch Today's Attendance Register
  const { data: registerItems = [], isLoading, refetch } = useQuery({
    queryKey: ['attendanceRegister', selectedDate],
    queryFn: () => shiftAttendanceService.getAttendanceRegister(selectedDate)
  });

  // 2. Fetch Accepted Work Orders for scheduling new shifts
  const { data: workOrdersData } = useQuery({
    queryKey: ['employerAcceptedOrders'],
    queryFn: () => workOrderService.getEmployerWorkOrders({ status: 'ACCEPTED', limit: 50 })
  });
  const acceptedOrders = workOrdersData?.workOrders || [];

  // Approve Attendance
  const handleApprove = async (attendanceId: string, workerName: string) => {
    try {
      await shiftAttendanceService.approveAttendance(attendanceId);
      toast.success(`Approved attendance for ${workerName}`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] dark:text-zinc-100">
            Shift Attendance Register
          </h1>
          <p className="text-xs text-[#717784] dark:text-zinc-400">
            Daily site check-in board, rolling QR credentials, and attendance verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-semibold text-slate-800 dark:text-zinc-200"
          />

          {acceptedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedWorkOrderForShift(acceptedOrders[0])}
              className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster & Attendance Board */}
      {isLoading ? (
        <AppLoader variant="skeleton" message="Loading attendance register..." />
      ) : registerItems.length === 0 ? (
        <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-3">
          <Users className="w-10 h-10 text-[#717784] mx-auto" />
          <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">
            No Shifts Scheduled for {new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </h3>
          <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-md mx-auto">
            Schedule shifts for candidates who have accepted your digital work orders.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {registerItems.map((item) => {
              const status = item.attendance?.status || 'NOT_STARTED';
              return (
                <div
                  key={item.shiftId}
                  className="rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase tracking-wider">
                        {item.orderNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800' :
                        status === 'ON_BREAK' ? 'bg-amber-100 text-amber-800' :
                        status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                        status === 'PENDING_APPROVAL' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100">
                        {item.worker.name}
                      </h3>
                      <p className="text-xs text-[#717784]">{item.jobTitle} • {item.worksiteName}</p>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-zinc-400 bg-slate-50 dark:bg-[#121215] p-2.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span>Planned:</span>
                        <span className="font-semibold">{item.startTime} - {item.endTime}</span>
                      </div>
                      {item.attendance?.checkInTime && (
                        <div className="flex items-center justify-between">
                          <span>Checked In:</span>
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {new Date(item.attendance.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      {item.attendance?.totalWorkMinutes !== undefined && item.attendance.totalWorkMinutes > 0 && (
                        <div className="flex items-center justify-between">
                          <span>Total Work:</span>
                          <span className="font-bold">{item.attendance.totalWorkMinutes} mins</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveShiftForQr(item)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                      <span>QR / PIN</span>
                    </button>

                    {item.attendance && ['PENDING_APPROVAL', 'CHECKED_OUT', 'CORRECTION_REQUESTED'].includes(item.attendance.status) && (
                      <button
                        type="button"
                        onClick={() => handleApprove(item.attendance!.id, item.worker.name)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Show QR / OTP Credential Modal */}
      {activeShiftForQr && (
        <ShowQrOtpModal
          isOpen={Boolean(activeShiftForQr)}
          onClose={() => setActiveShiftForQr(null)}
          shiftId={activeShiftForQr.shiftId}
          workerName={activeShiftForQr.worker.name}
          jobTitle={activeShiftForQr.jobTitle}
        />
      )}

      {/* Create Shift Modal */}
      {selectedWorkOrderForShift && (
        <CreateShiftModal
          isOpen={Boolean(selectedWorkOrderForShift)}
          onClose={() => setSelectedWorkOrderForShift(null)}
          workOrder={selectedWorkOrderForShift}
          onShiftCreated={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['attendanceRegister'] });
          }}
        />
      )}
    </div>
  );
}
