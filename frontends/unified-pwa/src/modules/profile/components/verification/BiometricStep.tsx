import { motion } from "framer-motion";
import { Camera, Loader2, ChevronRight } from "lucide-react";

interface BiometricStepProps {
  onCapture: (file: File) => void;
  preview: string | null;
  isPending: boolean;
}

export default function BiometricStep({ onCapture, preview, isPending }: BiometricStepProps) {
  const handleCaptureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  const sanitizePreviewUrl = (url: string | null): string | null => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (trimmed.startsWith('blob:') && !trimmed.includes('javascript:') && !trimmed.includes('<')) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === 'blob:') return trimmed;
      } catch {
        return null;
      }
    }
    if (/^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      return null;
    }
    return null;
  };

  const safePreview = sanitizePreviewUrl(preview);

  return (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-[calc(100vh-140px)] flex flex-col md:flex-row items-stretch overflow-hidden bg-white rounded-[3rem] shadow-2xl relative"
    >
        {/* Left Side: Biometric Capture */}
        <section className="flex-1 px-8 md:px-16 py-12 md:py-16 flex flex-col justify-center">
            <div className="max-w-xl mx-auto md:mx-0 w-full text-left">
                <div className="mb-10">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#d1fae5] text-[#002117] font-bold text-[0.75rem] uppercase tracking-wider mb-6">Security Verification</span>
                    <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-[#1b1c19] tracking-tighter leading-[1.1] mb-4">Biometric Match</h1>
                    <p className="text-[#414845] text-lg opacity-80 leading-relaxed font-body">AI cross-referencing your live signature with the logged documentation artifacts. Please ensure clear lighting.</p>
                </div>

                {/* Circular Capture Area */}
                <div className="relative group border-2 border-[#e9e8e3] rounded-full w-72 h-72 mx-auto p-4 transition-all cursor-pointer overflow-hidden shadow-2xl bg-[#F8FAFC]/30 mb-12">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="user" 
                        onChange={handleCaptureChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                        disabled={isPending}
                    />
                    {safePreview ? (
                        <div className="w-full h-full rounded-full overflow-hidden border-[8px] border-[#FACD15] shadow-2xl relative rotate-3">
                            <img src={safePreview} alt="Live Capture" className="w-full h-full object-cover grayscale-[0.3]" />
                            <div className="absolute inset-0 bg-[#FACD15]/5" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center space-y-4 group-hover:scale-105 transition-transform border border-[#e9e8e3] shadow-inner">
                            <Camera className="w-12 h-12 text-[#1b1c19]/10 group-hover:text-[#456559] transition-colors" />
                            <div className="text-[10px] font-bold tracking-widest text-[#1b1c19]/20 font-headline px-8 text-center leading-relaxed">BIOMETRIC <br /> CAPTURE</div>
                        </div>
                    )}
                    {/* Face guide */}
                    <div className="absolute inset-10 border-2 border-[#FACD15]/20 rounded-full pointer-events-none border-dashed animate-pulse ring-8 ring-[#FACD15]/5" />
                </div>

                <button 
                    disabled={!preview || isPending} 
                    className="w-full bg-[#1b1c19] text-[#FACD15] font-headline font-extrabold py-6 rounded-[2rem] shadow-2xl disabled:opacity-30 transition-all flex items-center justify-center gap-4 text-xl tracking-widest hover:bg-neutral-800"
                >
                    {isPending ? <Loader2 className="animate-spin w-8 h-8" /> : (
                        <>Authorize Verification <ChevronRight className="w-6 h-6" /></>
                    )}
                </button>
            </div>
        </section>

        {/* Right Side: Emotional Anchor (Consistent) */}
        <section className="hidden md:flex flex-1 bg-[#F8FAFC] relative items-center justify-center overflow-hidden min-h-[400px]">
             {/* Decorative Organic Blobs */}
             <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ffe081] opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#d1fae5] opacity-20 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 w-full max-w-2xl px-12 text-left">
                <div className="relative inline-block">
                    <div className="blob-mask w-full aspect-square max-w-[400px] mx-auto overflow-hidden bg-stone-300 shadow-2xl">
                        <img 
                            alt="Professional Worker" 
                            className="w-full h-full object-cover" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzo9dIR3jqY9DoKmCll1R24GpQFPk66nP-7YvkDdHxbuhDmNTUduHj3exl3AH8xIEasSvZ-h39fdo40q_OSFaTIk-nlh8_KHBTYWSyw-S3ozItW1xjd8p1mDMsWICI7OqrCUH47ScQvkuPKtqzIhmoCZWi1JFALDQVaDU1-aSga23x2MUVT-gP9E_yU_DKlkQBdB6SL2UBtM4T7kfwR58D4xfp_HMbZMAiX4zIrWFTNBi35Fx2LnFIn5wncp-xIIvi3sGvxhiKEG0"
                        />
                    </div>
                </div>
                <div className="mt-16">
                    <h2 className="font-headline font-extrabold text-3xl text-[#2d4d41] tracking-tighter leading-tight mb-4">Securing the professional network.</h2>
                    <p className="text-[#414845] opacity-70 font-body leading-relaxed">Your biometric signature is isolated, encrypted, and processed only for this verification cycle.</p>
                </div>
            </div>
        </section>

        <style>{`
            .blob-mask {
                mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%23FF0066' d='M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C86.9,14.6,81.2,29.1,72.6,41.4C64.1,53.8,52.7,63.9,39.9,71.8C27.1,79.7,13.5,85.4,-0.8,86.8C-15.1,88.2,-30.2,85.4,-43.8,78.1C-57.3,70.9,-69.3,59.2,-77.3,45.4C-85.3,31.6,-89.2,15.8,-88.2,0.6C-87.1,-14.7,-81.1,-29.3,-72.1,-41.6C-63,-53.8,-50.9,-63.7,-37.6,-71.4C-24.3,-79.1,-12.2,-84.6,1.4,-87.1C15,-89.5,30.6,-83.6,44.7,-76.4Z' transform='translate(100 100)' /%3E%3C/svg%3E");
                mask-size: contain;
                mask-repeat: no-repeat;
                mask-position: center;
            }
        `}</style>
    </motion.div>
  );
}
