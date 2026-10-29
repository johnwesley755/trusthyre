import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ArrowRight, Briefcase } from 'lucide-react';
import { CandidateResumeView } from './CandidateResumeView';
import type { ResumeData } from './CandidateResumeView';

interface CandidateResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ResumeData | null;
}

export const CandidateResumeModal: React.FC<CandidateResumeModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  // Body scroll lock and Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !data) return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs font-['Onest',system-ui,sans-serif] overflow-hidden select-none print:bg-transparent print:p-0 print:overflow-visible print:static"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[94vh] select-text print:bg-white print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible print:rounded-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Top Bar (Anchored outside the scroll area, completely immune to navbar overlap) */}
          <div className="no-print shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center font-bold">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 id="resume-modal-title" className="text-sm font-bold text-white leading-tight">
                  Candidate Resume
                </h3>
                <p className="text-[11px] text-slate-300">
                  Standard Executive ATS Template
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close resume preview"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body: Single inner scroll container */}
          <div className="p-3 sm:p-6 md:p-8 overflow-y-auto overscroll-contain flex-1 min-h-0 bg-[#F8FAFC] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full print:p-0 print:bg-white print:overflow-visible">
            <CandidateResumeView data={data} />
          </div>
                  {/* Modal Bottom Bar: Prompt to go directly to Job Search */}
          <div className="no-print shrink-0 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Your verified resume is saved and ready for employer applications.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Briefcase className="w-4 h-4" />
              <span>Continue to Search Jobs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

