import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../../../services/auth.service';
import { resetPasswordSchema } from '../../../validations/zodSchema';
import { AuthVisualHero } from '../components/AuthVisualHero';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AlertCircle, 
    Loader2, 
    ArrowLeft, 
    CheckCircle2, 
    Eye, 
    EyeOff, 
    KeyRound, 
    ArrowRight, 
    ShieldCheck, 
    HelpCircle 
} from 'lucide-react';

type Stage = 'VERIFYING_URL' | 'CODE' | 'NEW_PASSWORD' | 'SUCCESS';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const tokenFromUrl = (searchParams.get('token') || '').trim();
    const emailFromUrl = (searchParams.get('email') || '').trim();

    const [stage, setStage] = useState<Stage>(tokenFromUrl ? 'VERIFYING_URL' : 'CODE');
    const [token, setToken] = useState(tokenFromUrl);
    const [email, setEmail] = useState(emailFromUrl);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Auto-verify token if arriving via email CTA deep-link
    useEffect(() => {
        if (!tokenFromUrl) return;

        let isMounted = true;
        const autoVerify = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await authService.verifyResetCode(tokenFromUrl, emailFromUrl || undefined);
                if (isMounted) {
                    if (res?.data?.email) {
                        setEmail(res.data.email);
                    }
                    setStage('NEW_PASSWORD');
                }
            } catch (err: any) {
                if (isMounted) {
                    setError('The reset link code has expired or is invalid. Please enter your 6-digit code or request a new one.');
                    setStage('CODE');
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        autoVerify();
        return () => { isMounted = false; };
    }, [tokenFromUrl, emailFromUrl]);

    // Auto-redirect to sign-in on success
    useEffect(() => {
        if (stage === 'SUCCESS') {
            const timeout = setTimeout(() => {
                navigate('/sign-in');
            }, 3500);
            return () => clearTimeout(timeout);
        }
    }, [stage, navigate]);

    // Handle manual code verification
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = token.trim();
        if (!trimmed || trimmed.length < 6) {
            setError('Please enter a valid 6-digit verification code.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await authService.verifyResetCode(trimmed, email || undefined);
            if (res?.data?.email) {
                setEmail(res.data.email);
            }
            setStage('NEW_PASSWORD');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Invalid or expired verification code. Please check your email or request a new code.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle password update
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
            await authService.resetPassword({ token: token.trim(), password });
            setStage('SUCCESS');
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update password. The code may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen p-2 sm:p-3 bg-white dark:bg-[#000000] text-[#0a0a0a] dark:text-zinc-100 font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col transition-colors duration-200">
            
            {/* Framed Full-Screen Canvas matching Landing Page Architecture */}
            <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-[2rem] overflow-hidden border border-[#e6e8ec] dark:border-zinc-800 bg-white dark:bg-[#09090b] shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
                
                {/* Left Side: Full-Bleed Brand Visual Hero */}
                <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
                    <AuthVisualHero role="WORKER" />
                </div>

                {/* Right Side: Clean Modern Form with Independent Smooth Scroll */}
                <div className="lg:col-span-7 xl:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative bg-white dark:bg-[#09090b] text-[#0a0a0a] dark:text-zinc-100 h-full overflow-y-auto">
                    
                    {/* Top Navigation Row: Back Link */}
                    <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
                        <Link 
                            to="/sign-in" 
                            className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Back to Sign In</span>
                        </Link>
                    </div>

                    {/* Mobile Only: Ambient Hero Banner */}
                    <div className="block lg:hidden mb-6">
                        <AuthVisualHero role="WORKER" isMobileBanner={true} />
                    </div>

                    {/* Centered Area */}
                    <div className="max-w-md w-full mx-auto my-auto py-2">

                        {/* Error Alert Banner */}
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

                        {/* STAGE: VERIFYING_URL (Deep link auto-verification loader) */}
                        {stage === 'VERIFYING_URL' && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12 space-y-4"
                            >
                                <Loader2 className="w-8 h-8 animate-spin text-[#0f2f63] dark:text-[#38BDF8] mx-auto" />
                                <h2 className="text-xl font-medium text-[#0a0a0a] dark:text-white">
                                    Verifying Security Code...
                                </h2>
                                <p className="text-xs text-[#717784] dark:text-zinc-400">
                                    Validating your one-time authorization token.
                                </p>
                            </motion.div>
                        )}

                        {/* STAGE: CODE (Enter 6-Digit Code if no token or token expired) */}
                        {stage === 'CODE' && (
                            <motion.div
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] dark:text-zinc-400 mb-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9] dark:bg-[#38BDF8]" />
                                        <span>Security Check • Code Entry</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                        Enter reset code
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                        Enter the 6-digit authorization code dispatched to your registered email address.
                                    </p>
                                </div>

                                <form onSubmit={handleVerifyCode} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-medium uppercase text-[#0a0a0a] dark:text-zinc-200">
                                            6-Digit Reset Code
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={6}
                                                autoFocus
                                                autoComplete="one-time-code"
                                                value={token}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setToken(val);
                                                }}
                                                placeholder="123456"
                                                required
                                                className="w-full tracking-[8px] text-center font-mono text-xl sm:text-2xl font-bold bg-[#f4f4f4]/60 dark:bg-[#121215] hover:bg-[#f4f4f4] dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-[#1C1C21] border border-[#e6e8ec] dark:border-zinc-800 focus:border-[#0f2f63] dark:focus:border-[#38BDF8] rounded-xl px-4 py-3.5 text-[#0a0a0a] dark:text-white placeholder:text-[#cbd5e1] dark:placeholder:text-zinc-600 placeholder:tracking-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10 dark:focus:ring-sky-500/20"
                                            />
                                            <KeyRound className="w-4 h-4 text-[#9ea3ae] dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || token.length < 6}
                                        className="w-full mt-2 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Verifying Code...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Verify Code & Continue</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </button>

                                    <div className="pt-2 text-center text-xs text-[#717784] dark:text-zinc-400">
                                        Don't have a code?{' '}
                                        <Link to="/forgot-password" className="text-[#2563c9] dark:text-[#38BDF8] hover:underline font-semibold">
                                            Request a new code
                                        </Link>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        {/* STAGE: NEW_PASSWORD (Set New Password once code is verified) */}
                        {stage === 'NEW_PASSWORD' && (
                            <motion.div
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold uppercase mb-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                        <span>Identity Verified</span>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] dark:text-white leading-[1.05]">
                                        Create new password
                                    </h1>
                                    <p className="text-xs sm:text-sm text-[#717784] dark:text-zinc-400 mt-2 leading-relaxed">
                                        Choose a secure password with a minimum of 8 characters.
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

                        {/* STAGE: SUCCESS */}
                        {stage === 'SUCCESS' && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.96 }}
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
                                    onClick={() => navigate('/sign-in')}
                                    className="w-full mt-4 bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>Log In Now</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </motion.div>
                        )}

                    </div>

                    {/* Bottom Help */}
                    <div className="pt-4 text-center text-xs text-[#717784] dark:text-zinc-500">
                        Need help? Return to{' '}
                        <Link to="/sign-in" className="font-medium text-[#0f2f63] dark:text-[#38BDF8] hover:text-[#2563c9] dark:hover:text-sky-300 underline underline-offset-2 transition-colors">
                            Sign In
                        </Link>
                    </div>
                </div>

            </div>

        </div>
    );
}
