import React from 'react';
import { useUser } from "../../../providers/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../../../services/dashboard.service";
import { 
  Briefcase, 
  Users, 
  UserCheck, 
  Clock, 
  ShieldCheck, 
  PlusCircle, 
  ArrowRight, 
  Sparkles,
  Bookmark,
  History,
  ChevronRight,
  Send,
  Building2,
  BookOpen
} from "lucide-react";
import { AppLoader } from '../../../components/common/AppLoader';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useUser();

  // Single unified API endpoint call for all dashboard metrics
  const { data: summary, isLoading } = useQuery({ 
    queryKey: ['dashboardSummary'], 
    queryFn: dashboardService.getDashboardSummary,
    staleTime: 1000 * 60 * 2,
  });

  if (isLoading) {
    return <AppLoader variant="page" message="Loading Dashboard Metrics..." />;
  }

  const isEmployer = user?.role === 'EMPLOYER' || summary?.role === 'EMPLOYER';
  const displayName = user?.firstName || summary?.companyName || 'Partner';

  const activeJobs = summary?.activeJobs ?? 0;
  const totalApplicants = summary?.totalApplicants ?? 0;
  const interviewingCount = summary?.interviewingCount ?? 0;
  const totalHired = summary?.totalHired ?? 0;
  const availableCandidates = summary?.availableWorkersCount ?? summary?.radarNearbyWorkersCount ?? 0;

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. Hallmark Hero Header Banner */}
        <div className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-6 sm:p-8 shadow-xs relative overflow-hidden">
          
          
          <div className="relative z-10 space-y-4">
            

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f2f63]/10 text-[#0f2f63] text-xs font-semibold">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Employer Workspace</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0a0a0a] tracking-tight text-balance">
                  Welcome back, {displayName}
                </h1>
                <p className="text-[#717784] text-sm leading-relaxed">
                  Real-time talent operations, candidate application pipeline, and verified hiring overview.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/post-job"
                  className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs sm:text-sm font-medium uppercase px-5 py-3 transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Post New Job</span>
                </Link>
                <Link
                  to="/find-workers"
                  className="rounded-full bg-white hover:bg-slate-100 text-[#0a0a0a] border border-[#e6e8ec] text-xs sm:text-sm font-medium uppercase px-5 py-3 transition-all flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#717784]" />
                  <span>Search Talent</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Primary 4 KPI Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Active Openings */}
          <div 
            onClick={() => navigate('/jobs')}
            className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-5 sm:p-6 shadow-xs hover:border-[#0f2f63]/40 transition-all cursor-pointer group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e6e8ec] text-[#0f2f63] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#0f2f63] text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
                Live Now
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                {activeJobs}
              </div>
              <p className="text-xs font-bold uppercase text-[#717784] mt-1">
                Active Job Openings
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[#0f2f63] group-hover:underline pt-1">
              <span>Manage listings</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Total Applicants Received */}
          <div 
            onClick={() => navigate('/jobs')}
            className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-5 sm:p-6 shadow-xs hover:border-[#0f2f63]/40 transition-all cursor-pointer group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e6e8ec] text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                Total Pool
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                {totalApplicants}
              </div>
              <p className="text-xs font-bold uppercase text-[#717784] mt-1">
                Applicants Received
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:underline pt-1">
              <span>View candidate queue</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Under Review & Direct Offers */}
          <div 
            onClick={() => navigate('/jobs')}
            className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-5 sm:p-6 shadow-xs hover:border-amber-400/60 transition-all cursor-pointer group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e6e8ec] text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold">
                Action Needed
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                {interviewingCount}
              </div>
              <p className="text-xs font-bold uppercase text-[#717784] mt-1">
                Under Review & Offers
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 group-hover:underline pt-1">
              <span>Review pending</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* Confirmed & Dispatched Team */}
          <div 
            onClick={() => navigate('/jobs')}
            className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-5 sm:p-6 shadow-xs hover:border-emerald-400/60 transition-all cursor-pointer group space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#e6e8ec] text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
                Active Shifts
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                {totalHired}
              </div>
              <p className="text-xs font-bold uppercase text-[#717784] mt-1">
                Hired & Dispatched
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 group-hover:underline pt-1">
              <span>View active team</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

        </div>

        {/* 3. Operational Grid (2 Columns: Candidate Discovery + Trust & Quick Actions) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Columns: Talent Discovery */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Verified Candidate Discovery Card */}
            <div className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-6 sm:p-8 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-[#e6e8ec] text-[#0f2f63] flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#0a0a0a]">
                      Verified Talent Directory
                    </h3>
                    <p className="text-xs text-[#717784]">
                      Pre-screened trade technicians and skilled candidates ready for immediate hire
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold self-start sm:self-auto border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Verified Database
                </span>
              </div>

              <div className="p-4 sm:p-5 rounded-[1.5rem] bg-white border border-[#e6e8ec] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[#0a0a0a] tabular-nums tracking-tight">
                    {availableCandidates > 0 ? `${availableCandidates} Verified Candidates Available` : 'Search Verified Candidates'}
                  </div>
                  <p className="text-xs text-[#717784] mt-1">
                    Pre-screened electricians, welders, plumbers, drivers, carpenters, and technical trades.
                  </p>
                </div>
                <Link
                  to="/find-workers"
                  className="rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-medium uppercase px-4 py-2.5 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer shrink-0"
                >
                  <span>Explore Candidates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Fast Category Filter Chips */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#717784]">
                  Instant Search Shortcuts:
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Electrician', 'Plumber', 'Welder', 'Driver', 'Carpenter', 'Mechanic'].map((trade) => (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => navigate(`/find-workers?trade=${encodeURIComponent(trade)}`)}
                      className="px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-[#e6e8ec] text-[#0a0a0a] text-xs font-medium transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      {trade}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Right 1 Column: Quick Actions & Trust Hyre Guarantee */}
          <div className="space-y-6">
            
            {/* Direct Shortcuts Card */}
            <div className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-6 sm:p-7 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold uppercase text-[#0a0a0a]">
                Quick Operations
              </h3>

              <div className="space-y-2">
                <Link
                  to="/post-job"
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-100 rounded-[1.25rem] border border-[#e6e8ec] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0f2f63]/10 text-[#0f2f63] flex items-center justify-center">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-[#0a0a0a]">Post New Job</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#717784] group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/jobs"
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-100 rounded-[1.25rem] border border-[#e6e8ec] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-[#0a0a0a]">Active Openings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#717784] group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/saved-profiles"
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-100 rounded-[1.25rem] border border-[#e6e8ec] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Bookmark className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-[#0a0a0a]">Shortlisted Talent</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#717784] group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/tracker"
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-100 rounded-[1.25rem] border border-[#e6e8ec] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <History className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-[#0a0a0a]">Activity History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#717784] group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <Link
                  to="/blog"
                  className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-100 rounded-[1.25rem] border border-[#e6e8ec] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0f2f63] flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#0a0a0a] block">Hiring Articles & Blog</span>
                      <span className="text-[10px] text-[#717784] block">Salary benchmarks & hiring guides</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#717784] group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* TrustHyre Protection Card */}
            <div className="rounded-[2rem] border border-[#e6e8ec] bg-[#f4f4f4] p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-[#0a0a0a]">
                  TrustHyre Protection
                </h3>
              </div>
              <ul className="text-xs text-[#0a0a0a] space-y-3 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span className="text-[#717784]">
                    <strong className="text-[#0a0a0a]">Skill & Profile Check:</strong> Profile authentication & physical skill verification before candidate dispatch.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span className="text-[#717784]">
                    <strong className="text-[#0a0a0a]">Verified Work History:</strong> Permanent digital logs of completed shifts, attendance, and ratings.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span className="text-[#717784]">
                    <strong className="text-[#0a0a0a]">Reliable Replacement Support:</strong> Immediate candidate replacement assistance if a specialist cancels.
                  </span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
