import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../providers/AuthContext";
import trustHyreLogo from "../../../assets/TrustHyre Skills and Opportunities Logo.png";
import { 
  MapPin, 
  ChevronDown, 
  ShieldCheck, 
  Briefcase, 
  UserCheck, 
  Building2, 
  LayoutDashboard,
  Menu,
  X,
  BookOpen
} from "lucide-react";

export function LandingNavbar() {
  const { isSignedIn, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const targetDashboard = user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'EMPLOYER' ? '/find-workers' : '/search';

  return (
    <nav className="fixed top-0 w-full h-[72px] z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_rgba(10,25,49,0.04)] transition-all duration-300 font-sans">
      <div className="flex justify-between items-center px-4 sm:px-8 lg:px-12 h-full max-w-[1440px] mx-auto gap-4">
        
        {/* Brand & Hyperlocal Location */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center group py-1" aria-label="TrustHyre Home">
            <img 
              src={trustHyreLogo} 
              alt="TrustHyre" 
              className="h-10 sm:h-12 md:h-14 w-auto object-contain block select-none mix-blend-multiply group-hover:opacity-90 transition-opacity" 
            />
          </Link>

          {/* Location pill */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-full cursor-pointer transition-colors border border-slate-200/60">
            <MapPin className="w-3.5 h-3.5 text-[#0066FF]" />
            <span className="text-xs font-black text-[#0A1931] truncate max-w-[160px]">HSR Layout, Bengaluru</span>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">⚡ 30m match</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Center Navigation Links */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-[#0A1931]/70">
          <Link className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5" to="/search">
            <Briefcase className="w-4 h-4 text-[#0066FF]" />
            Find Jobs
          </Link>
          <Link className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5" to="/find-workers">
            <UserCheck className="w-4 h-4 text-[#0066FF]" />
            Hire Workers
          </Link>
          <Link className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5" to="/blog">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Blog & Guides
          </Link>
          <Link className="hover:text-[#0066FF] transition-colors flex items-center gap-1.5 cursor-pointer" to="/terms">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Terms & Safety
          </Link>
        </div>

        {/* Right Action Switcher */}
        <div className="flex items-center gap-2.5">
          {isSignedIn ? (
            user?.role === 'ADMIN' ? (
              <Link
                to="/admin/dashboard"
                className="bg-blue-50 hover:bg-blue-100 text-[#0066FF] border border-blue-200/80 font-extrabold px-4.5 py-2.5 rounded-xl uppercase text-xs tracking-wider shadow-xs active:scale-95 transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
                <span>Admin Command Center</span>
              </Link>
            ) : user?.role === 'EMPLOYER' ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/find-workers"
                  className="hidden sm:inline-flex text-[#0A1931] font-extrabold px-4 py-2 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase tracking-wider items-center gap-1.5 border border-slate-200"
                >
                  <UserCheck className="w-4 h-4 text-[#0066FF]" />
                  <span>Find Candidates</span>
                </Link>
                <Link
                  to="/find-workers"
                  className="bg-[#0066FF] hover:bg-[#0050CB] text-white font-extrabold px-5 py-2.5 rounded-xl uppercase text-xs tracking-wider shadow-md shadow-[#0066FF]/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Find Workers</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/search"
                  className="hidden sm:inline-flex text-[#0A1931] font-extrabold px-4 py-2 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase tracking-wider items-center gap-1.5 border border-slate-200"
                >
                  <Briefcase className="w-4 h-4 text-[#0066FF]" />
                  <span>Browse Jobs</span>
                </Link>
                <Link
                  to="/search"
                  className="bg-[#0066FF] hover:bg-[#0050CB] text-white font-extrabold px-5 py-2.5 rounded-xl uppercase text-xs tracking-wider shadow-md shadow-[#0066FF]/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>My Jobs</span>
                </Link>
              </div>
            )
          ) : (
            <>
              <Link
                to="/sign-in?role=WORKER"
                className="hidden sm:inline-flex text-[#0A1931] font-extrabold px-4 py-2 hover:bg-slate-100 rounded-xl transition-all text-xs uppercase tracking-wider items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4 text-[#0066FF]" />
                <span>Candidate Login</span>
              </Link>
              <Link
                to="/sign-in?role=EMPLOYER"
                className="hidden sm:inline-flex bg-[#0A1931] hover:bg-[#0F172A] text-white font-extrabold px-4.5 py-2.5 rounded-xl uppercase text-xs tracking-wider active:scale-95 transition-all shadow-sm items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-[#38BDF8]" />
                <span>Employer Portal</span>
              </Link>
            </>
          )}

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3 shadow-xl">
          <div className="flex flex-col space-y-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Link
              to="/search"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <Briefcase className="w-4 h-4 text-[#0066FF]" />
              <span>Find Jobs</span>
            </Link>
            <Link
              to="/find-workers"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <UserCheck className="w-4 h-4 text-[#0066FF]" />
              <span>Hire Workers</span>
            </Link>
            <Link
              to="/blog"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Blog & Guides</span>
            </Link>
          </div>

          {isSignedIn && user?.role === 'ADMIN' && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/admin/dashboard"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-[#0066FF] border border-blue-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
                <span>Admin Command Center</span>
              </Link>
            </div>
          )}

          {!isSignedIn && (
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/sign-in?role=WORKER"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-slate-100 text-[#0A1931] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-[#0066FF]" />
                <span>Candidate Login</span>
              </Link>
              <Link
                to="/sign-in?role=EMPLOYER"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-[#0A1931] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4 text-[#38BDF8]" />
                <span>Employer Portal</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
