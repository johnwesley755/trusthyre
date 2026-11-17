import { useQuery } from '@tanstack/react-query';
import { verificationService } from '../../../services/verification.service';
import apiClient from '../../../api/apiClient';
import { 
  HelpCircle, 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  Upload, 
  Camera, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthContext';
import { toast } from 'sonner';
import React, { useState } from 'react';

// Modular Components
import SuccessStep from '../components/verification/SuccessStep';

export const IdentityVerificationPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const { data: statusData, refetch } = useQuery({
    queryKey: ['verificationStatus'],
    queryFn: verificationService.getStatus,
  });

  const record = (statusData as any)?.data || statusData;
  const isVerified = record?.status === 'VERIFIED' || record?.status === 'APPROVED';
  const isPending = record?.status === 'PENDING';

  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!docFile) {
      setError('Please select a photo of your Government ID (Aadhaar / Voter ID / Driving License).');
      return;
    }

    if (!selfieFile) {
      setError('Please provide a live selfie photograph for identity matching.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Government ID Document
      const docForm = new FormData();
      docForm.append('file', docFile);
      await apiClient.post('/api/verification/upload-doc', docForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // 2. Upload Live Selfie
      const selfieForm = new FormData();
      selfieForm.append('file', selfieFile);
      await apiClient.post('/api/verification/capture-live', selfieForm, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refetch();
      toast.success('Verification documents submitted successfully! Our compliance team will review them.');
    } catch (err: any) {
      console.error('[Verification] Submission error:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to submit verification documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncAndRedirect = async () => {
    try {
      await apiClient.post('/api/auth/sync', { onboarded: true });
      updateUser({ onboarded: true });
      toast.success('Profile active.');
      navigate('/search');
    } catch (e) {
      console.error(e);
      navigate('/search');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#000000] font-['Onest',system-ui,sans-serif] text-neutral-900 dark:text-zinc-100 selection:bg-[#0f2f63] selection:text-white flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-50 border-b border-neutral-200/80 dark:border-zinc-800">
        <div className="flex justify-between items-center max-w-5xl mx-auto w-full px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-700 dark:text-zinc-300" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base text-[#0f2f63] dark:text-[#38BDF8]">TrustHyre</span>
              <span className="text-xs text-neutral-400 dark:text-zinc-600">/</span>
              <span className="text-xs font-semibold text-neutral-600 dark:text-zinc-400">Verification</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs font-medium text-neutral-500 dark:text-zinc-400">
              Identity Verification
            </span>
            <Link
              to="/support"
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Need Help?"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {isVerified ? (
            <SuccessStep key="success" onDashboard={handleSyncAndRedirect} />
          ) : isPending ? (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full bg-white dark:bg-[#121215] rounded-2xl p-6 sm:p-8 border border-neutral-200/80 dark:border-zinc-800 shadow-xs text-center"
            >
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-600 dark:text-amber-400">
                <Clock className="w-7 h-7" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-zinc-100 tracking-tight">
                Verification Under Review
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Your Government ID and live verification selfie have been securely received. Our compliance team verifies submitted documents within 24 hours.
              </p>

              <div className="my-6 p-4 rounded-xl bg-neutral-50 dark:bg-[#1C1C21] border border-neutral-200/70 dark:border-zinc-800 text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-neutral-700 dark:text-zinc-300">
                  <span className="font-medium">Government ID Document:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-700 dark:text-zinc-300">
                  <span className="font-medium">Live Biometric Selfie:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#0c244c] dark:hover:bg-[#0052cc] text-white font-semibold py-3 px-5 rounded-xl transition-all text-xs sm:text-sm cursor-pointer shadow-xs"
              >
                Return to My Profile
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="activate"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="w-full bg-white dark:bg-[#121215] rounded-2xl p-6 sm:p-8 border border-neutral-200/80 dark:border-zinc-800 shadow-xs"
            >
              <div className="w-12 h-12 bg-neutral-100 dark:bg-zinc-800/80 border border-neutral-200 dark:border-zinc-700 rounded-xl flex items-center justify-center mb-5 text-[#0f2f63] dark:text-[#38BDF8]">
                <ShieldCheck className="w-6 h-6 text-[#0f2f63] dark:text-[#38BDF8]" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-zinc-100 tracking-tight text-balance">
                Verify Your Candidate Profile
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-zinc-400 mt-2 leading-relaxed">
                Upload your official Government ID and a live selfie to receive a verified TrustHyre badge and unlock priority employer dispatch.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleDocumentSubmit} className="space-y-4 my-6">
                {/* Government ID Document Upload */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase text-neutral-800 dark:text-zinc-200">
                    1. Government ID (Aadhaar / Voter ID / Driver License)
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-zinc-700 hover:border-[#0f2f63] dark:hover:border-[#38BDF8] rounded-xl p-4 transition-colors cursor-pointer bg-neutral-50/50 dark:bg-[#18181f]/40">
                    <Upload className="w-6 h-6 text-[#717784] dark:text-zinc-400 mb-1" />
                    <span className="text-xs font-medium text-neutral-700 dark:text-zinc-300">
                      {docFile ? docFile.name : 'Choose ID Photo (JPG, PNG or PDF, max 5MB)'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Live Selfie Capture */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase text-neutral-800 dark:text-zinc-200">
                    2. Live Selfie Photograph
                  </label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-zinc-700 hover:border-[#0f2f63] dark:hover:border-[#38BDF8] rounded-xl p-4 transition-colors cursor-pointer bg-neutral-50/50 dark:bg-[#18181f]/40">
                    <Camera className="w-6 h-6 text-[#717784] dark:text-zinc-400 mb-1" />
                    <span className="text-xs font-medium text-neutral-700 dark:text-zinc-300">
                      {selfieFile ? selfieFile.name : 'Take or upload selfie photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="p-3 bg-neutral-50 dark:bg-[#1C1C21] rounded-xl border border-neutral-200/70 dark:border-zinc-800 text-[11px] text-neutral-500 dark:text-zinc-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 shrink-0 text-[#0f2f63] dark:text-[#38BDF8]" />
                  <span>Your credentials are encrypted and only accessible by authorized TrustHyre compliance auditors.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !docFile || !selfieFile}
                  className="w-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#0c244c] dark:hover:bg-[#0052cc] active:bg-[#081a38] text-white font-semibold py-3.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Documents...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit for Verification</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-white dark:bg-[#09090b] border-t border-neutral-200/80 dark:border-zinc-800 px-4 sm:px-6 py-4 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-neutral-500 dark:text-zinc-400 font-normal">
          <p>© 2026 TrustHyre Platforms. Direct Verified Workforce Hiring.</p>
          <div className="flex items-center gap-6">
            <Link className="hover:text-neutral-900 dark:hover:text-zinc-200 transition-colors" to="/privacy">Privacy Policy</Link>
            <Link className="hover:text-neutral-900 dark:hover:text-zinc-200 transition-colors" to="/terms">Terms of Service</Link>
            <Link className="hover:text-neutral-900 dark:hover:text-zinc-200 transition-colors" to="/contact">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default IdentityVerificationPage;
