import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Zap, 
  FileText, 
  UserCheck, 
  Building2, 
  Lock,
  Sparkles 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LANDING_IMAGES } from '../../landing/constants/landingAssets';
import trustHyreLightLogo from '../../../assets/TrustHyre Logo with Skills Tagline.png';

interface OnboardingVisualHeroProps {
  role: 'WORKER' | 'EMPLOYER';
  currentStep?: number;
  totalSteps?: number;
  className?: string;
  isMobileBanner?: boolean;
}

export const OnboardingVisualHero: React.FC<OnboardingVisualHeroProps> = ({ 
  role, 
  currentStep = 1, 
  totalSteps = 6, 
  className = '', 
  isMobileBanner = false 
}) => {
  const isCandidate = role === 'WORKER';

  // Sector photography corresponding to role from verified landing assets
  const candidateImages = [
    LANDING_IMAGES.heroBackgrounds[0]?.src || '/images/landing/indian_hero_team.jpg',
    LANDING_IMAGES.electrician?.src || '/images/landing/indian_electrician.jpg',
    LANDING_IMAGES.culinary?.src || '/images/landing/indian_chef.jpg',
    LANDING_IMAGES.warehouseLogistics?.src || '/images/landing/indian_logistics.jpg',
    LANDING_IMAGES.plumbing?.src || '/images/landing/indian_plumber.jpg',
  ];

  const employerImages = [
    LANDING_IMAGES.heroBackgrounds[0]?.src || '/images/landing/indian_hero_team.jpg',
    LANDING_IMAGES.warehouseLogistics?.src || '/images/landing/indian_logistics.jpg',
    LANDING_IMAGES.cncMachinist?.src || '/images/landing/indian_engineer.jpg',
  ];

  const activeImages = isCandidate ? candidateImages : employerImages;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Crossfade timer for authentic Indian workforce photography
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % activeImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeImages.length]);

  // Mobile compact banner rendering
  if (isMobileBanner) {
    return (
      <div className={`relative w-full overflow-hidden bg-[#0f2f63] dark:bg-[#000000] text-white p-4 sm:p-5 rounded-2xl border border-transparent dark:border-zinc-800 ${className}`}>
        <div className="absolute inset-0 z-0">
          <img
            src={activeImages[0]}
            alt="TrustHyre Workforce"
            className="w-full h-full object-cover filter brightness-[0.6] contrast-[1.1] scale-105"
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

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/95">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Step {currentStep} of {totalSteps}</span>
          </div>
        </div>
      </div>
    );
  }

  // Candidate step milestone information
  const candidateMilestones = [
    {
      step: 1,
      title: "Biometric Photo & Identity",
      desc: "Mandatory photo verification enables high-trust badge",
      icon: UserCheck
    },
    {
      step: 2,
      title: "Direct WhatsApp Job Alerts",
      desc: "Instant job notifications from verified employers",
      icon: Zap
    },
    {
      step: 3,
      title: "Hyper-Local GPS Geofence",
      desc: "Match jobs within your preferred commute radius",
      icon: MapPin
    },
    {
      step: 4,
      title: "Language & Communication",
      desc: "Connect directly in your native language",
      icon: Sparkles
    },
    {
      step: 5,
      title: "Target Trade & Verified Skills",
      desc: "Showcase skills directly to hiring managers",
      icon: ShieldCheck
    },
    {
      step: 6,
      title: "Instant Executive ATS Resume",
      desc: "Official verified CV generated automatically",
      icon: FileText
    }
  ];

  return (
    <div className={`relative w-full h-full min-h-[580px] lg:min-h-full overflow-hidden bg-[#0f2f63] dark:bg-[#000000] text-white flex flex-col justify-between p-7 sm:p-10 lg:p-12 select-none font-['Onest',system-ui,sans-serif] ${className}`}>
      {/* Background Photography with Navy Scrim Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {activeImages.map((imgSrc, idx) => (
          <img
            key={imgSrc + idx}
            src={imgSrc}
            alt={isCandidate ? "Verified skilled Indian workforce" : "Enterprise industrial infrastructure"}
            className={`absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.1] scale-105 transition-opacity duration-1000 ease-in-out ${
              idx === activeImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Multilayer Deep Navy Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f2f63]/90 via-[#0f2f63]/75 to-[#0f2f63]/95" />
        <div className="absolute inset-0 bg-[#0f2f63]/30 mix-blend-multiply" />
      </div>

      {/* Top Header: TrustHyre Brand Badge & Step Indicator */}
      <div className="relative z-10 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center group cursor-pointer py-1" aria-label="TrustHyre Home">
          <img 
            src={trustHyreLightLogo} 
            alt="TrustHyre" 
            className="h-10 sm:h-11 w-auto object-contain block select-none drop-shadow-md group-hover:scale-105 transition-transform" 
          />
        </Link>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-white/90">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Step {currentStep} of {totalSteps}</span>
        </div>
      </div>

      {/* Middle Interactive Floating Milestone Cards */}
      <div className="relative z-10 my-auto py-6 space-y-3">
        {isCandidate ? (
          <>
            {/* Primary Step Spotlight Card */}
            <motion.div
              key={`spotlight-${currentStep}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="backdrop-blur-md bg-white/15 border border-white/25 rounded-2xl p-4 shadow-xl"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-white text-[#0f2f63] flex items-center justify-center font-bold shrink-0 shadow-md">
                  {React.createElement(
                    candidateMilestones[Math.min(currentStep - 1, candidateMilestones.length - 1)].icon,
                    { className: "w-5 h-5 text-[#0f2f63]" }
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white leading-tight">
                      {candidateMilestones[Math.min(currentStep - 1, candidateMilestones.length - 1)].title}
                    </p>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">
                    {candidateMilestones[Math.min(currentStep - 1, candidateMilestones.length - 1)].desc}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Permanent Verified CV Benefit Card */}
            <div className="backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                    <FileText className="w-4 h-4 text-[#5790e6]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">TrustHyre Verified ATS Resume</p>
                    <p className="text-[11px] text-white/70">Generated automatically on completion</p>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Employer Step Cards */}
            <div className="backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                    <Building2 className="w-4 h-4 text-[#5790e6]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Screened & Verified Crews</p>
                    <p className="text-[11px] text-white/70">Zero fake profiles or proxy candidates</p>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            </div>

            <div className="backdrop-blur-md bg-white/10 border border-white/15 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Direct Attendance & Verified Shifts</p>
                    <p className="text-[11px] text-white/70">GPS-verified physical arrival</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                  Verified
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Hero Headline & Proof Points */}
      <div className="relative z-10 pt-4 border-t border-white/15">
        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
          {isCandidate ? (
            <>Work with pride. <br />Get hired directly.</>
          ) : (
            <>Hire with trust. <br />Zero no-shows.</>
          )}
        </h2>
        <p className="text-xs text-white/75 mt-1.5 leading-relaxed max-w-sm">
          {isCandidate 
            ? "Connect with verified HRs and companies for high-paying trade roles." 
            : "Deploy verified industrial talent across construction, logistics, and retail."}
        </p>

        {/* Region Trust Strip */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-white/60 tracking-wider mt-4">
          <span>Chennai</span>
          <span>•</span>
          <span>Bengaluru</span>
          <span>•</span>
          <span>Hyderabad</span>
          <span>•</span>
          <span>Mumbai</span>
          <span>•</span>
          <span>Delhi NCR</span>
        </div>
      </div>
    </div>
  );
};
