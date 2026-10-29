import React, { useState } from 'react';
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
  Languages,
  CheckCircle2
} from 'lucide-react';
import { SeoHead } from '../../../components/common/SeoHead';

export const SignInPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryRole = searchParams.get('role')?.toUpperCase();
    const [activeRole, setActiveRole] = useState<'WORKER' | 'EMPLOYER'>(queryRole === 'EMPLOYER' ? 'EMPLOYER' : 'WORKER');
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentLang, setCurrentLang] = useState<'en' | 'ta' | 'hi'>('en');
    
    const { user, isSignedIn, login, signInWithGoogle, authError, clearAuthError } = useAuth();
    const navigate = useNavigate();

    // Auto redirect when user becomes signed in
    React.useEffect(() => {
        if (isSignedIn && user) {
            const target = user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'EMPLOYER' ? '/find-workers' : '/search';
            navigate(target, { replace: true });
        }
    }, [isSignedIn, user, navigate]);

    // Sync auth errors into in-line page alert toast (no native browser alert popups)
    React.useEffect(() => {
        if (authError) {
            setError(authError);
        }
    }, [authError]);

    React.useEffect(() => {
        const handleAuthErrorEvent = (e: any) => {
            if (e.detail) {
                setError(e.detail);
            }
        };
        window.addEventListener('auth:error', handleAuthErrorEvent);
        return () => window.removeEventListener('auth:error', handleAuthErrorEvent);
    }, []);

    const handleGoogleSignIn = async () => {
        setError('');
        clearAuthError();
        try {
            await signInWithGoogle(activeRole);
        } catch (err: any) {
            if (
                err?.code !== 'auth/popup-closed-by-user' &&
                err?.code !== 'auth/cancelled-popup-request'
            ) {
                setError(err?.response?.data?.message || err?.message || 'Google Sign-In failed.');
            }
        }
    };

    // Keep activeRole synced if query param changes
    React.useEffect(() => {
        if (queryRole === 'EMPLOYER' && activeRole !== 'EMPLOYER') {
            setActiveRole('EMPLOYER');
        } else if (queryRole === 'WORKER' && activeRole !== 'WORKER') {
            setActiveRole('WORKER');
        }
    }, [queryRole]);

    const handleRoleToggle = (newRole: 'WORKER' | 'EMPLOYER') => {
        setActiveRole(newRole);
        setSearchParams({ role: newRole.toLowerCase() });
        setError('');
    };

    const handleStandardSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await apiClient.post('/api/auth/login', { email, password, role: activeRole });
            const userData = response.data.user;
            login(response.data.token, userData);
            navigate(userData.role === 'ADMIN' ? '/admin/dashboard' : userData.role === 'WORKER' ? '/search' : '/find-workers');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid email or password. Please verify your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const isCandidate = activeRole === 'WORKER';

    return (
        <div className="w-full min-h-screen p-2 sm:p-3 bg-white font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col">
            <SeoHead
                title="Sign In to Your Account"
                description="Sign in to TrustHyre to access verified skilled candidates, track hiring applications, and manage projects."
                canonicalPath="/login"
            />
            {/* Framed Full-Screen Canvas matching Landing Page Architecture */}
            <div className="relative w-full flex-1 min-h-[calc(100svh-1rem)] sm:min-h-[calc(100svh-1.5rem)] lg:h-[calc(100svh-1.5rem)] rounded-2xl sm:rounded-[2rem] overflow-hidden border border-[#e6e8ec] bg-white shadow-xl grid grid-cols-1 lg:grid-cols-12 transition-all">
                
                {/* Left Side: Full-Bleed Brand Visual Hero */}
                <div className="lg:col-span-5 xl:col-span-5 hidden lg:block h-full">
                    <AuthVisualHero role={activeRole} />
                </div>

                {/* Right Side: Clean Modern Form with Independent Smooth Scroll */}
                <div className="lg:col-span-7 xl:col-span-7 p-4 sm:p-8 lg:p-12 flex flex-col justify-between relative bg-white h-full overflow-y-auto">
                    
                    {/* Top Navigation Row: Back Link + Role Segmented Switcher + Vernacular Chip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
                        {/* Mobile Brand Logo / Desktop Back Link */}
                        <div className="flex items-center gap-2">
                            <Link 
                                to="/" 
                                className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] hover:text-[#0a0a0a] transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Back to Home</span>
                            </Link>
                        </div>

                        {/* Top Right: Segmented Role Pill & Native Language Indicators */}
                        <div className="flex items-center gap-2.5">
                            {/* Segmented Pill Role Switcher */}
                            <div className="inline-flex p-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec]">
                                <button
                                    type="button"
                                    onClick={() => handleRoleToggle('WORKER')}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                                        isCandidate 
                                            ? 'bg-[#0f2f63] text-white shadow-xs' 
                                            : 'text-[#717784] hover:text-[#0a0a0a]'
                                    }`}
                                >
                                    <User className="w-3 h-3" />
                                    <span>Candidate</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRoleToggle('EMPLOYER')}
                                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                                        !isCandidate 
                                            ? 'bg-[#0f2f63] text-white shadow-xs' 
                                            : 'text-[#717784] hover:text-[#0a0a0a]'
                                    }`}
                                >
                                    <Building2 className="w-3 h-3" />
                                    <span>Employer</span>
                                </button>
                            </div>

                            {/* Vernacular Language Switcher Pill */}
                            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] text-[11px] font-semibold text-[#717784]">
                                <Languages className="w-3.5 h-3.5 text-[#0f2f63]" />
                                <span className={currentLang === 'en' ? 'text-[#0f2f63] font-bold' : ''}>EN</span>
                                <span className="text-[#c5c8d0]">•</span>
                                <span className={currentLang === 'ta' ? 'text-[#0f2f63] font-bold' : ''}>தமிழ்</span>
                                <span className="text-[#c5c8d0]">•</span>
                                <span className={currentLang === 'hi' ? 'text-[#0f2f63] font-bold' : ''}>हिंदी</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Only: Ambient Hero Banner */}
                    <div className="block lg:hidden mb-6">
                        <AuthVisualHero role={activeRole} isMobileBanner={true} />
                    </div>

                    {/* Centered Form Area */}
                    <div className="max-w-md w-full mx-auto my-auto py-2">
                        
                        {/* Eyebrow & Title */}
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase text-[#717784] mb-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2563c9]" />
                                <span>{isCandidate ? 'Candidate Portal (வேலை தேடுபவர்)' : 'Employer Portal (பணியமர்த்துபவர்)'}</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-medium text-[#0a0a0a] leading-[1.05]">
                                Sign in to TrustHyre
                            </h1>
                            <p className="text-xs sm:text-sm text-[#717784] mt-2 leading-relaxed">
                                {isCandidate 
                                    ? 'Access verified jobs, verified daily shifts, and direct employer phone calls.' 
                                    : 'Access your hiring pipeline, active job postings, and pre-screened verified workers.'}
                            </p>
                        </div>

                        {/* Error Alert Toast */}
                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2.5 shadow-2xs"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Sign In Form */}
                        <form onSubmit={handleStandardSubmit} className="space-y-4">
                            
                            {/* Email Field */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium uppercase text-[#0a0a0a]">
                                    {isCandidate ? 'Email address or mobile' : 'Official business email'}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={isCandidate ? 'name@example.com' : 'hr@company.com'}
                                    required
                                    className="w-full bg-[#f4f4f4]/60 hover:bg-[#f4f4f4] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-4 py-3 text-base sm:text-sm text-[#0a0a0a] placeholder:text-[#9ea3ae] font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                                />
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="block text-xs font-medium uppercase text-[#0a0a0a]">
                                         Password
                                    </label>
                                    <Link 
                                        to={`/forgot-password?role=${activeRole.toLowerCase()}`}
                                        className="text-xs font-medium text-[#717784] hover:text-[#0f2f63] transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        required
                                        className="w-full bg-[#f4f4f4]/60 hover:bg-[#f4f4f4] focus:bg-white border border-[#e6e8ec] focus:border-[#0f2f63] rounded-xl px-4 py-3 pr-10 text-base sm:text-sm text-[#0a0a0a] placeholder:text-[#9ea3ae] font-normal transition-all outline-hidden focus:ring-2 focus:ring-[#0f2f63]/10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ea3ae] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Primary Sign In Button */}
                            <button
                                type="submit"
                                disabled={isLoading || !email || !password}
                                className="w-full mt-2 bg-[#0f2f63] hover:bg-[#2563c9] active:scale-[0.99] disabled:opacity-50 text-white py-3.5 px-5 rounded-full font-medium text-xs sm:text-sm uppercase transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing In...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Sign Up Redirect Link */}
                        <div className="mt-5 text-center">
                            <p className="text-xs sm:text-sm text-[#717784] font-normal">
                                Don't have an account?{' '}
                                <Link 
                                    to={`/sign-up?role=${activeRole.toLowerCase()}`} 
                                    className="font-medium text-[#0f2f63] hover:text-[#2563c9] underline underline-offset-2 transition-colors"
                                >
                                    Create an account
                                </Link>
                            </p>
                        </div>

                        {/* Social Sign In (Google OAuth for both Candidate & Employer) */}
                        <div>
                            <div className="flex items-center gap-3 my-5">
                                <div className="flex-1 h-px bg-[#e6e8ec]"></div>
                                <span className="text-[10px] font-medium uppercase text-[#9ea3ae]">or continue with</span>
                                <div className="flex-1 h-px bg-[#e6e8ec]"></div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                className="w-full bg-white hover:bg-[#f4f4f4] border border-[#e6e8ec] text-[#0a0a0a] py-3 px-4 rounded-full font-medium text-xs sm:text-sm uppercase flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                                </svg>
                                <span>Sign in with Google</span>
                            </button>
                        </div>
                    </div>

                    {/* Bottom Footer Note */}
                    <div className="pt-4 text-center text-xs text-[#717784]">
                        By signing in, you agree to our{' '}
                        <Link to="/terms" className="underline hover:text-[#0a0a0a] transition-colors">Terms of Service</Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="underline hover:text-[#0a0a0a] transition-colors">Privacy Policy</Link>.
                    </div>
                </div>

            </div>

        </div>
    );
};
