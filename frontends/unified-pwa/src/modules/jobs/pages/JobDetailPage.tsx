import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { applicationService } from '../../../services/application.service';
import { profileService } from '../../../services/profile.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useState } from 'react';
import { formatMissingProfileFields, getMissingProfileFields } from '../../../utils/profileCompletion';
import { useUser } from '../../../providers/AuthContext';
import { AppLoader } from '../../../components/common/AppLoader';
import { 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  MapPin, 
  IndianRupee, 
  ShieldCheck, 
  Share2, 
  Bookmark, 
  ChevronLeft, 
  Briefcase, 
  Building2, 
  Calendar, 
  Check, 
  Users, 
  FileText, 
  Send, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Award,
  Plus
} from 'lucide-react';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [hasJustApplied, setHasJustApplied] = useState(() => {
    return localStorage.getItem(`applied_${id}`) === 'true';
  });
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetterInput, setShowCoverLetterInput] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: queryKeys.jobs.detail(id || ''),
    queryFn: () => jobService.getJobById(id!),
    enabled: !!id
  });

  const { data: profile } = useQuery({
    queryKey: queryKeys.workers.detail('me'),
    queryFn: profileService.getProfile,
    staleTime: 1000 * 60 * 5,
    enabled: user?.role === 'WORKER'
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: queryKeys.jobs.myApplications,
    queryFn: applicationService.getMyApplications,
    staleTime: 1000 * 60 * 5,
    enabled: user?.role === 'WORKER'
  });

  const employer = (job as any)?.employerProfile || (job as any)?.employer || null;
  const isEmployer = user?.role === 'EMPLOYER' || user?.id === (job as any)?.employerId || user?.id === (job as any)?.employer?.userId;
  const rawExpiry = (job as any)?.expiresAt || (job as any)?.expires_at;
  const createdDate = (job as any)?.createdAt || (job as any)?.created_at;
  const effectiveExpiry = rawExpiry
    ? new Date(rawExpiry)
    : (createdDate ? new Date(new Date(createdDate).getTime() + 30 * 24 * 60 * 60 * 1000) : null);

  const isExpired = Boolean(
    (job as any)?.isExpired || 
    (job as any)?.status === 'EXPIRED' || 
    (effectiveExpiry && effectiveExpiry.getTime() <= Date.now())
  );
  const expiryDate = rawExpiry || effectiveExpiry?.toISOString();

  const { data: employerJobApps = [] } = useQuery({
    queryKey: queryKeys.jobs.allEmployerApplications(id ? [id] : []),
    queryFn: () => applicationService.getApplicationsForEmployerJobs([id!]),
    enabled: !!id && isEmployer,
  });

  const applicantCount = employerJobApps.length > 0
    ? employerJobApps.length
    : (job?.applicationCount || (job as any)?.applicantCount || 0);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof applicationService.applyForJob>[0]) => applicationService.applyForJob(data),
    onSuccess: (newApp: any) => {
      setHasJustApplied(true);
      localStorage.setItem(`applied_${id}`, 'true');
      queryClient.setQueryData<any[]>(queryKeys.jobs.myApplications, (old = []) => [
        ...(old || []),
        newApp || { id: `app-${Date.now()}`, jobId: id!, status: 'PENDING', appliedAt: new Date().toISOString() }
      ]);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: ['recommendedJobs'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myApplications });
      toast.success('Application submitted successfully to employer!');
    },
    onError: (error: unknown) => {
      const message = (error as any)?.response?.data?.message || (error as Error)?.message || 'Failed to submit application.';
      if (String(message).toLowerCase().includes('already applied')) {
        setHasJustApplied(true);
        localStorage.setItem(`applied_${id}`, 'true');
        toast.info('You have already applied for this opening.');
        return;
      }
      toast.error(message);
    }
  });

  const handleApply = () => {
    if (isEmployer) {
      toast.info('Employers cannot apply for openings. You can manage candidates from the pipeline.');
      return;
    }
    if (isExpired) {
      toast.error('This job has expired and is no longer accepting applications.');
      return;
    }
    const missingFields = getMissingProfileFields(profile);
    if (missingFields.length > 0) {
      toast.error(`Please complete your profile before applying. Missing: ${formatMissingProfileFields(missingFields)}.`);
      navigate('/profile');
      return;
    }
    mutation.mutate({ jobId: id!, coverLetter });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      applicationService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<any[]>(queryKeys.jobs.myApplications, (old = []) => 
        (old || []).map((app: any) => app.id === variables.id ? { ...app, status: variables.status } : app)
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: ['recommendedJobs'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myApplications });
      toast.success(`Application updated: ${variables.status}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update application status.');
    }
  });

  const existingApplication = myApplications.find((application) => application.jobId === id);
  const isApplied = hasJustApplied || !!existingApplication;
  const applicationStatus = existingApplication?.status || (hasJustApplied ? 'PENDING' : null);
  const isOfferSent = applicationStatus === 'OFFER_SENT';
  const isApproved = applicationStatus === 'ACCEPTED' || applicationStatus === 'APPROVED' || applicationStatus === 'COMPLETED';
  const isDeclined = applicationStatus === 'REJECTED' || applicationStatus === 'DECLINED';

  const { isJobSaved, toggleSaveJob } = useSavedStore();
  const isSaved = isJobSaved(id || '');

  const handleShare = async () => {
    const shareData = {
      title: `${job?.title || 'Job Opening'} - TrustHyre`,
      text: `Check out this verified job opening on TrustHyre: ${job?.title}`,
      url: window.location.href,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Job link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Job link copied to clipboard!');
      }
    }
  };

  const handleToggleSave = () => {
    if (!job || !id) return;
    const anyJob = job as any;
    toggleSaveJob({
      id: anyJob.id || id,
      title: anyJob.title,
      companyName: anyJob.employerProfile?.companyName || anyJob.employerName || 'Verified Employer',
      logoUrl: anyJob.employerProfile?.logoUrl || anyJob.logoUrl,
      location: anyJob.location || anyJob.city || anyJob.address,
      city: anyJob.city,
      budget: anyJob.budget,
      salaryText: anyJob.budget ? `₹${anyJob.budget.toLocaleString()}` : undefined,
      jobType: anyJob.jobType,
      experienceYearsRequired: anyJob.experienceYearsRequired,
      expiresAt: anyJob.expiresAt,
    });
    toast.success(isSaved ? 'Removed from saved jobs' : 'Job saved to your bookmarks!');
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] flex items-center justify-center">
        <AppLoader variant="page" message="Loading verified job details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
        <div className="max-w-2xl mx-auto pt-20 text-center space-y-4">
          <div className="w-14 h-14 bg-[#f4f4f4] rounded-full flex items-center justify-center mx-auto text-[#717784]">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Job Opening Not Found</h2>
          <p className="text-xs text-[#717784]">This opening may have been filled or closed by the employer.</p>
          <button 
            onClick={() => navigate(isEmployer ? '/dashboard' : '/search')}
            className="px-5 py-2.5 bg-[#0f2f63] text-white rounded-full text-xs font-medium uppercase active:scale-95 transition-all cursor-pointer"
          >
            {isEmployer ? 'Go to Dashboard' : 'Browse Other Openings'}
          </button>
        </div>
      </div>
    );
  }

  const employerName = employer?.companyName || (job as any).employerName || 'Verified Enterprise';
  const hasCoordinates = typeof job.latitude === 'number' && typeof job.longitude === 'number' && !isNaN(job.latitude) && !isNaN(job.longitude);
  const locationCoordinates: [number, number] | null = hasCoordinates ? [job.latitude!, job.longitude!] : null;

  const rawSkills = job.requiredSkills && Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0 
    ? job.requiredSkills 
    : ((job as any).skills && Array.isArray((job as any).skills) ? (job as any).skills : []);

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between pt-2">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] text-xs font-medium transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{isEmployer ? 'Back' : 'Back to Search'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] border border-[#e6e8ec] transition-all cursor-pointer"
              title="Share Job"
            >
              <Share2 className="w-4 h-4 text-[#717784]" />
            </button>
            {!isEmployer && (
              <button
                onClick={handleToggleSave}
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-blue-50 border-blue-200 text-[#0f2f63]'
                    : 'bg-[#f4f4f4] hover:bg-[#e6e8ec] border-[#e6e8ec] text-[#717784]'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Job'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* 1. HERO JOB CARD (Hallmark Tactile Aesthetic) */}
        <div className="bg-[#f4f4f4] rounded-[2rem] p-6 sm:p-8 border border-[#e6e8ec] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Identity & Company Cluster */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              
              {/* Company Monogram Badge */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-3xl border border-[#e6e8ec] flex items-center justify-center overflow-hidden shadow-2xs shrink-0">
                {employer?.profileImageUrl || (job as any).logoUrl ? (
                  <img 
                    src={employer?.profileImageUrl || (job as any).logoUrl} 
                    alt={employerName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-[#0f2f63]/50" />
                )}
              </div>

              {/* Title, Company, Status Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0a0a0a]">
                    {job.title}
                  </h1>
                  {isExpired ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      <Clock className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      <span>Job Expired</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Employer</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-xs font-medium text-[#717784]">
                  <span className="font-semibold text-[#0a0a0a]">{employerName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <span>{job.location || job.city || 'Pan India'}</span>
                  </span>
                  <span>•</span>
                  <span>{job.experienceYearsRequired || 1}+ Years Experience</span>
                  {job.industry && (
                    <>
                      <span>•</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0f2f63]/5 text-[#0f2f63] font-semibold border border-[#0f2f63]/10">
                        {job.industry}
                      </span>
                    </>
                  )}
                  {expiryDate && (
                    <>
                      <span>•</span>
                      <span className={`flex items-center gap-1 font-semibold ${isExpired ? 'text-rose-700' : 'text-[#717784]'}`}>
                        <Calendar className={`w-3.5 h-3.5 ${isExpired ? 'text-rose-600' : 'text-[#0f2f63]'}`} />
                        <span>
                          {isExpired ? 'Expired on' : 'Auto-expires:'} {new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(expiryDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Wage Highlight & Role-Aware Action Pill */}
            <div className="flex flex-row lg:flex-col items-start lg:items-end justify-between w-full lg:w-auto gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#e6e8ec]">
              <div className="text-left lg:text-right">
                <p className="text-[10px] font-bold uppercase text-[#717784]">Agreed Compensation</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5 tabular-nums tracking-tight">
                  {job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Compensation on Discussion'}
                  {job.budget && <span className="text-xs font-medium text-[#717784] ml-1">/ month</span>}
                </p>
              </div>

              {isEmployer ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/jobs?jobId=${id}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-semibold text-xs shadow-xs transition-all cursor-pointer uppercase active:scale-95"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage Applicants ({applicantCount})</span>
                  </Link>
                  {isExpired && (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      Expired
                    </span>
                  )}
                </div>
              ) : isExpired ? (
                <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#f4f4f4] text-[#717784] rounded-full font-semibold text-xs border border-[#e6e8ec] cursor-not-allowed">
                  <Clock className="w-3.5 h-3.5 text-rose-500" />
                  <span>Requisition Expired • Applications Closed</span>
                </div>
              ) : !isApplied ? (
                <button
                  onClick={handleApply}
                  disabled={mutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs shadow-xs transition-all cursor-pointer uppercase active:scale-95 disabled:opacity-50"
                >
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Instant Apply</span>
                </button>
              ) : null}
            </div>

          </div>
        </div>


        {/* 3. MAIN 2-COLUMN PROFILE GRID (Even Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN (8 Cols): Scope, Skills & Worksite Details */}
          <div className="col-span-1 lg:col-span-8 space-y-6">
            
            {/* Job Description Card */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
                <FileText className="w-4 h-4 text-[#0f2f63]" />
                <h3 className="text-xs font-bold uppercase text-[#717784]">
                  Job Description & Scope
                </h3>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-[#e6e8ec] text-xs text-[#0a0a0a] leading-relaxed whitespace-pre-line">
                {job.description || "Detailed scope and trade responsibilities will be provided during onboarding by the employer."}
              </div>
            </div>

            {/* Required Skills & Competencies */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
              <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
                <Award className="w-4 h-4 text-[#0f2f63]" />
                <h3 className="text-xs font-bold uppercase text-[#717784]">
                  Required Technical Skills & Competencies
                </h3>
              </div>

              <div className="pt-1">
                {rawSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rawSkills.map((skill: string, idx: number) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#e6e8ec] text-xs font-semibold text-[#0a0a0a] shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] text-xs text-[#717784]">
                    Standard trade competencies and safety compliance required as outlined in the job scope.
                  </div>
                )}
              </div>
            </div>

            {/* Workplace Location & Worksite Details (No fake map coordinates) */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Workplace Location & Directions
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#0f2f63] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {job.city || 'Pan India'}
                </span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-[#0a0a0a]">
                  <MapPin className="w-4 h-4 text-[#0f2f63] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#0a0a0a]">Official Worksite Address</p>
                    <p className="text-[#717784] mt-0.5">{job.address || job.location || 'Report to designated site office on commencement.'}</p>
                  </div>
                </div>

                {/* Leaflet Map Preview Container - ONLY IF VALID REAL COORDINATES EXIST */}
                {locationCoordinates ? (
                  <div className="w-full h-56 rounded-xl overflow-hidden border border-[#e6e8ec] relative z-0 isolate">
                    <MapContainer 
                      center={locationCoordinates} 
                      zoom={13} 
                      scrollWheelZoom={false}
                      style={{ height: '100%', width: '100%', zIndex: 0 }}
                      className="w-full h-full z-0"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={locationCoordinates}>
                        <Popup>
                          <div className="font-sans text-xs">
                            <strong>{job.title}</strong><br />
                            {job.location || job.city}
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <div className="bg-[#fbfbfb] rounded-xl p-3 border border-[#e6e8ec] flex items-center gap-3 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#0f2f63] shrink-0" />
                    <p className="text-[#717784]">Worksite location verified through employer compliance registration.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (4 Cols): Role-Aware Console or Candidate Application */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            
            {/* If Employer: Render Employer Management Console */}
            {isEmployer ? (
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#0f2f63]" />
                    <h3 className="text-xs font-bold uppercase text-[#717784]">
                      Employer Operations
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {job.status === 'OPEN' || job.status === 'ACTIVE' ? 'Accepting Candidates' : (job.status || 'Active')}
                  </span>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-[#fbfbfb] rounded-xl border border-[#e6e8ec]">
                      <p className="text-[10px] font-bold uppercase text-[#717784]">Applicants</p>
                      <p className="text-xl font-bold text-[#0f2f63] mt-0.5 tabular-nums tracking-tight">{applicantCount}</p>
                    </div>
                    <div className="p-3 bg-[#fbfbfb] rounded-xl border border-[#e6e8ec]">
                      <p className="text-[10px] font-bold uppercase text-[#717784]">Experience</p>
                      <p className="text-xl font-bold text-[#0a0a0a] mt-0.5 tabular-nums tracking-tight">{job.experienceYearsRequired || 1}+ yr</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Link
                      to={`/jobs?jobId=${id}`}
                      className="w-full py-3 px-4 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-semibold text-xs uppercase shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Review Candidate Pipeline ({applicantCount})</span>
                    </Link>

                    <Link
                      to="/post-job"
                      className="w-full py-2.5 px-4 bg-white hover:bg-[#f4f4f4] text-[#0a0a0a] rounded-full font-medium text-xs border border-[#e6e8ec] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#717784]" />
                      <span>Post Another Opening</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* If Candidate: Render Candidate Application Card */
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-3">
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Application Status
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isApproved 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : isOfferSent 
                      ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                      : isDeclined 
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : isApplied 
                      ? 'bg-blue-50 text-[#0f2f63] border-blue-200'
                      : isExpired
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-[#717784] border-slate-200'
                  }`}>
                    {isApproved 
                      ? 'Confirmed & Hired' 
                      : isOfferSent 
                      ? 'Offer Received' 
                      : isDeclined 
                      ? 'Closed' 
                      : isApplied 
                      ? 'In Pipeline' 
                      : isExpired
                      ? 'Job Expired'
                      : 'Open for Candidates'}
                  </span>
                </div>

                {isApplied ? (
                  <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-4">
                    
                    {/* Pipeline Stepper */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0a0a0a]">Application Submitted</p>
                          <p className="text-[10px] text-[#717784]">Profile verified & application delivered</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isOfferSent || isApproved 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[#0f2f63] text-white animate-pulse'
                        }`}>
                          {isOfferSent || isApproved ? '✓' : '2'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0a0a0a]">Employer Review</p>
                          <p className="text-[10px] text-[#717784]">Under active review by hiring team</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isApproved 
                            ? 'bg-emerald-500 text-white' 
                            : isOfferSent 
                            ? 'bg-amber-500 text-white animate-ping' 
                            : 'bg-[#f4f4f4] text-[#717784] border border-[#e6e8ec]'
                        }`}>
                          {isApproved ? '✓' : '3'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0a0a0a]">Offer & Shift Assignment</p>
                          <p className="text-[10px] text-[#717784]">{isOfferSent ? 'Action required: Review offer below' : 'Pending manager decision'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Offer Received Actions */}
                    {isOfferSent && existingApplication?.id && (
                      <div className="pt-2 border-t border-[#e6e8ec] space-y-2">
                        <p className="text-xs font-bold text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          🎉 The employer has made you an offer for this shift!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => statusMutation.mutate({ id: existingApplication.id, status: 'ACCEPTED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-2 px-3 bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold rounded-full uppercase transition-all cursor-pointer"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ id: existingApplication.id, status: 'DECLINED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-2 px-3 bg-white border border-[#e6e8ec] text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-full uppercase transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {isApproved && (
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                        <p className="font-bold">✓ Job Confirmed!</p>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          Please arrive at the worksite with your TrustHyre check-in barcode ready.
                        </p>
                      </div>
                    )}

                  </div>
                ) : isExpired ? (
                  <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase">
                      <Clock className="w-4 h-4 text-rose-600" />
                      <span>Applications Closed</span>
                    </div>
                    <p className="text-xs text-rose-900 leading-relaxed">
                      This job reached its auto-expiry deadline on <strong>{expiryDate ? `${new Date(expiryDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })} at ${new Date(expiryDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'the scheduled deadline'}</strong> and is no longer accepting candidate submissions.
                    </p>
                    <Link
                      to="/jobs"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
                    >
                      <span>Explore Active Openings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-4">
                    <p className="text-xs text-[#717784] leading-relaxed">
                      Submit your verified TrustHyre profile. Your verified ratings, attendance status, and skills are shared directly with the employer.
                    </p>

                    {/* Optional Note toggle */}
                    <div>
                      {!showCoverLetterInput ? (
                        <button
                          onClick={() => setShowCoverLetterInput(true)}
                          className="text-xs font-semibold text-[#0f2f63] hover:underline cursor-pointer"
                        >
                          + Add a quick note to employer (optional)
                        </button>
                      ) : (
                        <div className="space-y-1.5 animate-in fade-in">
                          <label className="text-[10px] font-bold uppercase text-[#717784]">Note to Employer</label>
                          <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Briefly state your relevant experience or shift availability..."
                            className="w-full text-xs p-3 rounded-xl border border-[#e6e8ec] bg-[#fbfbfb] focus:bg-white focus:border-[#0f2f63] outline-none resize-none h-20"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleApply}
                      disabled={mutation.isPending}
                      className="w-full py-3 px-5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {mutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>Apply with Verified Profile</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Direct Verified Employer Snapshot */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 border border-[#e6e8ec] space-y-3">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-2.5">
                <h3 className="text-xs font-bold uppercase text-[#717784]">
                  About the Employer
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Verified Identity
                </span>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-2.5 text-xs">
                <p className="font-bold text-[#0a0a0a] text-sm">{employerName}</p>
                <p className="text-[11px] text-[#717784] leading-relaxed">
                  {employer?.profileBio || 'Verified employer committed to fair workplaces and transparent hiring standards.'}
                </p>
                <div className="pt-2 border-t border-[#e6e8ec] flex justify-between items-center text-[11px] text-[#717784]">
                  <span>Identity Verification:</span>
                  <span className="font-bold text-emerald-700">100% Certified</span>
                </div>
              </div>
            </div>

            {/* Quick Job Details Card */}
            <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 border border-[#e6e8ec] space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#717784] border-b border-[#e6e8ec] pb-2.5">
                Job Overview Details
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                  <span className="text-[#717784]">Job Type:</span>
                  <span className="font-semibold text-[#0a0a0a]">{(job as any).jobType || (job.status === 'OPEN' ? 'Open Shift' : 'Full Time')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                  <span className="text-[#717784]">Experience Required:</span>
                  <span className="font-semibold text-[#0a0a0a]">{job.experienceYearsRequired || 1}+ Years</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                  <span className="text-[#717784]">Work Schedule:</span>
                  <span className="font-semibold text-[#0a0a0a]">Regular Shifts</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#717784]">Verification Status:</span>
                  <span className="font-semibold text-emerald-700">Verified Employer</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
