import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Lock, Zap, Building2, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LANDING_IMAGES } from '../../landing/constants/landingAssets';
import trustHyreLightLogo from '../../../assets/TrustHyre Logo with Skills Tagline.png';

interface AuthVisualHeroProps {
  role: 'WORKER' | 'EMPLOYER';
  className?: string;
  isMobileBanner?: boolean;
}

export const AuthVisualHero: React.FC<AuthVisualHeroProps> = ({ role, className = '', isMobileBanner = false }) => {
  const isCandidate = role === 'WORKER';

  // Sector photography corresponding to role from verified landing assets
  const candidateImages = [
    LANDING_IMAGES.electrician?.src || LANDING_IMAGES.heroBackgrounds[1]?.src,
    LANDING_IMAGES.culinary?.src || LANDING_IMAGES.heroBackgrounds[0]?.src,
    LANDING_IMAGES.plumbing?.src || LANDING_IMAGES.heroBackgrounds[3]?.src,
  ];

  const employerImages = [
    LANDING_IMAGES.heroBackgrounds[0]?.src,
    LANDING_IMAGES.warehouseLogistics?.src || LANDING_IMAGES.heroBackgrounds[2]?.src,
    LANDING_IMAGES.heroBackgrounds[1]?.src,
  ];

  const activeImages = isCandidate ? candidateImages : employerImages;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Subtle crossfade background timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % activeImages.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [activeImages.length]);

  // Mobile compact banner rendering
  if (isMobileBanner) {
    return (
      <div className={`relative w-full overflow-hidden bg-[#0f2f63] dark:bg-[#000000] text-white p-4 sm:p-5 rounded-2xl border border-transparent dark:border-zinc-800 ${className}`}>
        <div className="absolute inset-0 z-0">
          <img
            src={activeImages[0]}
            alt="TrustHyre Network"
            className="w-full h-full object-cover filter brightness-[0.65] contrast-[1.1] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f2f63]/95 via-[#0f2f63]/85 to-[#0f2f63]/90 dark:from-black/95 dark:via-black/85 dark:to-black/90" />
        </div>

        <div className="relative z-10 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center group py-0.5" aria-label="TrustHyre Home">
            <img 
              src={trustHyreLightLogo} 
              alt="TrustHyre" 
              className="h-8 w-auto object-contain block select-none drop-shadow-md" 
            />
          </Link>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5790e6] animate-pulse" />
            <span>{isCandidate ? 'Candidate Portal' : 'Employer Portal'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[580px] lg:min-h-full overflow-hidden bg-[#0f2f63] dark:bg-[#000000] text-white flex flex-col justify-between p-7 sm:p-10 lg:p-12 select-none font-['Onest',system-ui,sans-serif] ${className}`}>
      {/* Background Photography with Navy Scrim Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {activeImages.map((imgSrc, idx) => (
          <img
            key={imgSrc + idx}
            src={imgSrc}
            alt={isCandidate ? "Verified skilled workforce" : "Enterprise industrial infrastructure"}
            className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.1] scale-105 transition-opacity duration-1000 ease-in-out ${
              idx === activeImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Multilayer Deep Navy Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f2f63]/90 via-[#0f2f63]/75 to-[#0f2f63]/95" />
        <div className="absolute inset-0 bg-[#0f2f63]/30 mix-blend-multiply" />
      </div>

      {/* Top Header: TrustHyre Brand Badge & Live Status Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center group cursor-pointer py-1" aria-label="TrustHyre Home">
          <img 
            src={trustHyreLightLogo} 
            alt="TrustHyre" 
            className="h-10 sm:h-11 w-auto object-contain block select-none drop-shadow-md group-hover:scale-105 transition-transform" 
          />
        </Link>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-medium text-white/90">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>24 Hubs Live</span>
        </div>
      </div>

      {/* Middle Interactive Floating Status Cards (Clean, sleek, no verbose text) */}
      <div className="relative z-10 my-auto py-6 space-y-3">
        {/* Card 1: Verified Attendance */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl px-4 py-3.5 shadow-lg transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                {isCandidate ? <UserCheck className="w-4 h-4 text-[#5790e6]" /> : <Building2 className="w-4 h-4 text-[#5790e6]" />}
              </div>
              <p className="text-sm font-medium text-white">
                {isCandidate ? 'Skill & Identity Verified' : 'Screened & Verified Crews'}
              </p>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
        </motion.div>

        {/* Card 2: Direct Connection */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/15 rounded-2xl px-4 py-3.5 shadow-lg transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-white">
                {isCandidate ? 'Direct Job Applications' : 'Verified Candidate Matching'}
              </p>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
              Direct
            </span>
          </div>
        </motion.div>
      </div>

      {/* Bottom Hero Headline (Clean, no clutter, natural font tracking) */}
      <div className="relative z-10 pt-2 pb-2">
        <h2 className="text-2xl sm:text-3xl font-medium text-white leading-snug">
          {isCandidate ? (
            <>Work with pride. <br />Direct hiring.</>
          ) : (
            <>Hire with trust. <br />Zero middle-men.</>
          )}
        </h2>
      </div>
    </div>
  );
};
