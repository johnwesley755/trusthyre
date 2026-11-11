import { useState, useMemo, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { mediaService } from '../../../services/media.service';
import { useNavigate, Link, useParams, useSearchParams } from 'react-router-dom';
import { 
  Briefcase, 
  Plus, 
  X, 
  Loader2, 
  CheckCircle, 
  Lightbulb, 
  IndianRupee, 
  CalendarClock, 
  ShieldCheck,
  Building2,
  MapPin,
  Check,
  Send,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { LocationPicker } from '../components/LocationPicker';
import { PostJobSuccessModal } from '../components/PostJobSuccessModal';
import { toast } from 'sonner';
import { TRADE_COVER_PRESETS, resolveTradeCover } from '../../../utils/coverImage.utils';
import { Dropdown } from '../../../components/ui/dropdown';

const INDUSTRY_OPTIONS = [
  { value: 'EDUCATION', label: 'Education, Teaching & Counseling' },
  { value: 'HEALTHCARE', label: 'Healthcare & Medical Staff' },
  { value: 'RETAIL', label: 'Retail & Counter Sales' },
  { value: 'OFFICE_ADMIN', label: 'Office & Customer Support' },
  { value: 'AUTOMOTIVE', label: 'Driver & Mobility Fleet' },
  { value: 'ELECTRICAL', label: 'Electrical Work' },
  { value: 'PLUMBING', label: 'Plumbing' },
  { value: 'CONSTRUCTION', label: 'Construction & Masonry' },
  { value: 'MAINTENANCE', label: 'Facility Maintenance & Repair' },
  { value: 'LOGISTICS', label: 'Logistics & Warehouse' },
  { value: 'COOKING_CHEF', label: 'Cooking / Commercial Chef' },
  { value: 'HOSPITALITY', label: 'Hospitality & Hotel Staff' },
  { value: 'DOMESTIC_HELP', label: 'Housekeeping / Cleaning' },
  { value: 'SECURITY', label: 'Security Services' },
  { value: 'MANUFACTURING', label: 'Manufacturing & Fabrication' },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'Full Time', label: 'Full Time' },
  { value: 'Part Time', label: 'Part Time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Shift Based', label: 'Shift Based' },
];

const SHIFT_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'Day Shift', label: 'Day Shift' },
  { value: 'Night Shift', label: 'Night Shift' },
  { value: 'Rotational Shift', label: 'Rotational Shift' },
  { value: 'Flexible Hours', label: 'Flexible Hours' },
];

const EDUCATION_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'Below 10th', label: 'Below 10th' },
  { value: '10th Pass', label: '10th Pass' },
  { value: '12th Pass', label: '12th Pass' },
  { value: 'Diploma / ITI', label: 'Diploma / ITI' },
  { value: 'Graduate', label: 'Graduate' },
  { value: 'Any Education', label: 'Any Education' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Any gender' },
  { value: 'Male Only', label: 'Male Only' },
  { value: 'Female Only', label: 'Female Only' },
];

export const JobPostingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { jobId: routeJobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const editJobId = routeJobId || searchParams.get('jobId') || null;
  const isEditMode = Boolean(editJobId);

  // Form input states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('ELECTRICAL');
  const [budget, setBudget] = useState('28000');
  const [experienceYears, setExperienceYears] = useState('2');
  const [expiresAt, setExpiresAt] = useState('');
  const [skills, setSkills] = useState<string[]>(['Safety Protocol', 'Punctual']);
  const [skillInput, setSkillInput] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);

  // Additional details state
  const [department, setDepartment] = useState('');
  const [roleCategory, setRoleCategory] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [shift, setShift] = useState('');
  const [education, setEducation] = useState('');
  const [languages, setLanguages] = useState('');
  const [ageLimit, setAgeLimit] = useState('');
  const [gender, setGender] = useState('');

  // Live preview reactive states
  const [previewTitle, setPreviewTitle] = useState('Master Electrical Specialist');
  const [previewIndustry, setPreviewIndustry] = useState('ELECTRICAL');
  const [previewBudget, setPreviewBudget] = useState('28000');
  const [previewExp, setPreviewExp] = useState('2');
  const [previewExpiresAt, setPreviewExpiresAt] = useState('');

  // Dedicated image upload reactive states
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Optional stock preset fallback
  const [selectedPresetUrl, setSelectedPresetUrl] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [createdJobData, setCreatedJobData] = useState<any | null>(null);

  // Blue-Collar Perks & Direct Calling State (WorkIndia & Apna Pattern)
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);
  const [allowDirectCall, setAllowDirectCall] = useState<boolean>(true);
  const [allowDirectWhatsapp, setAllowDirectWhatsapp] = useState<boolean>(true);
  const [contactPhone, setContactPhone] = useState<string>('');
  const [isUrgentSpotHire, setIsUrgentSpotHire] = useState<boolean>(false);

  // Walk-in Interview states
  const [isWalkInInterview, setIsWalkInInterview] = useState<boolean>(false);
  const [walkInDates, setWalkInDates] = useState<string>('');
  const [walkInTiming, setWalkInTiming] = useState<string>('');
  const [walkInVenue, setWalkInVenue] = useState<string>('');
  const [walkInContactPerson, setWalkInContactPerson] = useState<string>('');

  // Fetch existing job for edit mode
  const { data: existingJob, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', editJobId],
    queryFn: () => jobService.getJobById(editJobId!),
    enabled: isEditMode,
  });

  // Pre-fill fields when existingJob is loaded
  useEffect(() => {
    if (existingJob) {
      setTitle(existingJob.title || '');
      setPreviewTitle(existingJob.title || '');
      setDescription(existingJob.description || '');
      const ind = (existingJob as any).industry || 'ELECTRICAL';
      setIndustry(ind);
      setPreviewIndustry(ind);
      const bgt = String(existingJob.budget || '');
      setBudget(bgt);
      setPreviewBudget(bgt);
      const exp = String((existingJob as any).experienceYearsRequired ?? (existingJob as any).experience_years_required ?? '0');
      setExperienceYears(exp);
      setPreviewExp(exp);

      if (existingJob.expiresAt) {
        try {
          const expDate = new Date(existingJob.expiresAt);
          const pad = (n: number) => n < 10 ? '0' + n : n;
          const formatted = `${expDate.getFullYear()}-${pad(expDate.getMonth() + 1)}-${pad(expDate.getDate())}T${pad(expDate.getHours())}:${pad(expDate.getMinutes())}`;
          setExpiresAt(formatted);
          setPreviewExpiresAt(formatted);
        } catch {
          // ignore date parse error
        }
      }

      const rawSkills = (existingJob as any).skills || (existingJob as any).requiredSkills || (existingJob as any).required_skills;
      if (Array.isArray(rawSkills) && rawSkills.length > 0) {
        setSkills(rawSkills.map((s: any) => typeof s === 'string' ? s : s.name || String(s)));
      }

      setAddress((existingJob as any).address || existingJob.location || '');
      setCity((existingJob as any).city || '');
      if (existingJob.latitude && existingJob.longitude) {
        setCoords({ lat: Number(existingJob.latitude), lon: Number(existingJob.longitude) });
      }

      const cover = (existingJob as any).coverImageUrl || (existingJob as any).cover_image_url;
      if (cover) {
        setUploadedImageUrl(cover);
      }

      const addl = (existingJob as any).additionalDetails || {};
      if (addl.department) setDepartment(addl.department);
      if (addl.roleCategory) setRoleCategory(addl.roleCategory);
      if (addl.employmentType) setEmploymentType(addl.employmentType);
      if (addl.shift) setShift(addl.shift);
      if (addl.education) setEducation(addl.education);
      if (addl.languages) setLanguages(addl.languages);
      if (addl.ageLimit) setAgeLimit(addl.ageLimit);
      if (addl.gender) setGender(addl.gender);

      const existingPerks = Array.isArray((existingJob as any).perks) 
        ? (existingJob as any).perks 
        : (Array.isArray(addl.perks) ? addl.perks : []);
      if (existingPerks.length > 0) setSelectedPerks(existingPerks);

      if ((existingJob as any).allowDirectCall !== undefined) setAllowDirectCall(Boolean((existingJob as any).allowDirectCall));
      else if (addl.allowDirectCall !== undefined) setAllowDirectCall(Boolean(addl.allowDirectCall));

      if ((existingJob as any).allowDirectWhatsapp !== undefined) setAllowDirectWhatsapp(Boolean((existingJob as any).allowDirectWhatsapp));
      else if (addl.allowDirectWhatsapp !== undefined) setAllowDirectWhatsapp(Boolean(addl.allowDirectWhatsapp));

      const phone = (existingJob as any).contactPhone || (existingJob as any).contact_phone || addl.contactPhone || (existingJob as any).phoneNumber || '';
      if (phone) setContactPhone(phone);

      if ((existingJob as any).isUrgentSpotHire !== undefined) setIsUrgentSpotHire(Boolean((existingJob as any).isUrgentSpotHire));
      else if (addl.isUrgentSpotHire !== undefined) setIsUrgentSpotHire(Boolean(addl.isUrgentSpotHire));

      const walkIn = (existingJob as any).walkInDetails || addl.walkInDetails;
      const isWalkIn = Boolean((existingJob as any).isWalkInInterview || addl.isWalkInInterview || walkIn?.isWalkIn);
      setIsWalkInInterview(isWalkIn);
      if (walkIn) {
        if (walkIn.dates) setWalkInDates(walkIn.dates);
        if (walkIn.timing) setWalkInTiming(walkIn.timing);
        if (walkIn.venueAddress) setWalkInVenue(walkIn.venueAddress);
        if (walkIn.contactPerson) setWalkInContactPerson(walkIn.contactPerson);
      }
    }
  }, [existingJob]);

  const effectiveCoverUrl = useMemo(() => {
    return uploadedImageUrl || selectedPresetUrl || null;
  }, [uploadedImageUrl, selectedPresetUrl]);

  const minExpiryDateTime = useMemo(() => {
    const now = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);

  const mutation = useMutation({
    mutationFn: (job: any) => {
      if (isEditMode && editJobId) {
        return jobService.updateJob(editJobId, job);
      }
      return jobService.createJob(job);
    },
    onSuccess: (savedJob) => {
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (editJobId) {
        queryClient.invalidateQueries({ queryKey: ['job', editJobId] });
      }

      if (isEditMode) {
        toast.success('Job requisition updated successfully!');
        navigate('/jobs');
      } else {
        if (savedJob) {
          queryClient.setQueryData(['employerJobs'], (old: any) => {
            if (!old) return [savedJob];
            return Array.isArray(old) ? [savedJob, ...old] : old;
          });
          queryClient.setQueryData(['jobs'], (old: any) => {
            if (!old) return [savedJob];
            return Array.isArray(old) ? [savedJob, ...old] : old;
          });
        }
        toast.success('Job published successfully! Broadcast to WhatsApp to receive candidates.');
        if (savedJob?.id) {
          setCreatedJobData(savedJob);
        } else {
          navigate('/jobs');
        }
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || `Failed to ${isEditMode ? 'update' : 'post'} job. Please verify all fields.`);
    }
  });

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be under 10MB.');
      return;
    }

    setUploadedFileName(file.name);
    setIsUploading(true);
    setUploadProgress(15);

    // 1. Instant local preview for zero-delay visual feedback
    const localReader = new FileReader();
    localReader.onload = (e) => {
      const localDataUrl = e.target?.result as string;
      if (localDataUrl) {
        setUploadedImageUrl(localDataUrl);
        setSelectedPresetUrl(null);
      }
    };
    localReader.readAsDataURL(file);

    // 2. Upload to backend cloud media storage (Cloudinary)
    try {
      const response = await mediaService.uploadFile(file, (percent) => {
        setUploadProgress(Math.max(percent, 20));
      });
      if (response?.url) {
        setUploadedImageUrl(response.url);
        setSelectedPresetUrl(null);
        toast.success('Photo uploaded successfully!');
      }
    } catch (err: any) {
      console.warn('Cloud storage upload warning, using local high-res buffer:', err?.message);
      toast.success('Photo ready for job listing!');
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const expiresAtRaw = formData.get('expiresAt') as string;
    let expiresAtIso: string | undefined = undefined;

    if (expiresAtRaw && expiresAtRaw.trim() !== '') {
      const parsedDate = new Date(expiresAtRaw);
      if (isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
        toast.error('Auto-expiry date and time must be set in the future.');
        return;
      }
      expiresAtIso = parsedDate.toISOString();
    }

    const jobData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      industry: formData.get('industry') as string,
      location: address,
      latitude: coords?.lat,
      longitude: coords?.lon,
      experienceYearsRequired: Number(formData.get('experienceYearsRequired') || 0),
      budget: Number(formData.get('budget')),
      address: address,
      city: city,
      requiredSkills: skills,
      status: 'OPEN' as const,
      expiresAt: expiresAtIso,
      coverImageUrl: effectiveCoverUrl || null,
      cover_image_url: effectiveCoverUrl || null,
      perks: selectedPerks,
      allowDirectCall,
      allow_direct_call: allowDirectCall,
      allowDirectWhatsapp,
      allow_direct_whatsapp: allowDirectWhatsapp,
      contactPhone: contactPhone.trim() || undefined,
      contact_phone: contactPhone.trim() || undefined,
      isUrgentSpotHire,
      is_urgent_spot_hire: isUrgentSpotHire,
      isWalkInInterview,
      is_walk_in_interview: isWalkInInterview,
      walkInDetails: isWalkInInterview ? {
        isWalkIn: true,
        dates: walkInDates.trim() || undefined,
        timing: walkInTiming.trim() || undefined,
        venueAddress: walkInVenue.trim() || address || undefined,
        contactPerson: walkInContactPerson.trim() || undefined
      } : null,
      additionalDetails: {
        department: (formData.get('department') as string) || undefined,
        roleCategory: (formData.get('roleCategory') as string) || undefined,
        employmentType: (formData.get('employmentType') as string) || undefined,
        shift: (formData.get('shift') as string) || undefined,
        education: (formData.get('education') as string) || undefined,
        languages: (formData.get('languages') as string) || undefined,
        ageLimit: (formData.get('ageLimit') as string) || undefined,
        gender: (formData.get('gender') as string) || undefined,
        perks: selectedPerks,
        allowDirectCall,
        allowDirectWhatsapp,
        contactPhone: contactPhone.trim() || undefined,
        isUrgentSpotHire,
        isWalkInInterview,
        walkInDetails: isWalkInInterview ? {
          isWalkIn: true,
          dates: walkInDates.trim() || undefined,
          timing: walkInTiming.trim() || undefined,
          venueAddress: walkInVenue.trim() || address || undefined,
          contactPerson: walkInContactPerson.trim() || undefined
        } : null,
      }
    };
    mutation.mutate(jobData);
  };

  const addSkill = () => {
    if (skillInput && !skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const QUICK_SKILL_SUGGESTIONS = [
    'Quality Inspection', 'Safety Gear Certified', 'Three Phase Wiring', 
    'Conduit Bending', 'Tool Maintenance', 'Blueprint Reading', 'Rapid Assembly'
  ];

  return (
    <div className="w-full min-h-screen p-2 sm:p-4 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-[#0a0a0a] dark:text-zinc-100 transition-colors duration-200">
      <main className="max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-20">
        
        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] dark:bg-sky-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63] dark:text-sky-400">
                  {isEditMode ? 'Edit Requisition' : 'Job & Shift Posting'}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0a0a0a] dark:text-zinc-100">
                {isEditMode ? 'Update Job Opening' : 'Post a New Job Opening'}
              </h1>
              <p className="text-xs text-[#717784] dark:text-zinc-400 font-medium leading-relaxed max-w-xl">
                {isEditMode 
                  ? 'Update the details, compensation, requirements, or worksite location for this job requisition.'
                  : 'Quickly find verified workers nearby with authenticated profiles and zero agency middle-men fees.'}
              </p>
            </div>

            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 text-[#0a0a0a] dark:text-zinc-200 text-xs font-semibold uppercase transition-all shadow-2xs shrink-0"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
              <span>Manage Existing Jobs</span>
            </Link>
          </div>
        </div>

        {/* 2. Main Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* Form Column (8 cols) */}
          <div className="col-span-1 lg:col-span-8 space-y-5 sm:space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              
              {/* Step 1: Role Fundamentals */}
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    1
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wide">
                    Role Fundamentals & Scope
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Job Title *</label>
                    <input 
                      name="title"
                      required
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setPreviewTitle(e.target.value);
                      }}
                      placeholder="e.g. Master Industrial Electrician"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Industry Category *</label>
                    <Dropdown
                      name="industry"
                      value={industry}
                      onChange={(val) => {
                        const nextInd = String(val);
                        setIndustry(nextInd);
                        setPreviewIndustry(nextInd);
                        if (!uploadedImageUrl) {
                          const matchedPreset = TRADE_COVER_PRESETS.find(p => p.industry === nextInd);
                          if (matchedPreset) {
                            setSelectedPresetUrl(matchedPreset.url);
                          }
                        }
                      }}
                      options={INDUSTRY_OPTIONS}
                      searchable={true}
                      placeholder="Select industry category"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Role Scope & Responsibilities *</label>
                  <textarea 
                    name="description"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe daily tasks, working hours, tools provided, break times, and specific site regulations..."
                    rows={4}
                    className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Step 2: Upload Your Own Image (First-Class Feature & Fully Responsive) */}
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 sm:mt-0 shadow-2xs select-none">
                      2
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wide">
                        Upload Cover Image
                      </h3>
                      <p className="text-[11px] text-[#717784] dark:text-zinc-400 leading-snug mt-0.5">
                        Upload your company workplace, warehouse, team, or site photo for candidates to see in their search feed.
                      </p>
                    </div>
                  </div>

                  {effectiveCoverUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedImageUrl(null);
                        setUploadedFileName('');
                        setSelectedPresetUrl(null);
                      }}
                      className="self-start sm:self-auto text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 transition-colors cursor-pointer shrink-0"
                    >
                      Remove Image
                    </button>
                  )}
                </div>

                {/* Primary Drag-and-Drop Image Uploader Box */}
                {!uploadedImageUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full p-5 sm:p-8 md:p-10 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
                      isDragging 
                        ? 'border-[#0f2f63] dark:border-sky-400 bg-[#0f2f63]/5 dark:bg-sky-400/10 ring-4 ring-[#0f2f63]/10 scale-[0.99]' 
                        : 'border-[#c5c8d0] dark:border-zinc-700 hover:border-[#0f2f63] dark:hover:border-sky-400 hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 bg-white dark:bg-[#121215]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file);
                      }}
                    />

                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0f2f63]/5 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[#0a0a0a] dark:text-zinc-100">
                      Upload Your Own Image
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#717784] dark:text-zinc-400 mt-1 max-w-sm leading-relaxed px-2">
                      Drag and drop your photo here, or click to browse from your device
                    </p>

                    <div className="inline-flex items-center gap-2 mt-3.5 sm:mt-4 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold shadow-xs transition-all">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Browse Image File</span>
                    </div>

                    <span className="text-[10px] text-[#9ea3ae] dark:text-zinc-500 mt-2">
                      Supports JPG, PNG, WebP up to 10MB
                    </span>
                  </div>
                ) : (
                  /* Active Uploaded Image Preview Box */
                  <div className="w-full rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#121215] overflow-hidden shadow-xs relative">
                    <div className="w-full h-44 sm:h-56 md:h-64 relative bg-slate-900">
                      <img
                        src={uploadedImageUrl}
                        alt="Uploaded cover"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 p-4">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                          <span className="text-xs font-semibold">Uploading {uploadProgress}%</span>
                          <div className="w-44 sm:w-48 h-1.5 bg-white/30 rounded-full overflow-hidden">
                            <div className="h-full bg-white transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Top Action Buttons */}
                      <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 sm:px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-[#0a0a0a] text-[11px] sm:text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-xs transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#0f2f63]" />
                          <span>Change Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImageUrl(null);
                            setUploadedFileName('');
                          }}
                          className="p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white shadow-md cursor-pointer backdrop-blur-xs transition-all"
                          title="Remove photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Bottom Info Bar */}
                      <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 flex items-center gap-2 max-w-[85%]">
                        <span className="px-2 sm:px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs shrink-0">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Your Uploaded Photo</span>
                        </span>
                        {uploadedFileName && (
                          <span className="text-white/90 text-[11px] truncate drop-shadow-xs hidden sm:inline font-mono">
                            {uploadedFileName}
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file);
                      }}
                    />
                  </div>
                )}

                {/* Secondary Option: Stock Trade Presets (Optional) */}
                <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowPresets(!showPresets)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717784] dark:text-zinc-400 hover:text-[#0f2f63] dark:hover:text-sky-400 cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{showPresets ? 'Hide stock trade banners' : "Don't have your own photo? Choose a free trade banner"}</span>
                  </button>

                  {showPresets && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 animate-in fade-in duration-200">
                      {TRADE_COVER_PRESETS.map((preset) => {
                        const isPresetSelected = !uploadedImageUrl && selectedPresetUrl === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setSelectedPresetUrl(preset.url);
                              setUploadedImageUrl(null);
                              setUploadedFileName('');
                            }}
                            className={`group relative rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer h-20 sm:h-24 flex flex-col justify-end p-2 ${
                              isPresetSelected
                                ? 'border-[#0f2f63] dark:border-sky-400 shadow-md ring-2 ring-[#0f2f63]/20'
                                : 'border-[#e6e8ec] dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            {isPresetSelected && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                            <span className="relative z-10 text-[10px] font-bold text-white leading-tight">
                              {preset.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Worksite Location */}
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    3
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wide">
                    Worksite Location & GPS Geolocation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Street / Site Address *</label>
                    <input 
                      name="address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Guindy Industrial Estate, Plot 14"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">City / Region *</label>
                    <input 
                      name="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white dark:bg-[#121215] p-3 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 relative z-0 isolate">
                  <LocationPicker 
                    onLocationSelect={(lat, lon, addr, cty) => {
                      setCoords({ lat, lon });
                      setAddress(addr);
                      setCity(cty);
                    }} 
                  />
                </div>
              </div>

              {/* Step 4: Compensation & Required Experience */}
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    4
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wide">
                    Compensation, Duration & Skill Requirements
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Monthly Budget (₹) *</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717784] dark:text-zinc-500" />
                      <input 
                        name="budget"
                        type="number"
                        required
                        value={budget}
                        onChange={(e) => {
                          setBudget(e.target.value);
                          setPreviewBudget(e.target.value);
                        }}
                        placeholder="28000"
                        className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-[#0a0a0a] dark:text-zinc-100 tabular-nums focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Min. Experience (Years)</label>
                    <input 
                      name="experienceYearsRequired"
                      type="text"
                      min={0}
                      value={experienceYears}
                      onChange={(e) => {
                        setExperienceYears(e.target.value);
                        setPreviewExp(e.target.value);
                      }}
                      placeholder="2"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Auto-Expiry Date & Time (Optional)</label>
                      {expiresAt ? (
                        <button
                          type="button"
                          onClick={() => {
                            setExpiresAt('');
                            setPreviewExpiresAt('');
                          }}
                          className="text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-800 font-semibold cursor-pointer underline"
                        >
                          Remove Expiry
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#717784] dark:text-zinc-400 font-medium">Optional</span>
                      )}
                    </div>
                    <input 
                      name="expiresAt"
                      type="datetime-local"
                      min={minExpiryDateTime}
                      value={expiresAt}
                      onChange={(e) => {
                        setExpiresAt(e.target.value);
                        setPreviewExpiresAt(e.target.value);
                      }}
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none transition-all cursor-pointer"
                    />
                    <p className="text-[10px] text-[#717784] dark:text-zinc-500">
                      Leave blank for open-ended hiring, or pick a date & time to auto-expire.
                    </p>
                  </div>
                </div>

                {/* Skill Tags */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Technical Skill Tags</label>
                  <div className="flex gap-2">
                    <input 
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Type a skill and press Enter (e.g. Conduit Bending, Three Phase)..."
                      className="flex-1 bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none"
                    />
                    <button 
                      type="button" 
                      onClick={addSkill} 
                      className="px-4 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-xl text-xs font-semibold cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map(skill => (
                      <span 
                        key={skill} 
                        className="bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 px-3 py-1 rounded-full text-xs font-semibold text-[#0a0a0a] dark:text-zinc-200 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{skill}</span>
                        <X 
                          className="w-3.5 h-3.5 cursor-pointer text-[#717784] dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 ml-0.5" 
                          onClick={() => removeSkill(skill)} 
                        />
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 mb-1.5">Quick Suggestions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SKILL_SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => !skills.includes(s) && setSkills([...skills, s])}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-[#121215] hover:bg-slate-50 dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 text-[#717784] dark:text-zinc-300 cursor-pointer"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>


              {/* Step 5: Role & Eligibility Criteria (Optional) */}
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    5
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wide">
                      Role & Eligibility Criteria (Optional)
                    </h3>
                    <p className="text-[11px] text-[#717784] dark:text-zinc-400">Specify hiring requirements so candidates know exact shift and eligibility expectations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Department</label>
                    <input 
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Restaurant / Hospitality / Tourism"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-medium text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Role / Category</label>
                    <input 
                      name="roleCategory"
                      value={roleCategory}
                      onChange={(e) => setRoleCategory(e.target.value)}
                      placeholder="e.g. Cook / Chef / Kitchen Help"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-medium text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Employment Type</label>
                    <Dropdown
                      name="employmentType"
                      value={employmentType}
                      onChange={(val) => setEmploymentType(String(val))}
                      options={EMPLOYMENT_TYPE_OPTIONS}
                      placeholder="Select employment type"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Shift</label>
                    <Dropdown
                      name="shift"
                      value={shift}
                      onChange={(val) => setShift(String(val))}
                      options={SHIFT_OPTIONS}
                      placeholder="Select shift"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Education</label>
                    <Dropdown
                      name="education"
                      value={education}
                      onChange={(val) => setEducation(String(val))}
                      options={EDUCATION_OPTIONS}
                      placeholder="Select education requirement"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Languages Required</label>
                    <input 
                      name="languages"
                      value={languages}
                      onChange={(e) => setLanguages(e.target.value)}
                      placeholder="e.g. English, Tamil, Hindi"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-medium text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Age Limit</label>
                    <input 
                      name="ageLimit"
                      value={ageLimit}
                      onChange={(e) => setAgeLimit(e.target.value)}
                      placeholder="e.g. 18 - 35 years"
                      className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-medium text-[#0a0a0a] dark:text-zinc-100 focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Gender Preference</label>
                  <Dropdown
                    name="gender"
                    value={gender}
                    onChange={(val) => setGender(String(val))}
                    options={GENDER_OPTIONS}
                    placeholder="Select gender preference"
                  />
                </div>
              </div>

              {/* Step 6: Frontline Perks & Direct Contact (WorkIndia & Apna Viral Viewership Drivers) */}
              <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] dark:border-zinc-800 space-y-5">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] dark:bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    6
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400 tracking-wide">
                      Frontline Perks & Direct Recruiter Contact
                    </h3>
                    <p className="text-[11px] text-[#717784] dark:text-zinc-400">Jobs with Free Food, Room, Overtime, and Direct Call HR get 5x more candidate applications.</p>
                  </div>
                </div>

                {/* Perks Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200 block">
                    Select Perks & Facilities Provided (Optional)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'Free Food', label: '🍛 Free Food / Meals' },
                      { id: 'Room Provided', label: '🏠 Room / Lodging' },
                      { id: 'Daily Pay', label: '💵 Daily / Weekly Payout' },
                      { id: 'Overtime Pay', label: '⏱️ Overtime (OT) Pay' },
                      { id: 'Travel Allowance', label: '⛽ Fuel / Travel Allowance' },
                      { id: 'ESI PF Benefits', label: '🛡️ ESI / PF Benefits' },
                    ].map(perk => {
                      const isSelected = selectedPerks.includes(perk.id);
                      return (
                        <button
                          key={perk.id}
                          type="button"
                          onClick={() => {
                            setSelectedPerks(prev =>
                              prev.includes(perk.id) ? prev.filter(p => p !== perk.id) : [...prev, perk.id]
                            );
                          }}
                          className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#0f2f63] dark:bg-sky-600 text-white border-[#0f2f63] dark:border-sky-500 shadow-xs'
                              : 'bg-white dark:bg-[#121215] text-[#0a0a0a] dark:text-zinc-200 border-[#e6e8ec] dark:border-zinc-800 hover:border-[#0f2f63]/40 dark:hover:border-zinc-700'
                          }`}
                        >
                          <span>{perk.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Contact Toggle and Input */}
                <div className="bg-white dark:bg-[#121215] rounded-2xl p-4 sm:p-5 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
                  {/* Walk-in Interview FastTrack Toggle (WorkIndia & Apna Pattern) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h4 className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">Walk-in Interview FastTrack</h4>
                      </div>
                      <p className="text-[11px] text-[#717784] dark:text-zinc-400">Post specific interview dates and timing slots so candidates can directly walk in without application waiting periods.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWalkInInterview}
                        onChange={(e) => setIsWalkInInterview(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {isWalkInInterview && (
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/40 space-y-3 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200">Walk-in Dates</label>
                          <input
                            type="text"
                            value={walkInDates}
                            onChange={(e) => setWalkInDates(e.target.value)}
                            placeholder="e.g. 06 Nov - 09 Nov (Mon to Fri)"
                            className="w-full bg-white dark:bg-[#1C1C21] border border-amber-200 dark:border-amber-900/40 rounded-lg p-2.5 text-xs text-[#0a0a0a] dark:text-zinc-100 outline-none focus:border-[#0f2f63] dark:focus:border-sky-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200">Interview Timing Slot</label>
                          <input
                            type="text"
                            value={walkInTiming}
                            onChange={(e) => setWalkInTiming(e.target.value)}
                            placeholder="e.g. 10:00 AM - 04:00 PM"
                            className="w-full bg-white dark:bg-[#1C1C21] border border-amber-200 dark:border-amber-900/40 rounded-lg p-2.5 text-xs text-[#0a0a0a] dark:text-zinc-100 outline-none focus:border-[#0f2f63] dark:focus:border-sky-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200">Interview Venue / Landmark</label>
                          <input
                            type="text"
                            value={walkInVenue}
                            onChange={(e) => setWalkInVenue(e.target.value)}
                            placeholder="e.g. Near Guindy Metro Station, Opp. Police Station"
                            className="w-full bg-white dark:bg-[#1C1C21] border border-amber-200 dark:border-amber-900/40 rounded-lg p-2.5 text-xs text-[#0a0a0a] dark:text-zinc-100 outline-none focus:border-[#0f2f63] dark:focus:border-sky-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#0a0a0a] dark:text-zinc-200">Contact Person / HR Name</label>
                          <input
                            type="text"
                            value={walkInContactPerson}
                            onChange={(e) => setWalkInContactPerson(e.target.value)}
                            placeholder="e.g. Mr. Ramesh (HR Manager)"
                            className="w-full bg-white dark:bg-[#1C1C21] border border-amber-200 dark:border-amber-900/40 rounded-lg p-2.5 text-xs text-[#0a0a0a] dark:text-zinc-100 outline-none focus:border-[#0f2f63] dark:focus:border-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-100">Allow Candidates to Call HR Directly</h4>
                      <p className="text-[11px] text-[#717784] dark:text-zinc-400">Shows a prominent "Call HR" button on your job card for instant phone screening.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowDirectCall}
                        onChange={(e) => setAllowDirectCall(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {allowDirectCall && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="text-xs font-bold text-[#0a0a0a] dark:text-zinc-200">Direct Recruiter / Supervisor Phone Number</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210 (Defaults to registered mobile if blank)"
                        className="w-full bg-[#fbfbfb] dark:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl p-3 text-xs font-medium text-[#0a0a0a] dark:text-zinc-100 focus:bg-white dark:focus:bg-[#121215] focus:border-[#0f2f63] dark:focus:border-sky-500 outline-none"
                      />
                      <p className="text-[10px] text-[#717784] dark:text-zinc-500">
                        Workers can tap to call this number directly from the job card without middleman fees.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button Action Row */}
              <div className="bg-[#fbfbfb] dark:bg-[#09090b] p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#717784] dark:text-zinc-400">
                  <p className="font-semibold text-[#0a0a0a] dark:text-zinc-200">Secure Protected Shift Posting</p>
                  <p className="text-[11px]">Funds are held securely and released upon candidate check-out confirmation.</p>
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending || isUploading || (isEditMode && isLoadingJob)}
                  className="w-full sm:w-auto px-8 py-3 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {mutation.isPending || isUploading || (isEditMode && isLoadingJob) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditMode ? 'Save & Update Opening' : 'Publish Role & Deploy Shift'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: Sticky Live Preview & Guarantees (4 cols) */}
          <div className="col-span-1 lg:col-span-4 space-y-5 sm:space-y-6 lg:sticky lg:top-20">
            
            {/* Live Mockup Card */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] dark:border-zinc-800 pb-3">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0f2f63] dark:text-sky-400" />
                  <h3 className="text-xs font-bold uppercase text-[#717784] dark:text-zinc-400">
                    Candidate Feed Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
                  Live Sync
                </span>
              </div>

              {/* Mockup Card with Cover Image */}
              <div className="bg-white dark:bg-[#121215] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-sm overflow-hidden space-y-0">
                {effectiveCoverUrl && (
                  <div className="w-full h-36 relative overflow-hidden bg-slate-100 dark:bg-zinc-800 border-b border-[#e6e8ec] dark:border-zinc-800">
                    <img 
                      src={effectiveCoverUrl} 
                      alt="Cover Banner" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold uppercase tracking-wider">
                      {previewIndustry}
                    </span>
                    {uploadedImageUrl && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[9px] font-semibold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Uploaded Photo</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {!effectiveCoverUrl && (
                        <span className="px-2 py-0.5 rounded-full bg-[#0f2f63]/5 dark:bg-sky-500/10 text-[#0f2f63] dark:text-sky-400 text-[9px] font-bold border border-[#0f2f63]/10 dark:border-sky-500/20">
                          {previewIndustry}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-[#0a0a0a] dark:text-zinc-100 mt-1 leading-snug">
                        {previewTitle || 'Job Title'}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-xl tabular-nums shrink-0">
                      ₹{Number(previewBudget || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-xs text-[#717784] dark:text-zinc-400 space-y-1">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400 shrink-0" />
                      <span className="truncate">{city || address || 'Designated worksite location'}</span>
                    </p>
                    <p className="text-[11px] text-[#717784] dark:text-zinc-400">
                      Min. {previewExp || 0} years experience required
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {skills.slice(0, 3).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-[#f4f4f4] dark:bg-[#1C1C21] border border-transparent dark:border-zinc-800 rounded-md text-[10px] font-medium text-[#0a0a0a] dark:text-zinc-200">
                        {s}
                      </span>
                    ))}
                    {skills.length > 3 && (
                      <span className="px-2 py-0.5 bg-[#f4f4f4] dark:bg-[#1C1C21] border border-transparent dark:border-zinc-800 rounded-md text-[10px] font-medium text-[#717784] dark:text-zinc-400">
                        +{skills.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Job Listing</span>
                    </span>
                    {previewExpiresAt && (
                      <span className="text-[#717784] dark:text-zinc-400 text-[10px] flex items-center gap-1 font-medium">
                        <CalendarClock className="w-3 h-3 text-[#0f2f63] dark:text-sky-400" />
                        <span>Closes {new Date(previewExpiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hiring Speed & Protection Note */}
            <div className="bg-[#f4f4f4] dark:bg-[#09090b] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 border border-[#e6e8ec] dark:border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                <h4 className="font-bold text-[#0a0a0a] dark:text-zinc-100">TrustHyre Hiring Advantages</h4>
              </div>

              <ul className="space-y-2.5 text-[#717784] dark:text-zinc-400 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Nearby verified candidates receive direct push notifications instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Average shift fulfillment turnaround of under 4 hours across major commercial zones.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Zero hidden recruiter commissions or subscription lock-ins.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>

      {/* Post-Publish WhatsApp Broadcast Modal */}
      {createdJobData && (
        <PostJobSuccessModal
          isOpen={!!createdJobData}
          onClose={() => {
            setCreatedJobData(null);
            navigate('/jobs');
          }}
          job={{
            id: createdJobData.id,
            title: createdJobData.title || previewTitle,
            companyName: createdJobData.employerProfile?.companyName || createdJobData.employerName,
            city: createdJobData.city || city,
            location: createdJobData.location || address,
            budget: Number(createdJobData.budget || previewBudget),
            coverImageUrl: effectiveCoverUrl || createdJobData.cover_image_url || createdJobData.coverImageUrl || null,
          }}
        />
      )}
    </div>
  );
};
