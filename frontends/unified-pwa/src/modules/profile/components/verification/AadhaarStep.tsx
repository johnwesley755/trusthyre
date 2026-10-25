import { motion } from "framer-motion";

interface AadhaarStepProps {
  onUpload: (file: File) => void;
  preview: string | null;
  isPending: boolean;
}

export default function AadhaarStep({ onUpload, preview, isPending }: AadhaarStepProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
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
        {/* Left Side: Interactive Interface */}
        <section className="flex-1 px-8 md:px-16 py-12 md:py-16 flex flex-col justify-center">
            <div className="max-w-xl mx-auto md:mx-0 w-full text-left">
                <div className="mb-10">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#ffe081] text-[#231b00] font-bold text-[0.75rem] uppercase tracking-wider mb-6">Identity Verification</span>
                    <h1 className="font-headline font-extrabold text-4xl md:text-5xl text-[#1b1c19] tracking-tighter leading-[1.1] mb-4">Verify Your Identity</h1>
                    <p className="text-[#414845] text-lg opacity-80 leading-relaxed font-body">To maintain a high-trust community, we verify the identity of every member. Please provide a clear photo of your ID document or work credential.</p>
                </div>

                {/* Drag & Drop Area */}
                <div className="group relative bg-[#e9e8e3] rounded-xl border-2 border-dashed border-[#c1c8c3]/30 hover:border-[#ffe081] transition-all duration-300 p-12 flex flex-col items-center justify-center text-center cursor-pointer mb-8">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-4xl text-[#2d4d41]">upload_file</span>
                    </div>
                    <p className="font-headline font-bold text-lg mb-2">Drag and drop your file here</p>
                    <p className="text-sm text-[#414845] mb-6 font-body">PNG, JPG or PDF up to 5MB</p>
                    <button className="bg-[#FACD15] text-[#002117] px-8 py-3.5 rounded-lg font-headline font-extrabold uppercase text-sm tracking-widest shadow-[0_2px_0_0_rgba(0,0,0,0.1)] hover:shadow-lg active:scale-95 transition-all">
                        {isPending ? 'Processing...' : 'Browse Files'}
                    </button>
                    <input 
                        aria-label="Upload ID card or document" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        type="file" 
                        onChange={handleFileChange}
                        disabled={isPending}
                    />
                </div>

                {safePreview && (
                    <div className="mb-8 p-4 bg-[#d1fae5]/20 rounded-xl border border-[#d1fae5] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                            <img src={safePreview} alt="ID Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-xs font-bold text-[#0A1931] uppercase tracking-widest">Document Preview</p>
                            <p className="text-[10px] text-[#414845]">Ready for verification analysis</p>
                        </div>
                    </div>
                )}

                {/* Reassurance Text */}
                <div className="flex items-start gap-4 p-5 bg-white rounded-lg border border-[#c1c8c3]/10 shadow-[0_20px_40px_-10px_rgba(31,63,52,0.05)]">
                    <div className="bg-[#d1fae5]/30 p-2 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#456559] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    </div>
                    <div className="flex-1 text-left">
                        <p className="text-sm text-[#1b1c19] font-bold mb-1 font-headline">Privacy Protection</p>
                        <p className="text-xs text-[#414845] leading-normal font-body">Your ID document is encrypted and verified securely. We never share your sensitive personal credentials.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Right Side: Emotional Anchor */}
        <section className="hidden md:flex flex-1 bg-[#F8FAFC] relative items-center justify-center overflow-hidden min-h-[400px]">
            {/* Decorative Organic Blobs */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ffe081] opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-[#d1fae5] opacity-20 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 w-full max-w-2xl px-12 text-left">
                <div className="relative inline-block">
                    {/* The "Organic Blob" Profile */}
                    <div className="blob-mask w-full aspect-square max-w-[400px] mx-auto overflow-hidden bg-stone-300 shadow-2xl transition-transform hover:scale-[1.02] duration-700">
                        <img 
                            alt="Professional Worker" 
                            className="w-full h-full object-cover" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzo9dIR3jqY9DoKmCll1R24GpQFPk66nP-7YvkDdHxbuhDmNTUduHj3exl3AH8xIEasSvZ-h39fdo40q_OSFaTIk-nlh8_KHBTYWSyw-S3ozItW1xjd8p1mDMsWICI7OqrCUH47ScQvkuPKtqzIhmoCZWi1JFALDQVaDU1-aSga23x2MUVT-gP9E_yU_DKlkQBdB6SL2UBtM4T7kfwR58D4xfp_HMbZMAiX4zIrWFTNBi35Fx2LnFIn5wncp-xIIvi3sGvxhiKEG0"
                        />
                    </div>
                    {/* Floating Trust Badge */}
                    <div className="absolute -bottom-4 -left-4 md:-left-8 bg-white p-6 rounded-lg shadow-[0_20px_40px_-10px_rgba(31,63,52,0.08)] max-w-[240px] animate-in zoom-in-95 duration-500 delay-300">
                        <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(i => (
                                <span key={i} className="material-symbols-outlined text-[#eec200] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            ))}
                        </div>
                        <p className="text-xs italic text-[#414845] font-body leading-relaxed">"Verifying my ID helped me get higher-paying jobs faster. TrustHyre is reliable."</p>
                        <p className="mt-3 text-[10px] font-bold text-[#1b1c19] uppercase tracking-wider font-headline">— Rajesh, Electrician</p>
                    </div>
                </div>
                <div className="mt-16">
                    <h2 className="font-headline font-extrabold text-3xl text-[#2d4d41] tracking-tighter leading-tight mb-4">Building a safer marketplace together.</h2>
                    <p className="text-[#414845] opacity-70 font-body">Join 50,000+ verified professionals in India who trust our secure onboarding process.</p>
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
