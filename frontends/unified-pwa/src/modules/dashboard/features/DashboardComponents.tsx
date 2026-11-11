import { Loader2, Briefcase, Users, Video, Award, Bell, TrendingUp, CheckCircle2, Star, ArrowUpRight, ChevronRight, ShieldCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { applicationService } from '../../../services/application.service';
import { workerService } from '../../../services/worker.service';
import { dashboardService } from '../../../services/dashboard.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { AppLoader } from '../../../components/common/AppLoader';

export const StatsGrid = () => {
    const { data: stats } = useQuery({ 
        queryKey: queryKeys.employer.stats, 
        queryFn: dashboardService.getEmployerStats 
    });
    
    const statsData = [
        { 
            label: 'Active Postings', 
            value: stats?.activeJobs || 0, 
            trend: 'Live Openings', 
            trendColor: 'text-emerald-700 bg-emerald-50',
            icon: <Briefcase className="w-5 h-5 text-[#0066FF]" />,
            bg: 'bg-blue-50'
        },
        { 
            label: 'Applicants', 
            value: stats?.totalApplicants || 0, 
            trend: 'Dispatch ready', 
            trendColor: 'text-slate-600 dark:text-zinc-400 bg-slate-100',
            icon: <Users className="w-5 h-5 text-indigo-600" />,
            bg: 'bg-indigo-50'
        },
        { 
            label: 'Under Review', 
            value: stats?.interviewingCount || 0, 
            trend: 'Quick review active', 
            trendColor: 'text-amber-700 bg-amber-50',
            icon: <Video className="w-5 h-5 text-amber-600" />,
            bg: 'bg-amber-50'
        },
        { 
            label: 'Hired & Active', 
            value: stats?.totalHired || 0, 
            trend: 'Verified Active', 
            trendColor: 'text-emerald-700 bg-emerald-50',
            icon: <Award className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-50'
        },
        { 
            label: 'Live Alerts', 
            value: stats?.unreadNotifications || 0, 
            trend: 'Real-time sync', 
            trendColor: 'text-blue-700 bg-blue-50',
            icon: <Bell className="w-5 h-5 text-sky-600" />,
            bg: 'bg-sky-50'
        },
    ];

    return (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
            {statsData.map((stat) => (
                <div key={stat.label} className="bg-white dark:bg-[#121215] p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-zinc-800/80 flex flex-col justify-between hover:shadow-md hover:border-blue-200 dark:hover:border-zinc-700 transition-all group">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{stat.label}</p>
                            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">{stat.value}</h3>
                        </div>
                        <div className={`p-2.5 rounded-xl ${stat.bg} transition-colors`}>
                            {stat.icon}
                        </div>
                    </div>
                    <div className={`mt-3 text-[10px] font-bold flex items-center gap-1 w-fit px-2 py-0.5 rounded-full ${stat.trendColor}`}>
                        <span>{stat.trend}</span>
                    </div>
                </div>
            ))}
        </section>
    );
};

export const ApplicationsTable = () => {
    const navigate = useNavigate();
    const { data: jobs = [] } = useQuery({ queryKey: queryKeys.jobs.employerJobs, queryFn: jobService.getEmployerJobs });
    const jobIds = jobs.map((j: any) => j.id).filter((id: any): id is string => !!id);
    
    const { data: applications, isLoading, isError, error } = useQuery({
        queryKey: queryKeys.jobs.allEmployerApplications(jobIds),
        queryFn: () => applicationService.getApplicationsForEmployerJobs(jobIds),
        enabled: jobIds.length > 0
    });

    const workerIds = applications?.map((application) => application.workerId) || [];
    const { data: workers = [] } = useQuery({
        queryKey: queryKeys.workers.byUserIds(workerIds),
        queryFn: () => workerService.getProfilesByUserIds(workerIds),
        enabled: workerIds.length > 0
    });

    const workersById = new Map(workers.map((worker) => [worker.userId, worker]));
    const jobsById = new Map(jobs.filter((job: any) => job.id).map((job: any) => [job.id!, job]));

    if (isLoading) return <AppLoader variant="page" message="Loading applicant records..." />;

    if (isError) return (
        <div className="text-center py-20 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
            <h4 className="text-lg font-bold text-slate-800 mb-1">Couldn't load applicants</h4>
            <p className="text-slate-400 text-xs max-w-xl mx-auto">
                {String((error as any)?.response?.data?.message || (error as any)?.message || 'Request failed')}
            </p>
        </div>
    );

    if (!applications?.length) return (
        <div className="text-center py-20 bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No Applications Received Yet</h4>
            <p className="text-xs text-slate-400">Post a job or use Direct Hire to hire verified workers.</p>
        </div>
    );

    return (
        <section className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Candidate Applications</h3>
                <button onClick={() => navigate('/jobs')} className="text-xs font-bold text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer">
                    View All Applicants <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs border border-slate-200 dark:border-zinc-800/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-[#121215] border-b border-slate-100">
                                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Candidate</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Position</th>
                                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tier</th>
                                {/* TrustScore - Temporarily hidden until TrustScore engine is fully implemented */}
                                {/* <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">TrustScore</th> */}
                                <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {applications.slice(0, 5).map((app) => {
                                const worker = workersById.get(app.workerId);
                                const trustScore = (worker as any)?.trustScore || 88;
                                const tier = (worker as any)?.tier || 'Verified Pro';

                                return (
                                    <tr key={app.id} className="hover:bg-blue-50/40 transition-colors cursor-pointer" onClick={() => navigate('/jobs')}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar 
                                                    src={worker?.profileImageUrl} 
                                                    name={worker?.fullName || 'Candidate'} 
                                                    size="md"
                                                    showStatus={true}
                                                    statusOnline={true}
                                                />
                                                <div>
                                                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">{worker?.fullName || 'Candidate'}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300">{jobsById.get(app.jobId)?.title || 'Trade Role'}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-50 text-[#0066FF] border border-blue-200">
                                                {tier}
                                            </span>
                                        </td>
                                        {/* TrustScore - Temporarily hidden until TrustScore engine is implemented */}
                                        {/*
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-7 h-7 rounded-full border border-emerald-400 bg-emerald-50 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-emerald-700">{trustScore}</span>
                                                </div>
                                                <span className="text-[9px] font-bold uppercase text-emerald-600">Verified</span>
                                            </div>
                                        </td>
                                        */}
                                        <td className="px-5 py-4 text-right">
                                            <button className="text-[#0066FF] font-bold text-xs flex items-center gap-1 ml-auto hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer">
                                                Review & Hire <ArrowUpRight className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};
