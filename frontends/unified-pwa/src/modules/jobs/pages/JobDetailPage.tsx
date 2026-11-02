import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { sanitizeHtmlDescription } from '../../../utils/textSanitizer';
import { extractJobIdFromSlug, generateJobSeoSlug } from '../../../utils/seoSlug.utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { applicationService } from '../../../services/application.service';
import { profileService } from '../../../services/profile.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useState, useEffect } from 'react';
import { SeoHead, buildJobPostingJsonLd, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { getEffectiveCoverUrl, resolveTradeCover } from '../../../utils/coverImage.utils';
import { formatMissingProfileFields, getMissingProfileFields } from '../../../utils/profileCompletion';
import { useUser } from '../../../providers/AuthContext';
import { sanitizeRedirectUrl } from '../../../utils/redirectSanitizer';
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

const getCategoryDefaultSkills = (title?: string, industry?: string): string[] => {
  const text = `${title || ''} ${industry || ''}`.toLowerCase();
  if (text.includes('electr') || text.includes('wire') || text.includes('power')) {
    return ['Circuit Wiring', 'Safety Protocol', 'Power Distribution', 'Maintenance', 'Quality Inspection'];
  }
  if (text.includes('cook') || text.includes('chef') || text.includes('kitchen') || text.includes('food') || text.includes('rice') || text.includes('hotel')) {
    return ['Commercial Kitchen', 'Food Hygiene', 'Recipe Preparation', 'Time Management', 'Kitchen Safety'];
  }
  if (text.includes('driv') || text.includes('deliver') || text.includes('logist') || text.includes('courier')) {
    return ['Navigation & Routing', 'Vehicle Inspection', 'Package Handling', 'Punctuality', 'Safety Protocol'];
  }
  if (text.includes('plumb') || text.includes('pipe')) {
    return ['Pipe Fitting', 'Leak Detection', 'Drainage Systems', 'Tool Handling', 'Safety Compliance'];
  }
  if (text.includes('construct') || text.includes('mason') || text.includes('carpenter') || text.includes('build')) {
    return ['Masonry & Brickwork', 'Blueprint Reading', 'Site Safety', 'Material Handling', 'Structural Assembly'];
  }
  if (text.includes('secur') || text.includes('guard')) {
    return ['Surveillance Monitoring', 'Access Control', 'Emergency Response', 'Incident Reporting', 'Physical Fitness'];
  }
  if (text.includes('clean') || text.includes('housekeep') || text.includes('maid')) {
    return ['Chemical Handling', 'Sanitization Protocol', 'Deep Cleaning', 'Inventory Management', 'Attention to Detail'];
  }
  if (text.includes('technician') || text.includes('mechanic') || text.includes('engine') || text.includes('ac repair') || text.includes('hvac')) {
    return ['Diagnostic Testing', 'Preventative Maintenance', 'Equipment Calibration', 'Safety Compliance', 'Troubleshooting'];
  }
  return ['Trade Competencies', 'Safety Compliance', 'Quality Control', 'Punctuality', 'Team Coordination'];
};

const formatExactExperience = (jobData: any, mode: 'header' | 'stat' | 'detail' = 'header'): string => {
  if (!jobData) return mode === 'stat' ? '0 Yrs' : 'Not Specified';

  const raw = jobData.experienceYearsRequired ?? jobData.experience_years_required ?? jobData.experience;

  if (raw === undefined || raw === null || raw === '') {
    if (mode === 'stat') return 'Fresher';
    if (mode === 'detail') return 'Fresher / Entry Level';
    return 'Fresher (0 Years)';
  }

  // If employer typed a non-numeric string (e.g. "Fresher", "2-3 Years")
  if (typeof raw === 'string' && isNaN(Number(raw))) {
    return raw.trim();
  }

  const expNum = Number(raw);

  if (isNaN(expNum) || expNum <= 0) {
    if (mode === 'stat') return 'Fresher';
    if (mode === 'detail') return 'Fresher / Entry Level (0 Yrs)';
    return 'Fresher (0 Years)';
  }

  if (expNum === 1) {
    if (mode === 'stat') return '1 Year';
    if (mode === 'detail') return '1 Year';
    return '1 Year Experience';
  }

  if (mode === 'stat') return `${expNum} Years`;
  if (mode === 'detail') return `${expNum} Years`;
  return `${expNum} Years Experience`;
};

export default function JobDetailPage() {
  const { id: rawSlugOrId } = useParams<{ id: string }>();
  const id = extractJobIdFromSlug(rawSlugOrId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const [hasJustApplied, setHasJustApplied] = useState(() => {
    return localStorage.getItem(`applied_${id}`) === 'true';
  });
  const [coverLetter, setCoverLetter] = useState('');
  const [showCoverLetterInput, setShowCoverLetterInput] = useState(false);
  const [coverImageFailed, setCoverImageFailed] = useState(false);
  const [searchParams] = useSearchParams();

  // Auto-trigger application if redirected here after guest sign-in intent
  useEffect(() => {
    if (searchParams.get('action') === 'apply' && user?.role === 'WORKER') {
      try {
        const pending = sessionStorage.getItem('trusthyre_pending_application');
        if (pending) {
          const parsed = JSON.parse(pending);
          if (parsed.jobId === id) {
            sessionStorage.removeItem('trusthyre_pending_application');
            toast.info('Completing your application now that you are signed in...');
            setShowCoverLetterInput(true);
          }
        }
      } catch (_) {}
    }
  }, [searchParams, user, id]);

  const { data: job, isLoading } = useQuery({
    queryKey: queryKeys.jobs.detail(id || ''),
    queryFn: () => jobService.getJobById(id!),
    enabled: !!id
  });

  // Seamless SEO URL canonicalization: upgrade /job/:uuid to /job/:area-:title-:date-:uuid in browser address bar
  useEffect(() => {
    if (job && rawSlugOrId && job.id) {
      const canonicalSlug = generateJobSeoSlug({
        id: job.id,
        title: job.title,
        city: job.city,
        location: job.location,
        created_at: job.createdAt || (job as any).created_at,
      });
      if (canonicalSlug && rawSlugOrId !== canonicalSlug && !window.location.pathname.includes(canonicalSlug)) {
        const newPath = `/job/${canonicalSlug}${window.location.search}${window.location.hash}`;
        window.history.replaceState(null, '', newPath);
      }
    }
  }, [job, rawSlugOrId]);

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
  const isEmployer = Boolean(user && (user.role === 'EMPLOYER' || (user.id && ((job as any)?.employerId === user.id || (job as any)?.employer?.userId === user.id))));
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
  const effectiveCoverUrl = !coverImageFailed 
    ? getEffectiveCoverUrl(job as any) 
    : resolveTradeCover((job as any)?.title, (job as any)?.industry);

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
    if (!user) {
      // Store intent for frictionless post-auth application
      try {
        sessionStorage.setItem('trusthyre_pending_application', JSON.stringify({
          jobId: id,
          jobTitle: job?.title,
          timestamp: Date.now()
        }));
      } catch (_) {}

      toast.info('Please sign in as a candidate to submit your application.');
      const returnUrl = sanitizeRedirectUrl(`/job/${id}?action=apply`);
      navigate(`/sign-in?role=worker&redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

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
      experienceYearsRequired: anyJob.experienceYearsRequired ?? anyJob.experience_years_required ?? 0,
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
        <SeoHead
          title="Job Opening Not Found"
          description="This job opening may have been filled or closed by the employer on TrustHyre."
          noIndex={true}
        />
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

  const additionalDetails: any = (() => {
    const raw = (job as any)?.additionalDetails ?? (job as any)?.additional_details ?? (job as any)?.alternate_sources;
    if (raw && typeof raw === 'object') {
      return raw.additional_details || raw;
    }
    return {};
  })();

  const explicitSkills: string[] = (() => {
    const direct: any = (job as any)?.requiredSkills ?? (job as any)?.required_skills ?? (job as any)?.skills;
    if (Array.isArray(direct)) {
      return direct.map((s: any) => String(s).trim()).filter(Boolean);
    }
    if (typeof direct === 'string' && direct.trim() !== '') {
      return direct.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  })();

  const rawSkills = explicitSkills.length > 0 
    ? explicitSkills 
    : getCategoryDefaultSkills(job?.title, job?.industry);
  // legacy fallback handled above 



  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <SeoHead
        title={`${job.title} at ${employerName}`}
        description={`Apply for verified opening: ${job.title} in ${job.location || job.city || 'India'}. Verified Employer: ${employerName}. Agreed Salary: ${job.budget ? '₹' + Number(job.budget).toLocaleString('en-IN') + '/mo' : 'Best in Industry'}.`}
        canonicalPath={`/job/${generateJobSeoSlug(job ? { id: (job as any).id, title: (job as any).title, city: (job as any).city, location: (job as any).location, created_at: (job as any).createdAt } : { id })}`}
        ogType="website"
        ogImage={effectiveCoverUrl || employer?.profileImageUrl || (job as any).logoUrl || undefined}
        jsonLd={[
          ...(job ? [buildJobPostingJsonLd({
            title: job.title,
            description: job.description || `${job.title} required in ${job.city || 'India'} at ${employerName}.`,
            datePosted: createdDate ? new Date(createdDate).toISOString() : new Date().toISOString(),
            validThrough: expiryDate ? new Date(expiryDate).toISOString() : undefined,
            employmentType: job.jobType === 'PART_TIME' ? 'PART_TIME' : (job.jobType === 'CONTRACT' ? 'CONTRACTOR' : 'FULL_TIME'),
            hiringOrganization: employerName,
            hiringLogo: employer?.profileImageUrl || (job as any).logoUrl,
            city: job.city || job.location,
            address: job.address || job.location,
            salary: job.budget ? Number(job.budget) : undefined,
          })] : []),
          ...(job ? [buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Search Jobs', path: '/search' },
            { name: job.title, path: `/job/${generateJobSeoSlug(job)}` },
          ])] : [])
        ]}
      />
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

        {/* 1. HERO JOB CARD (Exact Match to User Reference Layout) */}
        <div className="bg-white rounded-[2rem] border border-[#e6e8ec] shadow-xs relative overflow-hidden flex flex-col md:flex-row items-stretch">
          
          {/* Left: Cover Image Vertical Panel (Exact 20% on Desktop with Badges) */}
          {effectiveCoverUrl && (
            <div className="w-full md:w-[22%] md:min-w-[210px] md:max-w-[250px] h-48 sm:h-56 md:h-auto min-h-[220px] overflow-hidden relative border-b md:border-b-0 md:border-r border-[#e6e8ec] bg-slate-900 group shrink-0">
              <img 
                src={effectiveCoverUrl} 
                alt={job.title} 
                onError={() => setCoverImageFailed(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block" 
              />
              <div className="absolute inset-0 w-full h-full bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/20 to-transparent pointer-events-none" />
              
              <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-10">
                <span className="px-3 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                  {job.industry || 'Verified Opening'}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-600 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Worksite</span>
                </span>
              </div>
            </div>
          )}

          {/* Right: Content Details Area (Exact 80% Horizontal Flow) */}
          <div className="p-6 lg:p-7 flex-1 w-full min-w-0 flex flex-col justify-between gap-6">
            
            {/* Top Row: Monogram + Title + Employer / Expiry | Divider | Salary | Apply Button */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              
              {/* Left Group: Company Monogram Badge + Title Cluster */}
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-14 h-14 bg-[#f8f9fa] rounded-2xl border border-[#e6e8ec] flex items-center justify-center overflow-hidden shrink-0">
                  {employer?.profileImageUrl || (job as any).logoUrl ? (
                    <img 
                      src={employer?.profileImageUrl || (job as any).logoUrl} 
                      alt={employerName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-[#0f2f63]/70" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] tracking-tight leading-tight">
                      {job.title}
                    </h1>
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                        <Clock className="w-3 h-3 text-rose-600" />
                        <span>Expired</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#717784] font-medium">
                    <span className="font-semibold text-[#0a0a0a]">{employerName}</span>
                    {expiryDate && (
                      <>
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-600 font-semibold' : 'text-[#717784]'}`}>
                          <Calendar className="w-3.5 h-3.5 text-[#717784]" />
                          <span>{isExpired ? 'Expired' : 'Expires'}: {new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Group: Vertical Divider + Salary + Action Button */}
              <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end pt-4 lg:pt-0 border-t lg:border-t-0 border-[#e6e8ec] shrink-0">
                
                {/* Vertical Divider (Desktop) */}
                <div className="hidden lg:block w-[1px] h-12 bg-[#e6e8ec]" />

                {/* Salary Section */}
                <div className="text-left lg:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] block leading-none">Salary</span>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-600 tracking-tight leading-none mt-1">
                    {job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Best in Industry'}
                    {job.budget && <span className="text-xs font-normal text-[#717784] ml-1">/mo</span>}
                  </p>
                </div>

                {/* Instant Apply Button */}
                {isEmployer ? (
                  <Link
                    to={`/jobs?jobId=${id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#0f2f63] hover:bg-[#1a4484] text-white rounded-full font-bold text-xs tracking-wider shadow-sm transition-all active:scale-95 uppercase"
                  >
                    <Users className="w-4 h-4" />
                    <span>Manage ({applicantCount})</span>
                  </Link>
                ) : isExpired ? (
                  <div className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 text-[#717784] rounded-full font-medium text-xs border border-[#e6e8ec]">
                    <Clock className="w-4 h-4 text-rose-500" />
                    <span>Closed</span>
                  </div>
                ) : !isApplied ? (
                  <button
                    onClick={handleApply}
                    disabled={mutation.isPending}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0f2f63] hover:bg-[#163b74] text-white rounded-full font-bold text-xs tracking-wider shadow-sm transition-all cursor-pointer uppercase active:scale-95 disabled:opacity-50"
                  >
                    {mutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{!user ? 'Instant Apply' : 'Instant Apply'}</span>
                  </button>
                ) : null}
              </div>

            </div>

            {/* Middle Row: 4 Pill Containers with Rounded Full / Rounded 2xl Borders */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Location Pill */}
              <div className="bg-[#fcfdfd] hover:bg-white rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0f2f63] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] block leading-none">Location</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] truncate mt-0.5">
                    {job.city || job.location || 'Chennai'}
                  </p>
                </div>
              </div>

              {/* Experience Pill */}
              <div className="bg-[#fcfdfd] hover:bg-white rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] block leading-none">Experience</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] truncate mt-0.5">
                    {formatExactExperience(job, 'stat')}
                  </p>
                </div>
              </div>

              {/* Work Mode Pill */}
              <div className="bg-[#fcfdfd] hover:bg-white rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] block leading-none">Work Mode</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] truncate mt-0.5 capitalize">
                    {String(job.jobType || 'Full Time').toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Shift / Hours Pill */}
              <div className="bg-[#fcfdfd] hover:bg-white rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] block leading-none">Shift / Hours</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] truncate mt-0.5">
                    {additionalDetails.shift || 'Regular Day'}
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Row: Key Skills Tags (left) and Address (right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#f0f2f5] text-xs">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#717784] shrink-0">Key Skills:</span>
                {rawSkills.slice(0, 4).map((skill: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-white border border-[#e6e8ec] text-xs font-semibold text-[#0a0a0a] shadow-2xs">
                    {skill}
                  </span>
                ))}
                {rawSkills.length > 4 && (
                  <span className="text-xs font-bold text-[#0f2f63] cursor-default">
                    +{rawSkills.length - 4} more
                  </span>
                )}
              </div>

              {job.location && (
                <div className="flex items-center gap-1.5 text-xs text-[#717784] truncate shrink-0 max-w-md">
                  <MapPin className="w-3.5 h-3.5 text-[#717784] shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
              )}
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
                {sanitizeHtmlDescription(job.description) || "Detailed scope and trade responsibilities will be provided during onboarding by the employer."}
              </div>
            </div>

            {/* Role & Eligibility Criteria Card */}
            {(additionalDetails.department || additionalDetails.roleCategory || additionalDetails.employmentType || additionalDetails.shift || additionalDetails.education || additionalDetails.languages || additionalDetails.ageLimit || additionalDetails.gender) && (
              <div className="bg-[#f4f4f4] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2 border-b border-[#e6e8ec] pb-3">
                  <Briefcase className="w-4 h-4 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Role Requirements & Eligibility Criteria
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {additionalDetails.department && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Department</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.department}</p>
                    </div>
                  )}

                  {additionalDetails.roleCategory && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Role / Category</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.roleCategory}</p>
                    </div>
                  )}

                  {additionalDetails.employmentType && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Employment Type</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.employmentType}</p>
                    </div>
                  )}

                  {additionalDetails.shift && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Shift Timing</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.shift}</p>
                    </div>
                  )}

                  {additionalDetails.education && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Education</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.education}</p>
                    </div>
                  )}

                  {additionalDetails.languages && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Languages Known</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.languages}</p>
                    </div>
                  )}

                  {additionalDetails.ageLimit && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Age Limit</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.ageLimit}</p>
                    </div>
                  )}

                  {additionalDetails.gender && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Gender Preference</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.gender}</p>
                    </div>
                  )}

                  {additionalDetails.experience && (
                    <div className="bg-white rounded-2xl p-4 border border-[#e6e8ec] space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] tracking-wider block">Experience Range</span>
                      <p className="text-xs font-bold text-[#0a0a0a]">{additionalDetails.experience}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                      <p className="text-xl font-bold text-[#0a0a0a] mt-0.5 tabular-nums tracking-tight">{formatExactExperience(job, 'stat')}</p>
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
                  <span className="font-semibold text-[#0a0a0a]">{additionalDetails.employmentType || (job as any).jobType || (job.status === 'OPEN' ? 'Open Shift' : 'Full Time')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                  <span className="text-[#717784]">Experience Required:</span>
                  <span className="font-semibold text-[#0a0a0a]">{additionalDetails.experience || formatExactExperience(job, 'detail')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                  <span className="text-[#717784]">Work Schedule:</span>
                  <span className="font-semibold text-[#0a0a0a]">{additionalDetails.shift || 'Regular Shifts'}</span>
                </div>
                {additionalDetails.education && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                    <span className="text-[#717784]">Education:</span>
                    <span className="font-semibold text-[#0a0a0a]">{additionalDetails.education}</span>
                  </div>
                )}
                {additionalDetails.languages && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                    <span className="text-[#717784]">Languages:</span>
                    <span className="font-semibold text-[#0a0a0a]">{additionalDetails.languages}</span>
                  </div>
                )}
                {additionalDetails.gender && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60">
                    <span className="text-[#717784]">Gender:</span>
                    <span className="font-semibold text-[#0a0a0a]">{additionalDetails.gender}</span>
                  </div>
                )}
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
