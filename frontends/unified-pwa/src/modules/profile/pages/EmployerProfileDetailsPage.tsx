import { useState, useRef, useMemo, useEffect } from "react";
import { useAuth, useUser } from "../../../providers/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { profileService, type EmployerProfile } from "../../../services/profile.service";
import { dashboardService } from "../../../services/dashboard.service";
import { jobService, type Job } from "../../../services/job.service";
import { applicationService } from "../../../services/application.service";
import type { JobApplication } from "../../../types";
import { queryKeys } from "../../../lib/queryKeys";
import { 
  Building2, 
  MapPin, 
  Briefcase, 
  Edit2, 
  ShieldCheck, 
  Users, 
  Clock, 
  ArrowRight, 
  Activity, 
  Calendar, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  Globe, 
  Phone, 
  Mail, 
  Sparkles, 
  Check, 
  ChevronRight, 
  FileText, 
  DollarSign, 
  Layers,
  Award,
  ExternalLink,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { EditEmployerProfileModal } from "../components/EditEmployerProfileModal";
import { PhoneDisplay } from "../../../components/common/PhoneDisplay";
import { ratingService } from "../../../services/rating.service";
import { ReviewsList } from "../../../components/common/ReviewsList";
import { Star } from "lucide-react";

export default function EmployerProfileDetailsPage() {
  const { user } = useUser();
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'openings' | 'overview' | 'reviews' | 'compliance'>('openings');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const { data: profile } = useQuery<EmployerProfile | null>({
    queryKey: queryKeys.employer.profile,
    queryFn: profileService.getEmployerProfile,
  });

  const { data: stats } = useQuery({
    queryKey: queryKeys.employer.stats,
    queryFn: dashboardService.getEmployerStats,
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: queryKeys.jobs.employerJobs,
    queryFn: jobService.getMyJobs,
  });

  const jobIds = useMemo(() => jobs.map((j: any) => j.id).filter((id): id is string => !!id), [jobs]);

  const { data: allApplications = [] } = useQuery<JobApplication[]>({
    queryKey: queryKeys.jobs.allEmployerApplications(jobIds),
    queryFn: () => applicationService.getApplicationsForEmployerJobs(jobIds),
    enabled: jobIds.length > 0,
  });

  const employerUserId = profile?.userId || user?.id || '';
  const { data: employerReviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['ratings', 'user', employerUserId],
    queryFn: () => ratingService.getRatingsForRatee(employerUserId),
    enabled: Boolean(employerUserId)
  });

  const getJobApplicationCount = (job: Job) => {
    const fromApps = allApplications.filter(a => a.jobId === job.id).length;
    if (fromApps > 0) return fromApps;
    return job.applicationCount || (job as any).applicantCount || 0;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoFeedback({ type: 'error', message: "Please select a valid image file (PNG, JPG, JPEG, WEBP)." });
      setTimeout(() => setLogoFeedback(null), 4000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLogoFeedback({ type: 'error', message: "Image file is too large (maximum 10MB)." });
      setTimeout(() => setLogoFeedback(null), 4000);
      return;
    }

    setIsUploadingLogo(true);
    setLogoFeedback(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        let compressedDataUrl = event.target?.result as string;
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        }

        try {
          await profileService.updateEmployerProfile({
            profileImageUrl: compressedDataUrl,
            profile_image_url: compressedDataUrl
          } as any);

          updateUser({
            ...user,
            profileImageUrl: compressedDataUrl,
            profile_image_url: compressedDataUrl
          });

          queryClient.setQueryData(queryKeys.employer.profile, (old: any) => ({
            ...(old || {}),
            profileImageUrl: compressedDataUrl,
            profile_image_url: compressedDataUrl
          }));

          setLogoFeedback({ type: 'success', message: "Company logo updated successfully!" });
          setTimeout(() => setLogoFeedback(null), 4000);
        } catch (err) {
          console.error("Failed to update company logo:", err);
          setLogoFeedback({ type: 'error', message: "Failed to update company logo. Please try again." });
          setTimeout(() => setLogoFeedback(null), 4000);
        } finally {
          setIsUploadingLogo(false);
        }
      };
      img.onerror = () => {
        setLogoFeedback({ type: 'error', message: "Failed to process image file." });
        setIsUploadingLogo(false);
        setTimeout(() => setLogoFeedback(null), 4000);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setLogoFeedback({ type: 'error', message: "Failed to read file." });
      setIsUploadingLogo(false);
      setTimeout(() => setLogoFeedback(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const isVerified = Boolean(profile?.isVerified || user?.identityVerified || (user as any)?.isVerified);
  const companyLogoUrl = profile?.profileImageUrl 
    || (profile as any)?.profile_image_url 
    || profile?.profilePhoto 
    || user?.profileImageUrl 
    || (user as any)?.profile_image_url 
    || (user as any)?.photoURL;

  useEffect(() => {
    setLogoLoadError(false);
  }, [companyLogoUrl]);

  const companyNameDisplay = profile?.companyName || user?.companyName || 'Corporate Partner';
  const industryDisplay = profile?.industry || 'Enterprise Hiring';
  const locationDisplay = profile?.city || profile?.location || profile?.address || 'Pan India';
  const websiteDisplay = profile?.companyWebsite || 'Not provided';
  const phoneDisplay = profile?.phoneNumber || (user as any)?.phone_number || user?.phoneNumber || 'Not provided';
  const emailDisplay = profile?.email || user?.email || 'Not provided';
  const contactPersonDisplay = profile?.contactPerson || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Authorized Hiring Manager';

  const activeJobsCount = stats?.activeJobs ?? jobs.filter(j => j.status === 'OPEN' || j.status === 'ACTIVE').length;
  const totalHiredCount = stats?.totalHired ?? allApplications.filter(a => a.status === 'ACCEPTED' || a.status === 'APPROVED').length;
  const totalApplicantsCount = allApplications.length > 0
    ? allApplications.length
    : (stats?.totalApplicants ?? jobs.reduce((sum, j) => sum + getJobApplicationCount(j), 0));

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-[#F8FAFC] dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0A1931] dark:text-zinc-100">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. HERO PROFILE CARD (Landing Page Aesthetic) */}
        <div className="bg-white dark:bg-[#09090B] rounded-[2rem] p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Identity & Logo Cluster */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              
              {/* Logo Input & Container */}
              <div className="relative shrink-0">
                <input 
                  type="file" 
                  ref={logoInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div 
                  onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                  title="Click to update company logo"
                  className="relative group cursor-pointer"
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-[#121215] rounded-3xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-center overflow-hidden shadow-2xs">
                    {companyLogoUrl && !logoLoadError ? (
                      <img 
                        src={companyLogoUrl} 
                        alt=""
                        aria-label={companyNameDisplay}
                        referrerPolicy="no-referrer"
                        onError={() => setLogoLoadError(true)}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Building2 className="w-10 h-10 text-[#0f2f63]/40 dark:text-zinc-600" />
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] group-hover:scale-110 rounded-full border-2 border-white dark:border-[#09090B] flex items-center justify-center shadow-md transition-all">
                    {isUploadingLogo ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Name, Industry, Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1931] dark:text-zinc-100">
                    {companyNameDisplay}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    isVerified ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isVerified ? 'Corporate Verified' : 'Pending Verification'}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span className="px-3 py-1 bg-[#0f2f63]/5 dark:bg-[#0066FF]/10 text-[#0f2f63] dark:text-[#38BDF8] border border-[#0f2f63]/10 dark:border-[#0066FF]/20 rounded-full font-semibold">
                    {industryDisplay}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                    <span>{locationDisplay}</span>
                  </span>
                  <span>•</span>
                  <span>Tier: {profile?.businessTier || 'Verified Employer'}</span>
                </div>

                {logoFeedback && (
                  <div className={`text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1.5 animate-in fade-in ${
                    logoFeedback.type === 'success' 
                      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800' 
                      : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800'
                  }`}>
                    {logoFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{logoFeedback.message}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Action Buttons Cluster */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full lg:w-auto">
              <Link 
                to="/post-job"
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white rounded-full font-medium text-xs shadow-xs transition-all cursor-pointer active:scale-95 uppercase whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">Post a Job</span>
              </Link>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="col-span-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-[#0A1931] dark:text-zinc-200 rounded-full font-medium text-xs shadow-2xs transition-all cursor-pointer uppercase active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span>Edit Profile</span>
              </button>
            </div>

          </div>
        </div>


        {/* 2. QUICK METRICS BANNER (4-Card Horizontal Grid - Full Width) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100/80 dark:border-blue-900/40 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-[#0f2f63] dark:text-[#38BDF8]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Active Jobs</p>
              <p className="text-xl sm:text-2xl font-bold text-[#0A1931] dark:text-zinc-100 mt-0.5">{activeJobsCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate">listings deployed</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Total Hires</p>
              <p className="text-xl sm:text-2xl font-bold text-[#0A1931] dark:text-zinc-100 mt-0.5">{totalHiredCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate">verified workers</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Applicants</p>
              <p className="text-xl sm:text-2xl font-bold text-[#0A1931] dark:text-zinc-100 mt-0.5">{totalApplicantsCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate">screened profiles</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/80 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Verification Standing</p>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">Verified</p>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium truncate">corporate account</p>
            </div>
          </div>
        </div>

        {/* 3. TAB SWITCHER */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-800 pb-3">
          <div className="bg-slate-100/90 dark:bg-[#121215] p-1 rounded-full border border-slate-200/60 dark:border-zinc-800 inline-flex items-center gap-1">
            <button
              onClick={() => setActiveTab('openings')}
              className={`py-2 px-5 sm:px-6 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'openings'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-zinc-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Job Openings ({jobs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-5 sm:px-6 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-zinc-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Company Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-2 px-5 sm:px-6 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'reviews'
                  ? 'bg-white dark:bg-[#1C1C21] text-[#0A1931] dark:text-zinc-100 shadow-xs'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-zinc-200'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Verified Reviews ({employerReviews.length})</span>
            </button>
          </div>
        </div>

            {/* TAB CONTENT 1: Active Job Openings */}
            {activeTab === 'openings' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#0A1931] dark:text-zinc-100">Published Jobs & Shifts</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                        Manage active roles, monitor candidate applications, and schedule interviews.
                      </p>
                    </div>
                    <Link
                      to="/post-job"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white rounded-full font-medium text-xs shadow-xs transition-all uppercase cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Role</span>
                    </Link>
                  </div>

                  {jobs.length === 0 ? (
                    <div className="bg-slate-50/80 dark:bg-[#09090B] rounded-2xl p-8 border border-slate-100 dark:border-zinc-800 text-center space-y-4">
                      <div className="w-14 h-14 bg-white dark:bg-[#1C1C21] rounded-full flex items-center justify-center mx-auto text-[#0f2f63] dark:text-[#38BDF8] shadow-xs border border-slate-200/60 dark:border-zinc-700">
                        <Briefcase className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-[#0A1931] dark:text-zinc-100">No Jobs Posted Yet</h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                          Post your first role in under 2 minutes. Gain access to thousands of pre-screened, biometric-verified candidates.
                        </p>
                      </div>
                      <Link
                        to="/post-job"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white rounded-full font-semibold text-xs shadow-xs uppercase transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Post Your First Job</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map((job) => (
                        <div 
                          key={job.id}
                          className="bg-slate-50/60 dark:bg-[#18181B]/80 rounded-2xl p-5 border border-slate-200/70 dark:border-zinc-800 hover:border-[#0f2f63]/40 dark:hover:border-zinc-700 hover:bg-white dark:hover:bg-[#1F1F23] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                        >
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h4 className="text-base font-bold text-[#0A1931] dark:text-zinc-100 group-hover:text-[#0f2f63] dark:group-hover:text-[#38BDF8] transition-colors">
                                {job.title}
                              </h4>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                job.status === 'OPEN' || job.status === 'ACTIVE'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                              }`}>
                                {job.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                                <span>{job.location || job.city || 'Pan India'}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                                <span>{getJobApplicationCount(job)} Applicants</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                                <span>{job.createdAt && !isNaN(new Date(job.createdAt).getTime()) ? format(new Date(job.createdAt), 'MMM d, yyyy') : 'Recent'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-zinc-800">
                            <Link
                              to={`/jobs?jobId=${job.id}`}
                              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white rounded-full text-xs font-semibold transition-all uppercase shadow-2xs"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>Manage ({getJobApplicationCount(job)})</span>
                            </Link>
                            <Link
                              to={`/jobs/${job.id}`}
                              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white dark:bg-[#121215] hover:bg-[#0f2f63] dark:hover:bg-[#0066FF] hover:text-white text-[#0A1931] dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 rounded-full text-xs font-semibold transition-all uppercase shadow-2xs"
                            >
                              <span>View Opening</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Company Overview (Balanced 2-Column Grid) */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Card (5 cols): About the Enterprise & Corporate Highlights */}
                <div className="col-span-1 lg:col-span-5 bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-7 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <h3 className="text-base font-bold text-[#0A1931] dark:text-zinc-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8]" />
                      <span>About {companyNameDisplay}</span>
                    </h3>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="text-xs font-semibold text-[#0f2f63] dark:text-[#38BDF8] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>

                  {/* Bio Content */}
                  <div className="bg-slate-50/80 dark:bg-[#1C1C21] rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 text-xs text-[#0A1931] dark:text-zinc-200 leading-relaxed min-h-[90px]">
                    {profile?.profileBio || (
                      <p className="text-slate-400 dark:text-zinc-500 italic">
                        No company bio provided yet. Click "Edit" to add your company overview and work culture.
                      </p>
                    )}
                  </div>

                  {/* Corporate Highlights */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800 text-xs">
                      <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Industry
                      </span>
                      <span className="font-semibold text-[#0A1931] dark:text-zinc-100">{industryDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800 text-xs">
                      <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Primary Hub
                      </span>
                      <span className="font-semibold text-[#0A1931] dark:text-zinc-100">{locationDisplay}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800 text-xs">
                      <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Account Tier
                      </span>
                      <span className="font-semibold text-[#0A1931] dark:text-zinc-100">{profile?.businessTier || 'Verified Employer'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 text-xs">
                      <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Compliance
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                        Enterprise Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Card (7 cols): Official Company Profile & Verified Contact */}
                <div className="col-span-1 lg:col-span-7 bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-7 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                    <h3 className="text-base font-bold text-[#0A1931] dark:text-zinc-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8]" />
                      <span>Official Company Profile</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-[#0f2f63] dark:text-[#38BDF8] bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/50">
                      Verified Contact
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    {/* Contact Person */}
                    <div className="flex items-start gap-3 bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <Users className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Hiring Contact Person</p>
                        <p className="font-semibold text-[#0A1931] dark:text-zinc-100 mt-0.5 truncate">{contactPersonDisplay}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-3 bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <Phone className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Direct Phone Line</p>
                        <div className="mt-1">
                          <PhoneDisplay phone={phoneDisplay} />
                        </div>
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex items-start gap-3 bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <Mail className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Official Business Email</p>
                        <p className="font-semibold text-[#0A1931] dark:text-zinc-100 mt-0.5 truncate">{emailDisplay}</p>
                      </div>
                    </div>

                    {/* Operating Region */}
                    <div className="flex items-start gap-3 bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <MapPin className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Operating City / Region</p>
                        <p className="font-semibold text-[#0A1931] dark:text-zinc-100 mt-0.5">{locationDisplay}</p>
                      </div>
                    </div>

                    {/* Registered Address */}
                    <div className="flex items-start gap-3 bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 sm:col-span-2">
                      <Building2 className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Registered Office Address</p>
                        <p className="font-semibold text-[#0A1931] dark:text-zinc-100 mt-0.5 leading-relaxed">
                          {profile?.address || 'Corporate address verified during compliance onboarding'}
                        </p>
                      </div>
                    </div>

                    {/* Website */}
                    {profile?.companyWebsite && (
                      <div className="flex items-start gap-3 bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 sm:col-span-2">
                        <Globe className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Official Website</p>
                          <a 
                            href={profile.companyWebsite.startsWith('http') ? profile.companyWebsite : `https://${profile.companyWebsite}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#0f2f63] dark:text-[#38BDF8] hover:underline mt-0.5 flex items-center gap-1 truncate"
                          >
                            <span className="truncate">{websiteDisplay}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Verified Reviews */}
            {activeTab === 'reviews' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#0A1931] dark:text-zinc-100">Worker Reviews & Workplace Ratings</h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                        Authentic feedback from verified workers who have worked on your posted jobs and shifts.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#0066FF] bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-900/50">
                      {employerReviews.length} Verified Reviews
                    </span>
                  </div>
                  <ReviewsList
                    ratings={employerReviews}
                    isLoading={isReviewsLoading}
                    emptyTitle="No worker ratings yet"
                    emptySubtitle="Feedback from candidates who accept job offers and complete assignments will appear here."
                  />
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Corporate Verification & Compliance History */}
            {activeTab === 'compliance' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-6">
                  
                  <div className="border-b border-slate-100 dark:border-zinc-800 pb-4">
                    <h3 className="text-lg font-bold text-[#0A1931] dark:text-zinc-100">Corporate Verification & Compliance</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
                      TrustHire audit record and timeline of your company verification milestones.
                    </p>
                  </div>

                  {/* Verification Timeline */}
                  <div className="space-y-4">
                    
                    {/* Item 1 */}
                    <div className="flex items-start gap-4 bg-slate-50/80 dark:bg-[#1C1C21] p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#0A1931] dark:text-zinc-100">Corporate Entity Verified</h4>
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            Passed
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Business identity, official address, and authorized contact person verified under TrustHire standard identity protocol.
                        </p>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex items-start gap-4 bg-slate-50/80 dark:bg-[#1C1C21] p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-[#0f2f63] dark:text-[#38BDF8]">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#0A1931] dark:text-zinc-100">Verified Employer Badge</h4>
                          <span className="text-[10px] font-semibold text-[#0f2f63] dark:text-[#38BDF8] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Authentic employer profile enabled. Candidates can apply and connect directly with your hiring team.
                        </p>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex items-start gap-4 bg-slate-50/80 dark:bg-[#1C1C21] p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                      <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-[#0A1931] dark:text-zinc-100">Zero Ghosting Commitment</h4>
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                            Enforced
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                          Maintains average application review time under 4 hours. All applied candidates receive status responses or interview invites.
                        </p>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

      </main>

      {/* Edit Employer Profile Modal */}
      <EditEmployerProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile || undefined}
      />
    </div>
  );
}
