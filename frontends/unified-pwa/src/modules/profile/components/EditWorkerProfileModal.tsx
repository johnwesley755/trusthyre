import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Loader2, 
  User, 
  Briefcase, 
  MapPin, 
  GraduationCap, 
  Languages, 
  Calendar, 
  Award, 
  Sparkles, 
  Camera, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  FileText
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, type WorkerProfile } from '../../../services/profile.service';
import { queryKeys } from '../../../lib/queryKeys';
import { useAuth, useUser } from '../../../providers/AuthContext';
import { UserAvatar } from '../../../components/common/UserAvatar';

interface EditWorkerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: WorkerProfile;
}

const EDUCATION_OPTIONS = [
  "Below 10th Pass",
  "10th Pass",
  "12th Pass",
  "Diploma / ITI",
  "Graduate / Degree",
  "Post Graduate"
];

const ENGLISH_LEVELS = [
  { id: 'FLUENT', label: 'Fluent English' },
  { id: 'GOOD', label: 'Good English' },
  { id: 'BASIC', label: 'Basic English' },
  { id: 'NONE', label: 'No English' }
];

const POPULAR_SKILLS = [
  "Maintenance & Repair",
  "Electrical Wiring",
  "Pipe Fitting & Plumbing",
  "Customer Support",
  "Inventory & Warehousing",
  "Driving & Delivery",
  "Cooking & Food Safety",
  "MS Office / Data Entry",
  "Retail Sales & Cash Handling",
  "Facility Cleaning",
  "Carpentry & Woodwork",
  "Machine Operation"
];

const POPULAR_ROLES = [
  "Electrician",
  "Plumber",
  "Delivery Driver",
  "Warehouse Associate",
  "Cook / Chef / Kitchen Help",
  "Retail Sales & Operations",
  "Customer Support / BPO",
  "Data Entry Operator",
  "Security Guard",
  "Carpenter"
];

export const EditWorkerProfileModal: React.FC<EditWorkerProfileModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [skillInput, setSkillInput] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    skills: '',
    experienceYears: 0,
    hourlyRate: 0,
    city: '',
    address: '',
    bio: '',
    dob: '',
    gender: 'MALE',
    highestEducation: '12th Pass',
    collegeName: '',
    degree: '',
    specialization: '',
    schoolMedium: '',
    englishProficiency: 'BASIC',
    languagesKnown: 'English, Hindi, Tamil',
    preferredRoles: 'Electrician, Customer Support',
    willingToRelocate: false,
    preferredCities: 'Chennai, Bangalore',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync data whenever modal opens or profile changes
  useEffect(() => {
    if (profile) {
      setProfileImageUrl(profile.profileImageUrl || (profile as any).profile_image_url || (profile as any).profilePhoto || user?.profileImageUrl || '');
      
      const skillsStr = Array.isArray(profile.skills) 
        ? profile.skills.join(', ') 
        : (profile.skills || '');
      
      const rolesStr = Array.isArray(profile.preferredRoles)
        ? profile.preferredRoles.join(', ')
        : (typeof profile.preferredRoles === 'string' ? profile.preferredRoles : (skillsStr || 'Electrician, Customer Support'));

      const exp = Number(profile.experienceYears ?? (profile as any).experience_years) || 0;

      let formattedDob = '';
      if (profile.dob) {
        try {
          formattedDob = new Date(profile.dob).toISOString().split('T')[0];
        } catch {
          formattedDob = String(profile.dob).slice(0, 10);
        }
      }

      setFormData({
        fullName: profile.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '',
        skills: skillsStr,
        experienceYears: exp,
        hourlyRate: profile.hourlyRate || 0,
        city: profile.city || profile.location || '',
        address: profile.address || '',
        bio: profile.bio || '',
        dob: formattedDob,
        gender: profile.gender || 'MALE',
        highestEducation: profile.highestEducation || '12th Pass',
        collegeName: profile.collegeName || '',
        degree: profile.degree || '',
        specialization: profile.specialization || '',
        schoolMedium: profile.schoolMedium || '',
        englishProficiency: profile.englishProficiency || 'BASIC',
        languagesKnown: Array.isArray(profile.languagesKnown) ? profile.languagesKnown.join(', ') : (profile.languagesKnown || 'English, Hindi, Tamil'),
        preferredRoles: rolesStr,
        willingToRelocate: Boolean(profile.willingToRelocate),
        preferredCities: Array.isArray(profile.preferredCities) ? profile.preferredCities.join(', ') : (profile.preferredCities || 'Chennai, Bangalore'),
      });
    }
  }, [profile, isOpen, user]);

  // Skill Helpers
  const skillsList = typeof formData.skills === 'string'
    ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
    : (Array.isArray(formData.skills) ? (formData.skills as string[]).map(s => String(s).trim()).filter(Boolean) : []);

  const handleAddSkill = (skillToAdd?: string) => {
    const val = (skillToAdd || skillInput).trim();
    if (!val) return;
    if (!skillsList.includes(val)) {
      const updated = [...skillsList, val].join(', ');
      setFormData(prev => ({ ...prev, skills: updated }));
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updated = skillsList.filter(s => s !== skillToRemove).join(', ');
    setFormData(prev => ({ ...prev, skills: updated }));
  };

  // Role Helpers
  const rolesList = formData.preferredRoles
    ? formData.preferredRoles.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const handleToggleRole = (role: string) => {
    let updated: string[];
    if (rolesList.includes(role)) {
      if (rolesList.length > 1) {
        updated = rolesList.filter(r => r !== role);
      } else {
        return;
      }
    } else {
      updated = [...rolesList, role];
    }
    setFormData(prev => ({ ...prev, preferredRoles: updated.join(', ') }));
  };

  // Auto-Generate Bio
  const handleAutoGenerateBio = () => {
    const roles = formData.preferredRoles || 'Skilled professional';
    const loc = formData.city ? `based in ${formData.city}` : 'ready for local assignments';
    const exp = formData.experienceYears > 0 
      ? `${formData.experienceYears} years of verified practical experience` 
      : 'Dedicated and motivated professional ready to contribute immediately';
    const topSkills = skillsList.length > 0 ? `Core strengths include ${skillsList.slice(0, 4).join(', ')}.` : '';
    const bioText = `${roles} ${loc} with ${exp}. ${topSkills} Proficient in ${formData.englishProficiency.toLowerCase()} English. Dedicated, punctual, and committed to high performance.`;
    setFormData(prev => ({ ...prev, bio: bioText }));
  };

  // Handle Photo Upload with Client-Side Canvas Compression
  const handleModalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg("Please select an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setIsProcessingPhoto(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setProfileImageUrl(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setProfileImageUrl(event.target?.result as string);
        }
        setIsProcessingPhoto(false);
      };
      img.onerror = () => {
        setErrorMsg("Failed to process image.");
        setIsProcessingPhoto(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: (updates: Partial<WorkerProfile>) => profileService.updateWorkerProfile(updates),
    onSuccess: (updatedData) => {
      if (profileImageUrl) {
        updateUser({
          ...user,
          profileImageUrl: profileImageUrl,
          profile_image_url: profileImageUrl
        });
      }
      queryClient.setQueryData(queryKeys.workers.detail('me'), (old: any) => {
        const result: Record<string, any> = {
          ...(old || {}),
          ...formData,
          profileImageUrl,
          profile_image_url: profileImageUrl,
          profilePhoto: profileImageUrl,
          languagesKnown: formData.languagesKnown.split(',').map(s => s.trim()).filter(Boolean),
          preferredRoles: formData.preferredRoles.split(',').map(s => s.trim()).filter(Boolean),
          preferredCities: formData.preferredCities.split(',').map(s => s.trim()).filter(Boolean),
          ...(updatedData || {})
        };
        result.experienceYears = Number(formData.experienceYears) || 0;
        result.experience_years = Number(formData.experienceYears) || 0;
        return result;
      });
      queryClient.setQueryData(queryKeys.workers.me, result);
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update profile');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    mutation.mutate({
      fullName: formData.fullName.trim(),
      profileImageUrl: profileImageUrl || undefined,
      profile_image_url: profileImageUrl || undefined,
      profilePhoto: profileImageUrl || undefined,
      skills: formData.skills,
      experienceYears: Number(formData.experienceYears) || 0,
      hourlyRate: Number(formData.hourlyRate) || 0,
      city: formData.city.trim(),
      location: `${formData.address ? formData.address + ', ' : ''}${formData.city}`,
      address: formData.address.trim(),
      bio: formData.bio.trim(),
      dob: formData.dob || null,
      gender: formData.gender,
      highestEducation: formData.highestEducation,
      collegeName: formData.collegeName?.trim() || null,
      degree: formData.degree?.trim() || null,
      specialization: formData.specialization?.trim() || null,
      schoolMedium: formData.schoolMedium?.trim() || null,
      englishProficiency: formData.englishProficiency,
      languagesKnown: formData.languagesKnown.split(',').map(s => s.trim()).filter(Boolean),
      preferredRoles: formData.preferredRoles.split(',').map(s => s.trim()).filter(Boolean),
      willingToRelocate: formData.willingToRelocate,
      preferredCities: formData.preferredCities.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  // Body scroll lock and Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-y-auto select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl md:rounded-[2rem] w-full max-w-2xl max-h-[88vh] flex flex-col border border-[#e6e8ec] shadow-2xl overflow-hidden my-auto select-text"
        >
          {/* PINNED HEADER (Current App Theme) */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#e6e8ec] shrink-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 flex items-center justify-center text-[#0f2f63] shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 id="edit-profile-title" className="text-base sm:text-lg font-bold text-[#0A1931]">
                  Edit Candidate Profile
                </h2>
                <p className="text-xs text-[#717784]">
                  Update your credentials, experience, skills, and professional bio
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-[#0A1931] hover:bg-slate-100 transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* FORM BODY WITH INDEPENDENT SMOOTH SCROLL */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
                  {errorMsg}
                </div>
              )}

              {/* 1. Profile Photo Section */}
              <div className="p-4 bg-[#f8f9fa] rounded-2xl border border-[#e6e8ec] flex items-center gap-4">
                <input 
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleModalPhotoUpload}
                  className="hidden"
                />

                <div className="relative group shrink-0">
                  <UserAvatar 
                    src={profileImageUrl}
                    name={formData.fullName || 'Candidate'}
                    size="lg"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <span>Profile Photo</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPhoto}
                      className="px-3.5 py-1.5 bg-[#0f2f63] hover:bg-[#0c244c] text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isProcessingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-white" />
                          <span>{profileImageUrl ? "Change Photo" : "Upload Photo"}</span>
                        </>
                      )}
                    </button>
                    {profileImageUrl && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Personal Details */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-[#e6e8ec]">
                  <User className="w-3.5 h-3.5 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Personal Details</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Ramesh Kumar"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all cursor-pointer"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">City / Town *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Chennai, TN"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931]">Address / Locality</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g. Royapuram, Near High Court"
                  />
                </div>
              </div>

              {/* 3. Work Experience & Preferred Trades */}
              <div className="space-y-3.5 pt-2 border-t border-[#e6e8ec]">
                <div className="flex items-center justify-between pb-1 border-b border-[#e6e8ec]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Work Experience & Trades</h3>
                  </div>
                  <span className="text-xs font-bold text-[#0f2f63]">
                    {formData.experienceYears === 0 ? "Fresher (0 yrs)" : `${formData.experienceYears} Years Experience`}
                  </span>
                </div>

                {/* Experience Chip Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931]">Total Work Experience *</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { val: 0, label: "Fresher" },
                      { val: 1, label: "1 Yr" },
                      { val: 2, label: "2 Yrs" },
                      { val: 3, label: "3 Yrs" },
                      { val: 4, label: "4 Yrs" },
                      { val: 5, label: "5+ Yrs" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, experienceYears: item.val }))}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          formData.experienceYears === item.val
                            ? "bg-[#0f2f63] text-white border-[#0f2f63] shadow-xs"
                            : "bg-[#f8f9fa] text-[#717784] border-[#e6e8ec] hover:border-slate-300 hover:text-[#0A1931]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Roles */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0A1931]">Preferred Job Roles (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.preferredRoles}
                    onChange={(e) => setFormData({ ...formData, preferredRoles: e.target.value })}
                    className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                    placeholder="e.g. Electrician, Customer Support, Retail Executive"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-24 overflow-y-auto">
                    {POPULAR_ROLES.map((role) => {
                      const isSelected = rolesList.includes(role);
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleToggleRole(role)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-[#0f2f63] text-white border-[#0f2f63]"
                              : "bg-[#f8f9fa] text-[#717784] border-[#e6e8ec] hover:text-[#0A1931]"
                          }`}
                        >
                          {role} {isSelected ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 4. Core Skills & Technical Strengths */}
              <div className="space-y-3.5 pt-2 border-t border-[#e6e8ec]">
                <div className="flex items-center justify-between pb-1 border-b border-[#e6e8ec]">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Skills & Specialties</h3>
                  </div>
                  <span className="text-[11px] text-[#717784]">
                    {skillsList.length} skills listed
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Add a skill (e.g. Three-Phase Wiring, Tally) & press Enter..."
                    className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddSkill()}
                    disabled={!skillInput.trim()}
                    className="px-4 py-2.5 bg-[#0f2f63] text-white text-xs font-bold rounded-xl disabled:opacity-40 hover:bg-[#0c244c] cursor-pointer shrink-0 transition-all"
                  >
                    Add
                  </button>
                </div>

                {/* Selected Skills Badges */}
                {skillsList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {skillsList.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#0f2f63] border border-blue-200"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Suggested Trade Skills */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-semibold text-[#717784]">Popular skills:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {POPULAR_SKILLS.map((sk) => {
                      const isAdded = skillsList.includes(sk);
                      return (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => isAdded ? handleRemoveSkill(sk) : handleAddSkill(sk)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer border ${
                            isAdded
                              ? "bg-[#0f2f63] text-white border-[#0f2f63]"
                              : "bg-[#f8f9fa] text-[#717784] border-slate-200 hover:text-[#0A1931]"
                          }`}
                        >
                          {sk} {isAdded ? "✓" : "+"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Professional Bio / Candidate Summary */}
              <div className="space-y-2.5 pt-2 border-t border-[#e6e8ec]">
                <div className="flex items-center justify-between pb-1 border-b border-[#e6e8ec]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#0f2f63]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Candidate Bio & Summary *</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoGenerateBio}
                    className="text-[11px] font-bold text-[#0f2f63] hover:text-[#0c244c] flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-all"
                  >
                    <Sparkles className="w-3 h-3 text-[#0f2f63]" />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Introduce your work experience, strengths, and reliability to potential employers..."
                  className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl p-3 text-xs text-[#0A1931] font-semibold outline-none resize-none leading-relaxed transition-all placeholder:text-slate-400"
                />
                <p className="text-[11px] text-[#717784]">
                  This summary is visible on your profile and verified resume when applying for jobs.
                </p>
              </div>

              {/* 6. Academic Background */}
              <div className="space-y-3.5 pt-2 border-t border-[#e6e8ec]">
                <div className="flex items-center gap-2 pb-1 border-b border-[#e6e8ec]">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Academic Background</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Highest Education</label>
                    <select
                      value={formData.highestEducation}
                      onChange={(e) => setFormData({ ...formData, highestEducation: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all cursor-pointer"
                    >
                      {EDUCATION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">College / Institution</label>
                    <input
                      type="text"
                      value={formData.collegeName}
                      onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Loyola College / Govt ITI"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Degree / Certificate</label>
                    <input
                      type="text"
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. B.Sc, B.Com, ITI Electrician"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Specialization / Stream</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Computer Science, Electrical"
                    />
                  </div>
                </div>
              </div>

              {/* 7. Languages & Relocation */}
              <div className="space-y-3.5 pt-2 border-t border-[#e6e8ec]">
                <div className="flex items-center gap-2 pb-1 border-b border-[#e6e8ec]">
                  <Languages className="w-3.5 h-3.5 text-[#0f2f63]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A1931]">Languages & Relocation</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">English Proficiency</label>
                    <select
                      value={formData.englishProficiency}
                      onChange={(e) => setFormData({ ...formData, englishProficiency: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all cursor-pointer"
                    >
                      {ENGLISH_LEVELS.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>{lvl.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0A1931]">Languages Known (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.languagesKnown}
                      onChange={(e) => setFormData({ ...formData, languagesKnown: e.target.value })}
                      className="w-full bg-white border border-[#e6e8ec] focus:border-[#0f2f63] focus:ring-2 focus:ring-[#0f2f63]/10 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] font-semibold outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Tamil, English, Hindi"
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between p-3.5 bg-[#f8f9fa] rounded-2xl border border-[#e6e8ec]">
                  <div>
                    <p className="text-xs font-bold text-[#0A1931]">Willing to Relocate</p>
                    <p className="text-[11px] text-[#717784]">Allow employers outside your current city to reach out</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.willingToRelocate}
                    onChange={(e) => setFormData({ ...formData, willingToRelocate: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0f2f63] focus:ring-[#0f2f63] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* PINNED FOOTER ACTIONS */}
            <div className="px-6 py-4 border-t border-[#e6e8ec] flex items-center justify-end gap-3 shrink-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-[#0A1931] hover:bg-slate-100 rounded-full transition-all cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-2.5 bg-[#0f2f63] hover:bg-[#0c244c] active:bg-[#081a38] text-white text-xs font-bold rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
