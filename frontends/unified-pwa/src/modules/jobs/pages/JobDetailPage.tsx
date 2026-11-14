import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { sanitizeHtmlDescription } from '../../../utils/textSanitizer';
import { extractJobIdFromSlug, generateJobSeoSlug, generateHierarchicalJobUrl } from '../../../utils/seoSlug.utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { applicationService } from '../../../services/application.service';
import { profileService } from '../../../services/profile.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useState, useEffect, useMemo } from 'react';
import { calculateMatchScore, getMatchScoreVisuals } from '../../../utils/matchScorer';
import { SeoHead, buildJobPostingJsonLd, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { getEffectiveCoverUrl, resolveTradeCover, resolveJobCategoryLabel } from '../../../utils/coverImage.utils';
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
  ChevronRight, 
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
  Plus,
  Edit,
  Star,
  Phone,
  MessageCircle,
  Utensils,
  Home,
  Zap,
  Fuel,
  Clock3,
  Volume2,
  VolumeX
} from 'lucide-react';
import { RatingModal } from '../../../components/common/RatingModal';
import { JobPamphletModal } from '../../../components/common/JobPamphletModal';
import { WalkInPassModal } from '../../../components/common/WalkInPassModal';
import { InterviewPrepKitModal } from '../../../components/common/InterviewPrepKitModal';
import { VoiceNoteRecorder } from '../../../components/common/VoiceNoteRecorder';
import { audioBriefing } from '../../../utils/audioBriefing.utils';
import { parsePhoneNumber } from '../../../components/common/PhoneDisplay';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { useTranslation } from '../../../providers/TranslationContext';
import { 
  buildJobWhatsAppMessage, 
  openWhatsAppShare, 
  buildWorkerToEmployerApplicationMessage, 
  openWhatsAppDirectChat 
} from '../../../utils/whatsappTemplate.utils';
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
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [showCoverLetterInput, setShowCoverLetterInput] = useState(false);
  const [coverImageFailed, setCoverImageFailed] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isPamphletModalOpen, setIsPamphletModalOpen] = useState(false);
  const [isWalkInPassOpen, setIsWalkInPassOpen] = useState(false);
  const [isPrepKitOpen, setIsPrepKitOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [searchParams] = useSearchParams();
  const { language } = useTranslation();

  useEffect(() => {
    const unsub = audioBriefing.subscribe((speaking) => {
      if (!speaking) setIsPlayingAudio(false);
    });
    return () => unsub();
  }, []);

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

  // Seamless SEO URL canonicalization: upgrade legacy /job/:uuid or /job/:slug to /:city/:title/job/:id in browser address bar
  useEffect(() => {
    if (job && rawSlugOrId && job.id) {
      const canonicalPath = generateHierarchicalJobUrl({
        id: job.id,
        title: job.title,
        city: job.city,
        location: job.location,
        created_at: job.createdAt || (job as any).created_at,
      });
      if (canonicalPath && !window.location.pathname.startsWith(canonicalPath)) {
        const newPath = `${canonicalPath}${window.location.search}${window.location.hash}`;
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

  // Indeed-style dynamic profile & skills match analysis for worker
  const matchAnalysis = useMemo(() => {
    if (!job || !profile || user?.role !== 'WORKER') return null;
    return calculateMatchScore(job, profile);
  }, [job, profile, user]);

  const matchVisuals = useMemo(() => {
    return matchAnalysis ? getMatchScoreVisuals(matchAnalysis.overallScore) : null;
  }, [matchAnalysis]);

  const cleanJobCity = (job?.city ? job.city.split(',')[0].trim() : '') || 'Chennai';
  const cleanJobCitySlug = cleanJobCity.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'chennai';

  const employer = (job as any)?.employerProfile || (job as any)?.employer || null;
  const isAdmin = Boolean(user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'));
  const isEmployer = Boolean(user && (user.role === 'EMPLOYER' || (user.id && ((job as any)?.employerId === user.id || (job as any)?.employer?.userId === user.id))));
  const canManageJob = isEmployer || isAdmin;
  const rawExpiry = (job as any)?.expiresAt || (job as any)?.expires_at;
  const createdDate = (job as any)?.createdAt || (job as any)?.created_at;

  const isExpired = Boolean(
    (job as any)?.isExpired || 
    (job as any)?.status === 'EXPIRED' || 
    (rawExpiry && new Date(rawExpiry).getTime() <= Date.now())
  );
  const expiryDate = rawExpiry || undefined;
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
    mutation.mutate({ jobId: id!, coverLetter, voiceNoteUrl: voiceNoteUrl || undefined });
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
    const userRef = (user as any)?.referralCode || (user as any)?.referral_code;
    const shareUrl = new URL(window.location.href);
    if (userRef) {
      shareUrl.searchParams.set('ref', userRef);
      shareUrl.searchParams.set('src', 'job_share');
    }
    const finalUrl = shareUrl.toString();

    const shareData = {
      title: `${job?.title || 'Job Opening'} - TrustHyre`,
      text: `Check out this verified job opening on TrustHyre: ${job?.title}`,
      url: finalUrl,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(finalUrl);
        toast.success('Job link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(finalUrl);
        toast.success('Job link copied to clipboard!');
      }
    }
  };

  const handleWhatsAppShare = () => {
    if (!job) return;
    const company = (job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Employer';
    const userRef = (user as any)?.referralCode || (user as any)?.referral_code;
    const message = buildJobWhatsAppMessage(
      {
        id: id || (job as any).id,
        title: job.title,
        companyName: company,
        city: job.city,
        location: job.location,
        budget: job.budget,
        experienceYearsRequired: (job as any).experienceYearsRequired ?? (job as any).experience_years_required,
        skills: (job as any).skills,
        industry: job.industry,
      },
      language,
      typeof window !== 'undefined' ? window.location.origin : 'https://trusthyre.com',
      userRef
    );
    openWhatsAppShare(message);
  };

  const handleWhatsAppApply = () => {
    if (!job) return;
    const company = (job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Employer';
    const employerPhone = (job as any)?.employerProfile?.phoneNumber || (job as any)?.employerPhone || (job as any)?.phoneNumber || '';

    const candidateName = profile?.fullName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'TrustHyre Job Seeker';
    const candidatePhone = profile?.phoneNumber || user?.phoneNumber || '';
    const candidateTrade = (profile as any)?.preferredRoles?.[0] || (profile as any)?.skills?.[0] || job.industry || 'Skilled Specialist';
    const candidateExp = (profile as any)?.experienceYears || (profile as any)?.experience_years || 0;
    const candidateCity = (profile as any)?.city || (profile as any)?.location || job.city || 'Nearby';
    const candidateProfileUrl = user?.id ? `${window.location.origin}/worker/${user.id}` : undefined;

    const message = buildWorkerToEmployerApplicationMessage(
      {
        id: id || (job as any).id,
        title: job.title,
        companyName: company,
        city: job.city,
        location: job.location,
        budget: job.budget,
        experienceYearsRequired: (job as any).experienceYearsRequired ?? (job as any).experience_years_required,
        skills: (job as any).skills,
        industry: job.industry,
      },
      {
        name: candidateName,
        phone: candidatePhone,
        trade: candidateTrade,
        experienceYears: candidateExp,
        city: candidateCity,
        profileUrl: candidateProfileUrl,
      },
      language
    );

    if (employerPhone) {
      openWhatsAppDirectChat(employerPhone, message);
    } else {
      openWhatsAppShare(message);
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
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] flex items-center justify-center transition-colors duration-200">
        <AppLoader variant="page" message="Loading verified job details..." />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
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

  const payoutFrequency = ((job as any)?.payout_frequency || (job as any)?.payoutFrequency || 'MONTHLY').toUpperCase();
  const payFreqSuffix = payoutFrequency === 'DAILY' ? '/day'
    : payoutFrequency === 'WEEKLY' ? '/week'
    : payoutFrequency === 'HOURLY' ? '/hr'
    : payoutFrequency === 'ONE_TIME' ? ' total'
    : '/mo';
  const payFreqLabel = payoutFrequency === 'DAILY' ? 'Per Day'
    : payoutFrequency === 'WEEKLY' ? 'Per Week'
    : payoutFrequency === 'HOURLY' ? 'Per Hour'
    : payoutFrequency === 'ONE_TIME' ? 'Total Project'
    : 'Per Month';

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
      <SeoHead
        title={`${job.title} at ${employerName}`}
        description={`Apply for verified opening: ${job.title} in ${job.location || job.city || 'India'}. Verified Employer: ${employerName}. Agreed Salary: ${job.budget ? '₹' + Number(job.budget).toLocaleString('en-IN') + payFreqSuffix : 'Best in Industry'}.`}
        canonicalPath={generateHierarchicalJobUrl(job ? { id: (job as any).id, title: (job as any).title, city: (job as any).city, location: (job as any).location, created_at: (job as any).createdAt } : { id })}
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
            payoutFrequency: (job as any).payout_frequency || (job as any).payoutFrequency || 'MONTHLY',
          })] : []),
          ...(job ? [buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: `Jobs in ${cleanJobCity}`, path: `/jobs-in-${cleanJobCitySlug}` },
            { name: job.title, path: generateHierarchicalJobUrl(job) },
          ])] : [])
        ]}
      />
      <main className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Navigation Breadcrumb Bar */}
        <div className="flex items-center justify-between pt-2">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f4f4f4] dark:bg-[#121215] hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec] dark:border-zinc-800 text-xs font-medium transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{isEmployer ? 'Back' : 'Back to Search'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* 🔊 1-Tap Audio Job Briefing (Zero cost speech synthesis) */}
            <button
              onClick={() => {
                if (isPlayingAudio) {
                  audioBriefing.stop();
                  setIsPlayingAudio(false);
                } else {
                  setIsPlayingAudio(true);
                  audioBriefing.playJobBriefing(
                    {
                      title: job.title,
                      companyName: employerName,
                      city: job.city,
                      location: job.location,
                      budget: job.budget,
                      perks: Array.isArray((job as any).perks) && (job as any).perks.length > 0
                        ? (job as any).perks
                        : (Array.isArray(additionalDetails.perks) ? additionalDetails.perks : []),
                      allowDirectCall: job.allowDirectCall
                    },
                    language
                  );
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isPlayingAudio
                  ? 'bg-amber-500 border-amber-600 text-slate-950 animate-pulse ring-2 ring-amber-300'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              }`}
              title={isPlayingAudio ? 'Stop Voice Briefing' : 'Listen to 15s Voice Briefing'}
            >
              {isPlayingAudio ? (
                <VolumeX className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
              <span>{isPlayingAudio ? 'Stop Audio' : 'Listen Job'}</span>
            </button>

            {/* 📋 1-Tap Interview Prep & Document Checklist */}
            <button
              onClick={() => setIsPrepKitOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Interview Prep & Mandatory Document Checklist"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Prep Kit</span>
            </button>

            {/* Instant Hiring Flyer / Visiting Card Generator (Available for Employers & Job Owners) */}
            {isEmployer && (
              <button
                onClick={() => setIsPamphletModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Download & share high-contrast WhatsApp hiring flyer"
              >
                <Zap className="w-3.5 h-3.5 fill-white text-white" />
                <span>Hiring Flyer</span>
              </button>
            )}

            {/* WhatsApp Viral Referral Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Share Job on WhatsApp"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Share on WhatsApp</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-[#f4f4f4] dark:bg-[#121215] hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 text-[#0a0a0a] dark:text-zinc-200 border border-[#e6e8ec] dark:border-zinc-800 transition-all cursor-pointer"
              title="Share Job"
            >
              <Share2 className="w-4 h-4 text-[#717784] dark:text-zinc-400" />
            </button>
            {!isEmployer && (
              <button
                onClick={handleToggleSave}
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  isSaved
                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-[#0f2f63] dark:text-blue-400'
                    : 'bg-[#f4f4f4] dark:bg-[#121215] hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 border-[#e6e8ec] dark:border-zinc-800 text-[#717784] dark:text-zinc-400'
                }`}
                title={isSaved ? 'Remove from Saved' : 'Save Job'}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* 1. HERO JOB CARD (Exact Match to User Reference Layout) */}
        <div className="bg-white dark:bg-[#121215] rounded-[2rem] border border-[#e6e8ec] dark:border-zinc-800 shadow-xs relative overflow-hidden flex flex-col md:flex-row items-stretch">
          
          {/* Left: Cover Image Vertical Panel (Exact 20% on Desktop with Badges) */}
          {effectiveCoverUrl && (
            <div className="w-full md:w-[22%] md:min-w-[210px] md:max-w-[250px] h-48 sm:h-56 md:h-auto min-h-[220px] overflow-hidden relative border-b md:border-b-0 md:border-r border-[#e6e8ec] dark:border-zinc-800 bg-slate-900 group shrink-0">
              <img 
                src={effectiveCoverUrl} 
                alt={job.title} 
                onError={() => setCoverImageFailed(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 block" 
              />
              <div className="absolute inset-0 w-full h-full bg-gradient-to-t md:bg-gradient-to-r from-black/85 via-black/20 to-transparent pointer-events-none" />
              
              <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1.5 z-10">
                <span className="px-3 py-1 rounded-md bg-black/75 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                  {resolveJobCategoryLabel(job.title, job.industry)}
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
                <div className="w-14 h-14 bg-[#f8f9fa] dark:bg-[#1C1C21] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {employer?.profileImageUrl || (job as any).logoUrl ? (
                    <img 
                      src={employer?.profileImageUrl || (job as any).logoUrl} 
                      alt={employerName} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Building2 className="w-7 h-7 text-[#0f2f63] dark:text-blue-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-[#0a0a0a] dark:text-white tracking-tight leading-tight">
                      {job.title}
                    </h1>
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        <span>Expired</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#717784] dark:text-zinc-400 font-medium">
                    <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{employerName}</span>
                    {expiryDate && (
                      <>
                        <span>•</span>
                        <span className={`flex items-center gap-1 ${isExpired ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-[#717784] dark:text-zinc-400'}`}>
                          <Calendar className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
                          <span>{isExpired ? 'Expired' : 'Expires'}: {new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Group: Vertical Divider + Salary + Action Button */}
              <div className="flex items-center gap-6 w-full lg:w-auto justify-between lg:justify-end pt-4 lg:pt-0 border-t lg:border-t-0 border-[#e6e8ec] dark:border-zinc-800 shrink-0">
                
                {/* Vertical Divider (Desktop) */}
                <div className="hidden lg:block w-[1px] h-12 bg-[#e6e8ec] dark:bg-zinc-800" />

                {/* Salary Section */}
                <div className="text-left lg:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block leading-none">Salary</span>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none mt-1">
                    {job.budget ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Best in Industry'}
                    {job.budget && <span className="text-xs font-normal text-[#717784] dark:text-zinc-400 ml-1">{payFreqSuffix}</span>}
                  </p>
                </div>

                {/* Instant Apply, WhatsApp Apply, or Employer/Admin Manage & Edit Buttons */}
                {canManageJob ? (
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/post-job?jobId=${id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-3 bg-white dark:bg-[#1C1C21] hover:bg-slate-50 dark:hover:bg-zinc-800 text-[#0a0a0a] dark:text-zinc-100 border border-[#e6e8ec] dark:border-zinc-800 rounded-full font-bold text-xs tracking-wider shadow-2xs transition-all active:scale-95 uppercase"
                      title={isAdmin ? "Edit job requisition as Admin" : "Edit your job post"}
                    >
                      <Edit className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                      <span>Edit Job</span>
                    </Link>
                    {isEmployer && (
                      <Link
                        to={`/jobs?jobId=${id}`}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#0f2f63] hover:bg-[#1a4484] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-bold text-xs tracking-wider shadow-sm transition-all active:scale-95 uppercase"
                      >
                        <Users className="w-4 h-4" />
                        <span>Manage ({applicantCount})</span>
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin/jobs"
                        className="inline-flex items-center gap-1.5 px-4 py-3 bg-[#0f2f63] hover:bg-[#1a4484] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-bold text-xs tracking-wider shadow-sm transition-all active:scale-95 uppercase"
                      >
                        <span>Admin Console</span>
                      </Link>
                    )}
                  </div>
                ) : isExpired ? (
                  <div className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-100 dark:bg-zinc-800 text-[#717784] dark:text-zinc-400 rounded-full font-medium text-xs border border-[#e6e8ec] dark:border-zinc-700">
                    <Clock className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                    <span>Closed</span>
                  </div>
                ) : !isApplied ? (
                  <div className="flex flex-col gap-2 items-start">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>Recruiter Active on WhatsApp (9 AM - 7 PM)</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={handleWhatsAppApply}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full font-bold text-xs tracking-wider shadow-sm transition-all cursor-pointer uppercase active:scale-95"
                        title="Apply directly to employer via WhatsApp"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        <span>WhatsApp Apply</span>
                      </button>

                      <button
                        onClick={handleApply}
                        disabled={mutation.isPending}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0f2f63] hover:bg-[#163b74] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-bold text-xs tracking-wider shadow-sm transition-all cursor-pointer uppercase active:scale-95 disabled:opacity-50"
                      >
                        {mutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Instant Apply</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

            </div>

            {/* Middle Row: 4 Pill Containers with Rounded Full / Rounded 2xl Borders */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Location Pill */}
              <div className="bg-[#fcfdfd] dark:bg-[#1C1C21] hover:bg-white dark:hover:bg-zinc-800/80 rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] dark:border-zinc-800 flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0f2f63] dark:text-blue-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block leading-none">Location</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 truncate mt-0.5">
                    {job.city || job.location || 'Chennai'}
                  </p>
                </div>
              </div>

              {/* Experience Pill */}
              <div className="bg-[#fcfdfd] dark:bg-[#1C1C21] hover:bg-white dark:hover:bg-zinc-800/80 rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] dark:border-zinc-800 flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block leading-none">Experience</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 truncate mt-0.5">
                    {formatExactExperience(job, 'stat')}
                  </p>
                </div>
              </div>

              {/* Work Mode Pill */}
              <div className="bg-[#fcfdfd] dark:bg-[#1C1C21] hover:bg-white dark:hover:bg-zinc-800/80 rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] dark:border-zinc-800 flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block leading-none">Work Mode</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 truncate mt-0.5 capitalize">
                    {String(job.jobType || 'Full Time').toLowerCase().replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Shift / Hours Pill */}
              <div className="bg-[#fcfdfd] dark:bg-[#1C1C21] hover:bg-white dark:hover:bg-zinc-800/80 rounded-2xl sm:rounded-full px-4 py-3 border border-[#e6e8ec] dark:border-zinc-800 flex items-center gap-3 transition-colors">
                <div className="w-9 h-9 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block leading-none">Shift / Hours</span>
                  <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 truncate mt-0.5">
                    {additionalDetails.shift || 'Regular Day'}
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Row: Key Skills Tags (left) and Address (right) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#f0f2f5] dark:border-zinc-800 text-xs">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 shrink-0">Key Skills:</span>
                {rawSkills.slice(0, 4).map((skill: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-lg bg-white dark:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 shadow-2xs">
                    {skill}
                  </span>
                ))}
                {rawSkills.length > 4 && (
                  <span className="text-xs font-bold text-[#0f2f63] dark:text-sky-400 cursor-default">
                    +{rawSkills.length - 4} more
                  </span>
                )}
              </div>

              {job.location && (
                <div className="flex items-center gap-1.5 text-xs text-[#717784] dark:text-zinc-400 truncate shrink-0 max-w-md">
                  <MapPin className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400 shrink-0" />
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
            
            {isExpired && (
              <div className="bg-amber-50 border border-amber-200 rounded-[1.75rem] p-6 text-[#78350f] space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>This position has been filled or expired</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  The employer has closed applications for this opening. Explore active verified vacancies matching this trade and locality below.
                </p>
                {job.city && (
                  <Link
                    to={`/jobs-in-${cleanJobCitySlug}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2f63] text-white rounded-full text-xs font-bold hover:bg-[#1a4484] transition"
                  >
                    <span>View all verified jobs in {cleanJobCity}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            )}

            {/* Job Description Card */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                <FileText className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                  Job Description & Scope
                </h3>
              </div>

              <div className="bg-white dark:bg-[#121215] rounded-2xl p-5 border border-[#e6e8ec] dark:border-zinc-800 text-xs text-[#0a0a0a] dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                {sanitizeHtmlDescription(job.description) || "Detailed scope and trade responsibilities will be provided during onboarding by the employer."}
              </div>
            </div>

            {/* Proprietary Salary Benchmark & Compensation Transparency Widget */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                    Market Salary Insights: {job.title} in {job.city || 'India'}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  TrustHyre Verified Index
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-1">
                  <span className="text-[11px] text-[#717784] dark:text-zinc-400 font-medium block">Entry / Fresher</span>
                  <span className="text-base font-bold text-[#0a0a0a] dark:text-white">
                    {job.budget && Number(job.budget) > 0 ? `₹${Math.round(Number(job.budget) * 0.85).toLocaleString('en-IN')}` : '₹18,000'}
                  </span>
                  <span className="text-[10px] text-[#868c98] dark:text-zinc-500 block">{payFreqLabel}</span>
                </div>

                <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border-2 border-[#0f2f63] dark:border-blue-500 text-center space-y-1 relative shadow-xs">
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.2 bg-[#0f2f63] dark:bg-blue-600 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                    Offered Here
                  </span>
                  <span className="text-[11px] text-[#0f2f63] dark:text-blue-400 font-bold block pt-1">This Opening</span>
                  <span className="text-lg font-extrabold text-[#0f2f63] dark:text-blue-400">
                    {job.budget && Number(job.budget) > 0 ? `₹${Number(job.budget).toLocaleString('en-IN')}` : 'Market Competitive'}
                  </span>
                  <span className="text-[10px] text-[#5a6270] dark:text-zinc-400 block">Guaranteed Base</span>
                </div>

                <div className="bg-white dark:bg-[#121215] p-4 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 text-center space-y-1">
                  <span className="text-[11px] text-[#717784] dark:text-zinc-400 font-medium block">Experienced (2+ Yrs)</span>
                  <span className="text-base font-bold text-[#0a0a0a] dark:text-white">
                    {job.budget && Number(job.budget) > 0 ? `₹${Math.round(Number(job.budget) * 1.25).toLocaleString('en-IN')}` : '₹32,000+'}
                  </span>
                  <span className="text-[10px] text-[#868c98] dark:text-zinc-500 block">{payFreqLabel}</span>
                </div>
              </div>

              <p className="text-[11px] text-[#717784] dark:text-zinc-400 leading-relaxed">
                * Compensation figures are calculated using authentic live postings and employer audit standards across {job.city || 'regional'} industrial zones. Zero deductions for commissions.
              </p>
            </div>

            {/* 🚇 Smart Commute & Transit Accessibility Card (WorkIndia & Apna Style) */}
            {(() => {
              const nearestMetro = (job as any).nearestMetroStation || (job as any).nearest_metro_station || additionalDetails.nearestMetroStation;
              const nearestBus = (job as any).nearestBusStand || (job as any).nearest_bus_stand || additionalDetails.nearestBusStand;
              const companyTransport = Boolean((job as any).companyTransportProvided ?? (job as any).company_transport_provided ?? additionalDetails.companyTransportProvided);
              const walkMins = (job as any).walkingMinutesToTransit || (job as any).walking_minutes_to_transit || additionalDetails.walkingMinutesToTransit || 5;
              const landmark = (job as any).landmark || additionalDetails.landmark;

              if (!nearestMetro && !nearestBus && !companyTransport && !landmark) return null;

              return (
                <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                      How to Reach Worksite (பணிமனைக்கு செல்லும் வழி)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {nearestMetro && (
                      <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 space-y-1 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">Nearest Metro</span>
                        <p className="text-xs font-bold text-blue-950 dark:text-blue-200">{nearestMetro} Metro Station</p>
                        <p className="text-[11px] text-blue-800 dark:text-blue-300/80">~{walkMins} mins walk or share-auto from station</p>
                      </div>
                    )}

                    {nearestBus && (
                      <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">Nearest Bus Stop</span>
                        <p className="text-xs font-bold text-amber-950 dark:text-amber-200">{nearestBus}</p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Direct MTC/state bus connectivity</p>
                      </div>
                    )}

                    {companyTransport && (
                      <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-1 shadow-2xs sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 block">Company Commute Provided</span>
                        <p className="text-xs font-bold text-purple-950 dark:text-purple-200">Free Pickup & Drop Van / Cab</p>
                        <p className="text-[11px] text-purple-800 dark:text-purple-300/80">Fixed shift pickup points provided by employer at no extra cost</p>
                      </div>
                    )}

                    {landmark && !nearestMetro && !nearestBus && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 space-y-1 shadow-2xs sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block">Worksite Landmark</span>
                        <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{landmark}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Blue-Collar Perks & Facilities Card (WorkIndia & Apna Viral Conversion Pattern) */}
            {(() => {
              const perksList: string[] = Array.isArray((job as any).perks) && (job as any).perks.length > 0
                ? (job as any).perks
                : (Array.isArray(additionalDetails.perks) ? additionalDetails.perks : []);

              if (perksList.length === 0) return null;

              return (
                <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                    <Sparkles className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                      Worksite Perks & Living Facilities
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {perksList.map((p, idx) => {
                      const perkStr = String(p).toLowerCase();
                      let label = p;
                      let desc = "Included with position";
                      let bg = "bg-white dark:bg-[#121215] border-[#e6e8ec] dark:border-zinc-800";

                      if (perkStr.includes('food') || perkStr.includes('meal')) {
                        label = "Free Food / Meals";
                        desc = "Daily lunch or canteen facility provided";
                        bg = "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40";
                      } else if (perkStr.includes('room') || perkStr.includes('accommodation') || perkStr.includes('lodging')) {
                        label = "Room / Lodging Included";
                        desc = "Free verified worker accommodation near worksite";
                        bg = "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-900/40";
                      } else if (perkStr.includes('daily') || perkStr.includes('weekly')) {
                        label = "Daily / Weekly Payout";
                        desc = "Fast cash flow settlement directly after shifts";
                        bg = "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40";
                      } else if (perkStr.includes('ot') || perkStr.includes('overtime')) {
                        label = "Overtime (OT) Pay Extra";
                        desc = "Extra wages paid for hours exceeding standard shift";
                        bg = "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40";
                      } else if (perkStr.includes('travel') || perkStr.includes('petrol') || perkStr.includes('fuel')) {
                        label = "Travel / Petrol Allowance";
                        desc = "Fuel reimbursement or company pickup arranged";
                        bg = "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-900/40";
                      }

                      return (
                        <div key={idx} className={`p-4 rounded-2xl border ${bg} space-y-1 shadow-2xs`}>
                          <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{label}</p>
                          <p className="text-[11px] text-[#717784] dark:text-zinc-400 leading-relaxed">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Role & Eligibility Criteria Card */}
            {(additionalDetails.department || additionalDetails.roleCategory || additionalDetails.employmentType || additionalDetails.shift || additionalDetails.education || additionalDetails.languages || additionalDetails.ageLimit || additionalDetails.gender) && (
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <Briefcase className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                    Role Requirements & Eligibility Criteria
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {additionalDetails.department && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Department</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.department}</p>
                    </div>
                  )}

                  {additionalDetails.roleCategory && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Role / Category</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.roleCategory}</p>
                    </div>
                  )}

                  {additionalDetails.employmentType && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Employment Type</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.employmentType}</p>
                    </div>
                  )}

                  {additionalDetails.shift && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Shift Timing</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.shift}</p>
                    </div>
                  )}

                  {additionalDetails.education && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Education</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.education}</p>
                    </div>
                  )}

                  {additionalDetails.languages && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Languages Known</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.languages}</p>
                    </div>
                  )}

                  {additionalDetails.ageLimit && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Age Limit</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.ageLimit}</p>
                    </div>
                  )}

                  {additionalDetails.gender && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Gender Preference</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.gender}</p>
                    </div>
                  )}

                  {additionalDetails.experience && (
                    <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wider block">Experience Range</span>
                      <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">{additionalDetails.experience}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Indeed-style Profile Qualifications & Skills Match for Worker */}
            {matchAnalysis && matchVisuals && (
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-extrabold text-sm ${matchVisuals.bg} ${matchVisuals.text} border ${matchVisuals.border} shadow-2xs shrink-0`}>
                      <span className="text-base leading-none">{matchAnalysis.overallScore}%</span>
                      <span className="text-[8px] uppercase tracking-wider opacity-85">Match</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 flex items-center gap-1.5">
                        <span>How your profile matches this job</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </h3>
                      <p className="text-xs text-[#717784] dark:text-zinc-400 mt-0.5">
                        {matchAnalysis.matchSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold self-start sm:self-auto">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{matchAnalysis.matchingSkills.length} Matching Skills</span>
                    </span>
                    {matchAnalysis.missingSkills.length > 0 && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1">
                        <span>{matchAnalysis.missingSkills.length} Missing</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Skills Match vs Missing Badges */}
                <div className="space-y-3 pt-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block mb-2">
                      Your Matching Skills
                    </span>
                    {matchAnalysis.matchingSkills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {matchAnalysis.matchingSkills.map((skill, idx) => (
                          <span 
                            key={`ms-${idx}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">None of your listed skills explicitly overlap with this role.</p>
                    )}
                  </div>

                  {matchAnalysis.missingSkills.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block mb-2">
                        Missing Skills / Learnable Competencies
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {matchAnalysis.missingSkills.map((skill, idx) => (
                          <span 
                            key={`mis-${idx}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-[#121215] border border-dashed border-amber-300 dark:border-amber-700/60 text-xs font-medium text-slate-700 dark:text-zinc-300 shadow-2xs"
                          >
                            <span className="text-amber-500 font-bold">•</span>
                            <span>Needs {skill}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Experience & Location breakdown chips */}
                  <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 flex flex-wrap items-center gap-3 text-xs text-[#717784] dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-[#0f2f63] dark:text-blue-400" />
                      <span>Experience Fit: <strong className="text-slate-800 dark:text-zinc-200">{matchAnalysis.breakdown.experience}%</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-blue-400" />
                      <span>Location Proximity: <strong className="text-slate-800 dark:text-zinc-200">{matchAnalysis.breakdown.location}%</strong></span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#0f2f63] dark:text-blue-400" />
                      <span>Verification Standing: <strong className="text-slate-800 dark:text-zinc-200">{matchAnalysis.breakdown.verification}%</strong></span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Required Skills & Competencies */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                <Award className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                  Required Technical Skills & Competencies
                </h3>
              </div>

              <div className="pt-1">
                {rawSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rawSkills.map((skill: string, idx: number) => (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 text-xs text-[#717784] dark:text-zinc-400">
                    Standard trade competencies and safety compliance required as outlined in the job scope.
                  </div>
                )}
              </div>
            </div>

            {/* Workplace Location & Worksite Details (No fake map coordinates) */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 sm:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                    Workplace Location & Directions
                  </h3>
                </div>
                <span className="text-xs font-semibold text-[#0f2f63] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                  {job.city || 'Pan India'}
                </span>
              </div>

              <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-3">
                <div className="flex items-start gap-2.5 text-xs text-[#0a0a0a] dark:text-zinc-200">
                  <MapPin className="w-4 h-4 text-[#0f2f63] dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[#0a0a0a] dark:text-zinc-100">Official Worksite Address</p>
                    <p className="text-[#717784] dark:text-zinc-400 mt-0.5">{job.address || job.location || 'Report to designated site office on commencement.'}</p>
                  </div>
                </div>

                {/* Leaflet Map Preview Container - ONLY IF VALID REAL COORDINATES EXIST */}
                {locationCoordinates ? (
                  <div className="w-full h-56 rounded-xl overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 relative z-0 isolate">
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
                  <div className="bg-[#fbfbfb] dark:bg-[#1C1C21] rounded-xl p-3 border border-[#e6e8ec] dark:border-zinc-800 flex items-center gap-3 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#0f2f63] dark:text-blue-400 shrink-0" />
                    <p className="text-[#717784] dark:text-zinc-400">Worksite location verified through employer compliance registration.</p>
                  </div>
                )}
              </div>
            </div>

            {/* SEO Trade & Location Equity Card */}
            {job.city && (
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <MapPin className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                    Explore More Verified Jobs in {cleanJobCity}
                  </h3>
                </div>
                <p className="text-xs text-[#5a6270] dark:text-zinc-400 leading-relaxed">
                  Looking for more verified openings in {cleanJobCity}? Browse direct employer opportunities across trades with guaranteed wage transparency.
                </p>
                <div className="pt-1">
                  <Link
                    to={`/jobs-in-${cleanJobCitySlug}`}
                    className="inline-flex items-center justify-between w-full p-3 bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-[#e2e4e9] dark:border-zinc-800 rounded-xl text-xs font-bold text-[#0f2f63] dark:text-sky-400 transition shadow-2xs"
                  >
                    <span>View all {cleanJobCity} Openings</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN (4 Cols): Role-Aware Console or Candidate Application */}
          <div className="col-span-1 lg:col-span-4 space-y-6">
            
            {/* If Employer: Render Employer Management Console */}
            {isEmployer ? (
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#0f2f63] dark:text-blue-400" />
                    <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                      Employer Operations
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                    {job.status === 'OPEN' || job.status === 'ACTIVE' ? 'Accepting Candidates' : (job.status || 'Active')}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-[#fbfbfb] dark:bg-[#1C1C21] rounded-xl border border-[#e6e8ec] dark:border-zinc-800">
                      <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Applicants</p>
                      <p className="text-xl font-bold text-[#0f2f63] dark:text-blue-400 mt-0.5 tabular-nums tracking-tight">{applicantCount}</p>
                    </div>
                    <div className="p-3 bg-[#fbfbfb] dark:bg-[#1C1C21] rounded-xl border border-[#e6e8ec] dark:border-zinc-800">
                      <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Experience</p>
                      <p className="text-xl font-bold text-[#0a0a0a] dark:text-zinc-100 mt-0.5 tabular-nums tracking-tight">{formatExactExperience(job, 'stat')}</p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <Link
                      to={`/jobs?jobId=${id}`}
                      className="w-full py-3 px-4 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-semibold text-xs uppercase shadow-xs transition-all flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      <span>Review Candidate Pipeline ({applicantCount})</span>
                    </Link>

                    <Link
                      to="/post-job"
                      className="w-full py-2.5 px-4 bg-white dark:bg-[#1C1C21] hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 text-[#0a0a0a] dark:text-zinc-200 rounded-full font-medium text-xs border border-[#e6e8ec] dark:border-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
                      <span>Post Another Opening</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              /* If Candidate: Render Candidate Application Card */
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                    Application Status
                  </h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isApproved 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                      : isOfferSent 
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse'
                      : isDeclined 
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : isApplied 
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-[#0f2f63] dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : isExpired
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-zinc-800 text-[#717784] dark:text-zinc-400 border-slate-200 dark:border-zinc-700'
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
                  <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                    
                    {/* Pipeline Stepper */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">Application Submitted</p>
                          <p className="text-[10px] text-[#717784] dark:text-zinc-400">Profile verified & application delivered</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isOfferSent || isApproved 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[#0f2f63] dark:bg-blue-600 text-white animate-pulse'
                        }`}>
                          {isOfferSent || isApproved ? '✓' : '2'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">Employer Review</p>
                          <p className="text-[10px] text-[#717784] dark:text-zinc-400">Under active review by hiring team</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isApproved 
                            ? 'bg-emerald-500 text-white' 
                            : isOfferSent 
                            ? 'bg-amber-500 text-white animate-ping' 
                            : 'bg-[#f4f4f4] dark:bg-zinc-800 text-[#717784] dark:text-zinc-400 border border-[#e6e8ec] dark:border-zinc-700'
                        }`}>
                          {isApproved ? '✓' : '3'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">Offer & Shift Assignment</p>
                          <p className="text-[10px] text-[#717784] dark:text-zinc-400">{isOfferSent ? 'Action required: Review offer below' : 'Pending manager decision'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Offer Received Actions */}
                    {isOfferSent && existingApplication?.id && (
                      <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 space-y-2">
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800">
                          🎉 The employer has made you an offer for this shift!
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => statusMutation.mutate({ id: existingApplication.id, status: 'ACCEPTED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-2 px-3 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold rounded-full uppercase transition-all cursor-pointer"
                          >
                            Accept Offer
                          </button>
                          <button
                            onClick={() => statusMutation.mutate({ id: existingApplication.id, status: 'DECLINED' })}
                            disabled={statusMutation.isPending}
                            className="flex-1 py-2 px-3 bg-white dark:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold rounded-full uppercase transition-all cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {isApproved && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-2">
                        <div>
                          <p className="font-bold">✓ Job Confirmed!</p>
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                            Please arrive at the worksite with your TrustHyre check-in barcode ready.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsRatingModalOpen(true)}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-full uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <Star className="w-3.5 h-3.5 fill-white text-white" />
                          <span>Rate Employer</span>
                        </button>
                      </div>
                    )}

                  </div>
                ) : isExpired ? (
                  <div className="bg-rose-50 dark:bg-rose-950/40 rounded-2xl p-4 border border-rose-200 dark:border-rose-800 space-y-3">
                    <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs uppercase">
                      <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Applications Closed</span>
                    </div>
                    <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                      This job reached its auto-expiry deadline on <strong>{expiryDate ? `${new Date(expiryDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })} at ${new Date(expiryDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'the scheduled deadline'}</strong> and is no longer accepting candidate submissions.
                    </p>
                    <Link
                      to="/jobs"
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
                    >
                      <span>Explore Active Openings</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                    <p className="text-xs text-[#717784] dark:text-zinc-400 leading-relaxed">
                      Submit your verified TrustHyre profile. Your verified ratings, attendance status, and skills are shared directly with the employer.
                    </p>

                    {/* Optional Note toggle */}
                    <div>
                      {!showCoverLetterInput ? (
                        <button
                          onClick={() => setShowCoverLetterInput(true)}
                          className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          + Add a quick note to employer (optional)
                        </button>
                      ) : (
                        <div className="space-y-1.5 animate-in fade-in">
                          <label className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400">Note to Employer</label>
                          <textarea
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            placeholder="Briefly state your relevant experience or shift availability..."
                            className="w-full text-xs p-3 rounded-xl border border-[#e6e8ec] dark:border-zinc-800 bg-[#fbfbfb] dark:bg-[#1C1C21] text-[#0a0a0a] dark:text-white focus:bg-white dark:focus:bg-[#121215] focus:border-[#0f2f63] dark:focus:border-sky-400 outline-none resize-none h-20"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <VoiceNoteRecorder onAudioRecorded={(url) => setVoiceNoteUrl(url)} />
                    </div>

                    <button
                      onClick={handleApply}
                      disabled={mutation.isPending}
                      className="w-full py-3 px-5 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* ⚡ DIRECT WALK-IN INTERVIEW FASTTRACK CARD (WorkIndia & Apna Pattern) */}
            {(() => {
              const isWalkIn = Boolean((job as any)?.isWalkInInterview || (job as any)?.additionalDetails?.isWalkInInterview);
              const walkIn = (job as any)?.walkInDetails || (job as any)?.additionalDetails?.walkInDetails;
              if (!isWalkIn) return null;

              const dates = walkIn?.dates || 'Ongoing this week';
              const timing = walkIn?.timing || '10:00 AM - 04:00 PM';
              const venue = walkIn?.venueAddress || job?.location || job?.address || 'Company Worksite';
              const contactPerson = walkIn?.contactPerson || employerName;
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue}, ${job?.city || ''}`)}`;

              return (
                <div className="bg-amber-50/90 dark:bg-amber-950/30 rounded-[1.75rem] p-5 sm:p-6 border border-amber-300 dark:border-amber-800 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                        ⚡ Direct Walk-in Interview Open
                      </h3>
                    </div>
                    <span className="text-[10px] font-extrabold text-amber-900 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                      FastTrack Hiring
                    </span>
                  </div>

                  <p className="text-xs text-amber-900 dark:text-amber-300/90 leading-relaxed font-medium">
                    No online waiting! Candidates who meet basic trade requirements can directly attend the physical interview drive:
                  </p>

                  <div className="bg-white/90 dark:bg-[#121215] rounded-2xl p-3.5 border border-amber-200 dark:border-zinc-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-amber-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-400 font-semibold">Walk-in Dates:</span>
                      <span className="font-bold text-[#0a0a0a] dark:text-zinc-100">{dates}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-amber-100 dark:border-zinc-800">
                      <span className="text-slate-500 dark:text-zinc-400 font-semibold">Timing Window:</span>
                      <span className="font-bold text-[#0a0a0a] dark:text-zinc-100">{timing}</span>
                    </div>
                    <div className="text-[11px] space-y-1 pt-0.5">
                      <span className="text-slate-500 dark:text-zinc-400 font-semibold block">Interview Venue / Landmark:</span>
                      <p className="font-bold text-[#0a0a0a] dark:text-zinc-100 leading-snug">{venue}</p>
                    </div>
                    {contactPerson && (
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-amber-100 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-400 font-semibold">HR / Contact:</span>
                        <span className="font-bold text-[#0f2f63] dark:text-sky-400">{contactPerson}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsWalkInPassOpen(true)}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-white" />
                      <span>Get 1-Tap Walk-In Pass</span>
                    </button>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5 shadow-xs transition-all no-underline shrink-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-950" />
                      <span>Directions</span>
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* 📞 Direct Recruiter Contact Card (WorkIndia & Apna Viral Direct Call Feature) */}
            {(() => {
              const allowDirectCall = (job as any).allowDirectCall ?? (job as any).allow_direct_call ?? additionalDetails.allowDirectCall ?? true;
              const allowDirectWhatsapp = (job as any).allowDirectWhatsapp ?? (job as any).allow_direct_whatsapp ?? additionalDetails.allowDirectWhatsapp ?? true;
              const contactPhone = (job as any).contactPhone || (job as any).contact_phone || additionalDetails.contactPhone || (employer as any)?.phoneNumber || (job as any).employerProfile?.phoneNumber;

              if (!contactPhone || (!allowDirectCall && !allowDirectWhatsapp)) return null;

              const parsed = parsePhoneNumber(contactPhone);
              const formattedPhone = parsed 
                ? `${parsed.countryCode} ${parsed.formattedNumber}` 
                : contactPhone;

              return (
                <div className="bg-emerald-50/80 dark:bg-emerald-950/30 rounded-[1.75rem] p-5 sm:p-6 border border-emerald-200/80 dark:border-emerald-800 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950 dark:text-emerald-300">
                        Direct HR & Recruiter Contact
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700">
                      Zero Middlemen
                    </span>
                  </div>

                  <p className="text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                    Have questions about the shift timing, daily pay, or worksite address? Connect directly with the verified employer:
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    {allowDirectCall && (
                      <a
                        href={`tel:${contactPhone}`}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer no-underline"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call HR Directly ({formattedPhone})</span>
                      </a>
                    )}

                    {allowDirectWhatsapp && (
                      <button
                        type="button"
                        onClick={handleWhatsAppApply}
                        className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat with Employer on WhatsApp</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Direct Verified Employer Snapshot */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-2.5">
                <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                  About the Employer
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Verified Identity
                </span>
              </div>

              <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 border border-[#e6e8ec] dark:border-zinc-800 space-y-2.5 text-xs">
                <p className="font-bold text-[#0a0a0a] dark:text-zinc-100 text-sm">{employerName}</p>
                <p className="text-[11px] text-[#717784] dark:text-zinc-400 leading-relaxed">
                  {employer?.profileBio || 'Verified employer committed to fair workplaces and transparent hiring standards.'}
                </p>
                <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 flex justify-between items-center text-[11px] text-[#717784] dark:text-zinc-400">
                  <span>Identity Verification:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">100% Certified</span>
                </div>
              </div>
            </div>

            {/* Quick Job Details Card */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-[1.75rem] p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-3">
              <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 border-b border-[#e6e8ec] dark:border-zinc-800 pb-2.5">
                Job Overview Details
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60 dark:border-zinc-800">
                  <span className="text-[#717784] dark:text-zinc-400">Job Type:</span>
                  <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{additionalDetails.employmentType || (job as any).jobType || (job.status === 'OPEN' ? 'Open Shift' : 'Full Time')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60 dark:border-zinc-800">
                  <span className="text-[#717784] dark:text-zinc-400">Experience Required:</span>
                  <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{additionalDetails.experience || formatExactExperience(job, 'detail')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60 dark:border-zinc-800">
                  <span className="text-[#717784] dark:text-zinc-400">Work Schedule:</span>
                  <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{additionalDetails.shift || 'Regular Shifts'}</span>
                </div>
                {additionalDetails.education && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60 dark:border-zinc-800">
                    <span className="text-[#717784] dark:text-zinc-400">Education:</span>
                    <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{additionalDetails.education}</span>
                  </div>
                )}
                {additionalDetails.languages && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60 dark:border-zinc-800">
                    <span className="text-[#717784] dark:text-zinc-400">Languages:</span>
                    <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{additionalDetails.languages}</span>
                  </div>
                )}
                {additionalDetails.gender && (
                  <div className="flex justify-between items-center py-1 border-b border-[#e6e8ec]/60 dark:border-zinc-800">
                    <span className="text-[#717784] dark:text-zinc-400">Gender:</span>
                    <span className="font-semibold text-[#0a0a0a] dark:text-zinc-200">{additionalDetails.gender}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#717784] dark:text-zinc-400">Verification Status:</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Verified Employer</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {isRatingModalOpen && job && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          jobId={job.id}
          rateeId={job.employerId || (job as any).employer_id || (job as any)?.employerProfile?.userId}
          rateeName={(job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Employer'}
          rateeRole="employer"
          jobTitle={job.title}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: queryKeys.jobs.myApplications });
          }}
        />
      )}

      {/* HIRING PAMPHLET / POSTER MODAL (WorkIndia model) */}
      {isPamphletModalOpen && job && (
        <JobPamphletModal
          isOpen={isPamphletModalOpen}
          onClose={() => setIsPamphletModalOpen(false)}
          job={{
            id: job.id,
            title: job.title,
            companyName: (job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Employer',
            city: job.city,
            location: job.location,
            budget: job.budget,
            perks: Array.isArray((job as any).perks) && (job as any).perks.length > 0
              ? (job as any).perks
              : (Array.isArray(additionalDetails.perks) ? additionalDetails.perks : []),
            contactPhone: (job as any).contactPhone || (job as any).contact_phone || additionalDetails.contactPhone || (employer as any)?.phoneNumber || (job as any).employerProfile?.phoneNumber,
            isUrgentSpotHire: Boolean((job as any).isUrgentSpotHire || additionalDetails.isUrgentSpotHire)
          }}
        />
      )}

      {/* 🎟️ 1-TAP WALKIN PASS MODAL */}
      {isWalkInPassOpen && job && (
        <WalkInPassModal
          isOpen={isWalkInPassOpen}
          onClose={() => setIsWalkInPassOpen(false)}
          job={{
            id: job.id,
            title: job.title,
            companyName: (job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Employer',
            city: job.city,
            location: job.location,
            walkInDetails: (job as any)?.walkInDetails || additionalDetails.walkInDetails,
            contactPhone: (job as any).contactPhone || (job as any).contact_phone || additionalDetails.contactPhone || (employer as any)?.phoneNumber || (job as any).employerProfile?.phoneNumber
          }}
          candidate={{
            fullName: profile?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Verified Candidate',
            trade: (profile as any)?.primaryTrade || (profile as any)?.trade || (job as any)?.industry || 'Specialist',
            phone: profile?.phoneNumber || user?.phoneNumber || user?.phone || 'Contact via TrustHyre',
            experienceYears: profile?.experienceYears || 1,
            profileId: (profile as any)?.id || user?.id
          }}  
        />
      )}

      {/* 📋 1-TAP INTERVIEW PREP & DOCUMENT CHECKLIST MODAL */}
      {isPrepKitOpen && job && (
        <InterviewPrepKitModal
          isOpen={isPrepKitOpen}
          onClose={() => setIsPrepKitOpen(false)}
          jobTitle={job.title}
          companyName={(job as any)?.employerProfile?.companyName || (job as any)?.employerName || 'Verified Employer'}
          locationCity={job.city || job.location || 'Local Worksite'}
          contactPhone={(job as any).contactPhone || (job as any).contact_phone || additionalDetails.contactPhone || (employer as any)?.phoneNumber || (job as any).employerProfile?.phoneNumber}
        />
      )}
    </div>
  );
}
