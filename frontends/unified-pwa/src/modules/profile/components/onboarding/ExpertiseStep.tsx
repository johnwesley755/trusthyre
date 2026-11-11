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

interface ExpertiseStepProps {
  formData: OnboardingData;
  setFormData: (data: OnboardingData | ((prev: OnboardingData) => OnboardingData)) => void;
  onNext: () => void;
  onBack: () => void;
}

const SKILL_OPTIONS = [
  "COOKING", "PLUMBING", "ELECTRICAL", "CARPENTRY", "LOGISTICS", "SECURITY", "CLEANING", "DRIVING"
];

const ADDITIONAL_SKILLS = ["MASONRY", "PAINTING"];

export default function ExpertiseStep({ formData, setFormData, onNext, onBack }: ExpertiseStepProps) {
  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter((s: string) => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="w-full text-left"
    >
        {/* Header Section */}
        <div className="mb-12 relative">
            <div className="hidden md:block mb-2">
                <span className="font-headline text-[10px] font-bold text-[#FACD15] uppercase tracking-[0.3em]">Step Two</span>
            </div>
            <h1 className="font-headline text-[3.5rem] font-bold text-[#0A1931] dark:text-white leading-[1.1] tracking-tight mb-4">
                Expertise
            </h1>
            <p className="text-[#0A1931] dark:text-white/80 text-lg max-w-lg leading-relaxed">
                Highlight your core tactical skills and market value for the Trust Hire ecosystem.
            </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (Visuals and Tier) */}
            <div className="lg:col-span-12 xl:col-span-5 space-y-8">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Worker Image */}
                    <div className="relative overflow-hidden rounded-[2.5rem] aspect-[4/5] w-full md:w-3/5 group shadow-2xl">
                        <img 
                            alt="Professional Worker" 
                            className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsCdOLredjppTUvfYWz3a2MiNZvCXe2xSn6kZbPlCTR89KD7PjOrAlZRWA04EV7MhTSe18hqRzfJ0GRIeX-vi43hMNt4gm940-8hexXpaYsybaRQjezVf2gIbCmkLrj0zYnvvfqDyd3xH4RTpN-luaVAwvcYlQw9HqDp1XY7XSqWlNx_HmurikMcdEjwWNYYWSuJzMaznrDdw7HGtHFPPHTAURwAE1PEhp9nmXEdloQgi0zF-lQM7QBV02dRaRUrYHj5hscAvxdFo"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A1931] via-transparent to-transparent opacity-80"></div>
                        <div className="absolute bottom-8 left-8 right-8">
                            <p className="font-headline text-white font-bold text-2xl leading-tight tracking-tight">Your skills are the heart of the community.</p>
                        </div>
                    </div>

                    {/* Regional Insights Card directly to the right of the image */}
                    <section className="bg-white dark:bg-[#09090B] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_20px_40px_-10px_rgba(31,63,52,0.05)] border border-[#F8FAFC] w-full md:w-2/5">
                        <p className="font-headline text-[8px] font-bold text-[#0A1931] dark:text-white/30 uppercase tracking-[0.3em] mb-4">Regional Insights</p>
                        <div className="aspect-square rounded-2xl bg-[#F8FAFC] relative overflow-hidden mb-6">
                            <img 
                                alt="Regional Map" 
                                className="w-full h-full object-cover opacity-60 grayscale" 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvPzgp_vCP6hFR2iP7-RF0IzV6vX1gKEDxfLwWFvFG-_RkqCd6QQP33kOSjjWq-96zlddQ9RMuszxhcnYv87XNUX8fv5S4fnGYJHqeP9VWYWr3ueISexOK4jo-poXl_uU_EKqzy6NZFvxv_sBIJSduoRW-z1MJF7uJmY51DXoY57J-xUvv_gB4vg9rKEzc_1fdGSkT2tLW0dhmORC0FXjrzJ4VJ647KhSaEOxVk1ltpQ1BjIHaYv_n0gxjqkeYeyyNEDyCLSs1fYk"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-4 h-4 bg-[#FACD15] rounded-full animate-pulse shadow-[0_0_20px_#FACD15]"></div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black font-headline text-[#0A1931] dark:text-white">South Mumbai</p>
                            <p className="text-[10px] font-bold text-[#FACD15] uppercase tracking-wider">High Demand Sector</p>
                        </div>
                    </section>
                </div>

                {/* Professional Tier Card below Image + Map */}
                <div className="bg-white rounded-[2rem] p-8 shadow-[0_20px_40px_-10px_rgba(31,63,52,0.05)] border border-[#F8FAFC]/50">
                    <h2 className="font-headline text-xl font-bold mb-6 tracking-tight text-[#0A1931] dark:text-white">Professional Tier</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {[
                            { id: "Foundational", label: "Foundational", sub: "Certified core competency", icon: "shield_with_heart" },
                            { id: "Specialist", label: "Specialist", sub: "Advanced site execution", icon: "verified" },
                            { id: "Senior Expert", label: "Senior Expert", sub: "Strategic resource allocation", icon: "military_tech" },
                            { id: "Lead Master", label: "Lead Master", sub: "Full project leadership", icon: "workspace_premium" }
                        ].map(tier => (
                            <div 
                                key={tier.id}
                                onClick={() => setFormData({...formData, level: tier.id})}
                                className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${formData.level === tier.id ? "border-[#0066FF] bg-blue-50/50" : "border-slate-100 bg-slate-50 dark:bg-[#121215]/50 hover:border-[#0066FF]/40"}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${formData.level === tier.id ? "bg-[#0066FF] text-white shadow-md shadow-blue-500/20" : "bg-slate-100 text-slate-400"}`}>
                                        <span className="material-symbols-outlined font-black">{tier.icon}</span>
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm transition-colors ${formData.level === tier.id ? "text-[#0A1931] dark:text-white" : "text-slate-500"}`}>{tier.label}</p>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${formData.level === tier.id ? "text-slate-500" : "text-slate-400"}`}>{tier.sub}</p>
                                    </div>
                                </div>
                                <span className={`material-symbols-outlined text-xl ${formData.level === tier.id ? "text-[#0066FF]" : "text-slate-300"}`}>
                                    {formData.level === tier.id ? "radio_button_checked" : "radio_button_unchecked"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Column (Forms) */}
            <div className="lg:col-span-12 xl:col-span-7 space-y-8">
                {/* Skill Matrix Card */}
                <section className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_40px_-10px_rgba(31,63,52,0.05)] border border-[#F8FAFC]/50">
                    <h2 className="font-headline text-xl font-bold mb-10 flex items-center gap-4 text-[#0A1931] dark:text-white">
                        <span className="w-10 h-10 rounded-full bg-[#FACD15]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#FACD15] font-black" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                        </span>
                        Skill Matrix Verification
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        {SKILL_OPTIONS.map(skill => (
                            <button 
                                key={skill}
                                onClick={() => toggleSkill(skill)}
                                className={`px-10 py-5 rounded-3xl font-bold font-headline text-[10px] tracking-widest transition-all ${
                                    formData.skills.includes(skill)
                                        ? "bg-[#FACD15] text-[#002117] shadow-lg scale-105"
                                        : "bg-[#F8FAFC] text-[#0A1931] dark:text-white/30 hover:bg-[#e2e8f0]"
                                }`}
                            >
                                {skill}
                            </button>
                        ))}
                        {ADDITIONAL_SKILLS.map(skill => (
                            <button key={skill} className="bg-[#F8FAFC] text-[#0A1931] dark:text-white/30 px-10 py-5 rounded-3xl font-bold font-headline text-[10px] tracking-widest hover:bg-[#e2e8f0] transition-all">{skill}</button>
                        ))}
                        
                        <button className="border-2 border-dashed border-[#C1C8C3]/50 hover:border-[#FACD15] transition-colors px-10 py-5 rounded-3xl font-bold font-headline text-[10px] tracking-widest text-[#0A1931] dark:text-white/40 flex items-center gap-2">
                            ADD SKILL +
                        </button>
                    </div>
                </section>

                {/* Bottom Navigation */}
                <div className="flex justify-between items-center pt-8">
                    <button 
                        onClick={onBack}
                        className="font-headline font-bold text-xs uppercase tracking-[0.2em] text-[#0A1931] dark:text-white/40 hover:text-[#0A1931] dark:text-white transition-colors"
                    >
                        Back to Profile
                    </button>
                    <button 
                        onClick={onNext}
                        disabled={formData.skills.length === 0}
                        className="bg-[#FACD15] text-[#002117] px-14 py-6 rounded-full font-bold font-headline uppercase tracking-[0.2em] text-sm shadow-[0_10px_0_0_#C39F00] active:translate-y-1 active:shadow-none transition-all flex items-center gap-4 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                    >
                        NEXT STEP
                        <span className="material-symbols-outlined font-black">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    </motion.div>
  );
}
