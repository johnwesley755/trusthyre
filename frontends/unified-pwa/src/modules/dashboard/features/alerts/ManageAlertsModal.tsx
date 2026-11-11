import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchAlertService, type SearchAlert } from '../../../../services/searchAlert.service';
import { 
  X, 
  Bell, 
  BellOff, 
  Trash2, 
  MapPin, 
  Briefcase, 
  Search, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { AppLoader } from '../../../../components/common/AppLoader';

interface ManageAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alertType?: 'JOB_ALERT' | 'CANDIDATE_ALERT';
}

export const ManageAlertsModal: React.FC<ManageAlertsModalProps> = ({
  isOpen,
  onClose,
  alertType = 'JOB_ALERT'
}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const { data: alerts = [], isLoading, refetch } = useQuery<SearchAlert[]>({
    queryKey: ['searchAlerts', alertType],
    queryFn: () => searchAlertService.getMyAlerts(alertType),
    enabled: isOpen
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      searchAlertService.toggleAlert(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchAlerts'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => searchAlertService.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchAlerts'] });
    }
  });

  if (!isOpen) return null;

  const isJobAlert = alertType === 'JOB_ALERT';

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-hidden select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-[#1C1C21] rounded-3xl shadow-2xl border border-[#e6e8ec] dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] select-text text-[#0a0a0a] dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-[#0f2f63] dark:bg-[#121215] text-white border-b border-white/10 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 dark:border-zinc-700 flex items-center justify-center text-white">
              <Bell className="w-5 h-5 text-[#5790e6] dark:text-[#38BDF8]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {isJobAlert ? 'My Job Alerts' : 'My Talent Alerts'}
              </h2>
              <p className="text-xs text-white/70 dark:text-zinc-400">
                {isJobAlert 
                  ? 'Receive instant alerts when matching jobs are posted by verified employers.'
                  : 'Get notified when new verified specialists in your required trades become available.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-zinc-800 text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts List Body - Single Scrollable Region */}
        <div className="p-6 overflow-y-auto overscroll-contain space-y-4 flex-1 min-h-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <AppLoader message="Loading your alerts..." />
            </div>
          ) : alerts.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#f4f4f4] dark:bg-zinc-900 flex items-center justify-center text-[#717784] dark:text-zinc-500">
                <BellOff className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-white">No saved search alerts yet</h3>
              <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-xs mx-auto">
                {isJobAlert 
                  ? 'Search for jobs by title, city, or trade and tap "Subscribe to Alerts" to get notified automatically.'
                  : 'Search for verified workers by skills and location and save search alerts.'}
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  alert.is_active 
                    ? 'bg-white dark:bg-[#121215] border-[#e6e8ec] dark:border-zinc-800 shadow-xs' 
                    : 'bg-[#fafafa] dark:bg-zinc-900/40 border-[#ebecef] dark:border-zinc-800/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-white">
                        {alert.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        alert.is_active 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {alert.is_active ? 'Active' : 'Paused'}
                      </span>
                    </div>

                    {/* Criteria Tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {alert.city && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#717784] dark:text-zinc-300 bg-[#f4f4f4] dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          <MapPin className="w-3 h-3 text-[#2563c9] dark:text-[#38BDF8]" />
                          {alert.city}
                        </span>
                      )}
                      {alert.category && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#717784] dark:text-zinc-300 bg-[#f4f4f4] dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          <Briefcase className="w-3 h-3 text-[#2563c9] dark:text-[#38BDF8]" />
                          {alert.category}
                        </span>
                      )}
                      {alert.query && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#717784] dark:text-zinc-300 bg-[#f4f4f4] dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          <Search className="w-3 h-3 text-[#2563c9] dark:text-[#38BDF8]" />
                          "{alert.query}"
                        </span>
                      )}
                      {alert.min_salary && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          ₹{Number(alert.min_salary).toLocaleString('en-IN')}+
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.is_active })}
                      title={alert.is_active ? 'Pause Alert' : 'Resume Alert'}
                      className="p-1.5 rounded-xl hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-all cursor-pointer"
                    >
                      {alert.is_active ? (
                        <ToggleRight className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-zinc-400 dark:text-zinc-600" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete alert "${alert.title}"?`)) {
                          deleteMutation.mutate(alert.id);
                        }
                      }}
                      title="Delete Alert"
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[#717784] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#717784] dark:text-zinc-500 pt-1 border-t border-[#f0f0f0] dark:border-zinc-800">
                  <span>Frequency: {alert.frequency || 'Instant'}</span>
                  <span>Matches Triggered: {alert.match_count || 0}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f4f4f4] dark:bg-[#121215] border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between text-xs text-[#717784] dark:text-zinc-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#2563c9] dark:text-[#38BDF8]" />
            Enterprise Reverse Search Alert System
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#183b74] dark:hover:bg-[#0052cc] text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
