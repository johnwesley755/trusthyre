import { useQuery } from '@tanstack/react-query';
import { profileService } from '../../../services/profile.service';
import { applicationService } from '../../../services/application.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useNavigate, Link } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useUser } from '../../../providers/AuthContext';
import { 
  Briefcase, 
  ChevronRight, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Award, 
  AlertCircle, 
  FileText,
  Filter,
  Activity,
  ArrowRight,
  Star
} from 'lucide-react';
import apiClient from '../../../api/apiClient';
import { RatingModal } from '../../../components/common/RatingModal';

export default function TrackerPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [filterType, setFilterType] = useState<'all' | 'applications' | 'shifts' | 'milestones'>('all');
  const [ratingTarget, setRatingTarget] = useState<{
    jobId: string;
    rateeId: string;
    rateeName: string;
    jobTitle: string;
  } | null>(null);

  const { data: profile } = useQuery({
    queryKey: queryKeys.workers.detail('me'),
    queryFn: profileService.getProfile,
  });

  const { data: myApplications = [], isLoading: isAppsLoading } = useQuery({
    queryKey: queryKeys.jobs.myApplications,
    queryFn: applicationService.getMyApplications,
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: queryKeys.activities.recent(20),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/activities/recent?limit=20');
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    }
  });

  // Calculate quick metrics
  const completedApps = myApplications.filter((a: any) => a.status === 'COMPLETED' || a.status === 'ACCEPTED' || a.status === 'APPROVED');
  const pendingApps = myApplications.filter((a: any) => a.status === 'PENDING' || a.status === 'APPLIED' || a.status === 'REVIEWING');
  const offersReceived = myApplications.filter((a: any) => a.status === 'OFFER_SENT');

  // Combined and filtered activity items
  const filteredItems = useMemo(() => {
    const list: any[] = [];

    // Map applications to timeline items
    myApplications.forEach((app: any) => {
      list.push({
        id: `app-${app.id}`,
        type: 'application',
        title: app.job?.title || 'Job Application',
        company: app.job?.employerProfile?.companyName || app.job?.employerName || 'Verified Employer',
        location: app.job?.location || app.job?.city || 'Local Zone',
        date: app.appliedAt || app.createdAt,
        status: app.status,
        wage: app.job?.budget ? `₹${Number(app.job.budget).toLocaleString('en-IN')}` : undefined,
        jobId: app.jobId,
        employerId: app.job?.employerId || app.job?.employerProfile?.userId || app.job?.employer_id
      });
    });

    // Map system activities to timeline items
    activities.forEach((act: any, idx: number) => {
      list.push({
        id: `act-${act.id || idx}`,
        type: act.type?.toLowerCase().includes('milestone') ? 'milestone' : 'activity',
        title: act.description || act.title || 'System Milestone',
        company: 'TrustHyre System',
        location: 'Verified System',
        date: act.createdAt || new Date().toISOString(),
        status: act.type || 'EVENT',
        wage: act.amount ? `₹${Number(act.amount).toLocaleString('en-IN')}` : undefined
      });
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (filterType === 'applications') {
      return list.filter(item => item.type === 'application');
    }
    if (filterType === 'shifts') {
      return list.filter(item => item.status === 'ACCEPTED' || item.status === 'COMPLETED' || item.status === 'APPROVED');
    }
    if (filterType === 'milestones') {
      return list.filter(item => item.type === 'milestone' || item.type === 'activity');
    }
    return list;
  }, [myApplications, activities, filterType]);

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. Header Card - Pure Activity History Focus */}
        <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] dark:bg-sky-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63] dark:text-sky-400">
                  Candidate Audit Trail
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] dark:text-zinc-100">
                Activity & Application History
              </h1>
              <p className="text-xs text-[#717784] dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                Comprehensive log of your verified job applications, shift confirmations, and milestone updates.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95"
              >
                <span>Find New Jobs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Quick Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-[#f4f4f4] dark:bg-[#09090b] p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-1">
            <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Total Submitted</p>
            <p className="text-xl font-bold text-[#0a0a0a] dark:text-zinc-100 tabular-nums tracking-tight">{myApplications.length}</p>
            <p className="text-[10px] text-[#717784] dark:text-zinc-500">applications</p>
          </div>
          <div className="bg-[#f4f4f4] dark:bg-[#09090b] p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-1">
            <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Under Review</p>
            <p className="text-xl font-bold text-[#0f2f63] dark:text-sky-400 tabular-nums tracking-tight">{pendingApps.length}</p>
            <p className="text-[10px] text-[#717784] dark:text-zinc-500">active pipeline</p>
          </div>
          <div className="bg-[#f4f4f4] dark:bg-[#09090b] p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-1">
            <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Offers Received</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums tracking-tight">{offersReceived.length}</p>
            <p className="text-[10px] text-[#717784] dark:text-zinc-500">action required</p>
          </div>
          <div className="bg-[#f4f4f4] dark:bg-[#09090b] p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-1">
            <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Confirmed / Hired</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tight">{completedApps.length}</p>
            <p className="text-[10px] text-[#717784] dark:text-zinc-500">successful shifts</p>
          </div>
        </div>

        {/* 3. Filter Pill Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#fbfbfb] dark:bg-[#09090b] p-3 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-zinc-100 border border-[#e6e8ec] dark:border-zinc-800'
              }`}
            >
              All Activity <span className="tabular-nums">({filteredItems.length})</span>
            </button>
            <button
              onClick={() => setFilterType('applications')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'applications'
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-zinc-100 border border-[#e6e8ec] dark:border-zinc-800'
              }`}
            >
              Applications <span className="tabular-nums">({myApplications.length})</span>
            </button>
            <button
              onClick={() => setFilterType('shifts')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'shifts'
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-zinc-100 border border-[#e6e8ec] dark:border-zinc-800'
              }`}
            >
              Confirmed Shifts <span className="tabular-nums">({completedApps.length})</span>
            </button>
            <button
              onClick={() => setFilterType('milestones')}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === 'milestones'
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-white dark:bg-[#121215] text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-zinc-100 border border-[#e6e8ec] dark:border-zinc-800'
              }`}
            >
              Milestones
            </button>
          </div>

          <Link
            to="/applied-jobs"
            className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:underline flex items-center gap-1 px-2"
          >
            <span>Manage Applications Pipeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4. Activity Timeline List */}
        <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
            <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
              Chronological Audit Log
            </h3>
            <span className="text-[11px] text-[#717784] dark:text-zinc-400">
              Showing {filteredItems.length} records
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-white dark:bg-[#121215] rounded-2xl p-10 border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-3">
              <div className="w-12 h-12 bg-[#f4f4f4] dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-[#717784] dark:text-zinc-400">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100">No Activity Logged Yet</h4>
              <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
                Once you apply to jobs or complete shift milestones, your tamper-proof verification history will appear here.
              </p>
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0f2f63] text-white rounded-full text-xs font-semibold uppercase active:scale-95 transition-all"
              >
                Browse Job Openings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isOffer = item.status === 'OFFER_SENT';
                const isAccepted = item.status === 'ACCEPTED' || item.status === 'APPROVED' || item.status === 'COMPLETED';
                const isRejected = item.status === 'REJECTED' || item.status === 'DECLINED';
                
                return (
                  <div
                    key={item.id}
                    onClick={() => item.jobId && navigate(`/job/${item.jobId}`)}
                    className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-[#e6e8ec] dark:border-zinc-800 hover:border-[#0f2f63]/40 dark:hover:border-zinc-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isAccepted 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' 
                          : isOffer 
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' 
                          : isRejected 
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' 
                          : 'bg-[#e6eefc] dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-400 border-blue-200 dark:border-sky-900/50'
                      }`}>
                        {item.type === 'milestone' ? (
                          <Award className="w-5 h-5" />
                        ) : isAccepted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : isOffer ? (
                          <AlertCircle className="w-5 h-5" />
                        ) : (
                          <Briefcase className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 group-hover:text-[#0f2f63] dark:group-hover:text-sky-400 transition-colors truncate">
                            {item.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isAccepted 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50' 
                              : isOffer 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 animate-pulse' 
                              : isRejected 
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50' 
                              : 'bg-blue-50 dark:bg-sky-950/40 text-blue-800 dark:text-sky-300 border border-blue-200 dark:border-sky-900/50'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#717784] dark:text-zinc-400">
                          <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{item.company}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                            <span>{item.location}</span>
                          </span>
                          {item.wage && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">{item.wage}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e6e8ec] dark:border-zinc-800">
                      <div className="text-left sm:text-right text-[11px] text-[#717784] dark:text-zinc-400">
                        <p className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#717784] dark:text-zinc-500" />
                          <span>{item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}</span>
                        </p>
                      </div>

                      {isAccepted && item.employerId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRatingTarget({
                              jobId: item.jobId,
                              rateeId: item.employerId,
                              rateeName: item.company,
                              jobTitle: item.title
                            });
                          }}
                          className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-full text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>Rate Employer</span>
                        </button>
                      )}

                      {item.jobId && (
                        <span className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {ratingTarget && (
        <RatingModal
          isOpen={Boolean(ratingTarget)}
          onClose={() => setRatingTarget(null)}
          jobId={ratingTarget.jobId}
          rateeId={ratingTarget.rateeId}
          rateeName={ratingTarget.rateeName}
          rateeRole="employer"
          jobTitle={ratingTarget.jobTitle}
        />
      )}
    </div>
  );
}
