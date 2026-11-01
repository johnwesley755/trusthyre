import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { adminService } from '../../../services/admin.service';
import { useAuth } from '../../../providers/AuthContext';
import { toast } from 'sonner';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided. Please use the complete link shared with you.');
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

      toast.success('Administrator account activated successfully! Welcome to TrustHyre.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to activate administrator account';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-['Onest',system-ui,sans-serif]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#0f2f63] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              T
            </div>
            <span className="text-xl font-bold text-[#0a0a0a] tracking-tight">TrustHyre</span>
          </Link>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-[#0a0a0a] tracking-tight">
          Administrator Onboarding
        </h2>
        <p className="mt-2 text-center text-xs text-[#717784]">
          Configure your credentials to access the administrative dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-[#e6e8ec] sm:px-10">
          
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 text-[#0f2f63] animate-spin" />
              <p className="text-xs text-[#717784]">Verifying cryptographic invitation token...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#0a0a0a]">Invitation Invalid or Expired</h3>
              <p className="text-xs text-[#717784] leading-relaxed">
                {error}
              </p>
              <div className="pt-2">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#0f2f63] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#1a4484] transition-all"
                >
                  <span>Go to Admin Login</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#0f2f63] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0f2f63]">Authorized Email Address</p>
                  <p className="text-xs font-medium text-slate-700 truncate">{inviteData?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#717784] mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="First name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#717784] mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#717784] mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#717784] mb-1">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repeat your password"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-[#0f2f63] hover:bg-[#1a4484] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Activate Administrator Account</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
export default AdminAcceptInvitePage;

