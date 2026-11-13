import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../../services/admin.service';
import { Link } from 'react-router-dom';
import { AppLoader } from '../../../components/common/AppLoader';
import { useAuth } from '../../../providers/AuthContext';
import { 
  Users, 
  Briefcase, 
  FileCheck2, 
  CheckCircle2, 
  Loader2,
  Building2,
  UserCheck,
  ArrowRight,
  BarChart3,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'admin@trusthyre.com';

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: adminService.getStats,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const { data: visitorData } = useQuery({
    queryKey: ['adminVisitorAnalytics'],
    queryFn: () => adminService.getVisitorAnalytics(false),
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: pendingVerifications = [], isLoading: isLoadingVerifications } = useQuery({
    queryKey: ['adminVerifications', 'PENDING'],
    queryFn: () => adminService.getVerifications('PENDING'),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'VERIFIED' | 'REJECTED' }) =>
      adminService.updateVerificationStatus(id, status),
    onSuccess: (_, variables) => {
      toast.success(`Verification marked as ${variables.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['adminVerifications'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    }
  });

  if (isLoadingStats) {
    return (
      <AppLoader variant="page" message="Loading admin intelligence..." />
    );
  }

  const kpiCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      sub: `${stats?.totalWorkers || 0} Candidates • ${stats?.totalEmployers || 0} Employers`,
      icon: Users,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-[#0f2f63] dark:text-sky-400 border border-blue-100 dark:border-blue-900/40'
    },
    {
      title: 'Active Job Postings',
      value: stats?.openJobs || 0,
      sub: `${stats?.totalJobs || 0} Total Listings Created`,
      icon: Briefcase,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
    },
    {
      title: 'Pending Verifications',
      value: stats?.pendingVerifications || 0,
      sub: `${stats?.totalVerifications || 0} Evaluated Records`,
      icon: FileCheck2,
      color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40',
      alert: (stats?.pendingVerifications || 0) > 0
    },
    {
      title: 'Completed Hirings',
      value: stats?.totalHired || 0,
      sub: `${(stats?.totalHired || 0)} Direct Placements`,
      icon: CheckCircle2,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
    },
  ];

  return (
    <div className="space-y-6 font-['Onest',system-ui,sans-serif] w-full max-w-full min-w-0">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-[#09090b] border border-[#e6e8ec] dark:border-zinc-800 rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs relative overflow-hidden min-w-0 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
            <span>Platform Overview</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] dark:text-white tracking-tight">
            Command Center
          </h1>
          <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-1 leading-relaxed">
            Real-time ecosystem metrics, workforce identity review queue, and platform operational health.
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-[11px] sm:text-xs font-medium uppercase tracking-wider shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Services Operational</span>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 min-w-0">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx}
              className="bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between shadow-xs hover:border-[#0f2f63]/30 dark:hover:border-zinc-700 transition-all min-w-0"
            >
              <div className="flex items-center justify-between mb-3 min-w-0">
                <span className="text-xs font-medium uppercase tracking-wider text-[#717784] dark:text-zinc-400 truncate mr-2">{kpi.title}</span>
                <div className={`w-10 h-10 rounded-xl ${kpi.color} flex items-center justify-center shadow-2xs shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-2xl sm:text-3xl font-semibold text-[#0a0a0a] dark:text-white tracking-tight block">{kpi.value.toLocaleString()}</span>
                <p className="text-xs text-[#717784] dark:text-zinc-400 mt-1 truncate">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visitor Intelligence Pulse Card */}
      <div className="bg-gradient-to-r from-[#0f2f63] via-[#163f82] to-[#1e54a8] text-white rounded-2xl p-4 sm:p-6 lg:p-7 shadow-sm border border-[#0f2f63]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-blue-400/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Traffic Pulse
              </span>
              <span className="text-xs text-blue-200">
                Measurement ID: <code className="font-mono bg-black/20 px-2 py-0.5 rounded text-white text-[11px]">G-NH3HTZ6XBB</code>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Google Analytics 4 & Visitor Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
              Real-time candidate and recruiter visits, geographic concentration across Indian metro hubs, acquisition pathways, and device split.
            </p>
          </div>

          {/* Quick Metrics & CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <div className="grid grid-cols-3 gap-2 bg-black/20 p-2.5 rounded-xl border border-white/10 text-center">
              <div className="px-2">
                <span className="text-[10px] uppercase font-bold text-blue-200 block">Active Now</span>
                <span className="text-lg font-bold text-emerald-300 block">
                  {visitorData?.realtime?.activeUsers ?? 0}
                </span>
              </div>
              <div className="px-2 border-l border-white/10">
                <span className="text-[10px] uppercase font-bold text-blue-200 block">Visitors</span>
                <span className="text-lg font-bold text-white block">
                  {visitorData ? visitorData.metrics.monthlyActiveUsers.toLocaleString() : '...'}
                </span>
              </div>
              <div className="px-2 border-l border-white/10">
                <span className="text-[10px] uppercase font-bold text-blue-200 block">Page Views</span>
                <span className="text-lg font-bold text-white block">
                  {visitorData ? visitorData.metrics.totalPageViews.toLocaleString() : '...'}
                </span>
              </div>
            </div>

            <Link
              to="/admin/analytics"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-[#0066FF] hover:bg-blue-50 dark:hover:bg-[#0052cc] text-[#0f2f63] dark:text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              <BarChart3 className="w-4 h-4 text-[#0f2f63]" />
              <span>Full Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0">
        
        {/* Left Column: Verification Queue */}
        <div className="lg:col-span-7 bg-white dark:bg-[#09090b] border border-[#e6e8ec] dark:border-zinc-800 rounded-2xl p-4 sm:p-6 lg:p-7 flex flex-col justify-between shadow-xs min-w-0 transition-colors">
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#e6e8ec] dark:border-zinc-800 gap-2 min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileCheck2 className="w-5 h-5 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                <h2 className="text-base font-semibold text-[#0a0a0a] dark:text-white truncate">Pending Verifications</h2>
              </div>
              <Link 
                to="/admin/verifications"
                className="text-xs font-medium text-[#2563c9] dark:text-sky-400 hover:underline inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <span>Full Queue ({pendingVerifications.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingVerifications ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#0f2f63] dark:text-sky-400 animate-spin" />
              </div>
            ) : pendingVerifications.length === 0 ? (
              <div className="text-center py-12 bg-[#f8fafc] dark:bg-[#121215] rounded-xl border border-[#e6e8ec] dark:border-zinc-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200">All identity verification requests cleared!</p>
                <p className="text-[11px] text-[#717784] dark:text-zinc-400 mt-0.5">No pending documents in queue.</p>
              </div>
            ) : (
              <div className="space-y-3 min-w-0">
                {pendingVerifications.slice(0, 4).map((rec) => (
                  <div 
                    key={rec.id}
                    className="p-3 sm:p-3.5 bg-[#f8fafc] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800/60 transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-400 font-bold flex items-center justify-center text-sm border border-blue-100 dark:border-sky-900/40 shrink-0">
                        {rec.userName.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-[#0a0a0a] dark:text-white truncate">{rec.userName}</h4>
                        <p className="text-[11px] text-[#717784] dark:text-zinc-400 truncate">{rec.userEmail || rec.userPhone || 'Registered User'}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 dark:bg-sky-950/40 border border-blue-200 dark:border-sky-900/40 text-[#0f2f63] dark:text-sky-300 rounded-md text-[9px] font-bold uppercase tracking-wider">
                          {rec.verificationType}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        onClick={() => verifyMutation.mutate({ id: rec.id, status: 'VERIFIED' })}
                        disabled={verifyMutation.isPending}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shadow-xs shrink-0"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => verifyMutation.mutate({ id: rec.id, status: 'REJECTED' })}
                        disabled={verifyMutation.isPending}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-white dark:bg-[#1C1C21] hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-[#e6e8ec] dark:border-zinc-700 hover:border-rose-200 dark:hover:border-rose-800/40 text-[#717784] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-full text-xs font-medium uppercase tracking-wider transition-all cursor-pointer shrink-0"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#e6e8ec] dark:border-zinc-800 text-[11px] text-[#717784] dark:text-zinc-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 min-w-0">
            <span className="truncate">Approved records instantly receive verified trust badges.</span>
            <Link to="/admin/verifications" className="text-[#0f2f63] dark:text-sky-400 font-medium hover:underline shrink-0 whitespace-nowrap">
              Inspect Queue &rarr;
            </Link>
          </div>
        </div>

        {/* Right Column: Platform Feeds & Fast Nav */}
        <div className="lg:col-span-5 space-y-6 min-w-0">
          {/* Recent Registrations */}
          <div className="bg-white dark:bg-[#09090b] border border-[#e6e8ec] dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs min-w-0 transition-colors">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#e6e8ec] dark:border-zinc-800 gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                <h3 className="text-sm font-semibold text-[#0a0a0a] dark:text-white truncate">Recent Registrations</h3>
              </div>
              {isSuperAdmin && (
                <Link to="/admin/users" className="text-xs font-medium text-[#2563c9] dark:text-sky-400 hover:underline shrink-0 whitespace-nowrap">
                  View All
                </Link>
              )}
            </div>

            <div className="space-y-2.5 min-w-0">
              {(stats?.recentUsers || []).slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between text-xs py-2 border-b border-[#e6e8ec] dark:border-zinc-800/80 last:border-0 gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[#0a0a0a] dark:text-zinc-100 block truncate">
                      {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                    </span>
                    <span className="text-[10px] text-[#717784] dark:text-zinc-400 font-normal block truncate">
                      {u.email}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${
                    u.role === 'EMPLOYER' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' : 'bg-blue-50 dark:bg-blue-950/40 text-[#0f2f63] dark:text-sky-400 border border-blue-200 dark:border-blue-900/40'
                  }`}>
                    {u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white dark:bg-[#09090b] border border-[#e6e8ec] dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs min-w-0 transition-colors">
            <h3 className="text-sm font-semibold text-[#0a0a0a] dark:text-white mb-3">Quick Navigation</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 min-w-0">
              <Link
                to="/admin/analytics"
                className="p-2.5 bg-[#f8fafc] dark:bg-[#121215] hover:bg-blue-50/60 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 hover:border-blue-200 dark:hover:border-zinc-700 rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 transition-all group min-w-0"
              >
                <BarChart3 className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 truncate w-full">Analytics</span>
              </Link>
              <Link
                to="/admin/blog"
                className="p-2.5 bg-[#f8fafc] dark:bg-[#121215] hover:bg-purple-50/60 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 hover:border-purple-200 dark:hover:border-zinc-700 rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 transition-all group min-w-0"
              >
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 truncate w-full">Articles</span>
              </Link>
              <Link
                to="/admin/leads"
                className="p-2.5 bg-[#f8fafc] dark:bg-[#121215] hover:bg-emerald-50/60 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 hover:border-emerald-200 dark:hover:border-zinc-700 rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 transition-all group min-w-0"
              >
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 truncate w-full">Companies</span>
              </Link>
              {isSuperAdmin && (
                <Link
                  to="/admin/users"
                  className="p-2.5 bg-[#f8fafc] dark:bg-[#121215] hover:bg-sky-50/60 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 hover:border-sky-200 dark:hover:border-zinc-700 rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 transition-all group min-w-0"
                >
                  <Users className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 truncate w-full">Directory</span>
                </Link>
              )}
              <Link
                to="/admin/jobs"
                className="p-2.5 bg-[#f8fafc] dark:bg-[#121215] hover:bg-amber-50/60 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 hover:border-amber-200 dark:hover:border-zinc-700 rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 transition-all group min-w-0"
              >
                <Briefcase className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 truncate w-full">Moderation</span>
              </Link>
              <Link
                to="/admin/verifications"
                className="p-2.5 bg-[#f8fafc] dark:bg-[#121215] hover:bg-rose-50/60 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 hover:border-rose-200 dark:hover:border-zinc-700 rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 transition-all group min-w-0"
              >
                <FileCheck2 className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                <span className="text-[11px] sm:text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 truncate w-full">Verification</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
