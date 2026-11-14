import { useState, useRef, useMemo } from "react";
import { useAuth, useUser } from "../../../providers/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { profileService, type WorkerProfile } from "../../../services/profile.service";
import { applicationService } from "../../../services/application.service";
import { jobService } from "../../../services/job.service";
import { queryKeys } from "../../../lib/queryKeys";
import { UserAvatar } from "../../../components/common/UserAvatar";
import { AppLoader } from "../../../components/common/AppLoader";
import { PhoneDisplay } from "../../../components/common/PhoneDisplay";
import { 
  ShieldCheck, 
  MapPin, 
  MapPinned, 
  Star, 
  History, 
  Camera, 
  Edit2, 
  CheckCircle2, 
  Zap, 
  GraduationCap, 
  Languages, 
  Briefcase, 
  Calendar, 
  User as UserIcon, 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  Download, 
  Sparkles,
  Globe,
  Award,
  Loader2,
  UploadCloud,
  ChevronRight,
  TrendingUp,
  Check
} from "lucide-react";
import { EditWorkerProfileModal } from "../components/EditWorkerProfileModal";
import { CandidateResumeModal } from "../components/resume/CandidateResumeModal";
import type { ResumeData } from "../components/resume/CandidateResumeView";
import { normalizeSkills } from "../../../utils/skills";
import { ratingService } from "../../../services/rating.service";
import { ReviewsList } from "../../../components/common/ReviewsList";
import { RatingModal } from "../../../components/common/RatingModal";
import { VisitingCardModal } from "../../../components/common/VisitingCardModal";
import { ReferralDashboardSection } from "../components/ReferralDashboardSection";

export default function WorkerProfileDetailsPage() {
  const { user } = useUser();
  const { updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isVisitingCardOpen, setIsVisitingCardOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'academics' | 'skills' | 'applications' | 'reviews' | 'about'>('academics');
  const [ratingTarget, setRatingTarget] = useState<{
    jobId: string;
    rateeId: string;
    rateeName: string;
    jobTitle?: string;
  } | null>(null);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoFeedback("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      setTimeout(() => setPhotoFeedback(null), 4000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoFeedback("Image file is too large (maximum 10MB).");
      setTimeout(() => setPhotoFeedback(null), 4000);
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoFeedback(null);

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
          // 1. Update backend
          await profileService.updateProfile({
            profileImageUrl: compressedDataUrl,
            profile_image_url: compressedDataUrl,
            profilePhoto: compressedDataUrl
          });

          // 2. Update Auth user state
          updateUser({
            ...user,
            profileImageUrl: compressedDataUrl,
            profile_image_url: compressedDataUrl
          });

          // 3. Update React Query Cache immediately
          queryClient.setQueryData(queryKeys.workers.detail('me'), (old: any) => ({
            ...(old || {}),
            profileImageUrl: compressedDataUrl,
            profile_image_url: compressedDataUrl,
            profilePhoto: compressedDataUrl
          }));
          queryClient.setQueryData(queryKeys.workers.me, (old: any) => ({ ...(old || {}), profileImageUrl: compressedDataUrl, profile_image_url: compressedDataUrl, profilePhoto: compressedDataUrl }));

          setPhotoFeedback("Profile photo updated successfully!");
          setTimeout(() => setPhotoFeedback(null), 4000);
        } catch (err) {
          console.error("Failed to update photo:", err);
          setPhotoFeedback("Failed to update profile photo. Please try again.");
          setTimeout(() => setPhotoFeedback(null), 4000);
        } finally {
          setIsUploadingPhoto(false);
        }
      };
      img.onerror = () => {
        setPhotoFeedback("Failed to process image file.");
        setIsUploadingPhoto(false);
        setTimeout(() => setPhotoFeedback(null), 4000);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setPhotoFeedback("Failed to read file.");
      setIsUploadingPhoto(false);
      setTimeout(() => setPhotoFeedback(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const { data: profile, isLoading: isProfileLoading } = useQuery<WorkerProfile | null>({
    queryKey: queryKeys.workers.detail('me'),
    queryFn: profileService.getWorkerProfile,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: queryKeys.jobs.myApplications,
    queryFn: applicationService.getMyApplications,
  });

  // Collect any missing jobIds to fetch fresh full job details if nested job object is not populated
  const missingJobIds = useMemo(() => {
    return Array.from(new Set(
      myApplications
        .filter((app: any) => !app.job && !app.jobs && (app.jobId || app.job_id))
        .map((app: any) => app.jobId || app.job_id)
    ));
  }, [myApplications]);

  const { data: fallbackJobs = [] } = useQuery({
    queryKey: ['workerProfileFallbackJobs', missingJobIds],
    queryFn: () => jobService.getJobsByIds(missingJobIds),
    enabled: missingJobIds.length > 0,
  });

  const fallbackJobsById = useMemo(() => {
    return new Map(fallbackJobs.filter((j: any) => j.id).map((j: any) => [j.id, j]));
  }, [fallbackJobs]);

  const workerUserId = profile?.userId || user?.id || '';
  const { data: verifiedReviews = [], isLoading: isReviewsLoading } = useQuery({
    queryKey: ['ratings', 'user', workerUserId],
    queryFn: () => ratingService.getRatingsForRatee(workerUserId),
    enabled: Boolean(workerUserId)
  });

  const handleUpdateGPSLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.");
      setTimeout(() => setLocationStatus(null), 4000);
      return;
    }

    setIsLocating(true);
    setLocationStatus("Detecting GPS coordinates...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          let detectedCity = profile?.city || 'Local area';
          let detectedAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const addr = geoData.address;
              detectedCity = addr.city || addr.town || addr.suburb || addr.state_district || detectedCity;
              detectedAddress = [addr.suburb || addr.neighbourhood, detectedCity].filter(Boolean).join(', ');
            }
          } catch {
            // fallback
          }

          await profileService.updateProfile({
            latitude,
            longitude,
            city: detectedCity,
            address: detectedAddress,
            location: detectedAddress,
          });

          queryClient.setQueryData(queryKeys.workers.detail('me'), (old: any) => ({
            ...(old || {}),
            latitude,
            longitude,
            city: detectedCity,
            address: detectedAddress,
            location: detectedAddress,
          }));

          setLocationStatus(`Live GPS: ${detectedAddress}`);
          setTimeout(() => setLocationStatus(null), 5000);
        } catch (err: any) {
          console.error("GPS update error:", err);
          setLocationStatus("Failed to update profile location");
          setTimeout(() => setLocationStatus(null), 4000);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("GPS error:", err);
        setIsLocating(false);
        setLocationStatus("GPS access denied. Enable location in browser settings.");
        setTimeout(() => setLocationStatus(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (isProfileLoading && !profile) {
    return (
      <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] flex items-center justify-center transition-colors duration-200">
        <AppLoader variant="page" message="Loading verified worker profile..." />
      </div>
    );
  }

  const isVerified = Boolean(user?.identityVerified || (user as any)?.isVerified || (profile as any)?.is_verified || (profile as any)?.isVerified);
  const completedJobsCount = (profile as any)?.completed_jobs || (profile as any)?.completedJobs || myApplications.filter((a: any) => a.status === 'ACCEPTED' || a.status === 'COMPLETED').length;
  const calculatedAvgRating = verifiedReviews.length > 0
    ? (verifiedReviews.reduce((sum, r) => sum + (r.score || 0), 0) / verifiedReviews.length).toFixed(1)
    : null;
  const ratingDisplay = calculatedAvgRating
    ? calculatedAvgRating
    : (profile as any)?.rating
    ? Number((profile as any).rating).toFixed(1)
    : (profile?.trustScore ? `${(profile.trustScore / 200).toFixed(1)}` : 'New');

  const formattedPhone = profile?.phoneNumber || user?.phoneNumber || 'Not provided';
  const displayEmail = profile?.email || user?.email || 'Not provided';
  const displayDob = profile?.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const displayGender = profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1).toLowerCase() : null;

  // Language mapping
  const englishLevelLabel = 
    profile?.englishProficiency === 'FLUENT' ? 'Fluent (Speak, Read & Write comfortably)' :
    profile?.englishProficiency === 'GOOD' ? 'Good (Can speak & understand well)' :
    profile?.englishProficiency === 'BASIC' ? 'Basic (Elementary greetings & terms)' :
    profile?.englishProficiency === 'NONE' ? 'No English' :
    profile?.englishProficiency || 'Basic English';

  // Resume builder data
  const resumeData: ResumeData = {
    fullName: profile?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Candidate',
    phoneNumber: formattedPhone !== 'Not provided' ? formattedPhone : undefined,
    email: displayEmail !== 'Not provided' ? displayEmail : undefined,
    profileImageUrl: profile?.profileImageUrl 
      || profile?.profilePhoto 
      || (profile as any)?.profile_image_url 
      || user?.profileImageUrl 
      || user?.profile_image_url 
      || undefined,
    city: profile?.city || profile?.location || undefined,
    area: profile?.area || profile?.address || '',
    highestEducation: profile?.highestEducation || undefined,
    isPursuingEducation: profile?.isPursuingEducation || false,
    collegeName: profile?.collegeName || '',
    degree: profile?.degree || '',
    specialization: profile?.specialization || '',
    schoolMedium: profile?.schoolMedium || '',
    englishProficiency: englishLevelLabel,
    languagesKnown: profile?.languagesKnown && profile.languagesKnown.length > 0 ? profile.languagesKnown : [],
    preferredRoles: profile?.preferredRoles && profile.preferredRoles.length > 0 ? profile.preferredRoles : normalizeSkills(profile?.skills),
    skills: normalizeSkills(profile?.skills),
    experienceYears: profile?.experienceYears || 0,
    bio: profile?.bio || undefined,
    dob: profile?.dob || '',
    gender: profile?.gender || '',
    isVerified: isVerified
  };

  const normalizedSkills = normalizeSkills(profile?.skills);
  const currentTrade = profile?.preferredRoles?.[0] || normalizedSkills[0] || 'Specialist Candidate';

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* 1. HERO PROFILE CARD (Landing Page Aesthetic) */}
        <div className="bg-white dark:bg-[#121215] rounded-[2rem] p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Identity & Avatar Cluster */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              
              {/* Photo Input & Avatar */}
              <div className="relative shrink-0">
                <input 
                  type="file" 
                  ref={photoInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div 
                  onClick={() => !isUploadingPhoto && photoInputRef.current?.click()}
                  title="Click to update photo"
                  className="relative group cursor-pointer"
                >
                  <UserAvatar 
                    src={profile?.profileImageUrl || (profile as any)?.profile_image_url || (profile as any)?.profilePhoto || user?.profileImageUrl || (user as any)?.profile_image_url || (user as any)?.photoURL} 
                    name={profile?.fullName || user?.firstName} 
                    size="xl" 
                  />
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 group-hover:scale-110 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-md transition-all">
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              </div>

              {/* Name, Trade, Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1931] dark:text-white">
                    {profile?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Candidate Profile'}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    isVerified ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{isVerified ? 'Biometric Verified' : 'Pending Verification'}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                  <span className="px-3 py-1 bg-[#0f2f63]/5 dark:bg-blue-950/40 text-[#0f2f63] dark:text-sky-300 border border-[#0f2f63]/10 dark:border-blue-900/40 rounded-full font-semibold">
                    {currentTrade}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                    <span>{profile?.city || profile?.location || 'Local Matching Area'}</span>
                  </span>
                  <span>•</span>
                  <span>{profile?.experienceYears ? `${profile.experienceYears}+ Years Experience` : 'Entry Level / Fresher'}</span>
                </div>

                {photoFeedback && (
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full inline-flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{photoFeedback}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Action Buttons Cluster */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 w-full lg:w-auto">
              <button 
                onClick={() => setIsVisitingCardOpen(true)}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
                title="Apna-style digital visiting card for WhatsApp"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Visiting Card</span>
              </button>
              <button 
                onClick={() => setIsResumeModalOpen(true)}
                className="col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-medium text-xs shadow-xs transition-all cursor-pointer active:scale-95 uppercase"
              >
                <FileText className="w-4 h-4" />
                <span>View CV</span>
              </button>
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="col-span-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-[#1C1C21] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200/80 dark:border-zinc-800 text-[#0A1931] dark:text-zinc-200 rounded-full font-medium text-xs shadow-2xs transition-all cursor-pointer uppercase active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span>Edit Profile</span>
              </button>
            </div>

          </div>
        </div>

        
        {/* 3. MAIN 2-COLUMN PROFILE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN (4 Cols): Official Contact, Trust Tier & Quick Stats (order-2 on mobile so tabs are immediately visible) */}
          <div className="col-span-1 lg:col-span-4 space-y-6 order-2 lg:order-1">
            
            {/* Trust Level Tier Progression Card */}
            <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                  <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-400">
                    Trust Progression
                  </h3>
                </div>
                <Link to="/level" className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:underline flex items-center gap-1">
                  <span>Level Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="bg-slate-50/80 dark:bg-[#1C1C21] p-4 rounded-[1.25rem] border border-slate-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0A1931] dark:text-white">
                    Level 2: Verified Specialist
                  </span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Tier 2
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200/70 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0f2f63] dark:bg-blue-600 h-full rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Complete 2 more verified shifts or pass a trade test to unlock Level 3 verified specialist badge.
                </p>
              </div>

              {/* Quick Metrics 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">Completed</p>
                  <p className="text-xl font-bold text-[#0A1931] dark:text-white mt-0.5">{completedJobsCount}</p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">shifts</p>
                </div>
                <div className="bg-slate-50/80 dark:bg-[#1C1C21] p-3.5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                  <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400">Rating</p>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <span className="text-xl font-bold text-[#0A1931] dark:text-white">{ratingDisplay}</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">average</p>
                </div>
              </div>
            </div>

            {/* Official Contact & Identification Card */}
            <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
                <UserIcon className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-400">
                  Contact & Profile Details
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" /> Phone
                  </span>
                  <PhoneDisplay phone={formattedPhone} />
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" /> Email
                  </span>
                  <span className="font-bold text-[#0A1931] dark:text-zinc-200 truncate max-w-[150px]" title={displayEmail}>
                    {displayEmail}
                  </span>
                </div>

                {displayDob && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" /> Date of Birth
                    </span>
                    <span className="font-bold text-[#0A1931] dark:text-zinc-200">{displayDob}</span>
                  </div>
                )}

                {displayGender && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                    <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" /> Gender
                    </span>
                    <span className="font-bold text-[#0A1931] dark:text-zinc-200">{displayGender}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> WhatsApp Alerts
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    profile?.whatsappOptIn !== false ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                  }`}>
                    {profile?.whatsappOptIn !== false ? 'Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Work Zone & Live Location Card */}
            <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800">
                <MapPinned className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-400">
                  Operational Zone & GPS
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0f2f63] dark:text-sky-400 mt-0.5 shrink-0" />
                  <p className="font-semibold text-[#0A1931] dark:text-white">
                    {profile?.address || profile?.city || profile?.location || 'Location not specified'}
                  </p>
                </div>

                {profile?.latitude && profile?.longitude && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Coordinates: ({profile.latitude.toFixed(2)}°, {profile.longitude.toFixed(2)}°)
                  </p>
                )}

                {locationStatus && (
                  <p className="text-xs font-semibold text-[#0f2f63] dark:text-sky-300 bg-slate-50/80 dark:bg-[#1C1C21] p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800">
                    {locationStatus}
                  </p>
                )}

                {profile?.willingToRelocate && (
                  <div className="p-3 bg-slate-50/80 dark:bg-[#1C1C21] rounded-xl border border-slate-100 dark:border-zinc-800 text-xs space-y-1">
                    <p className="font-bold text-[#0A1931] dark:text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" /> Willing to relocate for work
                    </p>
                    {profile?.preferredCities && profile.preferredCities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {profile.preferredCities.map((city, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded text-[10px] font-semibold text-[#0A1931] dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-700 shadow-2xs">
                            {city}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleUpdateGPSLocation}
                  disabled={isLocating}
                  className="w-full py-2.5 bg-slate-50 dark:bg-[#1C1C21] hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#0f2f63] dark:text-sky-300 font-medium text-xs rounded-full border border-slate-200 dark:border-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase active:scale-95 shadow-2xs mt-2"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isLocating ? 'Detecting Location...' : 'Update Live Location'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (8 Cols): Tabbed Profile Sections (order-1 on mobile so main tabs are immediately visible) */}
          <div className="col-span-1 lg:col-span-8 space-y-6 order-1 lg:order-2">
            
            {/* Pill Tab Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'academics', label: 'Academic & Education', icon: GraduationCap },
                { id: 'skills', label: 'Skills & Trade Certs', icon: Award },
                { id: 'reviews', label: `Verified Reviews (${verifiedReviews.length})`, icon: Star },
                { id: 'applications', label: 'Application History', icon: History },
                { id: 'about', label: 'Bio & Background', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#0f2f63] dark:bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100/90 dark:bg-[#121215] hover:bg-slate-200/60 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200/60 dark:border-zinc-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENT: Academics */}
            {activeTab === 'academics' && (
              <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-7 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                    <h3 className="text-sm font-bold text-[#0A1931] dark:text-white">
                      Educational Credentials & Academics
                    </h3>
                  </div>
                  {profile?.highestEducation && (
                    <span className="px-3 py-1 bg-slate-50/80 dark:bg-[#1C1C21] text-[#0f2f63] dark:text-sky-300 text-xs font-semibold rounded-full border border-slate-200/60 dark:border-zinc-800">
                      {profile.highestEducation}
                    </span>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/80 dark:bg-[#1C1C21] rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Highest Qualification</span>
                    <p className="text-sm font-bold text-[#0A1931] dark:text-white">
                      {profile?.highestEducation || 'High School / Secondary'}
                    </p>
                    <span className="inline-block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      {profile?.isPursuingEducation ? '• Currently Studying / Pursuing' : '• Completed & Verified'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50/80 dark:bg-[#1C1C21] rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Degree / Specialization</span>
                    <p className="text-sm font-bold text-[#0A1931] dark:text-white">
                      {profile?.degree || profile?.specialization || profile?.schoolMedium ? (
                        `${profile?.degree || ''} ${profile?.specialization ? `(${profile.specialization})` : ''} ${profile?.schoolMedium ? `- ${profile.schoolMedium}` : ''}`.trim()
                      ) : (
                        'Standard Secondary Education'
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                      {profile?.collegeName || 'Recognized Board / Technical Institute'}
                    </p>
                  </div>
                </div>

                {/* Language Matrix */}
                <div className="pt-2 space-y-3">
                  <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" /> Language Matrix
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/80 dark:bg-[#1C1C21] rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">English Competency</span>
                      <p className="text-sm font-bold text-[#0A1931] dark:text-white">{englishLevelLabel}</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">Standard workplace communication ready</p>
                    </div>

                    <div className="p-4 bg-slate-50/80 dark:bg-[#1C1C21] rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">Other Languages Known</span>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {profile?.languagesKnown && profile.languagesKnown.length > 0 ? (
                          profile.languagesKnown.map((lang, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-100/90 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-lg border border-slate-200/60 dark:border-zinc-700 shadow-2xs">
                              {lang}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">English, Tamil, Hindi</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Skills & Certifications */}
            {activeTab === 'skills' && (
              <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-7 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                    <h3 className="text-sm font-bold text-[#0A1931] dark:text-white">
                      Verified Trade Skills & Certifications
                    </h3>
                  </div>
                  <Link
                    to="/tests"
                    className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <span>Take Skill Test</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {/* Preferred Roles */}
                  {profile?.preferredRoles && profile.preferredRoles.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Primary Target Trades:</span>
                      <div className="flex flex-wrap gap-2">
                        {profile.preferredRoles.map((role, idx) => (
                          <div 
                            key={idx} 
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-[#1C1C21] border border-slate-200/60 dark:border-zinc-800 text-[#0A1931] dark:text-zinc-200 font-semibold text-xs shadow-2xs"
                          >
                            <Award className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
                            <span>{role}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registered Skills */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase">Verified Competencies:</span>
                    <div className="flex flex-wrap gap-2">
                      {normalizedSkills.length > 0 ? (
                        normalizedSkills.map((skill, idx) => (
                          <div 
                            key={idx} 
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50/80 dark:bg-[#1C1C21] border border-slate-200/60 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs shadow-2xs hover:border-[#0f2f63]/40 dark:hover:border-zinc-700 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{skill}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
                          No competencies registered. Update your profile to add skills.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Verified Reviews */}
            {activeTab === 'reviews' && (
              <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-7 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-6 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <h3 className="text-sm font-bold text-[#0A1931] dark:text-white">
                      Verified Employer Reviews & Performance Feedback
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                    {verifiedReviews.length} Verified Shifts
                  </span>
                </div>
                <ReviewsList
                  ratings={verifiedReviews}
                  isLoading={isReviewsLoading}
                  emptyTitle="No employer reviews recorded yet"
                  emptySubtitle="Once you complete verified job shifts on TrustHyre, authentic feedback and ratings from hiring managers will appear here."
                />
              </div>
            )}

            {/* TAB CONTENT: Applications */}
            {activeTab === 'applications' && (
              <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] border border-slate-200/80 dark:border-zinc-800 shadow-xs overflow-hidden animate-in fade-in duration-150">
                <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                    <h3 className="text-sm font-bold text-[#0A1931] dark:text-white">
                      Recent Job Applications & Status
                    </h3>
                  </div>
                  <Link to="/applied-jobs" className="text-xs font-semibold text-[#0f2f63] dark:text-sky-400 hover:underline flex items-center gap-1">
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {myApplications.length === 0 ? (
                    <div className="p-10 text-center space-y-3">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-[#1C1C21] rounded-2xl flex items-center justify-center mx-auto text-slate-500 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-800">
                        <Briefcase className="w-6 h-6 text-[#0f2f63] dark:text-sky-400" />
                      </div>
                      <h4 className="text-sm font-bold text-[#0A1931] dark:text-white">No job applications yet</h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                        Explore verified openings matching your skills to start working and connecting directly with employers.
                      </p>
                      <Link 
                        to="/search" 
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-medium rounded-full uppercase shadow-xs transition-all active:scale-95"
                      >
                        Browse Jobs
                      </Link>
                    </div>
                  ) : (
                    myApplications.slice(0, 5).map((app: any) => {
                      const linkedJob = app.job || app.jobs || fallbackJobsById.get(app.jobId || app.job_id);
                      const displayTitle = linkedJob?.title || app.jobTitle || app.title || 'Verified Role';
                      const displayLocation = linkedJob?.location || linkedJob?.city || app.jobLocation || 'Local area';
                      const rawBudget = linkedJob?.budget ?? app.jobBudget ?? app.budget;
                      const hasBudget = rawBudget !== undefined && rawBudget !== null && !isNaN(Number(rawBudget)) && Number(rawBudget) > 0;
                      const displayBudget = hasBudget
                        ? `₹${Number(rawBudget).toLocaleString('en-IN')}`
                        : 'Negotiated / Market Standard';

                      const employerId = linkedJob?.employerId || linkedJob?.employer_id || linkedJob?.employerProfile?.userId;
                      const employerName = linkedJob?.employerProfile?.companyName || linkedJob?.employerName || app.employerName || 'Employer';

                      return (
                        <div key={app.id} className="p-4 sm:p-5 bg-white dark:bg-[#121215] hover:bg-slate-50/70 dark:hover:bg-zinc-800/60 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                          <div className="flex gap-3.5 items-center">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#1C1C21] border border-slate-200/60 dark:border-zinc-800 flex items-center justify-center font-bold text-[#0f2f63] dark:text-sky-400 shrink-0">
                              <Zap className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs sm:text-sm text-[#0A1931] dark:text-white">
                                {displayTitle}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                {displayLocation}
                              </p>
                            </div>
                          </div>
                          <div className="text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:justify-end items-center sm:items-end gap-1.5">
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                              {displayBudget}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {(app.status === 'ACCEPTED' || app.status === 'COMPLETED' || app.status === 'APPROVED') && employerId && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRatingTarget({
                                      jobId: app.jobId || app.job_id || linkedJob?.id,
                                      rateeId: employerId,
                                      rateeName: employerName,
                                      jobTitle: displayTitle
                                    });
                                  }}
                                  className="px-2.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-2xs"
                                >
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                  <span>Rate Employer</span>
                                </button>
                              )}
                              <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                app.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                app.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200/60 dark:border-zinc-700'
                              }`}>
                                {app.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: About / Bio */}
            {activeTab === 'about' && (
              <div className="bg-white dark:bg-[#121215] rounded-[1.75rem] p-6 sm:p-7 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <FileText className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                  <h3 className="text-sm font-bold text-[#0A1931] dark:text-white">
                    Professional Summary & Bio
                  </h3>
                </div>
                <div className="bg-slate-50/80 dark:bg-[#1C1C21] p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
                  <p>{profile?.bio || 'Dedicated professional with verified skills, strong work ethic, and quick learning capabilities. Committed to punctual delivery, clean trade standards, and reliable attendance across client assignments.'}</p>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* 4. TRACKABLE COMMUNITY REFERRAL SYSTEM */}
        <ReferralDashboardSection userRole="WORKER" />
      </main>

      {/* QUICK EDIT MODAL */}
      <EditWorkerProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile || undefined}
      />

      {/* CANDIDATE VERIFIED RESUME MODAL */}
      <CandidateResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        data={resumeData}
      />

      {/* DIGITAL VISITING CARD MODAL (Apna-style smart card) */}
      <VisitingCardModal
        isOpen={isVisitingCardOpen}
        onClose={() => setIsVisitingCardOpen(false)}
        data={{
          id: user?.id,
          fullName: profile?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Candidate',
          trade: currentTrade,
          profileImageUrl: profile?.profileImageUrl || (profile as any)?.profile_image_url || (profile as any)?.profilePhoto || user?.profileImageUrl,
          phoneNumber: profile?.phoneNumber || user?.phoneNumber,
          city: profile?.city || profile?.location || 'India',
          experienceYears: profile?.experienceYears || 1,
          ratingAverage: verifiedReviews.length > 0
            ? verifiedReviews.reduce((acc: number, r: any) => acc + (r.score || 5), 0) / verifiedReviews.length
            : 5.0,
          ratingCount: verifiedReviews.length,
          isVerified: isVerified,
          referralCode: (user as any)?.referralCode || (user as any)?.referral_code
        }}
      />

      {/* RATING MODAL */}
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

