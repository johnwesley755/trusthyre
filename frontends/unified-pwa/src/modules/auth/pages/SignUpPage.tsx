import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthContext';
import apiClient from '../../../api/apiClient';
import { AuthVisualHero } from '../components/AuthVisualHero';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  User, 
  ArrowLeft, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight,
  CheckCircle2,
  Mail,
  RefreshCw,
  Edit3,
  Languages
} from 'lucide-react';
import { SeoHead } from '../../../components/common/SeoHead';

type SignUpStage = 'FORM' | 'OTP';

export const SignUpPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryRole = searchParams.get('role')?.toUpperCase();
    const [activeRole, setActiveRole] = useState<'WORKER' | 'EMPLOYER'>(queryRole === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER');
    
    // Multi-stage state
    const [stage, setStage] = useState<SignUpStage>('FORM');
    
    // Candidate Form Fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    
    // Employer Form Fields
    const [companyName, setCompanyName] = useState('');
    
    // Shared Fields
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // OTP State
    const [otp, setOtp] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendSuccess, setResendSuccess] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    
    const { user, isSignedIn, login, signInWithGoogle, authError, clearAuthError } = useAuth();
    const navigate = useNavigate();

    // Auto redirect when user becomes signed in
    useEffect(() => {
        if (isSignedIn && user) {
            const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.email?.toLowerCase() === 'admin@trusthyre.com';
            const target = isAdmin ? '/admin/dashboard' : user.role === 'EMPLOYER' ? '/find-workers' : '/onboarding';
            navigate(target, { replace: true });
        }
    }, [isSignedIn, user, navigate]);

    // Resend countdown timer
    useEffect(() => {
        let timer: any;
        if (resendCooldown > 0) {
            timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Sync auth errors into in-line page alert toast (no native browser alert popups)
    useEffect(() => {
        if (authError) {
            setError(authError);
        }
    }, [authError]);

    useEffect(() => {
        const handleAuthErrorEvent = (e: any) => {
            if (e.detail) {
                setError(e.detail);
            }
        };
        window.addEventListener('auth:error', handleAuthErrorEvent);
        return () => window.removeEventListener('auth:error', handleAuthErrorEvent);
    }, []);

    // Keep activeRole synced if query param changes
    useEffect(() => {
        if (queryRole === 'EMPLOYER' && activeRole !== 'EMPLOYER') {
            setActiveRole('EMPLOYER');
        } else if (queryRole === 'WORKER' && activeRole !== 'WORKER') {
            setActiveRole('WORKER');
        }
    }, [queryRole]);

    const handleRoleToggle = (newRole: 'WORKER' | 'EMPLOYER') => {
        if (stage === 'OTP') return; // Prevent role flipping mid-verification
        setActiveRole(newRole);
        setSearchParams({ role: newRole.toLowerCase() });
        setError('');
    };

    // Google Sign-Up: Bypasses OTP because Google accounts are already email-verified
    const handleGoogleSignUp = async () => {
        setError('');
        clearAuthError();
        try {
            await signInWithGoogle(activeRole);
        } catch (err: any) {
            if (
                err?.code !== 'auth/popup-closed-by-user' &&
                err?.code !== 'auth/cancelled-popup-request'
            ) {
                setError(err?.response?.data?.message || err?.message || 'Google Sign-Up failed.');
            }
        }
    };

    // Step 1: Validate Details and Send Email OTP
    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        // Sanitize Indian phone number
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
            setError('Please enter a valid 10-digit Indian mobile number.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);

        try {
            // Request Email OTP from backend mailer
            await apiClient.post('/api/auth/send-otp', {
                email: cleanEmail,
                role: activeRole,
                phoneNumber: cleanPhone
            });

            setStage('OTP');
            setResendCooldown(30);
            setResendSuccess(false);
            setOtp('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to send verification code. Please check your information.');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend Email OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || isResending) return;
        setIsResending(true);
        setError('');
        setResendSuccess(false);

        try {
            await apiClient.post('/api/auth/send-otp', {
                email: email.trim().toLowerCase(),
                role: activeRole
            });
            setResendCooldown(30);
            setResendSuccess(true);
            setTimeout(() => setResendSuccess(false), 4000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend code. Please try again shortly.');
        } finally {
            setIsResending(false);
        }
    };

    // Step 2: Verify Email OTP and Complete Registration
    const handleVerifyAndRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanOtp = otp.trim();
        if (cleanOtp.length !== 6) {
            setError('Please enter the complete 6-digit verification code sent to your email.');
            return;
        }

        setIsLoading(true);

        const cleanPhone = phoneNumber.replace(/\D/g, '');
        const cleanEmail = email.trim().toLowerCase();

        try {
            const payload = activeRole === 'WORKER' 
                ? {
                    role: 'WORKER',
                    email: cleanEmail,
                    password,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phoneNumber: `+91${cleanPhone}`,
                    otp: cleanOtp
                }
                : {
                    role: 'EMPLOYER',
                    email: cleanEmail,
                    password,
                    firstName: companyName.trim() || 'Business',
                    lastName: 'Employer',
                    phoneNumber: `+91${cleanPhone}`,
                    otp: cleanOtp
                };

            const response = await apiClient.post('/api/auth/register', payload);
            const responseData = response.data?.data || response.data;
            const userData = responseData.user;
            const token = responseData.token;

            if (token && userData) {
                login(token, userData);
                const isAdminUser = userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN' || userData.email?.toLowerCase() === 'admin@trusthyre.com';
                navigate(isAdminUser ? '/admin/dashboard' : userData.role === 'WORKER' ? '/onboarding' : '/find-workers', { replace: true });
            } else {
                throw new Error("Registration succeeded but no authorization token was returned.");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const isCandidate = activeRole === 'WORKER';

    return (
        <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] text-[#0a0a0a] dark:text-zinc-100 font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col transition-colors duration-200">
            <SeoHead
                title="Create an Account | TrustHyre"
                description="Sign up for TrustHyre as an employer to hire verified talent, or as a skilled candidate to unlock opportunities."
                canonicalPath="/sign-up"
            />
            {/* Framed Full-Screen Canvas matching Landing Page Architecture */}
            <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-2xl sm:rounded-[2rem] overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
                
                {/* Left Side: Full-Bleed Brand Visual Hero */}
                <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
                    <AuthVisualHero role={activeRole} />
                </div>

                {/* Right Side: Clean Modern Form with Independent Smooth Scroll */}
                <div className="lg:col-span-7 xl:col-span-7 p-4 sm:p-8 lg:p-12 flex flex-col justify-between relative bg-white dark:bg-[#09090b] text-[#0a0a0a] dark:text-zinc-100 h-full overflow-y-auto">
                    
                    {/* Top Navigation Row: Back Link + Role Segmented Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
                        <div className="flex items-center gap-2">
                            {stage === 'OTP' ? (
                                <button 
                                    type="button"
                                    onClick={() => { setStage('FORM'); setError(''); }}
                                    className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-colors cursor-pointer"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Edit Details</span>
                                </button>
                            ) : (
                                <Link 
                                    to="/" 
                                    className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to Home</span>
                                </Link>
                            )}
                        </div>

                        {/* Top Right: Segmented Role Pill & Native Language Indicators */}
                        <div className="flex items-center gap-2.5">
                            {/* Segmented Pill Role Switcher */}
                            <div className="inline-flex p-1 rounded-full bg-[#f4f4f4] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800">
                                <button
                                    type="button"
                                    disabled={stage === 'OTP'}
                                    onClick={() => handleRoleToggle('WORKER')}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                                        isCandidate 
                                            ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white shadow-xs' 
                                            : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
                                    } ${stage === 'OTP' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    <User className="w-3 h-3" />
                                    <span>Candidate</span>
                                </button>
                                <button
                                    type="button"
                                    disabled={stage === 'OTP'}
                                    onClick={() => handleRoleToggle('EMPLOYER')}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                                        !isCandidate 
                                            ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white shadow-xs' 
                                            : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
                                    } ${stage === 'OTP' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    <Building2 className="w-3 h-3" />
                                    <span>Employer</span>
                                </button>
                            </div>

                            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#f4f4f4] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 text-[11px] font-semibold text-[#717784] dark:text-zinc-300">
                                <Languages className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                                <span className="text-[#0f2f63] dark:text-[#38BDF8] font-bold">EN</span>
                                <span className="text-[#c5c8d0] dark:text-zinc-600">•</span>
                                <span>தமிழ்</span>
                                <span className="text-[#c5c8d0] dark:text-zinc-600">•</span>
                                <span>हिंदी</span>
                                <span className="text-[#c5c8d0]">•</span>
                                <span>हिंदी</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Only: Ambient Hero Banner */}
                    <div className="block lg:hidden mb-6">
                        <AuthVisualHero role={activeRole} isMobileBanner={true} />
                    </div>

                    {/* Centered Form Area */}
                    <div className="max-w-md w-full mx-auto my-auto py-2">
                        
                        <AnimatePresence mode="wait">
                            {stage === 'FORM' ? (
                                <motion.div
                                    key="form-stage"
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 16 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* Eyebrow & Title */}
                                    <div className="mb-6">
                                        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9] dark:bg-[#38BDF8]" />
                                            <span>{isCandidate ? 'Candidate Registration (வேலை தேடுபவர்)' : 'Employer Registration (பணியமர்த்துபவர்)'}</span>
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                            Create an account
                                        </h1>
                                        <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                            {isCandidate 
                                                ? 'Get verified, discover local jobs, and connect directly with verified employers.' 
                                                : 'Access India’s pre-screened technical talent pool with reliable attendance commitment.'}
                                        </p>
                                    </div>

                                    {/* Dual High-Contrast Choice Cards */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <button
                                            type="button"
                                            onClick={() => handleRoleToggle('WORKER')}
                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[92px] ${
                                                isCandidate
                                                    ? 'border-[#0f2f63] dark:border-[#38BDF8] bg-[#0f2f63]/5 dark:bg-sky-500/10 shadow-sm ring-2 ring-[#0f2f63]/15 dark:ring-sky-500/20'
                                                    : 'border-[#e6e8ec] dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121215]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                    isCandidate ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white' : 'bg-[#f4f4f4] dark:bg-zinc-800 text-[#717784] dark:text-zinc-400'
                                                }`}>
                                                    <User className="w-4 h-4" />
                                                </div>
                                                {isCandidate && (
                                                    <span className="w-5 h-5 rounded-full bg-[#0f2f63] dark:bg-[#2563EB] text-white flex items-center justify-center text-xs">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-[#0a0a0a] dark:text-white">Looking for Work</span>
                                                <span className="block text-[10px] text-[#717784] dark:text-zinc-400">வேலை தேடுகிறேன் · Daily jobs</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleRoleToggle('EMPLOYER')}
                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between min-h-[92px] ${
                                                !isCandidate
                                                    ? 'border-[#0f2f63] dark:border-[#38BDF8] bg-[#0f2f63]/5 dark:bg-sky-500/10 shadow-sm ring-2 ring-[#0f2f63]/15 dark:ring-sky-500/20'
                                                    : 'border-[#e6e8ec] dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-[#121215]'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                    !isCandidate ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white' : 'bg-[#f4f4f4] dark:bg-zinc-800 text-[#717784] dark:text-zinc-400'
                                                }`}>
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                {!isCandidate && (
                                                    <span className="w-5 h-5 rounded-full bg-[#0f2f63] dark:bg-[#2563EB] text-white flex items-center justify-center text-xs">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-[#0a0a0a] dark:text-white">I Want to Hire</span>
                                                <span className="block text-[10px] text-[#717784] dark:text-zinc-400">பணியமர்த்தல் · Post shifts</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Error Alert Toast */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-medium rounded-xl flex items-center gap-2.5 shadow-2xs"
                                            >
                                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                                <span>{error}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Sign Up Form */}
                                    <form onSubmit={handleRequestOtp} className="space-y-3.5">
                                        
                                        {/* Role Specific Name Inputs */}
                                        {isCandidate ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                                        First Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={firstName}
                                                        onChange={(e) => setFirstName(e.target.value)}
                                                        placeholder="John"
                                                        required
                                                        className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#18181f] focus:bg-white dark:focus:bg-[#18181f] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 text-base sm:text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#38BDF8]/20"
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
                                                        placeholder="Doe"
                                                        required
                                                        className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#18181f] focus:bg-white dark:focus:bg-[#18181f] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 text-base sm:text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#38BDF8]/20"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                                    Company / Enterprise Name
                                                </label>
                                                <input
                                                    type="text"
                                                    value={companyName}
                                                    onChange={(e) => setCompanyName(e.target.value)}
                                                    placeholder="Reliance Logistics Ltd"
                                                    required
                                                    className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#18181f] focus:bg-white dark:focus:bg-[#18181f] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 text-base sm:text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#38BDF8]/20"
                                                />
                                            </div>
                                        )}

                                        {/* Email Field */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                                {isCandidate ? 'Email Address' : 'Official Work Email'}
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder={isCandidate ? 'name@example.com' : 'contact@company.com'}
                                                required
                                                className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#18181f] focus:bg-white dark:focus:bg-[#18181f] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 text-base sm:text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#38BDF8]/20"
                                            />
                                        </div>

                                        {/* Mobile Phone Field */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                                Mobile Number
                                            </label>
                                            <div className="flex rounded-xl overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 focus-within:border-[#0f2f63] dark:focus-within:border-[#38BDF8] focus-within:ring-2 focus-within:ring-[#0f2f63]/10 dark:focus-within:ring-[#38BDF8]/20 transition-all bg-[#f4f4f4]/60 dark:bg-[#121215]">
                                                <span className="inline-flex items-center gap-1.5 px-3.5 bg-[#f4f4f4] dark:bg-zinc-800 text-xs font-medium text-[#717784] dark:text-zinc-400 border-r border-[#e6e8ec] dark:border-zinc-700 select-none">
                                                    <span>🇮🇳</span>
                                                    <span>+91</span>
                                                </span>
                                                <input
                                                    type="tel"
                                                    value={phoneNumber}
                                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                                    placeholder="98765 43210"
                                                    maxLength={10}
                                                    required
                                                    className="w-full bg-transparent px-4 py-3 text-base sm:text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal outline-hidden"
                                                />
                                            </div>
                                        </div>

                                        {/* Password Field */}
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Minimum 6 characters"
                                                    required
                                                    className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-[#18181f] focus:bg-white dark:focus:bg-[#18181f] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 pr-10 text-base sm:text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-500 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-[#38BDF8]/20"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ae] hover:text-[#0a0a0a] dark:hover:text-white transition-colors cursor-pointer"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isLoading || !email || !password || !phoneNumber}
                                            className="w-full mt-2 bg-[#0f2f63] hover:bg-[#2563c9] dark:bg-[#2563EB] dark:hover:bg-blue-600 active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Sending Verification Code...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Verify Email & Continue</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Sign In Redirect Link */}
                                    <div className="mt-5 text-center">
                                        <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 font-normal">
                                            Already have an account?{' '}
                                            <Link 
                                                to={`/sign-in?role=${activeRole.toLowerCase()}`} 
                                                className="font-medium text-[#0f2f63] dark:text-[#38BDF8] hover:text-[#2563c9] dark:hover:text-sky-300 underline underline-offset-2 transition-colors"
                                            >
                                                Sign in
                                            </Link>
                                        </p>
                                    </div>

                                    {/* Quick Google Signup for Candidate & Employer (Bypasses OTP as Google verifies identity) */}
                                    <div>
                                        <div className="flex items-center gap-3 my-5">
                                            <div className="flex-1 h-px bg-[#e6e8ec] dark:bg-zinc-800"></div>
                                            <span className="text-[10px] font-medium uppercase text-[#9ea3ae] dark:text-zinc-500">or fast track with</span>
                                            <div className="flex-1 h-px bg-[#e6e8ec] dark:bg-zinc-800"></div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleGoogleSignUp}
                                            className="w-full bg-white dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 text-[#0a0a0a] dark:text-white py-3 px-4 rounded-full font-medium text-xs sm:text-sm uppercase flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                            </svg>
                                            <span>Sign up with Google</span>
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="otp-stage"
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {/* OTP Stage Header */}
                                    <div className="mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-[#0f2f63]/5 dark:bg-sky-500/10 border border-[#0f2f63]/10 dark:border-sky-500/20 flex items-center justify-center text-[#0f2f63] dark:text-[#38BDF8] mb-4 shadow-xs">
                                            <Mail className="w-6 h-6 text-[#0f2f63] dark:text-[#38BDF8]" />
                                        </div>
                                        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>Step 2 of 2: Email Verification</span>
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                            Check your inbox
                                        </h1>
                                        <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                            We've sent a 6-digit verification code to{' '}
                                            <span className="font-semibold text-[#0a0a0a] dark:text-white bg-[#f4f4f4] dark:bg-zinc-800 px-1.5 py-0.5 rounded-md border border-[#e6e8ec] dark:border-zinc-700">
                                                {email}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Success Toast */}
                                    <AnimatePresence>
                                        {resendSuccess && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-medium rounded-xl flex items-center gap-2 shadow-2xs"
                                            >
                                                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                                <span>A new verification code has been dispatched to your email.</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Error Alert Toast */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-xs font-medium rounded-xl flex items-center gap-2.5 shadow-2xs"
                                            >
                                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                                                <span>{error}</span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* OTP Input Form */}
                                    <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200 flex items-center justify-between">
                                                <span>6-Digit Verification Code</span>
                                                <button
                                                    type="button"
                                                    onClick={() => { setStage('FORM'); setError(''); }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563c9] dark:text-[#38BDF8] hover:underline cursor-pointer"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                    <span>Change Email</span>
                                                </button>
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                autoFocus
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                placeholder="123456"
                                                required
                                                className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-[#1C1C21] border-2 border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-2xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.4em] text-[#0a0a0a] dark:text-white placeholder:text-[#cbd0d8] dark:placeholder:text-zinc-600 placeholder:font-normal placeholder:tracking-normal transition-all outline-hidden focus:ring-4 focus:ring-[#0f2f63]/10 dark:focus:ring-sky-500/20"
                                            />
                                            <p className="text-[11px] text-[#717784] dark:text-zinc-400 text-center">
                                                Enter the 6-digit code from your email (valid for 15 minutes)
                                            </p>
                                        </div>

                                        {/* Verify Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isLoading || otp.trim().length !== 6}
                                            className="w-full mt-2 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Verifying & Completing Setup...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck className="w-4 h-4" />
                                                    <span>Verify & Complete Registration</span>
                                                </>
                                            )}
                                        </button>

                                        {/* Resend Code Section */}
                                        <div className="pt-3 text-center">
                                            {resendCooldown > 0 ? (
                                                <p className="text-xs text-[#717784] dark:text-zinc-400 font-medium">
                                                    Resend code in <span className="font-bold text-[#0a0a0a] dark:text-white">{resendCooldown}s</span>
                                                </p>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={isResending}
                                                    onClick={handleResendOtp}
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f2f63] dark:text-[#38BDF8] hover:text-[#2563c9] underline underline-offset-2 transition-colors cursor-pointer"
                                                >
                                                    {isResending ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            <span>Resending...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                            <span>Didn't receive the code? Resend Code</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </form>

                                    {/* Security Guarantee Badge */}
                                    <div className="mt-8 p-3 bg-[#f8f9fb] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 rounded-xl flex items-center gap-2.5 text-[11px] text-[#717784] dark:text-zinc-400">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span>Your email is verified with Brevo security to keep your TrustHyre account secure.</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>

                    {/* Bottom Footer Note */}
                    <div className="pt-4 text-center text-xs text-[#717784] dark:text-zinc-500">
                        By creating an account, you agree to our{' '}
                        <Link to="/terms" className="underline hover:text-[#0a0a0a] dark:hover:text-white transition-colors">Terms of Service</Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="underline hover:text-[#0a0a0a] dark:hover:text-white transition-colors">Privacy Policy</Link>.
                    </div>
                </div>

            </div>

        </div>
    );
};
