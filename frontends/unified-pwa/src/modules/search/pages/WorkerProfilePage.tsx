import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workerService } from '../../../services/worker.service';
import { ratingService } from '../../../services/rating.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useSavedStore } from '../../../hooks/useSavedStore';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  ChevronLeft, 
  Share2, 
  Bookmark, 
  CheckCircle2, 
  Zap, 
  MapPin,
  Mail,
  Phone,
  Briefcase,
  FileText,
  GraduationCap,
  Languages,
  Calendar,
  User as UserIcon,
  Globe,
  Award,
  Sparkles,
  Download,
  MessageSquare,
  Check,
  Star,
  Clock,
  Building2,
  BadgeCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { AppLoader } from '../../../components/common/AppLoader';
import { SeoHead, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { CandidateResumeModal } from '../../profile/components/resume/CandidateResumeModal';
import { useUser } from '../../../providers/AuthContext';
import { 
  buildEmployerToWorkerOutreachMessage, 
  buildWorkerSkillBadgeShareMessage, 
  openWhatsAppDirectChat, 
  openWhatsAppShare 
} from '../../../utils/whatsappTemplate.utils';
import type { ResumeData } from '../../profile/components/resume/CandidateResumeView';

export const WorkerProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  const { isWorkerSaved, toggleSaveWorker } = useSavedStore();

  useEffect(() => {
    if (id) {
      workerService.incrementProfileView(id).catch(() => {});
    }
  }, [id]);

  const { data: worker, isLoading: isLoadingWorker } = useQuery({
    queryKey: queryKeys.workers.detail(id || ''),
    queryFn: () => workerService.getWorkerById(id || ''),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes fresh
  });

  const targetUserId = worker?.userId || id || '';

  const { data: workHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['worker', 'work-history', targetUserId],
    queryFn: () => workerService.getWorkerWorkHistory(targetUserId),
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: ratingsData = [], isLoading: isLoadingRatings } = useQuery({
    queryKey: ['worker', 'ratings', targetUserId],
    queryFn: () => ratingService.getRatingsForRatee(targetUserId),
    enabled: !!targetUserId,
    staleTime: 1000 * 60 * 5,
  });

  const isSaved = isWorkerSaved(worker?.userId || id || '');

  const handleShare = async () => {
    const shareData = {
      title: `${worker?.name || 'Worker Specialist'} - TrustHyre Profile`,
      text: `Check out ${worker?.name || 'this candidate'}'s verified profile on TrustHyre`,
      url: window.location.href,
    };
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Worker profile link copied to clipboard!');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Worker profile link copied to clipboard!');
      }
    }
  };

  const { user } = useUser();
  const isCandidateViewingOwn = Boolean(user && (user.id === id || user.id === worker?.userId));
  const isEmployer = Boolean(user && user.role === 'EMPLOYER');

  const handleWhatsAppEmployerChat = () => {
    if (!worker) return;
    const workerPhone = worker.phoneNumber || (worker as any).phone_number || (worker as any).whatsapp_number || '';
    const currentTrade = (worker as any)?.preferredRoles?.[0] || worker?.skills?.[0] || 'Specialist';
    
    const message = buildEmployerToWorkerOutreachMessage(
      {
        name: worker.name || 'Candidate',
        trade: currentTrade,
        city: worker.city || worker.location,
      },
      {
        companyName: user?.companyName || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Verified Employer',
        jobTitle: currentTrade,
        city: worker.city || 'your area',
      }
    );

    if (workerPhone) {
      openWhatsAppDirectChat(workerPhone, message);
    } else {
      openWhatsAppShare(message);
    }
  };

  const handleShareSkillBadge = () => {
    if (!worker) return;
    const message = buildWorkerSkillBadgeShareMessage({
      id: id || (worker as any).id || (worker as any).userId,
      name: worker.name || 'Specialist',
      skills: worker.skills,
      city: worker.city || worker.location,
      trustScore: worker.trustScore,
      level: String((worker as any).level || 'L1 Verified'),
    });
    openWhatsAppShare(message);
  };
  const handleToggleSave = () => {
    if (!worker && !id) return;
    toggleSaveWorker({
      userId: worker?.userId || id || '',
      name: worker?.name || 'Specialist',
      profilePhoto: worker?.profilePhoto,
      skills: worker?.skills || [],
      city: worker?.city || worker?.location || 'Local Area',
      location: worker?.location || worker?.city || 'Local Area',
      experience: worker?.experience || 0,
      trustScore: worker?.trustScore || 85,
      isVerified: worker?.verificationStatus === 'VERIFIED',
      bio: worker?.bio,
    });
  };

  if (isLoadingWorker) return <AppLoader variant="page" message="Loading Profile..." />;

  const w = worker as any;
  const isVerified = Boolean(worker?.verificationStatus === 'VERIFIED' || w?.isVerified || w?.is_verified);
  const displayDob = w?.dob ? new Date(w.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const displayGender = w?.gender ? w.gender.charAt(0).toUpperCase() + w.gender.slice(1).toLowerCase() : null;

  const englishLevelLabel = 
    w?.englishProficiency === 'FLUENT' ? 'Fluent (Speak, Read & Write)' :
    w?.englishProficiency === 'GOOD' ? 'Good (Conversational)' :
    w?.englishProficiency === 'BASIC' ? 'Basic' :
    w?.englishProficiency === 'NONE' ? 'No English' :
    w?.englishProficiency || 'Basic English';

  const resumeData: ResumeData = {
    fullName: worker?.name || 'Candidate',
    phoneNumber: worker?.phoneNumber || w?.phone_number || undefined,
    email: worker?.email || undefined,
    profileImageUrl: worker?.profilePhoto || (worker as any)?.profileImageUrl || (worker as any)?.profile_image_url || w?.profilePhoto || w?.profileImageUrl || w?.profile_image_url || undefined,
    city: worker?.city || worker?.location || undefined,
    area: w?.area || worker?.address || '',
    location: worker?.address || worker?.location,
    bio: worker?.bio || undefined,
    highestEducation: w?.highestEducation || w?.highest_education || undefined,
    isPursuingEducation: Boolean(w?.isPursuingEducation || w?.is_pursuing_education),
    collegeName: w?.collegeName || w?.college_name || '',
    degree: w?.degree || '',
    specialization: w?.specialization || '',
    schoolMedium: w?.schoolMedium || w?.school_medium || '',
    englishProficiency: englishLevelLabel,
    languagesKnown: w?.languagesKnown && w.languagesKnown.length > 0 ? w.languagesKnown : [],
    skills: worker?.skills && worker.skills.length > 0 ? worker.skills : [],
    preferredRoles: w?.preferredRoles && w.preferredRoles.length > 0 ? w.preferredRoles : (worker?.skills || []),
    preferredCities: w?.preferredCities || w?.preferred_cities || [],
    willingToRelocate: Boolean(w?.willingToRelocate || w?.willing_to_relocate),
    trustScore: worker?.trustScore,
    level: String(worker?.level || 'L1'),
    isVerified: isVerified,
    dob: w?.dob || '',
    gender: w?.gender || '',
  };

  const currentTrade = w?.preferredRoles?.[0] || worker?.skills?.[0] || 'Verified Specialist';
  const candidateCity = worker?.city || worker?.location || 'India';
  const candidateName = worker?.name || 'Verified Trade Specialist';
  const pageTitle = `${candidateName} | Verified ${currentTrade} in ${candidateCity} - TrustHyre`;
  const metaDesc = `Review verified profile, trade skills, and background credentials for ${candidateName} (${currentTrade}) in ${candidateCity}. Direct employer hiring with zero agency commission on TrustHyre.`;
  const canonicalPath = `/worker/${id}`;

  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      name: candidateName,
      jobTitle: currentTrade,
      address: {
        '@type': 'PostalAddress',
        addressLocality: candidateCity,
        addressCountry: 'IN'
      },
      description: worker?.bio || `${currentTrade} available for direct commercial and domestic employment on TrustHyre.`,
      knowsAbout: worker?.skills || [currentTrade],
      hasCredential: isVerified ? 'TrustHyre Verified Candidate' : undefined
    }
  };

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <SeoHead
        title={pageTitle}
        description={metaDesc}
        canonicalPath={canonicalPath}
        jsonLd={[
          profileJsonLd,
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Find Workers', path: '/find-workers' },
            { name: candidateName, path: canonicalPath }
          ])
        ]}
      />
      <main className="max-w-7xl mx-auto space-y-6 pb-20">
        
        {/* Header Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#717784] hover:text-[#0a0a0a] transition-colors cursor-pointer self-start py-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Candidate Directory</span>
          </button>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button 
              onClick={() => setIsResumeModalOpen(true)}
              className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-medium uppercase shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View CV</span>
            </button>
            <button 
              onClick={handleShare}
              className="p-2 bg-white rounded-full shadow-2xs border border-slate-200/80 hover:bg-slate-50 transition-all text-slate-500 hover:text-[#0A1931] cursor-pointer flex items-center gap-1 text-xs font-medium"
              title="Share Profile"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={handleToggleSave}
              className={`p-2 rounded-full shadow-2xs border transition-all cursor-pointer flex items-center gap-1 text-xs font-medium ${
                isSaved 
                  ? 'bg-[#0f2f63]/10 border-[#0f2f63]/20 text-[#0f2f63]' 
                  : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50 hover:text-[#0A1931]'
              }`}
              title={isSaved ? 'Remove from Saved' : 'Save Profile'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* 1. HERO PROFILE CARD */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-200/80 relative overflow-hidden shadow-xs">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Identity & Avatar Cluster */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full lg:w-auto">
              <div className="shrink-0 relative">
                <UserAvatar 
                  src={worker?.profilePhoto || (worker as any)?.profileImageUrl || (worker as any)?.profile_image_url} 
                  name={worker?.name || 'Worker'} 
                  size="xl" 
                />
                {isVerified && (
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#0A1931]">
                    {worker?.name || 'Candidate Specialist'}
                  </h1>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    isVerified 
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                  }`}>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 
                    <span>{isVerified ? 'Biometric Verified' : 'Pending Verification'}</span>
                  </span>

                  {/* ⭐ Worker Rating Star Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-full shadow-2xs">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-extrabold text-amber-900">
                      {ratingsData.length > 0
                        ? (ratingsData.reduce((acc: number, r: any) => acc + (r.score || 0), 0) / ratingsData.length).toFixed(1)
                        : (worker?.rating ? Number(worker.rating).toFixed(1) : '5.0')}
                    </span>
                    <span className="text-[10px] text-amber-700/80 font-medium">
                      ({ratingsData.length > 0 ? ratingsData.length : '1'})
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                  <span className="px-3 py-1 bg-[#0f2f63]/10 text-[#0f2f63] rounded-full font-semibold">
                    {currentTrade}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <span>{worker?.city || worker?.location || 'Local Matching Area'}</span>
                  </span>
                  <span>•</span>
                  <span className="tabular-nums">{worker?.experience || 0}+ Years Experience</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{worker?.availability === 'AVAILABLE' ? 'Available for Direct Hire' : 'Active on Shift'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons Cluster */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {isCandidateViewingOwn ? (
                <button
                  onClick={handleShareSkillBadge}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase active:scale-95"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Share Verified Skill Card</span>
                </button>
              ) : (
                <button
                  onClick={handleWhatsAppEmployerChat}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase active:scale-95"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>Chat on WhatsApp</span>
                </button>
              )}

              <button
                onClick={() => setIsResumeModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer uppercase active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-white" /> 
                <span>View Digital CV</span>
              </button>
            </div>

          </div>
        </div>

        {/* 3. MAIN 2-COLUMN PROFILE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* RIGHT COLUMN (8 Cols): Academic, Languages & Skills (order-1 on mobile so qualifications are immediately visible) */}
          <div className="col-span-1 lg:col-span-8 space-y-6 order-1 lg:order-2">
            
            {/* Academic & Education Background */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase text-[#0A1931] flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#0f2f63]" /> 
                  <span>Academic Background & Education</span>
                </h3>
                {w?.highestEducation && (
                  <span className="px-3 py-1 bg-slate-50/80 text-[#0f2f63] text-xs font-semibold rounded-full border border-slate-200/60">
                    {w.highestEducation}
                  </span>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Highest Qualification</span>
                  <p className="text-xs font-bold text-[#0A1931]">
                    {w?.highestEducation || 'Graduate / Diploma'}
                  </p>
                  <span className="inline-block text-[11px] font-semibold text-emerald-600">
                    {w?.isPursuingEducation ? '• Currently Studying / Enrolled' : '• Course Completed'}
                  </span>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Degree & Specialization</span>
                  <p className="text-xs font-bold text-[#0A1931]">
                    {w?.degree || w?.specialization || w?.schoolMedium ? (
                      `${w?.degree || ''} ${w?.specialization ? `(${w.specialization})` : ''} ${w?.schoolMedium ? `- ${w.schoolMedium}` : ''}`.trim()
                    ) : (
                      'General Curriculum'
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {w?.collegeName || 'Recognized Institution / University'}
                  </p>
                </div>
              </div>
            </div>

            {/* Language Competencies */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold uppercase text-[#0A1931] flex items-center gap-2">
                <Languages className="w-4 h-4 text-[#0f2f63]" /> 
                <span>Language Competencies</span>
              </h3>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">English Proficiency</span>
                  <p className="text-xs font-bold text-[#0A1931]">{englishLevelLabel}</p>
                  <p className="text-[11px] text-slate-500">Workplace communication readiness</p>
                </div>

                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Languages Spoken</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {w?.languagesKnown && w.languagesKnown.length > 0 ? (
                      w.languagesKnown.map((lang: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-0.5 bg-slate-100/90 text-slate-700 text-xs font-medium rounded-full border border-slate-200/60 shadow-2xs">
                          {lang}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">English, Hindi, Tamil</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Job Roles & Skills */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold uppercase text-[#0A1931] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0f2f63]" /> 
                <span>Target Job Roles & Verified Skills</span>
              </h3>
              
              <div className="space-y-4 pt-1">
                {w?.preferredRoles && w.preferredRoles.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-500 block mb-2">Preferred Roles:</span>
                    <div className="flex flex-wrap gap-2">
                      {w.preferredRoles.map((role: string, idx: number) => (
                        <div 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50/80 border border-slate-200/60 text-[#0f2f63] font-semibold text-xs shadow-2xs"
                        >
                          <Award className="w-3.5 h-3.5 text-[#0f2f63]" />
                          <span>{role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-xs font-semibold text-slate-500 block mb-2">Verified Technical Skills:</span>
                  <div className="flex flex-wrap gap-2">
                    {worker?.skills && worker.skills.length > 0 ? (
                      worker.skills.map((skill, idx) => (
                        <div 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50/80 border border-slate-200/60 text-slate-700 font-medium text-xs shadow-2xs hover:border-[#0f2f63]/40 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{skill.trim()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic text-xs">No specialized skills listed.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Summary / Bio */}
            {worker?.bio && (
              <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-3">
                <h3 className="text-sm font-extrabold uppercase text-[#0A1931]">Professional Summary</h3>
                <p className="text-slate-700 text-xs sm:text-sm font-normal leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  {worker.bio}
                </p>
              </div>
            )}

            {/* 📜 Digital Work History & Verified Shift Records */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-extrabold uppercase text-[#0A1931] flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0f2f63]" /> 
                  <span>Digital Work History & Shift Records</span>
                </h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  {workHistory.length} Verified Records
                </span>
              </div>

              {workHistory.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {workHistory.map((item: any, idx: number) => {
                    const isPlatformVerified = item.verificationStatus === 'TRUSTHYRE_COMPLETED' || item.source === 'TRUSTHYRE_SHIFT';
                    const startDateText = item.startDate ? new Date(item.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Recent';
                    const endDateText = item.isCurrent ? 'Present' : (item.endDate ? new Date(item.endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Completed');

                    return (
                      <div 
                        key={item.id || idx} 
                        className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 hover:border-[#0f2f63]/30 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-[#0A1931]">{item.roleTitle}</h4>
                              {isPlatformVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                  <BadgeCheck className="w-3 h-3 text-emerald-600" /> TrustHyre Completed Shift
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" /> Prior Industry Record
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.companyName}</span>
                              {item.city && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500">{item.city}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 shrink-0 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {startDateText} - {endDateText}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-100">
                            {item.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200 space-y-2">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No previous external shifts logged yet</p>
                  <p className="text-[11px] text-slate-500">Completed jobs and shifts booked on TrustHyre will automatically display here with platform verification checkmarks.</p>
                </div>
              )}
            </div>

            {/* ⭐ Employer Ratings & Reviews Showcase */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-extrabold uppercase text-[#0A1931] flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> 
                  <span>Employer Ratings & Verified Feedback</span>
                </h3>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-extrabold text-amber-900">
                    {ratingsData.length > 0
                      ? (ratingsData.reduce((acc: number, r: any) => acc + (r.score || 0), 0) / ratingsData.length).toFixed(1)
                      : (worker?.rating ? Number(worker.rating).toFixed(1) : '5.0')}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold">
                    ({ratingsData.length > 0 ? ratingsData.length : '1'} {ratingsData.length === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              </div>

              {ratingsData.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {ratingsData.map((review: any, idx: number) => (
                    <div 
                      key={review.id || idx}
                      className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#0A1931]">
                            {review.reviewer?.companyName || review.reviewerName || 'Verified Employer'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {review.job?.title || review.jobTitle || 'Verified Shift Assignment'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          {Array.from({ length: 5 }).map((_, sIdx) => (
                            <Star 
                              key={sIdx} 
                              className={`w-3 h-3 ${sIdx < (review.score || 5) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-xs text-slate-600 italic bg-white/70 p-2.5 rounded-xl border border-slate-100">
                          "{review.comment}"
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Verified Feedback'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold">100% Verified Trust Rating</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Candidate currently holds a pristine <strong>{worker?.rating ? Number(worker.rating).toFixed(1) : '5.0'} / 5.0</strong> trust and reliability standing based on identity screening and onboarding evaluations.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* LEFT COLUMN (4 Cols): Recruiter Profile, Contact, Location (order-2 on mobile) */}
          <div className="col-span-1 lg:col-span-4 space-y-6 order-2 lg:order-1">
            
            {/* Recruiter Verified Resume Card */}
            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f2f63]/10 text-[#0f2f63] text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Worker Resume</span>
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-[#0A1931]">Standard Formatted CV</h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  View or download this worker's complete verified profile and work documents.
                </p>
              </div>

              <div className="pt-1 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsResumeModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-medium uppercase flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Verified CV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResumeModalOpen(true);
                    setTimeout(() => window.print(), 300);
                  }}
                  className="w-full py-2.5 px-4 rounded-full bg-slate-50 hover:bg-slate-100 text-[#0A1931] text-xs font-medium uppercase flex items-center justify-center gap-2 border border-slate-200 transition-all cursor-pointer active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>

            {/* Candidate Personal Contact Profile */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 pb-2 border-b border-slate-100">
                <UserIcon className="w-4 h-4 text-[#0f2f63]" /> 
                <span>Contact & Personal Details</span>
              </h3>
              
              <div className="space-y-3 text-xs">
                {displayDob && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#0f2f63]" /> Date of Birth
                    </span>
                    <span className="font-bold text-[#0A1931]">{displayDob}</span>
                  </div>
                )}

                {displayGender && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-[#0f2f63]" /> Gender
                    </span>
                    <span className="font-bold text-[#0A1931]">{displayGender}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0f2f63]" /> Phone
                  </span>
                  <span className="font-bold text-[#0A1931]">
                    {worker?.phoneNumber || 'Disclosed on Hire'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#0f2f63]" /> Email
                  </span>
                  <span className="font-bold text-[#0A1931] truncate max-w-[150px]" title={worker?.email}>
                    {worker?.email || 'Registered Email'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp Direct
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    w?.whatsappOptIn !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {w?.whatsappOptIn !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Location & Mobility Card */}
            <div className="bg-white rounded-[1.75rem] p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-[#0f2f63]" /> 
                <span>Location & Mobility</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Operational Base</span>
                  <p className="font-bold text-[#0A1931] text-xs mt-0.5">
                    {worker?.address || worker?.city || worker?.location || 'Local Matching Hub'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-medium block">Relocation Willingness</span>
                  <p className={`font-bold mt-0.5 flex items-center gap-1.5 ${w?.willingToRelocate ? 'text-emerald-700' : 'text-[#0A1931]'}`}>
                    {w?.willingToRelocate ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Willing to travel for out-of-town jobs</span>
                      </>
                    ) : (
                      <span>Local work only (no relocation)</span>
                    )}
                  </p>
                </div>

                {w?.preferredCities && w.preferredCities.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium block mb-1.5">Target Cities:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {w.preferredCities.map((city: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-0.5 bg-slate-50 rounded-full text-[11px] font-medium text-[#0A1931] border border-slate-200/60">
                          {city}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

           
          </div>
        </div>
      </main>

      {/* Verified Resume Modal */}
      <CandidateResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        data={resumeData}
      />
    </div>
  );
};
