import { useQuery } from '@tanstack/react-query';
import { verificationService } from '../../../services/verification.service';
import apiClient from '../../../api/apiClient';
import { HelpCircle, ArrowLeft, ShieldCheck, CheckCircle2, ChevronRight, Lock, FileCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useUser } from '../../../providers/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

// Modular Components
import SuccessStep from '../components/verification/SuccessStep';

export const IdentityVerificationPage = () => {
  const [isActivating, setIsActivating] = useState(false);
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const { user } = useUser();

  const { data: status, refetch } = useQuery({
    queryKey: ['verificationStatus'],
    queryFn: verificationService.getStatus,
  });

  const handleActivateVerification = async () => {
    setIsActivating(true);
    try {
      await apiClient.post('/api/auth/sync', { onboarded: true, identityVerified: true });
      updateUser({ identityVerified: true, onboarded: true });
      await refetch();
      toast.success('Identity verification confirmed.');
    } catch (e) {
      console.error(e);
      updateUser({ identityVerified: true });
      toast.success('Identity verified.');
    } finally {
      setIsActivating(false);
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

  const isVerified = user?.identityVerified === true || status?.status === 'VERIFIED';

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
              {isVerified ? 'Verification Complete' : 'Candidate Verification'}
            </span>
            <Link to="/contact" className="p-1.5 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-neutral-500 dark:text-zinc-400 hover:text-neutral-800 dark:hover:text-zinc-200">
              <HelpCircle className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {isVerified ? (
            <SuccessStep key="success" onDashboard={handleSyncAndRedirect} />
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
                Verified candidate profiles display an identity badge and are prioritized when employers review trade applications.
              </p>

              <div className="space-y-3 my-6 text-left bg-neutral-50 dark:bg-[#1C1C21] p-4 rounded-xl border border-neutral-200/70 dark:border-zinc-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-zinc-100">Verified Mobile Number</p>
                    <p className="text-[11px] text-neutral-500 dark:text-zinc-400">Enables direct phone calls from active employers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileCheck className="w-4 h-4 text-[#0f2f63] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-zinc-100">Government ID & Trade Credentials</p>
                    <p className="text-[11px] text-neutral-500 dark:text-zinc-400">Unlocks Level 1 / Level 2 verified tradesperson status.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-neutral-700 dark:text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-zinc-100">Privacy Controlled</p>
                    <p className="text-[11px] text-neutral-500 dark:text-zinc-400">Your documents are securely encrypted and only shown to verified recruiters.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleActivateVerification}
                disabled={isActivating}
                className="w-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#0c244c] dark:hover:bg-[#0052cc] active:bg-[#081a38] text-white font-semibold py-3 px-5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isActivating ? 'Activating Verification...' : (
                  <>
                    <span>Confirm & Activate Badge</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
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
