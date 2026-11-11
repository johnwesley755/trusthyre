import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthContext';
import apiClient from '../../../api/apiClient';
import { AuthVisualHero } from '../../auth/components/AuthVisualHero';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';

export const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, user, isSignedIn } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isSignedIn && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isSignedIn, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
        role: 'ADMIN'
      });

      const userData = response.data.user;
      if (userData.role !== 'ADMIN' && userData.role !== 'SUPER_ADMIN') {
        setError('Access denied: This account does not possess administrator privileges.');
        return;
      }

      login(response.data.token, userData);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col transition-colors duration-200">
      {/* Framed Full-Screen Canvas matching Landing Page Architecture */}
      <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-[2rem] overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
        
        {/* Left Side: Full-Bleed Brand Visual Hero */}
        <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
          <AuthVisualHero role="EMPLOYER" />
        </div>

        {/* Right Side: Clean Modern Form with Independent Smooth Scroll */}
        <div className="lg:col-span-7 xl:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative bg-white dark:bg-[#09090b] h-full overflow-y-auto">
          
          {/* Top Navigation Row: Back Link & Security Badge */}
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
              <span>Restricted Gateway</span>
            </div>
          </div>

          {/* Mobile Only: Ambient Hero Banner */}
          <div className="block lg:hidden mb-6">
            <AuthVisualHero role="EMPLOYER" isMobileBanner={true} />
          </div>

          {/* Centered Area */}
          <div className="max-w-md w-full mx-auto my-auto py-2">
            
            {/* Header info */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
                <span>Super Administrator Portal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                Command Center
              </h1>
              <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                Authenticate with superuser credentials to access platform telemetry, moderation, and workforce verification.
              </p>
            </div>

            {/* Error Alert Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-medium rounded-xl flex items-center gap-2.5 shadow-2xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                  Administrator Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@trusthyre.com"
                    required
                    className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#1c1c21] focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-4 py-3 pl-10 text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                  />
                  <Mail className="w-4 h-4 text-[#9ea3ae] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                  Master Security Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#1c1c21] focus:bg-white dark:focus:bg-[#000000] border border-[#e6e8ec] dark:border-zinc-700 focus:border-[#0f2f63] dark:focus:border-sky-500 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
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
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full mt-2 bg-[#0f2f63] dark:bg-sky-600 hover:bg-[#2563c9] dark:hover:bg-sky-500 active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authenticating Admin...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Command Center</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>

          {/* Bottom Security Notice */}
          <div className="pt-4 text-center text-xs text-[#717784] dark:text-zinc-500">
            Authorized personnel only. All access attempts are cryptographically audited.
          </div>
        </div>

      </div>
    </div>
  );
};
