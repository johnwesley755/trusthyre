import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('trusthyre_cookie_consent');
      if (!consent) {
        // Small delay to prevent initial layout shift
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage access restricted fallback
    }
  }, []);

  const handleConsent = (level: 'all' | 'essential') => {
    try {
      localStorage.setItem('trusthyre_cookie_consent', level);
    } catch {
      // ignore storage write errors
    }
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          role="region"
          aria-label="Cookie consent banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 md:p-5 pointer-events-none"
        >
          <div className="max-w-4xl mx-auto bg-white/95 dark:bg-[#1C1C21]/95 backdrop-blur-md border border-slate-200/90 dark:border-zinc-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/60 p-4 sm:p-5 pointer-events-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-[#0f2f63] dark:text-blue-300 mt-0.5">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-[#0a0a0a] dark:text-white">
                  We value your privacy & security
                </p>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
                  TrustHyre uses essential cookies to ensure safe authentication, protect against fraudulent activity, and analyze platform performance. By clicking &ldquo;Accept All&rdquo;, you agree to our use of cookies. Read our{' '}
                  <Link
                    to="/privacy"
                    className="font-medium text-[#0f2f63] dark:text-sky-400 underline underline-offset-2 hover:text-[#2563c9] focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-xs"
                  >
                    Privacy Policy
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => handleConsent('essential')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200/80 dark:hover:bg-zinc-700 rounded-full transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-400"
              >
                Essential Only
              </button>
              <button
                type="button"
                onClick={() => handleConsent('all')}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0f2f63] dark:bg-sky-600 hover:bg-[#2563c9] dark:hover:bg-sky-700 rounded-full shadow-xs transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-600"
              >
                Accept All
              </button>
              <button
                type="button"
                onClick={() => handleConsent('essential')}
                aria-label="Dismiss cookie notice"
                className="p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full transition-colors cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-slate-300 md:ml-1"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
