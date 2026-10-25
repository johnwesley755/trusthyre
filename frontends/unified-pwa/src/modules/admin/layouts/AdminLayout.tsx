import React from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthContext';
import trustHyreLogo from '../../../assets/TrustHyre Skills and Opportunities Logo.png';
import { 
  LayoutDashboard, 
  FileCheck2, 
  Users, 
  Briefcase, 
  LogOut,
  Building2,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Hiring Companies', path: '/admin/leads', icon: Building2 },
    { label: 'Blog & SEO', path: '/admin/blog', icon: BookOpen },
    { label: 'Verifications', path: '/admin/verifications', icon: FileCheck2 },
    { label: 'User Directory', path: '/admin/users', icon: Users },
    { label: 'Job Moderation', path: '/admin/jobs', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#0a0a0a] font-['Onest',system-ui,sans-serif] selection:bg-[#2563c9] selection:text-white flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e6e8ec] shadow-xs w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Left: Official Logo + Navigation */}
          <div className="flex items-center gap-5 lg:gap-7 min-w-0">
            <Link to="/admin/dashboard" className="flex items-center group py-1 shrink-0" aria-label="TrustHyre Admin Dashboard">
              <img 
                src={trustHyreLogo} 
                alt="TrustHyre" 
                className="h-8 sm:h-9 w-auto object-contain block select-none mix-blend-multiply group-hover:opacity-90 transition-opacity" 
              />
            </Link>

            {/* Desktop Segmented Pill Navigation */}
            <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-[#f4f5f8] border border-[#e5e7eb] shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer select-none ${
                        isActive
                          ? 'bg-[#0f2f63] text-white shadow-xs font-semibold'
                          : 'text-[#5a6270] hover:text-[#0a0a0a] hover:bg-white/80'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap leading-none">{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right: Admin Badge & Logout */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1.25 rounded-full bg-[#f4f5f8] border border-[#e5e7eb]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[11px] font-medium text-[#0a0a0a] max-w-[140px] truncate whitespace-nowrap">{user?.email || 'Admin Console'}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#0f2f63] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 whitespace-nowrap shrink-0">Super Admin</span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.25 rounded-full bg-[#f4f5f8] hover:bg-rose-50 text-[#5a6270] hover:text-rose-600 border border-[#e5e7eb] hover:border-rose-200 text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Logout</span>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Sub-Navbar (Pill Strip) */}
      <div className="lg:hidden bg-white border-b border-[#e6e8ec] px-3 py-2 flex items-center overflow-x-auto gap-1.5 shadow-2xs scrollbar-none w-full">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#0f2f63] text-white shadow-xs font-semibold'
                    : 'text-[#5a6270] hover:text-[#0a0a0a] bg-[#f4f5f8]'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Main Workbench Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
        <Outlet />
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#e6e8ec] bg-white py-4 px-6 text-center text-xs text-[#717784]">
        TrustHyre Operations Console • Authenticated Administrator Environment
      </footer>
    </div>
  );
};
