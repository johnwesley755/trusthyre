import { motion } from "framer-motion";

interface SuccessStepProps {
  onDashboard: () => void;
}

export default function SuccessStep({ onDashboard }: SuccessStepProps) {
  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-5xl w-full text-center flex flex-col items-center py-12"
    >
        {/* Success Icon in Organic Blob */}
        <div className="relative mb-12">
            <div className="bg-white dark:bg-[#121215] w-48 h-48 flex items-center justify-center organic-blob soft-ambient-shadow border border-[#F8FAFC] dark:border-zinc-800">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400 text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            {/* Mini Pulsing Badge */}
            <div className="absolute bottom-4 right-4 bg-[#eec200] p-3 rounded-full border-4 border-white dark:border-[#121215] soft-ambient-shadow animate-bounce">
                <span className="material-symbols-outlined text-[#231b00] text-2xl">celebration</span>
            </div>
        </div>

        {/* Typography Cluster */}
        <h1 className="text-6xl md:text-7xl font-extrabold font-headline text-[#1b1c19] dark:text-zinc-100 mb-6 leading-[1.1] tracking-tighter">
            Identity Verified
        </h1>
        <p className="text-xl md:text-2xl font-normal text-[#414845] dark:text-zinc-400 max-w-lg mb-12 leading-relaxed font-body">
            Your profile is now live and visible to premium employers. Your journey to the perfect role starts here.
        </p>

        {/* Action Area */}
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-6 mb-20">
            <button 
                onClick={onDashboard}
                className="w-full md:w-auto px-12 py-5 bg-[#FACD15] text-[#002117] text-lg font-extrabold uppercase rounded-xl pressed-shadow hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 soft-ambient-shadow font-headline cursor-pointer"
            >
                Access Dashboard
            </button>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 dark:opacity-60 mb-24">
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400">security</span>
                <span className="text-sm font-bold uppercase tracking-widest font-headline text-slate-800 dark:text-zinc-200">Bank-Grade Security</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400">gpp_good</span>
                <span className="text-sm font-bold uppercase tracking-widest font-headline text-slate-800 dark:text-zinc-200">Data Encrypted</span>
            </div>
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400">handshake</span>
                <span className="text-sm font-bold uppercase tracking-widest font-headline text-slate-800 dark:text-zinc-200">Verified Badge Active</span>
            </div>
        </div>

        {/* Success Graphic / Bento Cards Preview */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F8FAFC] dark:bg-[#121215] p-8 rounded-xl flex flex-col gap-4 text-left border border-[#c1c8c3]/10 dark:border-zinc-800">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400 text-3xl">person_search</span>
                <h3 className="text-xl font-bold font-headline text-[#1b1c19] dark:text-zinc-100">Employer Visibility</h3>
                <p className="text-[#414845] dark:text-zinc-400 text-sm leading-relaxed font-body">Top recruiters can now view your verified credentials and contact you directly for premium openings.</p>
            </div>
            <div className="bg-white dark:bg-[#1C1C21] p-8 rounded-xl flex flex-col gap-4 text-left soft-ambient-shadow scale-105 relative z-10 border border-[#F8FAFC] dark:border-zinc-700">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400 text-3xl">stars</span>
                <h3 className="text-xl font-bold font-headline text-[#1b1c19] dark:text-zinc-100">Trust Badge Earned</h3>
                <p className="text-[#414845] dark:text-zinc-400 text-sm leading-relaxed font-body">Your "TrustHire Verified" badge increases your profile application success rate by up to 300%.</p>
            </div>
            <div className="bg-[#F8FAFC] dark:bg-[#121215] p-8 rounded-xl flex flex-col gap-4 text-left border border-[#c1c8c3]/10 dark:border-zinc-800">
                <span className="material-symbols-outlined text-[#456559] dark:text-emerald-400 text-3xl">notifications_active</span>
                <h3 className="text-xl font-bold font-headline text-[#1b1c19] dark:text-zinc-100">Smart Alerts</h3>
                <p className="text-[#414845] dark:text-zinc-400 text-sm leading-relaxed font-body">We will notify you immediately when a company views your profile or sends an interview request.</p>
            </div>
        </div>

        <style>{`
            .organic-blob {
                border-radius: 42% 58% 70% 30% / 45% 45% 55% 55%;
            }
            .pressed-shadow {
                box-shadow: inset 0 -2px 0 0 rgba(0, 0, 0, 0.1);
            }
            .soft-ambient-shadow {
                box-shadow: 0 20px 40px -10px rgba(31, 63, 52, 0.08);
            }
        `}</style>
    </motion.div>
  );
}
