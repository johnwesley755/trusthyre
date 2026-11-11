import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, 
  Loader2, ArrowRight, ArrowLeft, Mail, User, Sparkles
} from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import { useAuth } from '../../../providers/AuthContext';
import { AuthVisualHero } from '../../auth/components/AuthVisualHero';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SeoHead } from '../../../components/common/SeoHead';

export const AdminAcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState<{
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in link. Please ensure you clicked the full URL provided.');
      setIsLoading(false);
      return;
    }

    adminService.verifyAdminInvitation(token)
      .then((data) => {
        setInviteData(data);
        if (data.firstName) setFirstName(data.firstName);
        if (data.lastName) setLastName(data.lastName);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || err?.message || 'This invitation is invalid, revoked, or has expired.';
        setError(msg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adminService.acceptAdminInvitation({
        token,
        password,
        firstName,
        lastName
      });

      // Update auth session
      if (res.token && res.user) {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('trusthyre_auth_token', res.token);
        if (login) {
          login(res.token, res.user);
        }
      }

      toast.success('Administrator account activated! Welcome to TrustHyre Command Center.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to activate administrator account';
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col transition-colors duration-200">
      <SeoHead
        title="Admin Onboarding & Activation | TrustHyre"
        description="Configure your administrator security credentials to activate TrustHyre management access."
        canonicalPath="/admin/accept-invite"
      />

      {/* Framed Canvas matching SignIn & SignUp layout */}
      <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-2xl sm:rounded-[2rem] overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* Left Side: Brand Visual Hero with Employer/Enterprise theme */}
        <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
          <AuthVisualHero role="EMPLOYER" />
        </div>

        {/* Right Side: Form Content Panel */}
        <div className="lg:col-span-7 xl:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative bg-white dark:bg-[#09090b] h-full overflow-y-auto">
          
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-sky-950/40 border border-blue-200 dark:border-sky-900/40 text-[#0f2f63] dark:text-sky-300 text-[11px] font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2563c9] dark:text-sky-400" />
              <span>Admin Onboarding</span>
            </div>
          </div>

          {/* Mobile Hero Banner */}
          <div className="block lg:hidden mb-6">
            <AuthVisualHero role="EMPLOYER" isMobileBanner={true} />
          </div>

          {/* Centered Form / Loading / Error Container */}
          <div className="max-w-md w-full mx-auto my-auto py-2">
            
            {isLoading ? (
              <div className="text-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 text-[#0f2f63] dark:text-sky-400 animate-spin mx-auto" />
                <p className="text-sm font-medium text-[#0a0a0a] dark:text-white">Validating administrator invitation token...</p>
                <p className="text-xs text-[#717784] dark:text-zinc-400">Verifying authorization with TrustHyre security gateway.</p>
              </div>
            ) : error ? (
              <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-rose-950 dark:text-rose-200">Invalid or Expired Invitation</h3>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1.5 leading-relaxed">{error}</p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <Link
                    to="/admin/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-[#0f2f63] dark:bg-sky-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-xs hover:bg-[#1a4484] dark:hover:bg-sky-500 transition-all"
                  >
                    Go to Admin Login
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white"
                  >
                    Home
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Verified Invitation</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-medium text-[#0a0a0a] dark:text-white leading-[1.1]">
                    Set Up Admin Credentials
                  </h1>
                  <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                    You have been provisioned administrative rights on TrustHyre. Configure your secure password to complete onboarding.
                  </p>
                </div>

                {/* Email Chip */}
                <div className="mb-5 p-3.5 bg-[#f8f9fa] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400 block leading-none">
                      Authorized Email
                    </span>
                    <p className="text-xs font-bold text-[#0a0a0a] dark:text-white truncate mt-0.5 font-mono">
                      {inviteData?.email}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold uppercase shrink-0">
                    {inviteData?.role || 'ADMIN'}
                  </span>
                </div>

                {/* Password Configuration Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#1c1c21] focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-[#0a0a0a] dark:text-white outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#1c1c21] focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-xs text-[#0a0a0a] dark:text-white outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                      Create Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#1c1c21] focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-3.5 py-3 pl-10 pr-10 text-xs text-[#0a0a0a] dark:text-white outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                      />
                      <Lock className="w-4 h-4 text-[#9ea3ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ae] hover:text-[#0a0a0a] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#717784] dark:text-zinc-400">Must contain at least 8 characters.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#1c1c21] focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-3.5 py-3 pl-10 pr-10 text-xs text-[#0a0a0a] dark:text-white outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                      />
                      <Lock className="w-4 h-4 text-[#9ea3ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ae] hover:text-[#0a0a0a] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !password || !confirmPassword}
                    className="w-full mt-2 bg-[#0f2f63] dark:bg-sky-600 hover:bg-[#2563c9] dark:hover:bg-sky-500 active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Activating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Activate Admin Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Bottom Security Audit Notice */}
          <div className="pt-4 text-center text-xs text-[#717784] dark:text-zinc-500">
            TrustHyre Security Protocol &bull; Administrative access events are cryptographically audited.
          </div>
        </div>

      </div>
    </div>
  );
};
