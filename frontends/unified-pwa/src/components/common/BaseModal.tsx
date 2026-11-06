import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
  bodyClassName?: string;
  className?: string;
  showCloseButton?: boolean;
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

/**
 * Standard Unified Modal Component for TrustHyre.
 * Rendered directly through React createPortal into document.body to prevent
 * CSS transform/containment clipping from parent cards.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconBgColor = 'bg-[#eff6ff] text-[#0066ff] border border-[#dbeafe]',
  maxWidth = 'md',
  children,
  footer,
  headerRight,
  bodyClassName = 'p-5 sm:p-6 space-y-4 bg-white',
  className = '',
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/65 backdrop-blur-xs font-['Plus_Jakarta_Sans',sans-serif]"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-2xl sm:rounded-3xl border border-[#e6e8ec] shadow-2xl w-full ${MAX_WIDTH_CLASSES[maxWidth]} max-h-[90vh] flex flex-col overflow-hidden my-auto ${className}`}
        >
          {/* Header */}
          {(title || icon || showCloseButton) && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6e8ec] bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor}`}>
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  {typeof title === 'string' ? (
                    <h3 className="text-sm sm:text-base font-bold text-[#0A1931] truncate tracking-tight">
                      {title}
                    </h3>
                  ) : (
                    title
                  )}
                  {subtitle && (
                    <p className="text-[11px] text-[#717784] truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {headerRight}
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className={`flex-1 overflow-y-auto ${bodyClassName}`}>
            {children}
          </div>

          {/* Modal Footer */}
          {footer && (
            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#e6e8ec] shrink-0">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
