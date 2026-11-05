import React, { useEffect, useState } from 'react';

export interface AppLoaderProps {
  message?: string;
  variant?: 'fullscreen' | 'page' | 'inline' | 'skeleton' | 'curtain';
  size?: 'sm' | 'md' | 'lg' | string;
  ready?: boolean;
}

export const AppLoader: React.FC<AppLoaderProps> = ({
  message,
  variant = 'fullscreen',
  size = 'md',
  ready = false,
}) => {
  // Internal animation state for self-contained curtain / full-screen transitions
  const [internalReady, setInternalReady] = useState(false);

  useEffect(() => {
    // If the caller explicitly provides a ready boolean (like in LandingPage), we use that.
    if (variant === 'curtain' && typeof ready === 'boolean') {
      setInternalReady(ready);
    }
  }, [ready, variant]);

  // Small button / input spinner
  if (variant === 'inline') {
    const spinnerSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    return (
      <div className="inline-flex items-center gap-2">
        <svg
          className={`animate-spin ${spinnerSize} text-current`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {message && <span className="text-sm text-neutral-600 font-medium">{message}</span>}
      </div>
    );
  }

  // Content skeleton placeholder
  if (variant === 'skeleton') {
    return (
      <div className="w-full space-y-4 animate-pulse p-4">
        <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-neutral-200 rounded"></div>
          <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  // Unified Full-Page / Page Transition / Curtain Loader
  // Matches the premium Deep-Navy curtain loader with official white logo & glow
  const isCurtainLifted = variant === 'curtain' ? ready || internalReady : false;

  return (
    <div
      aria-hidden={isCurtainLifted}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f2f63] text-white overflow-hidden transition-transform duration-[850ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
        isCurtainLifted ? '-translate-y-[105%] pointer-events-none' : 'translate-y-0 pointer-events-auto'
      }`}
    >
      <style>{`
        @keyframes appLoaderFadeRise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes appLoaderGlow {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.45; transform: scale(1.05); }
        }
      `}</style>

      {/* Ambient background glow */}
      <div
        className="absolute w-[420px] h-[420px] rounded-full bg-blue-500/20 blur-3xl pointer-events-none"
        style={{ animation: 'appLoaderGlow 3s ease-in-out infinite' }}
      />

      <div
        className="relative z-10 flex flex-col items-center px-4"
        style={{ animation: 'appLoaderFadeRise 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}
      >
        {/* TrustHyre Official White Logo */}
        <div className="relative mb-5 flex items-center justify-center">
          <img
            src="/assets/TrustHyre Logo with Skills Tagline.png"
            alt="TrustHyre"
            className="h-14 sm:h-16 md:h-20 w-auto object-contain drop-shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          />
        </div>

        {/* Sleek animated progress line */}
        <div className="w-44 sm:w-52 h-[2.5px] rounded-full bg-white/15 overflow-hidden relative shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-300 via-white to-sky-300 animate-pulse"
            style={{
              width: '100%',
              transform: isCurtainLifted ? 'scaleX(1)' : 'scaleX(0.7)',
              transformOrigin: 'left center',
              transition: 'transform 700ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        {/* Context message or default tagline */}
        <p className="mt-4 text-[12px] sm:text-xs tracking-wider uppercase text-blue-200/80 font-medium">
          {message || 'Verified Workforce & Jobs Network'}
        </p>
      </div>
    </div>
  );
};
