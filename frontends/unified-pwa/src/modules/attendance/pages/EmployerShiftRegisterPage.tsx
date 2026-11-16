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
  X,
  FileText,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shiftAttendanceService, type ShiftRegisterItem } from '../../../services/shiftAttendance.service';
import { workOrderService, type WorkOrder } from '../../../services/workOrder.service';
import { AppLoader } from '../../../components/common/AppLoader';
import { ShowQrOtpModal } from '../components/ShowQrOtpModal';
import { CreateShiftModal } from '../components/CreateShiftModal';
import { EditShiftModal } from '../components/EditShiftModal';
import { toast } from 'sonner';

function getTodayIST(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function EmployerShiftRegisterPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'MONTH' | 'DAY'>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIST());
  const [activeShiftForQr, setActiveShiftForQr] = useState<ShiftRegisterItem | null>(null);
  const [editingShift, setEditingShift] = useState<ShiftRegisterItem | null>(null);
  const [selectedWorkOrderForShift, setSelectedWorkOrderForShift] = useState<WorkOrder | null>(null);
  const [isWorkOrderPickerOpen, setIsWorkOrderPickerOpen] = useState(false);
  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [resolvingCorrectionItem, setResolvingCorrectionItem] = useState<ShiftRegisterItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // 1. Fetch Attendance Register (Monthly or Daily)
  const { data: registerItems = [], isLoading, refetch } = useQuery({
    queryKey: ['attendanceRegister', viewMode, viewMode === 'MONTH' ? selectedMonth : selectedDate],
    queryFn: () => shiftAttendanceService.getAttendanceRegister(
      viewMode === 'MONTH' ? { month: selectedMonth } : { date: selectedDate }
    )
  });

  // 2. Fetch ALL Work Orders for scheduling shifts (no rigid status filter)
  const { data: workOrdersData, isLoading: isLoadingWorkOrders } = useQuery({
    queryKey: ['employerAllWorkOrders'],
    queryFn: () => workOrderService.getEmployerWorkOrders({ limit: 50 })
  });

  // Filter out cancelled or declined orders
  const allOrders = workOrdersData?.workOrders || [];
  const availableOrders = allOrders.filter(
    (wo: WorkOrder) => !['CANCELLED', 'DECLINED'].includes(wo.status)
  );

  const filteredOrders = availableOrders.filter((wo: WorkOrder) => {
    if (!workOrderSearch.trim()) return true;
    const q = workOrderSearch.toLowerCase();
    return (
      wo.order_number?.toLowerCase().includes(q) ||
      wo.job_title?.toLowerCase().includes(q) ||
      wo.worker?.full_name?.toLowerCase().includes(q) ||
      wo.worksite_name?.toLowerCase().includes(q)
    );
  });

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

  // Resolve Correction
  const handleResolveCorrection = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!resolvingCorrectionItem?.attendance) return;
    try {
      await shiftAttendanceService.resolveCorrection(
        resolvingCorrectionItem.attendance.id,
        decision,
        resolutionNotes
      );
      toast.success(`Correction ${decision.toLowerCase()} successfully`);
      setResolvingCorrectionItem(null);
      setResolutionNotes('');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to resolve correction');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0a0a0a] dark:text-zinc-100">
            Shift Attendance Register
          </h1>
          <p className="text-xs text-[#717784] dark:text-zinc-400">
            Daily site check-in board, single-use PINs, rolling QR, and attendance verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('MONTH')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'MONTH'
                  ? 'bg-white dark:bg-[#121215] text-[#0f2f63] dark:text-sky-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              Monthly View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('DAY')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'DAY'
                  ? 'bg-white dark:bg-[#121215] text-[#0f2f63] dark:text-sky-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              Daily View
            </button>
          </div>

          {/* Date / Month Picker */}
          {viewMode === 'MONTH' ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer"
            />
          ) : (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-xs font-semibold text-slate-800 dark:text-zinc-200 cursor-pointer"
            />
          )}

          <button
            type="button"
            onClick={() => setIsWorkOrderPickerOpen(true)}
            className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Shift</span>
          </button>
        </div>
      </div>

      {/* Roster & Attendance Board */}
      {isLoading ? (
        <AppLoader variant="skeleton" message="Loading attendance register..." />
      ) : registerItems.length === 0 ? (
        <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-4">
          <Users className="w-10 h-10 text-[#717784] mx-auto" />
          <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">
            {viewMode === 'MONTH'
              ? `No Shifts Scheduled for ${new Date(selectedMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
              : `No Shifts Scheduled for ${new Date(selectedDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}`}
          </h3>
          <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-md mx-auto">
            Schedule working shifts for candidates under your active work orders. Once scheduled, workers can scan rolling QR codes or enter 6-digit PINs at check-in.
          </p>
          <div>
            <button
              type="button"
              onClick={() => setIsWorkOrderPickerOpen(true)}
              className="px-4 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Shift Now</span>
            </button>
          </div>
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#0f2f63] dark:text-sky-400 uppercase tracking-wider">
                          {item.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                          {new Date(item.shiftDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                        status === 'ON_BREAK' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        status === 'APPROVED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                        status === 'PENDING_APPROVAL' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
                        status === 'CORRECTION_REQUESTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
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
                        <span>Planned Hours:</span>
                        <span className="font-semibold text-slate-900 dark:text-zinc-100">{item.startTime} - {item.endTime}</span>
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
                          <span className="font-bold text-slate-900 dark:text-zinc-100">{item.attendance.totalWorkMinutes} mins</span>
                        </div>
                      )}
                      {item.attendance?.correctionReason && (
                        <div className="pt-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                          Reason: {item.attendance.correctionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: QR/PIN, Edit Timing, Approve/Review */}
                  <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveShiftForQr(item)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Show check-in QR Code and OTP PIN"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                        <span>QR / PIN</span>
                      </button>

                      {/* One-time Changeable Shift Timing Button */}
                      <button
                        type="button"
                        onClick={() => setEditingShift(item)}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Change shift timing or reschedule"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                        <span>Change Timing</span>
                      </button>
                    </div>

                    {item.attendance && (item.attendance.status === 'PENDING_APPROVAL' || item.attendance.status === 'CHECKED_OUT') && (
                      <button
                        type="button"
                        onClick={() => handleApprove(item.attendance!.id, item.worker.name)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {item.attendance && item.attendance.status === 'CORRECTION_REQUESTED' && (
                      <button
                        type="button"
                        onClick={() => setResolvingCorrectionItem(item)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Review</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Work Order Selector Modal for Scheduling */}
      {isWorkOrderPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1C1C21] rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Work Order to Schedule</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Choose a worker and agreement to schedule shifts for:</p>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkOrderPickerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Search */}
            {availableOrders.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by worker, job title, or order #..."
                  value={workOrderSearch}
                  onChange={(e) => setWorkOrderSearch(e.target.value)}
                  className="w-full pl-8.5 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 text-xs text-slate-900 dark:text-zinc-100 focus:outline-hidden"
                />
              </div>
            )}
            
            {isLoadingWorkOrders ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading available work orders...
              </div>
            ) : availableOrders.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center mx-auto">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">No Active Work Orders Found</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                    To schedule shifts, issue a work order to your candidate first.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWorkOrderPickerOpen(false);
                      navigate('/employer/work-orders');
                    }}
                    className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Manage / Issue Work Orders</span>
                  </button>
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No work orders matched "{workOrderSearch}".
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredOrders.map((wo: WorkOrder) => {
                  const statusColor = 
                    wo.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                    wo.status === 'SENT' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                    wo.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                    'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300';

                  return (
                    <div
                      key={wo.id}
                      onClick={() => {
                        setSelectedWorkOrderForShift(wo);
                        setIsWorkOrderPickerOpen(false);
                      }}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 hover:border-[#0f2f63] dark:hover:border-sky-500 hover:bg-slate-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#0f2f63] dark:text-sky-400">
                            {wo.order_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColor}`}>
                            {wo.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {wo.job_title}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Worker: <strong className="text-slate-700 dark:text-zinc-300">{wo.worker?.full_name || 'Assigned Candidate'}</strong> • {wo.worksite_name}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400">
                          ₹{Number(wo.wage_amount).toLocaleString('en-IN')}/{wo.wage_frequency?.toLowerCase()}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 group-hover:bg-[#0f2f63] group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review & Resolve Correction Modal */}
      {resolvingCorrectionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C21] rounded-3xl p-6 space-y-4 shadow-xl border border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Review Attendance Correction</h3>
            <div className="text-xs space-y-1 text-slate-600 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/50 p-3 rounded-xl">
              <div><strong>Worker:</strong> {resolvingCorrectionItem.worker.name}</div>
              <div><strong>Job:</strong> {resolvingCorrectionItem.jobTitle}</div>
              <div><strong>Correction Reason:</strong> {resolvingCorrectionItem.attendance?.correctionReason}</div>
            </div>

            <textarea
              rows={2}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Optional supervisor notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolvingCorrectionItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleResolveCorrection('REJECTED')}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold cursor-pointer"
              >
                Reject Correction
              </button>
              <button
                type="button"
                onClick={() => handleResolveCorrection('APPROVED')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
              >
                Approve & Recalculate
              </button>
            </div>
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

      {/* Edit Shift Timing Modal (One-time Changeable) */}
      {editingShift && (
        <EditShiftModal
          isOpen={Boolean(editingShift)}
          onClose={() => setEditingShift(null)}
          shiftItem={editingShift}
          onShiftUpdated={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['attendanceRegister'] });
          }}
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
