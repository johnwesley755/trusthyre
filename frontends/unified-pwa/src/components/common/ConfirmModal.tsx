import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from '../ui/button';

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
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="sm"
      title={title}
      icon={<AlertTriangle className="w-5 h-5" />}
      iconBgColor={
        isDestructive
          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60'
          : 'bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] border border-blue-200 dark:border-blue-900/60'
      }
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'navy'}
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto gap-1.5"
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs leading-relaxed text-[#717784] dark:text-zinc-400">
        <p>{description}</p>
        {entityName && (
          <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 font-medium text-slate-800 dark:text-zinc-200 break-all">
            {entityName}
          </div>
        )}
        {isDestructive && (
          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            ⚠️ This action is permanent and cannot be undone.
          </p>
        )}
      </div>
    </BaseModal>
  );
};

