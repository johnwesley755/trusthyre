import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  KeyRound, 
  Clock, 
  RotateCw, 
  ShieldCheck 
} from 'lucide-react';
import { BaseModal } from '../../../components/common/BaseModal';
import { shiftAttendanceService } from '../../../services/shiftAttendance.service';
import { toast } from 'sonner';

interface ShowQrOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  workerName: string;
  jobTitle: string;
}

export const ShowQrOtpModal: React.FC<ShowQrOtpModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  workerName,
  jobTitle
}) => {
  const [activeTab, setActiveTab] = useState<'QR' | 'PIN'>('QR');
  const [actionType, setActionType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60);
  const [otpPin, setOtpPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch / Refresh QR Token (Client-Side Rendering)
  const refreshQr = async () => {
    try {
      setIsLoading(true);
      const res = await shiftAttendanceService.generateQrToken(shiftId, actionType);
      setQrToken(res.token);
      setQrSecondsLeft(60);

      // Render QR code locally via canvas without leaking token to 3rd-party services
      const url = await QRCode.toDataURL(res.token, {
        width: 200,
        margin: 1,
        color: {
          dark: '#0f2f63',
          light: '#ffffff'
        }
      });
      setQrDataUrl(url);
    } catch (err: any) {
      toast.error('Failed to generate attendance QR code');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch / Refresh PIN
  const refreshOtp = async () => {
    try {
      setIsLoading(true);
      const res = await shiftAttendanceService.generateOtpPin(shiftId, actionType);
      setOtpPin(res.otp);
      toast.success('Generated new 6-digit PIN');
    } catch (err: any) {
      toast.error('Failed to generate attendance PIN');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load or actionType change
  useEffect(() => {
    if (isOpen && shiftId) {
      refreshQr();
      refreshOtp();
    }
  }, [isOpen, shiftId, actionType]);

  // QR countdown ticker
  useEffect(() => {
    if (!isOpen || activeTab !== 'QR') return;
    const interval = setInterval(() => {
      setQrSecondsLeft((prev) => {
        if (prev <= 1) {
          refreshQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeTab, shiftId, actionType]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Verification Credential"
      subtitle={`Verify attendance for ${workerName} (${jobTitle})`}
      maxWidth="md"
    >
      <div className="space-y-4 text-center">
        {/* Action Type: Check-In vs Check-Out */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setActionType('CHECK_IN')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
              actionType === 'CHECK_IN'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
            }`}
          >
            Check-In
          </button>
          <button
            type="button"
            onClick={() => setActionType('CHECK_OUT')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
              actionType === 'CHECK_OUT'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
            }`}
          >
            Check-Out
          </button>
        </div>

        {/* Tab switcher: QR vs 6-digit PIN */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('QR')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'QR'
                ? 'bg-white dark:bg-[#121215] text-[#0f2f63] dark:text-sky-400 shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Rolling QR Code</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PIN')}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'PIN'
                ? 'bg-white dark:bg-[#121215] text-[#0f2f63] dark:text-sky-400 shadow-2xs'
                : 'text-slate-600 dark:text-zinc-400'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>6-Digit PIN</span>
          </button>
        </div>

        {activeTab === 'QR' ? (
          <div className="p-6 bg-slate-50 dark:bg-[#0c0c0e] rounded-3xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Locally Generated Attendance QR Code"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400 gap-2">
                  <RotateCw className="w-6 h-6 animate-spin" />
                  <span className="text-[11px]">Rendering QR locally...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400">
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Refreshes in {qrSecondsLeft}s</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug max-w-xs mx-auto">
              Display this QR code to the worker. It automatically updates every 60 seconds with a single-use nonce to prevent replay attacks.
            </p>
          </div>
        ) : (
          <div className="p-6 bg-slate-50 dark:bg-[#0c0c0e] rounded-3xl border border-slate-200 dark:border-zinc-800 space-y-3">
            <div className="py-4">
              <span className="text-4xl font-black tracking-widest text-[#0f2f63] dark:text-sky-400 font-mono">
                {otpPin || '------'}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Valid for 10 minutes</span>
            </div>

            <button
              type="button"
              onClick={refreshOtp}
              disabled={isLoading}
              className="text-xs text-[#0f2f63] dark:text-sky-400 font-bold underline cursor-pointer hover:opacity-80"
            >
              Generate New PIN
            </button>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug max-w-xs mx-auto">
              Provide this numeric PIN to workers without cameras or with low-end phones for instant check-in.
            </p>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold uppercase cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
