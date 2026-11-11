import { motion } from "framer-motion";

interface ReviewStepProps {
  formData: any;
  setFormData: (data: any) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  detectLocation: () => void;
  locationError: string;
}

export default function ReviewStep({ formData, setFormData, onBack, onSubmit, isSubmitting, detectLocation, locationError }: ReviewStepProps) {
  return (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full max-w-6xl mx-auto"
    >
        <div className="grid md:grid-cols-12 gap-12 items-start">
            <div className="md:col-span-5 pt-8 text-left">
                <div className="inline-flex items-center gap-2 bg-[#F8FAFC] px-4 py-2 rounded-full mb-8">
                    <span className="w-2 h-2 bg-[#FACD15] rounded-full"></span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A1931] dark:text-white/60">Step 04 / 04</span>
                </div>
                <h1 className="font-headline font-bold text-5xl text-[#0A1931] dark:text-white tracking-tight leading-tight mb-6">Review</h1>
                <p className="text-lg text-[#0A1931] dark:text-white/70 leading-relaxed mb-10 font-medium">
                    Synchronize your operational range for nearby opportunities. Your base helps us map logistics and local service requests accurately.
                </p>
                <div className="bg-[#F8FAFC] rounded-2xl p-8 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-headline font-bold text-[#0A1931] dark:text-white text-xl mb-3 tracking-tight">Why this matters?</h3>
                        <p className="text-[#0A1931] dark:text-white/60 font-medium leading-relaxed">We use your precise location to ensure you're never more than 15km away from your next task, maximizing your earning potential.</p>
                    </div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#FACD15]/20 rounded-full blur-3xl"></div>
                </div>
            </div>

            <div className="md:col-span-7">
                <div className="bg-white rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(31,63,52,0.1)] p-8 md:p-12 border border-[#F8FAFC]/50">
                    <div className="aspect-video w-full bg-[#F8FAFC] rounded-[2rem] mb-10 relative overflow-hidden group">
                        <img 
                            className="w-full h-full object-cover opacity-60 grayscale" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcho8oz6-kgI5o2Pmztds5r2hsucFOdzjVt6zJS0-QHYwyhZlkwXL6kRBnfKmm3oPkyuO5-AB5c5pfYNdfMveTh4fNV3wQL9HXovgiiaH9eAae3nQP2LGGE_UPP6tcechofzPzqiTU1s9DDLMZBw7AbaiO9zblf4Udd2PgXlc_0IDv7-JE0HLfVVm-Ys2FIUlhetg-x-BsqE5ajnioG9sGDqYuU82TDB3rY_q3fIfWLh8VycQCYCl81vExOrn270Mnebr0I3OvV7E" 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 animate-ping bg-[#FACD15] rounded-full opacity-75Scale-150"></div>
                                <div className="relative w-16 h-16 bg-[#FACD15] rounded-full flex items-center justify-center shadow-2xl">
                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-4 border border-white shadow-xl">
                            <span className="material-symbols-outlined text-[#FACD15] font-black">my_location</span>
                            <span className="text-[11px] font-bold uppercase text-[#0A1931] dark:text-white tracking-[0.1em]">{formData.location || "Awaiting synchronization..."}</span>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <button 
                            onClick={detectLocation}
                            className="w-full bg-[#FACD15] text-[#002117] font-headline font-bold py-6 rounded-full flex items-center justify-center gap-4 transition-all active:scale-95 shadow-[0_8px_0_0_#C39F00] uppercase tracking-widest text-sm"
                        >
                            SYNC GPS COORDINATES
                            <span className="material-symbols-outlined font-black">arrow_forward</span>
                        </button>

                        <div className="relative flex items-center gap-6">
                            <div className="flex-grow h-[1px] bg-[#0A1931]/5"></div>
                            <span className="text-[10px] font-bold text-[#0A1931] dark:text-white/20 uppercase tracking-[0.2em]">or manually set</span>
                            <div className="flex-grow h-[1px] bg-[#0A1931]/5"></div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-[#0A1931] dark:text-white/40 ml-1 text-left block">Operational Base</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#0A1931] dark:text-white/20">search</span>
                                <input 
                                    className="w-full bg-[#F8FAFC] border-none rounded-2xl py-5 pl-14 pr-6 focus:ring-2 focus:ring-[#FACD15] text-[#0A1931] dark:text-white placeholder:text-[#0A1931] dark:text-white/10 font-bold outline-none shadow-inner" 
                                    placeholder="Define operational base..." 
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                                />
                            </div>
                            {locationError && <p className="text-error text-xs font-bold mt-2 ml-1 text-left">{locationError}</p>}
                        </div>

                        <div className="pt-8 flex items-center justify-between gap-6">
                            <button 
                                onClick={onBack}
                                className="px-10 py-5 rounded-2xl font-headline font-bold text-[10px] uppercase tracking-widest text-[#0A1931] dark:text-white/40 hover:bg-[#F8FAFC] transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                BACK
                            </button>
                            <button 
                                onClick={onSubmit}
                                disabled={isSubmitting || !formData.location}
                                className="grow bg-[#0A1931] px-10 py-5 rounded-full font-headline font-bold text-white flex items-center justify-center gap-4 hover:opacity-95 transition-all active:scale-95 shadow-xl disabled:opacity-50"
                            >
                                {isSubmitting ? <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span> : (
                                    <span className="flex items-center gap-3">
                                        COMPLETE INTEGRATION
                                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
}
