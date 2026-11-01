import React from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  entityName?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
  entityName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-in fade-in duration-150 font-['Onest',system-ui,sans-serif]">
      <div 
        className="bg-white rounded-2xl border border-[#e6e8ec] shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDestructive ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-[#0f2f63] border border-blue-100'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0a0a0a] tracking-tight">
                {title}
              </h3>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-[#717784]">
            <p>{description}</p>
            {entityName && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 font-medium text-slate-800 break-all">
                {entityName}
              </div>
            )}
            {isDestructive && (
              <p className="text-[11px] font-semibold text-rose-600">
                ⚠️ This action is permanent and cannot be undone.
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#f0f2f5]">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider text-[#717784] hover:bg-[#f4f4f4] transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                isDestructive 
                  ? 'bg-rose-600 hover:bg-rose-700 active:scale-95' 
                  : 'bg-[#0f2f63] hover:bg-[#1a4484] active:scale-95'
              }`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

