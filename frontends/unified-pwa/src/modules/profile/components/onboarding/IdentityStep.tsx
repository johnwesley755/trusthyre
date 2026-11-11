import { motion } from "framer-motion";
import { AdvancedFileUpload } from "../../components/AdvancedFileUpload";

interface OnboardingData {
  fullName: string;
  phoneNumber: string;
  bio: string;
  skills: string[];
  experienceYears: string;
  hourlyRate: string;
  level: string;
  location: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  profile_image_url: string;
}

interface IdentityStepProps {
  formData: OnboardingData;
  setFormData: (data: OnboardingData | ((prev: OnboardingData) => OnboardingData)) => void;
  onNext: () => void;
}

export default function IdentityStep({ formData, setFormData, onNext }: IdentityStepProps) {
  const isPhoneValid = !formData.phoneNumber || /^[0-9]{10}$/.test(formData.phoneNumber.replace(/\D/g, ''));

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full flex flex-col items-center justify-center relative"
    >

        <div className="max-w-xl w-full">
            {/* Identity Card */}
            <div className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-xl p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(31,63,52,0.08)] relative overflow-hidden text-left">
                {/* Editorial Profile Blob (Decorative) */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#e2e8f0] organic-blob -mr-16 -mt-16"></div>
                
                <div className="relative z-10">
                    <div className="mb-10">
                        <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-[#0A1931] dark:text-white tracking-tight mb-4">Identity</h1>
                        <p className="text-lg text-[#0A1931] dark:text-white/70 leading-relaxed">Confirm your verified candidate profile and mobile number.</p>
                    </div>

                    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
                        {/* Profile Image Section */}
                        <div className="flex items-center gap-6 mb-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#e9e8e3] ring-2 ring-[#FACD15] ring-offset-4">
                                    {formData.profile_image_url ? (
                                        <img alt="Profile" className="w-full h-full object-cover" src={formData.profile_image_url} />
                                    ) : (
                                        <div className="w-full h-full bg-[#f2f1ec] dark:bg-[#121215] flex items-center justify-center text-[#0A1931] dark:text-white/20">
                                            <span className="material-symbols-outlined text-4xl">person</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0">
                                    <AdvancedFileUpload 
                                        onUploadSuccess={(urls) => setFormData({...formData, profile_image_url: urls[0]})}
                                        initialUrls={formData.profile_image_url ? [formData.profile_image_url] : []}
                                        trigger={(open) => (
                                            <button 
                                                onClick={open}
                                                className="bg-[#FACD15] text-[#002117] p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform" 
                                                type="button"
                                            >
                                                <span className="material-symbols-outlined text-sm font-bold">edit</span>
                                            </button>
                                        )}
                                    />
                                </div>
                            </div>
                            <div>
                                <span className="block font-headline font-bold text-[#0A1931] dark:text-white">Profile Image</span>
                                <span className="text-xs text-[#0A1931] dark:text-white/50 uppercase tracking-widest">Identity Verified</span>
                            </div>
                        </div>

                        {/* Full Name */}
                        <div className="space-y-2 text-left">
                            <label className="font-headline font-bold text-xs uppercase tracking-widest text-[#0A1931] dark:text-white" htmlFor="fullname">Full Name *</label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#0A1931] dark:text-white/40">person</span>
                                <input 
                                    className="w-full pl-12 pr-4 py-4 bg-[#e9e8e3] dark:bg-[#121215] border border-transparent dark:border-zinc-800 border-none rounded-[1rem] focus:ring-2 focus:ring-[#FACD15] text-[#0A1931] dark:text-white placeholder:text-[#0A1931] dark:text-white/30 transition-all font-body outline-none" 
                                    id="fullname" 
                                    placeholder="E.g. Arjun Vardhan" 
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Phone Number (Mandatory to prevent duplicate/fake accounts) */}
                        <div className="space-y-2 text-left">
                            <div className="flex justify-between items-center">
                                <label className="font-headline font-bold text-xs uppercase tracking-widest text-[#0A1931] dark:text-white" htmlFor="phone">Mobile Phone Number *</label>
                                <span className="text-[10px] text-[#0A1931] dark:text-white/60 font-medium">10-Digit Mobile</span>
                            </div>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#0A1931] dark:text-white/40">phone</span>
                                <input 
                                    className={`w-full pl-12 pr-4 py-4 bg-[#e9e8e3] dark:bg-[#121215] border border-transparent dark:border-zinc-800 border-none rounded-[1rem] focus:ring-2 focus:ring-[#FACD15] text-[#0A1931] dark:text-white placeholder:text-[#0A1931] dark:text-white/30 transition-all font-body outline-none ${!isPhoneValid ? 'ring-2 ring-red-500' : ''}`} 
                                    id="phone" 
                                    placeholder="9876543210" 
                                    type="tel"
                                    required
                                    maxLength={10}
                                    value={formData.phoneNumber || ''}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '');
                                        setFormData({...formData, phoneNumber: clean});
                                    }}
                                />
                            </div>
                            <p className="text-[11px] text-[#0A1931] dark:text-white/60">
                                Required for hiring, direct employer calls, and duplicate prevention.
                            </p>
                        </div>

                        {/* CTA Section */}
                        <div className="pt-4">
                            <button 
                                className="w-full bg-[#FACD15] text-[#002117] font-headline font-extrabold py-4 px-8 rounded-[1rem] uppercase tracking-wider flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)] disabled:opacity-50" 
                                type="submit"
                                disabled={!formData.fullName || !(formData.phoneNumber && formData.phoneNumber.length >= 10)}
                            >
                                Continue to Expertise
                                <span className="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Contextual Footnote */}
            <p className="text-center mt-8 text-xs text-[#0A1931] dark:text-white/40 font-bold uppercase tracking-[0.2em]">Step 01 / 04 • Candidate Identity Verification</p>
        </div>

    </motion.div>
  );
}
