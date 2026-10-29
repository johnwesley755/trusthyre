import { useState, useMemo, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { jobService } from '../../../services/job.service';
import { mediaService } from '../../../services/media.service';
import { useNavigate, Link } from 'react-router-dom';
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
import { toast } from 'sonner';
import { TRADE_COVER_PRESETS, resolveTradeCover } from '../../../utils/coverImage.utils';

export const JobPostingPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [skills, setSkills] = useState<string[]>(['Safety Protocol', 'Punctual']);
  const [skillInput, setSkillInput] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);

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

  const effectiveCoverUrl = useMemo(() => {
    return uploadedImageUrl || selectedPresetUrl || null;
  }, [uploadedImageUrl, selectedPresetUrl]);

  const minExpiryDateTime = useMemo(() => {
    const now = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }, []);

  const mutation = useMutation({
    mutationFn: (job: any) => jobService.createJob(job),
    onSuccess: (newJob) => {
      if (newJob) {
        queryClient.setQueryData(['employerJobs'], (old: any) => {
          if (!old) return [newJob];
          return Array.isArray(old) ? [newJob, ...old] : old;
        });
        queryClient.setQueryData(['jobs'], (old: any) => {
          if (!old) return [newJob];
          return Array.isArray(old) ? [newJob, ...old] : old;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['employerJobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job published successfully! Candidates are being notified.');
      navigate('/jobs');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to post job. Please verify all fields.');
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
    <div className="w-full min-h-screen p-2 sm:p-4 bg-white font-['Onest',system-ui,sans-serif] text-[#0a0a0a]">
      <main className="max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-20">
        
        {/* 1. Header Hero Card */}
        <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
                <span className="text-[10px] font-semibold uppercase text-[#0f2f63]">
                  Job & Shift Posting
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0a0a0a]">
                Post a New Job Opening
              </h1>
              <p className="text-xs text-[#717784] font-medium leading-relaxed max-w-xl">
                Quickly find verified workers nearby with authenticated profiles and zero agency middle-men fees.
              </p>
            </div>

            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-[#e6e8ec] text-[#0a0a0a] text-xs font-semibold uppercase transition-all shadow-2xs shrink-0"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#717784]" />
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
              <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    1
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784] tracking-wide">
                    Role Fundamentals & Scope
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Job Title *</label>
                    <input 
                      name="title"
                      required
                      defaultValue={previewTitle}
                      onChange={(e) => setPreviewTitle(e.target.value)}
                      placeholder="e.g. Master Industrial Electrician"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Industry Category *</label>
                    <select 
                      name="industry"
                      defaultValue={previewIndustry}
                      onChange={(e) => {
                        const nextInd = e.target.value;
                        setPreviewIndustry(nextInd);
                      }}
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all cursor-pointer"
                    >
                      <option value="ELECTRICAL">Electrical Work</option>
                      <option value="PLUMBING">Plumbing</option>
                      <option value="CONSTRUCTION">Construction & Masonry</option>
                      <option value="MAINTENANCE">Facility Maintenance & Repair</option>
                      <option value="LOGISTICS">Logistics & Warehouse</option>
                      <option value="COOKING_CHEF">Cooking / Commercial Chef</option>
                      <option value="HOSPITALITY">Hospitality & Hotel Staff</option>
                      <option value="DOMESTIC_HELP">Housekeeping / Cleaning</option>
                      <option value="SECURITY">Security Services</option>
                      <option value="MANUFACTURING">Manufacturing & Fabrication</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0a0a0a]">Role Scope & Responsibilities *</label>
                  <textarea 
                    name="description"
                    required
                    placeholder="Describe daily tasks, working hours, tools provided, break times, and specific site regulations..."
                    rows={4}
                    className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Step 2: Upload Your Own Image (First-Class Feature & Fully Responsive) */}
              <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border-b border-[#e6e8ec] pb-3">
                  <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 sm:mt-0 shadow-2xs select-none">
                      2
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold uppercase text-[#717784] tracking-wide">
                        Upload Cover Image
                      </h3>
                      <p className="text-[11px] text-[#717784] leading-snug mt-0.5">
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
                      className="self-start sm:self-auto text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer shrink-0"
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
                        ? 'border-[#0f2f63] bg-[#0f2f63]/5 ring-4 ring-[#0f2f63]/10 scale-[0.99]' 
                        : 'border-[#c5c8d0] hover:border-[#0f2f63] hover:bg-slate-50/80 bg-white'
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

                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0f2f63]/5 text-[#0f2f63] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[#0a0a0a]">
                      Upload Your Own Image
                    </h4>
                    <p className="text-[11px] sm:text-xs text-[#717784] mt-1 max-w-sm leading-relaxed px-2">
                      Drag and drop your photo here, or click to browse from your device
                    </p>

                    <div className="inline-flex items-center gap-2 mt-3.5 sm:mt-4 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold shadow-xs transition-all">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Browse Image File</span>
                    </div>

                    <span className="text-[10px] text-[#9ea3ae] mt-2">
                      Supports JPG, PNG, WebP up to 10MB
                    </span>
                  </div>
                ) : (
                  /* Active Uploaded Image Preview Box */
                  <div className="w-full rounded-2xl border border-[#e6e8ec] bg-white overflow-hidden shadow-xs relative">
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
                <div className="pt-2 border-t border-[#e6e8ec]">
                  <button
                    type="button"
                    onClick={() => setShowPresets(!showPresets)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#717784] hover:text-[#0f2f63] cursor-pointer transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{showPresets ? 'Hide stock trade banners' : "Don't have your own photo? Choose a free trade banner"}</span>
                  </button>

                  {showPresets && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#e6e8ec] animate-in fade-in duration-200">
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
                                ? 'border-[#0f2f63] shadow-md ring-2 ring-[#0f2f63]/20'
                                : 'border-[#e6e8ec] hover:border-slate-400 opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={preset.url} alt={preset.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            {isPresetSelected && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#0f2f63] text-white flex items-center justify-center">
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
              <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    3
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784] tracking-wide">
                    Worksite Location & GPS Geolocation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Street / Site Address *</label>
                    <input 
                      name="address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Guindy Industrial Estate, Plot 14"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">City / Region *</label>
                    <input 
                      name="city"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chennai"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="bg-white p-3 rounded-2xl border border-[#e6e8ec] relative z-0 isolate">
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
              <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 md:p-8 border border-[#e6e8ec] space-y-4">
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[#e6e8ec] pb-3">
                  <div className="w-6 h-6 min-w-[24px] min-h-[24px] max-w-[24px] max-h-[24px] aspect-square rounded-full bg-[#0f2f63] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs select-none">
                    4
                  </div>
                  <h3 className="text-xs font-bold uppercase text-[#717784] tracking-wide">
                    Compensation, Duration & Skill Requirements
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Monthly Budget (₹) *</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717784]" />
                      <input 
                        name="budget"
                        type="number"
                        required
                        defaultValue={previewBudget}
                        onChange={(e) => setPreviewBudget(e.target.value)}
                        placeholder="28000"
                        className="w-full bg-white border border-[#e6e8ec] rounded-xl pl-9 pr-3 py-3 text-xs font-bold text-[#0a0a0a] tabular-nums focus:border-[#0f2f63] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0a0a0a]">Min. Experience (Years)</label>
                    <input 
                      name="experienceYearsRequired"
                      type="text"
                      min={0}
                      defaultValue={previewExp}
                      onChange={(e) => setPreviewExp(e.target.value)}
                      placeholder="2"
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#0a0a0a]">Auto-Expiry Date & Time (Optional)</label>
                      {previewExpiresAt ? (
                        <button
                          type="button"
                          onClick={() => setPreviewExpiresAt('')}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer underline"
                        >
                          Remove Expiry
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#717784] font-medium">Optional</span>
                      )}
                    </div>
                    <input 
                      name="expiresAt"
                      type="datetime-local"
                      min={minExpiryDateTime}
                      value={previewExpiresAt}
                      onChange={(e) => setPreviewExpiresAt(e.target.value)}
                      className="w-full bg-white border border-[#e6e8ec] rounded-xl p-3 text-xs font-semibold text-[#0a0a0a] focus:border-[#0f2f63] outline-none transition-all cursor-pointer"
                    />
                    <p className="text-[10px] text-[#717784]">
                      Leave blank for open-ended hiring, or pick a date & time to auto-expire.
                    </p>
                  </div>
                </div>

                {/* Skill Tags */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-[#0a0a0a]">Technical Skill Tags</label>
                  <div className="flex gap-2">
                    <input 
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="Type a skill and press Enter (e.g. Conduit Bending, Three Phase)..."
                      className="flex-1 bg-white border border-[#e6e8ec] rounded-xl px-3.5 py-2.5 text-xs text-[#0a0a0a] focus:border-[#0f2f63] outline-none"
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
                        className="bg-white border border-[#e6e8ec] px-3 py-1 rounded-full text-xs font-semibold text-[#0a0a0a] flex items-center gap-1.5 shadow-2xs"
                      >
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{skill}</span>
                        <X 
                          className="w-3.5 h-3.5 cursor-pointer text-[#717784] hover:text-rose-600 ml-0.5" 
                          onClick={() => removeSkill(skill)} 
                        />
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase text-[#717784] mb-1.5">Quick Suggestions:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_SKILL_SUGGESTIONS.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => !skills.includes(s) && setSkills([...skills, s])}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-[#e6e8ec] text-[#717784] cursor-pointer"
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button Action Row */}
              <div className="bg-[#fbfbfb] p-4 rounded-2xl border border-[#e6e8ec] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#717784]">
                  <p className="font-semibold text-[#0a0a0a]">Secure Protected Shift Posting</p>
                  <p className="text-[11px]">Funds are held securely and released upon candidate check-out confirmation.</p>
                </div>

                <button
                  type="submit"
                  disabled={mutation.isPending || isUploading}
                  className="w-full sm:w-auto px-8 py-3 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full font-medium text-xs uppercase shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {mutation.isPending || isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Publish Role & Deploy Shift</span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Column: Sticky Live Preview & Guarantees (4 cols) */}
          <div className="col-span-1 lg:col-span-4 space-y-5 sm:space-y-6 lg:sticky lg:top-20">
            
            {/* Live Mockup Card */}
            <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 border border-[#e6e8ec] space-y-4">
              <div className="flex items-center justify-between border-b border-[#e6e8ec] pb-3">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase text-[#717784]">
                    Candidate Feed Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live Sync
                </span>
              </div>

              {/* Mockup Card with Cover Image */}
              <div className="bg-white rounded-2xl border border-[#e6e8ec] shadow-sm overflow-hidden space-y-0">
                {effectiveCoverUrl && (
                  <div className="w-full h-36 relative overflow-hidden bg-slate-100 border-b border-[#e6e8ec]">
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
                        <span className="px-2 py-0.5 rounded-full bg-[#0f2f63]/5 text-[#0f2f63] text-[9px] font-bold border border-[#0f2f63]/10">
                          {previewIndustry}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-[#0a0a0a] mt-1 leading-snug">
                        {previewTitle || 'Job Title'}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-xl tabular-nums shrink-0">
                      ₹{Number(previewBudget || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-xs text-[#717784] space-y-1">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#0f2f63] shrink-0" />
                      <span className="truncate">{city || address || 'Designated worksite location'}</span>
                    </p>
                    <p className="text-[11px] text-[#717784]">
                      Min. {previewExp || 0} years experience required
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {skills.slice(0, 3).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-[#f4f4f4] rounded-md text-[10px] font-medium text-[#0a0a0a]">
                        {s}
                      </span>
                    ))}
                    {skills.length > 3 && (
                      <span className="px-2 py-0.5 bg-[#f4f4f4] rounded-md text-[10px] font-medium text-[#717784]">
                        +{skills.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#e6e8ec] flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Job Listing</span>
                    </span>
                    {previewExpiresAt && (
                      <span className="text-[#717784] text-[10px] flex items-center gap-1 font-medium">
                        <CalendarClock className="w-3 h-3 text-[#0f2f63]" />
                        <span>Closes {new Date(previewExpiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hiring Speed & Protection Note */}
            <div className="bg-[#f4f4f4] rounded-2xl sm:rounded-[1.75rem] p-4 sm:p-6 border border-[#e6e8ec] space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                <h4 className="font-bold text-[#0a0a0a]">TrustHyre Hiring Advantages</h4>
              </div>

              <ul className="space-y-2.5 text-[#717784] leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Nearby verified candidates receive direct push notifications instantly.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Average shift fulfillment turnaround of under 4 hours across major commercial zones.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Zero hidden recruiter commissions or subscription lock-ins.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
