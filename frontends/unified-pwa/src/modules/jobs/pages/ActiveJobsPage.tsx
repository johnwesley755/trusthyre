import { useQuery } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { applicationService } from '../../../services/application.service';
import type { Job, JobApplication } from '../../../types';
import { 
    PlusCircle, 
    Plus, 
    Layers, 
    IndianRupee, 
    MapPin, 
    ArrowRight, 
    ChevronLeft, 
    ChevronRight,
    Briefcase,
    Loader2,
    Utensils,
    Shield,
    Sun,
    Package,
    Tag,
    CalendarClock,
    Zap
} from 'lucide-react';
import { JobBoostModal } from '../../../components/common/JobBoostModal';

import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { AppLoader } from '../../../components/common/AppLoader';

export function ActiveJobsPage() {
    const navigate = useNavigate();
    const [boostTargetJob, setBoostTargetJob] = useState<Job | null>(null);
    const [boostedJobIds, setBoostedJobIds] = useState<Record<string, boolean>>({});

    // Fetch Jobs
    const { data: jobs = [], isLoading: isLoadingJobs } = useQuery<Job[]>({ 
        queryKey: ['employerJobs'], 
        queryFn: jobService.getEmployerJobs 
    });

    // Fetch all applications for these jobs to calculate counts
    const jobIds = useMemo(() => jobs.map((j: Job) => j.id).filter((id): id is string => !!id), [jobs]);
    
    const { data: applications = [], isLoading: isLoadingApps } = useQuery<JobApplication[]>({
        queryKey: ['employerJobApplications', jobIds],
        queryFn: () => applicationService.getApplicationsByJobs(jobIds),
        enabled: jobIds.length > 0
    });

    // Calculate metadata for each job
    const jobMetadata = useMemo(() => {
        if (!jobs || !applications) return {};
        
        return jobs.reduce((acc: Record<string, { totalCount: number; newCount: number; workerIds: string[] }>, job: Job) => {
            const jobApps = applications.filter((app: JobApplication) => app.jobId === job.id);
            const newApps = jobApps.filter((app: JobApplication) => app.status === 'PENDING' || app.status === 'APPLIED').length;
            
            acc[job.id!] = {
                totalCount: jobApps.length,
                newCount: newApps,
                workerIds: jobApps.slice(0, 2).map((app: JobApplication) => app.workerId)
            };
            return acc;
        }, {});
    }, [jobs, applications]);

    const isLoading = isLoadingJobs || (jobIds.length > 0 && isLoadingApps);

    const getSectorIcon = (industry?: string) => {
        if (!industry) return <Tag className="w-4 h-4" />;
        const ind = industry.toLowerCase();
        if (ind.includes('culinary') || ind.includes('hospitality') || ind.includes('cook')) return <Utensils className="w-4 h-4" />;
        if (ind.includes('construct') || ind.includes('infra')) return <Layers className="w-4 h-4" />;
        if (ind.includes('safety') || ind.includes('security')) return <Shield className="w-4 h-4" />;
        if (ind.includes('solar') || ind.includes('renew')) return <Sun className="w-4 h-4" />;
        if (ind.includes('logistic') || ind.includes('ware')) return <Package className="w-4 h-4" />;
        return <Tag className="w-4 h-4" />;
    };

    const getExpiryBadge = (expiresAt?: string) => {
        if (!expiresAt) return null;
        const expiry = new Date(expiresAt);
        const now = new Date();
        const diffMs = expiry.getTime() - now.getTime();

        if (diffMs <= 0) {
            return (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffdad6] text-[#ba1a1a] text-[9px] font-black uppercase tracking-widest rounded-xl">
                    <CalendarClock className="w-3 h-3" /> Expired ({expiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
            );
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 24) {
            return (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-widest rounded-xl">
                    <CalendarClock className="w-3 h-3" /> Expires in {diffHours <= 1 ? 'under 1h' : `${diffHours}h`}
                </span>
            );
        }

        const color = diffDays <= 3 ? 'bg-orange-100 text-orange-700' : 'bg-[#d1fae5] text-[#4a6b5e]';
        return (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl ${color}`}>
                <CalendarClock className="w-3 h-3" /> {diffDays}d left
            </span>
        );
    };



    if (isLoading) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
            <AppLoader variant="page" message="Loading active openings..." />
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0A1931] font-body selection:bg-[#FACD15] selection:text-[#0A1931]">
            {/* Main Content Canvas */}
            <main className="max-w-7xl mx-auto py-10 px-8">
                {/* Page Header Section */}
                <section className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-[#0066FF] mb-3">
                            <Briefcase className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase tracking-widest">Hiring & Applications Hub</span>
                        </div>
                        <h1 className="text-4xl font-black text-[#0A1931] tracking-tight">Active Openings & Applications</h1>
                        <p className="text-slate-500 font-medium mt-3 text-lg leading-relaxed">
                            Select an active role below to view applicant resumes, verify credentials, and hire candidates.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-sm w-full sm:w-auto justify-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-sm font-bold text-slate-700">{applications?.length || 0} Total Received</span>
                        </div>
                        <button 
                            onClick={() => navigate('/post-job')}
                            className="bg-[#0066FF] hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                        >
                            <PlusCircle className="w-5 h-5" />
                            Post a Job
                        </button>
                    </div>
                </section>

                {jobs.length === 0 ? (
                    <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto mt-8">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Package className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-2xl font-black text-[#0A1931] mb-3 tracking-tight">No Active Jobs</h3>
                        <p className="text-slate-500 font-medium mb-8">You currently don't have any active job postings. Once you post a new job, it will appear here for you to manage applications and track performance.</p>
                        <button 
                            onClick={() => navigate('/post-job')}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-[#0066FF] hover:bg-blue-700 text-white font-bold rounded-full shadow-md hover:shadow-lg transition-all"
                        >
                            <PlusCircle className="w-5 h-5" /> Post Your First Job
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence>
                            {jobs.map((job: Job, idx: number) => {
                                const meta = jobMetadata[job.id!] || { totalCount: 0, newCount: 0, workerIds: [] };
                                const isUrgent = job.description.toLowerCase().includes('urgent') || idx === 1;

                                return (
                                    <motion.div 
                                        key={job.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="bg-white p-6 rounded-2xl group hover:shadow-lg hover:border-[#FACD15] transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between border border-slate-200 relative overflow-hidden"
                                    >
                                        {/* Left Side: Job Info */}
                                        <div className="flex-1 min-w-0 pr-8">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-black text-[#0A1931] uppercase tracking-tight truncate group-hover:text-[#0066FF] transition-colors">
                                                    {job.title}
                                                </h3>
                                                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full tracking-widest uppercase shrink-0 ${
                                                    isUrgent ? 'bg-[#ffdad6] text-[#ba1a1a]' : 'bg-[#d1fae5] text-[#4a6b5e]'
                                                }`}>
                                                    {isUrgent ? 'URGENT' : 'ACTIVE'}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[#0A1931]/60 text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    {getSectorIcon(job.industry)}
                                                    <span className="truncate max-w-[120px]">{job.industry}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <IndianRupee className="w-4 h-4 text-slate-400" />
                                                    <span className="font-bold text-[#0A1931]">₹{job.budget?.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                    <span className="truncate max-w-[150px]">{job.location}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getExpiryBadge(job.expiresAt)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Stats & Action */}
                                        <div className="flex items-center gap-4 sm:gap-6 mt-6 md:mt-0 shrink-0 md:border-l md:border-slate-100 md:pl-6">
                                            {/* ⚡ 1-Tap Job Boost Button (WorkIndia / Apna Recruiter Model) */}
                                            <button
                                                type="button"
                                                onClick={() => setBoostTargetJob(job)}
                                                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95 shrink-0 ${
                                                    boostedJobIds[job.id!]
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                                        : 'bg-amber-400 hover:bg-amber-500 text-slate-950'
                                                }`}
                                                title="Amplify job visibility & broadcast notifications"
                                            >
                                                <Zap className={`w-3.5 h-3.5 ${boostedJobIds[job.id!] ? 'text-emerald-700' : 'fill-slate-950 text-slate-950'}`} />
                                                <span>{boostedJobIds[job.id!] ? 'Boosted • Rank #1' : 'Boost Job'}</span>
                                            </button>

                                            <div className="text-center md:text-right">
                                                <span className="block text-[10px] uppercase font-black tracking-widest text-[#0A1931]/40 mb-1">
                                                    Applications
                                                </span>
                                                <div className="flex items-center gap-3 justify-center md:justify-end">
                                                    <div className="flex -space-x-2">
                                                        {meta.workerIds.length > 0 ? (
                                                            meta.workerIds.map((wid: string) => (
                                                                <div key={wid} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 overflow-hidden shrink-0">
                                                                    <img 
                                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${wid}`} 
                                                                        alt="worker" 
                                                                        className="w-full h-full object-cover" 
                                                                    />
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                                0
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-lg font-black text-[#0A1931]">
                                                        {meta.totalCount} <span className="text-sm font-bold text-slate-400">Total</span>
                                                    </span>
                                                    {meta.newCount > 0 && (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full">
                                                            {meta.newCount} New
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button 
                                                onClick={() => navigate(`/applications?jobId=${job.id}`)}
                                                className="hidden md:flex items-center justify-center w-12 h-12 bg-slate-50 text-[#0A1931] hover:bg-[#0066FF] hover:text-white rounded-xl transition-colors group/btn"
                                            >
                                                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}

                {/* List End Indicator */}
                {jobs.length > 0 && (
                    <div className="mt-12 text-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">End of active jobs</p>
                    </div>
                )}
            </main>

            {/* Background Decorative Organic Blobs */}
            <div className="fixed top-1/4 -right-40 w-[600px] h-[600px] bg-[#FACD15] opacity-[0.03] rounded-full blur-[120px] -z-10 pointer-events-none organic-blob"></div>
            <div className="fixed -bottom-40 -left-20 w-[800px] h-[800px] bg-[#0A1931] opacity-[0.02] rounded-full blur-[150px] -z-10 pointer-events-none organic-blob-alt"></div>

            {/* ⚡ 1-Tap Job Boost & Broadcast Modal */}
            {boostTargetJob && (
                <JobBoostModal
                    isOpen={Boolean(boostTargetJob)}
                    onClose={() => setBoostTargetJob(null)}
                    job={{
                        id: boostTargetJob.id!,
                        title: boostTargetJob.title,
                        location: boostTargetJob.location,
                        city: boostTargetJob.city,
                        industry: boostTargetJob.industry,
                        budget: boostTargetJob.budget
                    }}
                    onBoostSuccess={(jobId) => {
                        setBoostedJobIds((prev) => ({ ...prev, [jobId]: true }));
                    }}
                />
            )}
        </div>
    );
}
