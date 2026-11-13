import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  PlusCircle, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  IndianRupee, 
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useUser } from '../../../providers/AuthContext';
import { workOrderService, type WorkOrder } from '../../../services/workOrder.service';
import { WorkOrderDetailModal } from '../components/WorkOrderDetailModal';
import { AppLoader } from '../../../components/common/AppLoader';
import { Link } from 'react-router-dom';

export default function WorkOrdersPage() {
  const { user } = useUser();
  const isEmployer = user?.role === 'EMPLOYER';

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch Work Orders according to authenticated role
  const { data, isLoading, refetch } = useQuery({
    queryKey: isEmployer ? ['employerWorkOrders', statusFilter] : ['workerWorkOrders', statusFilter],
    queryFn: () => {
      const params = { status: statusFilter !== 'ALL' ? statusFilter : undefined, limit: 30 };
      return isEmployer 
        ? workOrderService.getEmployerWorkOrders(params) 
        : workOrderService.getWorkerWorkOrders(params);
    }
  });

  const workOrders = data?.workOrders || [];

  const handleOpenDetail = (order: WorkOrder) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const statusBadges: Record<string, string> = {
    DRAFT: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
    SENT: 'bg-blue-50 text-[#0f2f63] dark:bg-sky-950/40 dark:text-sky-300 border border-blue-200 dark:border-sky-800',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    DECLINED: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
    IN_PROGRESS: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
    COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    CANCELLED: 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    DISPUTED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
  };

  return (
    <div className="w-full min-h-screen p-3 sm:p-6 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-6 pb-20">

        {/* 1. Header Banner */}
        <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f2f63]/10 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" />
              <span>Digital Work Agreements</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isEmployer ? 'Employer Work Orders' : 'My Work Orders & Contracts'}
            </h1>
            <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 max-w-xl">
              Legally binding digital records capturing wage rates, worksite locations, shift schedules, and safety provisions.
            </p>
          </div>

          {isEmployer && (
            <Link
              to="/find-workers"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Issue New Work Order</span>
            </Link>
          )}
        </div>

        {/* 2. Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {['ALL', 'SENT', 'ACCEPTED', 'DRAFT', 'DECLINED', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-[#f4f4f4] dark:bg-[#121215] text-[#717784] hover:text-[#0a0a0a] dark:hover:text-zinc-200 border border-[#e6e8ec] dark:border-zinc-800'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* 3. Orders Grid / Table */}
        {isLoading ? (
          <AppLoader variant="skeleton" message="Loading digital work orders..." />
        ) : workOrders.length === 0 ? (
          <div className="rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4] dark:bg-[#09090b] p-10 text-center space-y-3">
            <FileText className="w-10 h-10 text-[#717784] mx-auto" />
            <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100">No work orders found</h3>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-md mx-auto">
              {isEmployer
                ? 'Create a formal work order from candidate applications or during spot-hiring to track agreed wages and shifts.'
                : 'You have not received any digital work orders matching this filter yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleOpenDetail(order)}
                className="group rounded-[1.75rem] border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-5 sm:p-6 shadow-xs hover:border-[#0f2f63]/40 dark:hover:border-zinc-700 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-[#717784] dark:text-zinc-400">
                        {order.order_number}
                      </span>
                      <h3 className="text-base font-bold text-[#0a0a0a] dark:text-zinc-100 group-hover:text-[#0f2f63] dark:group-hover:text-sky-400 transition-colors">
                        {order.job_title}
                      </h3>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusBadges[order.status] || 'bg-zinc-100'}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#717784] dark:text-zinc-400">
                    <div className="flex items-center gap-1.5 font-medium text-[#0a0a0a] dark:text-zinc-200">
                      <MapPin className="w-3.5 h-3.5 text-[#717784]" />
                      <span>{order.worksite_name} ({order.city})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#717784]" />
                        <span>Starts {new Date(order.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#717784]" />
                        <span>{order.shift_timing}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#e6e8ec]/70 dark:border-zinc-800/70">
                  <div className="text-xs">
                    <span className="text-[10px] uppercase font-bold text-[#717784] block">Wage Agreed</span>
                    <span className="font-bold text-sm text-[#0a0a0a] dark:text-zinc-100">
                      ₹{Number(order.wage_amount).toLocaleString('en-IN')}{' '}
                      <span className="text-[10px] text-[#717784]">/ {order.wage_frequency.toLowerCase()}</span>
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1 text-xs font-bold text-[#0f2f63] dark:text-sky-400 group-hover:underline">
                    <span>View Agreement</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <WorkOrderDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          workOrder={selectedOrder}
          isEmployer={Boolean(isEmployer)}
          onStatusChange={refetch}
        />
      )}
    </div>
  );
}

