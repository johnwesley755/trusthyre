import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Loader2, 
  Building2, 
  Briefcase, 
  Globe, 
  MapPin, 
  FileText, 
  Camera, 
  UploadCloud, 
  CheckCircle2 
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, type EmployerProfile } from '../../../services/profile.service';
import { useAuth, useUser } from '../../../providers/AuthContext';
import { queryKeys } from '../../../lib/queryKeys';

interface EditEmployerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: EmployerProfile;
}

export const EditEmployerProfileModal: React.FC<EditEmployerProfileModalProps> = ({
  isOpen,
  onClose,
  profile
}) => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>('');
  const [isProcessingLogo, setIsProcessingLogo] = useState<boolean>(false);
  const [logoLoadError, setLogoLoadError] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    companyWebsite: '',
    profileBio: '',
    city: '',
    address: ''
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setProfileImageUrl(profile.profileImageUrl || (profile as any).profile_image_url || user?.profileImageUrl || '');
      setLogoLoadError(false);
      setFormData({
        companyName: profile.companyName || '',
        industry: profile.industry || '',
        companyWebsite: profile.companyWebsite || '',
        profileBio: profile.profileBio || '',
        city: profile.city || profile.location || '',
        address: profile.address || ''
      });
    }
  }, [profile, isOpen, user]);

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

  const handleModalLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg("Please select an image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    setIsProcessingLogo(true);
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
        setIsProcessingLogo(false);
      };
      img.onerror = () => {
        setErrorMsg("Failed to process image.");
        setIsProcessingLogo(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const mutation = useMutation({
    mutationFn: (updates: Partial<EmployerProfile>) => profileService.updateEmployerProfile(updates),
    onSuccess: (updatedData) => {
      if (profileImageUrl) {
        updateUser({
          ...user,
          profileImageUrl: profileImageUrl,
          profile_image_url: profileImageUrl
        });
      }
      queryClient.setQueryData(queryKeys.employer.profile, (old: any) => ({
        ...(old || {}),
        ...formData,
        profileImageUrl,
        profile_image_url: profileImageUrl,
        profilePhoto: profileImageUrl,
        ...(updatedData || {})
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.employer.profile });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update employer profile');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    mutation.mutate({
      companyName: formData.companyName.trim(),
      profileImageUrl: profileImageUrl || undefined,
      profile_image_url: profileImageUrl || undefined,
      industry: formData.industry.trim(),
      companyWebsite: formData.companyWebsite.trim(),
      profileBio: formData.profileBio.trim(),
      city: formData.city.trim(),
      location: formData.city.trim(),
      address: formData.address.trim()
    } as any);
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-y-auto select-none"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-employer-profile-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-[#1C1C21] rounded-3xl md:rounded-[2rem] w-full max-w-xl max-h-[88vh] flex flex-col border border-[#e6e8ec] dark:border-zinc-800 shadow-2xl overflow-hidden my-auto select-text"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#e6e8ec] dark:border-zinc-800 shrink-0 bg-white dark:bg-[#1C1C21] z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0f2f63]/10 dark:bg-zinc-800 border border-[#0f2f63]/15 dark:border-zinc-700 flex items-center justify-center text-[#0f2f63] dark:text-[#38BDF8] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 id="edit-employer-profile-title" className="text-base sm:text-lg font-bold text-[#0A1931] dark:text-zinc-100">
                  Edit Employer Profile
                </h2>
                <p className="text-xs text-[#717784] dark:text-zinc-400">Update company details, logo, industry, and address</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3 text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  {errorMsg}
                </div>
              )}

              {/* Company Logo Section */}
              <div className="p-4 bg-[#f8f9fa] dark:bg-[#121215] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 flex items-center gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleModalLogoUpload}
                  className="hidden"
                />

                <div className="w-16 h-16 bg-white dark:bg-[#1C1C21] flex items-center justify-center rounded-2xl border border-[#e6e8ec] dark:border-zinc-700 overflow-hidden shrink-0 shadow-2xs">
                  {profileImageUrl && !logoLoadError ? (
                    <img 
                      src={profileImageUrl} 
                      alt=""
                      aria-label="Company Logo" 
                      referrerPolicy="no-referrer"
                      onError={() => setLogoLoadError(true)}
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-300 dark:text-zinc-600" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                    <span>Company Logo</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingLogo}
                      className="px-3.5 py-1.5 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#0c244c] dark:hover:bg-[#0052cc] text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {isProcessingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5 text-white" />
                          <span>{profileImageUrl ? "Change Logo" : "Upload Logo"}</span>
                        </>
                      )}
                    </button>
                    {profileImageUrl && (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#0066FF]/20 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] dark:text-zinc-100 font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  placeholder="e.g. Apex Infrastructure Ltd."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Industry Sector
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#0066FF]/20 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] dark:text-zinc-100 font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    placeholder="e.g. Construction / Facility Mgmt"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Website
                  </label>
                  <input
                    type="url"
                    value={formData.companyWebsite}
                    onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                    className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#0066FF]/20 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] dark:text-zinc-100 font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    placeholder="https://company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Headquarter City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#0066FF]/20 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] dark:text-zinc-100 font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    placeholder="e.g. Chennai, TN"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200">Office Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#0066FF]/20 rounded-xl px-4 py-2.5 text-xs text-[#0A1931] dark:text-zinc-100 font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    placeholder="e.g. 104, Mount Road, Teynampet"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0A1931] dark:text-zinc-200 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" /> Company Overview / Bio
                </label>
                <textarea
                  rows={3}
                  value={formData.profileBio}
                  onChange={(e) => setFormData({ ...formData, profileBio: e.target.value })}
                  className="w-full bg-white dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-[#0066FF] focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#0066FF]/20 rounded-xl p-3 text-xs text-[#0A1931] dark:text-zinc-100 font-semibold outline-none resize-none leading-relaxed transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  placeholder="Tell potential candidates about your company and work culture..."
                />
              </div>
            </div>

            {/* Pinned Actions */}
            <div className="px-6 py-4 border-t border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-[#1C1C21]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-[#0A1931] dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-2.5 bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#0c244c] dark:hover:bg-[#0052cc] active:bg-[#081a38] text-white text-xs font-bold rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer uppercase tracking-wider"
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
