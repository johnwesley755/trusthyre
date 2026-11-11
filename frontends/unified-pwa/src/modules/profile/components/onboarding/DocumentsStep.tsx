import { motion } from "framer-motion";

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

interface DocumentsStepProps {
  formData: OnboardingData;
  setFormData: (data: OnboardingData | ((prev: OnboardingData) => OnboardingData)) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DocumentsStep({ formData, setFormData, onNext, onBack }: DocumentsStepProps) {
  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full flex flex-col items-center justify-center relative min-h-[60vh] pl-4 lg:pl-12"
    >

        <div className="w-full flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center relative">
            {/* Centered Card Layout */}
            <div className="w-full max-w-2xl bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-xl p-8 md:p-12 shadow-[0_20px_40px_-10px_rgba(31,63,52,0.05)] relative overflow-hidden text-left">
                {/* Asymmetric Decorative Element */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffe081]/20 organic-blob translate-x-12 -translate-y-12"></div>
                
                <div className="relative z-10">
                    <h1 className="font-headline font-extrabold text-[2.5rem] leading-[1.1] text-[#0A1931] dark:text-white mb-2 tracking-tight">Narrative</h1>
                    <p className="text-[#414845] text-lg leading-relaxed mb-10">Codify your professional background and work ethics.</p>

                    {/* Input Section */}
                    <div className="space-y-6">
                        <div className="group">
                            <label className="font-headline font-bold text-xs uppercase tracking-widest text-[#0A1931] dark:text-white block mb-3">Operational summary</label>
                            <div className="relative">
                                <textarea 
                                    className="w-full min-h-[220px] bg-[#e9e8e3] dark:bg-[#121215] border border-transparent dark:border-zinc-800 border-none rounded-lg p-6 font-body text-[#1b1c19] placeholder:text-[#414845]/40 focus:ring-2 focus:ring-[#ffe081] transition-all resize-none outline-none" 
                                    placeholder="Describe your tactical expertise and network value..."
                                    value={formData.bio}
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                />
                                {/* Contextual Visual */}
                                <div className="absolute bottom-4 right-4 opacity-10 grayscale hover:opacity-100 transition-opacity">
                                    <img alt="Professional worker" className="w-16 h-16 object-cover rounded-full border-2 border-white shadow-lg" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcaTLTk7dth-GLvYk8wVcWS4OghTz26eg9vFsJHpPFdMt5pmUissN8JjCz1mcnTnKwgGcEH3lLwsmOX3EjyqxppHN1cyrOOi5wHm9EpZwCGX7xhiOvrJ4bEX-nGupp2OkFP4cB9VS4ScmpWKsni7sTrrl8duQPTlv-_d_5F20My64c-sMdwybgF8CkGh11mlj8VnifwqhGG9mlSbPk--4XbjDuwLM-Gm-1eZjLaWcvS4Ph76l4XlI7T7wouyVFm84zwbSiEpE1Zpc" />
                                </div>
                            </div>
                            <p className="mt-3 text-xs text-[#414845] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Keep it concise. Highlight logistics, management, or field leadership.
                            </p>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-[#e9e8e3]/50">
                        <button 
                            onClick={onBack}
                            className="w-full sm:w-auto px-8 py-3 rounded-lg font-headline font-bold text-xs uppercase tracking-widest text-[#0A1931] dark:text-white hover:bg-[#e2e8f0] transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Back
                        </button>
                        <button 
                            onClick={onNext}
                            disabled={!formData.bio}
                            className="w-full sm:w-auto bg-[#FACD15] text-[#002117] px-10 py-4 rounded-lg font-headline font-extrabold text-sm uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            Next Step
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Editorial Tip (Floating Element) */}
            <div className="hidden lg:flex w-64 flex-col gap-4 self-center">
                <div className="bg-white p-6 rounded-lg shadow-sm text-left border border-[#e9e8e3]/50">
                    <div className="w-10 h-10 bg-[#d1fae5] rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[#4a6b5e]">psychology</span>
                    </div>
                    <h4 className="font-headline font-bold text-[#0A1931] dark:text-white mb-2">Why Narrative?</h4>
                    <p className="text-xs text-[#414845] leading-relaxed">Modern operators aren't just resumes. We use this summary to match you with high-trust employers that value your specific tactical intuition.</p>
                </div>
            </div>
        </div>

    </motion.div>
  );
}
