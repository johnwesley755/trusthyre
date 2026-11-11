import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../../services/auth.service';
import { forgotPasswordSchema, resetPasswordSchema } from '../../../validations/zodSchema';
import { AuthVisualHero } from '../components/AuthVisualHero';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertCircle, 
    Loader2, 
    ArrowLeft, 
    ArrowRight, 
    KeyRound, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    RefreshCw, 
    ShieldCheck,
    Mail 
} from 'lucide-react';

type Stage = 'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'SUCCESS';

export default function ForgotPasswordPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryRole = searchParams.get('role')?.toUpperCase();
    const [activeRole, setActiveRole] = useState<'WORKER' | 'EMPLOYER'>(queryRole === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER');

    const [stage, setStage] = useState<Stage>('EMAIL');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);

    const navigate = useNavigate();

    // Cooldown timer for code resend
    useEffect(() => {
        let timer: any;
        if (resendCooldown > 0) {
            timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Auto-redirect to sign-in on success
    useEffect(() => {
        if (stage === 'SUCCESS') {
            const timeout = setTimeout(() => {
                navigate(`/sign-in?role=${activeRole.toLowerCase()}`);
            }, 3500);
            return () => clearTimeout(timeout);
        }
    }, [stage, activeRole, navigate]);

    const handleRoleToggle = (newRole: 'WORKER' | 'EMPLOYER') => {
        if (stage !== 'EMAIL') return; // Lock role while in verification stages
        setActiveRole(newRole);
        setSearchParams({ role: newRole.toLowerCase() });
        setError(null);
    };

    // Stage 1: Request Code
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const validationResult = forgotPasswordSchema.safeParse({ email });
        if (!validationResult.success) {
            setError(validationResult.error.issues[0].message);
            setIsLoading(false);
            return;
        }

        try {
            await authService.forgotPassword(email, activeRole);
            setStage('CODE');
            setResendCooldown(30);
        } catch (err: any) {
            setError(err.response?.data?.message || err.response?.data?.error || 'Failed to dispatch recovery code. Please check the email address.');
        } finally {
            setIsLoading(false);
        }
    };

    // Resend Code handler
    const handleResendCode = async () => {
        if (resendCooldown > 0 || isLoading) return;
        setIsLoading(true);
        setError(null);
        try {
            await authService.forgotPassword(email, activeRole);
            setResendCooldown(30);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend code. Please try again shortly.');
        } finally {
            setIsLoading(false);
        }
    };

    // Stage 2: Verify Code
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedCode = code.trim();
        if (!trimmedCode || trimmedCode.length < 6) {
            setError('Please enter the complete 6-digit verification code.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authService.verifyResetCode(trimmedCode, email);
            setStage('NEW_PASSWORD');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Invalid or expired verification code. Please check your email or resend.');
        } finally {
            setIsLoading(false);
        }
    };

    // Stage 3: Set New Password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationResult = resetPasswordSchema.safeParse({ password, confirmPassword });
        if (!validationResult.success) {
            setError(validationResult.error.issues[0].message);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await authService.resetPassword({ token: code.trim(), password });
            setStage('SUCCESS');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update password. Your session may have timed out.');
        } finally {
            setIsLoading(false);
        }
    };

    const isCandidate = activeRole === 'WORKER';

    return (
        <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] text-[#0a0a0a] dark:text-zinc-100 font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col transition-colors duration-200">
            
            {/* Framed Full-Screen Canvas matching Landing Page Architecture */}
            <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-[2rem] overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
                
                {/* Left Side: Full-Bleed Brand Visual Hero */}
                <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
                    <AuthVisualHero role={activeRole} />
                </div>

                {/* Right Side: Clean Modern Form with Independent Smooth Scroll */}
                <div className="lg:col-span-7 xl:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative bg-white dark:bg-[#09090b] text-[#0a0a0a] dark:text-zinc-100 h-full overflow-y-auto">
                    
                    {/* Top Navigation Row: Back Link + Role Segmented Switcher */}
                    <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
                        <Link 
                            to={`/sign-in?role=${activeRole.toLowerCase()}`} 
                            className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to Sign In</span>
                        </Link>

                        {/* Segmented Pill Role Switcher */}
                        <div className={`inline-flex p-1 rounded-full bg-[#f4f4f4] dark:bg-[#121215] border border-[#e6e8ec] dark:border-zinc-800 ${stage !== 'EMAIL' ? 'opacity-60 pointer-events-none' : ''}`}>
                            <button
                                type="button"
                                onClick={() => handleRoleToggle('WORKER')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase transition-all cursor-pointer ${
                                    isCandidate 
                                        ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white shadow-xs' 
                                        : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
                                }`}
                            >
                                Job Seeker
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleToggle('EMPLOYER')}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium uppercase transition-all cursor-pointer ${
                                    !isCandidate 
                                        ? 'bg-[#0f2f63] dark:bg-[#2563EB] text-white shadow-xs' 
                                        : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white'
                                }`}
                            >
                                Employer
                            </button>
                        </div>
                    </div>

                    {/* Mobile Only: Ambient Hero Banner */}
                    <div className="block lg:hidden mb-6">
                        <AuthVisualHero role={activeRole} isMobileBanner={true} />
                    </div>

                    {/* Centered Area */}
                    <div className="max-w-md w-full mx-auto my-auto py-2">

                        {/* Global Error Banner */}
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

                        {/* STAGE 1: Request Code (Email Entry) */}
                        {stage === 'EMAIL' && (
                            <motion.div
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                            >
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9] dark:bg-[#38BDF8]" />
                                        <span>Step 1 of 3 • Account Recovery</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                        Reset your password
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                        Enter your registered email address and we'll dispatch a 6-digit verification code.
                                    </p>
                                </div>

                                <form onSubmit={handleSendCode} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                            {isCandidate ? 'Candidate Email Address' : 'Official Work Email'}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder={isCandidate ? 'name@example.com' : 'contact@company.com'}
                                                required
                                                className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 pl-10 text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-600 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-sky-500/20"
                                            />
                                            <Mail className="w-4 h-4 text-[#9ea3ae] dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !email}
                                        className="w-full mt-2 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Sending Verification Code...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Send Recovery Code</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* STAGE 2: Enter & Verify 6-Digit Code */}
                        {stage === 'CODE' && (
                            <motion.div
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                            >
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9] dark:bg-[#38BDF8]" />
                                        <span>Step 2 of 3 • Code Verification</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                        Enter 6-digit code
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                        We sent an authorization code to <strong className="text-[#0a0a0a] dark:text-white font-medium">{email}</strong>. Please check your inbox or spam folder.
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyCode} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                                6-Digit Security Code
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => { setStage('EMAIL'); setError(null); }}
                                                className="text-xs text-[#2563c9] dark:text-[#38BDF8] hover:underline cursor-pointer"
                                            >
                                                Change email
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                autoFocus
                                                autoComplete="one-time-code"
                                                value={code}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setCode(val);
                                                }}
                                                placeholder="123456"
                                                required
                                                className="w-full tracking-[8px] text-center font-mono text-xl sm:text-2xl font-bold bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3.5 text-[#0a0a0a] dark:text-white placeholder:text-[#cbd5e1] dark:placeholder:text-zinc-600 placeholder:tracking-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-sky-500/20"
                                            />
                                            <KeyRound className="w-4 h-4 text-[#9ea3ae] dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                        <p className="text-[11px] text-[#717784] dark:text-zinc-400 text-center">
                                            Tip: You can paste the full 6-digit code directly
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || code.length < 6}
                                        className="w-full mt-2 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Verifying Code...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Verify Code</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>

                                    {/* Resend Code Row */}
                                    <div className="pt-2 flex items-center justify-center gap-2 text-xs text-[#717784] dark:text-zinc-400">
                                        <span>Didn't receive the email?</span>
                                        {resendCooldown > 0 ? (
                                            <span className="font-semibold text-[#0f2f63] dark:text-[#38BDF8]">
                                                Resend in {resendCooldown}s
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleResendCode}
                                                disabled={isLoading}
                                                className="inline-flex items-center gap-1 font-semibold text-[#2563c9] dark:text-[#38BDF8] hover:underline cursor-pointer"
                                            >
                                                <RefreshCw className="w-3 h-3" />
                                                <span>Resend code</span>
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* STAGE 3: Set New Password */}
                        {stage === 'NEW_PASSWORD' && (
                            <motion.div
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                            >
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold uppercase mb-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Identity Verified • Step 3 of 3</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                        Create new password
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                        Identity confirmed for <strong className="text-[#0a0a0a] dark:text-white font-medium">{email}</strong>. Set a strong password with at least 8 characters.
                                    </p>
                                </div>

                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="At least 8 characters"
                                                required
                                                minLength={8}
                                                autoFocus
                                                className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 pr-10 text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-600 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-sky-500/20"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ae] dark:text-zinc-500 hover:text-[#0a0a0a] dark:hover:text-white transition-colors cursor-pointer"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                            Confirm New Password
                                        </label>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your password"
                                            required
                                            className="w-full bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3 text-sm text-[#0a0a0a] dark:text-white placeholder:text-[#9ea3ae] dark:placeholder:text-zinc-600 font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-sky-500/20"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !password || !confirmPassword}
                                        className="w-full mt-2 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Updating Password...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Save New Password</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* STAGE 4: Success Completion */}
                        {stage === 'SUCCESS' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4 py-4"
                            >
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100 dark:border-emerald-800/80">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                                </div>
                                <h1 className="text-3xl font-medium text-[#0a0a0a] dark:text-white">
                                    Password Reset Complete
                                </h1>
                                <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 leading-relaxed">
                                    Your password has been successfully updated. Redirecting you to sign in...
                                </p>
                                <button
                                    onClick={() => navigate(`/sign-in?role=${activeRole.toLowerCase()}`)}
                                    className="w-full mt-4 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Log In Now</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                    </div>

                    {/* Bottom Footer Note */}
                    <div className="pt-4 text-center text-xs text-[#717784] dark:text-zinc-500">
                        Need urgent assistance? Contact{' '}
                        <a href="mailto:support@trusthyre.com" className="underline hover:text-[#0a0a0a] dark:hover:text-white transition-colors">
                            support@trusthyre.com
                        </a>
                    </div>
                </div>

            </div>

        </div>
    );
}
