import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BarChart3,
  Mail,
  Users,
  FileCheck2,
  Briefcase,
  Building2,
  BookOpen,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { useAuth } from '../../../providers/AuthContext';
import { adminService } from '../../../services/admin.service';

export const AdminSubNavbar: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = (user?.role as string) === 'SUPER_ADMIN';

  // Fetch pending verifications count for real-time badge
  const { data: pendingVerifications = [] } = useQuery({
    queryKey: ['adminVerifications', 'PENDING'],
    queryFn: () => adminService.getVerifications('PENDING'),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const pendingCount = Array.isArray(pendingVerifications) ? pendingVerifications.length : 0;

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      superAdminOnly: false,
    },
    {
      name: 'Analytics',
      path: '/admin/analytics',
      icon: BarChart3,
      superAdminOnly: false,
    },
    {
      name: 'Email Templates',
      path: '/admin/email-templates',
      icon: Mail,
      superAdminOnly: false,
    },
    {
      name: 'User Directory',
      path: '/admin/users',
      icon: Users,
      superAdminOnly: true,
      badge: 'Super Admin',
    },
    {
      name: 'Verifications',
      path: '/admin/verifications',
      icon: FileCheck2,
      superAdminOnly: false,
      countBadge: pendingCount,
    },
    {
      name: 'Job Moderation',
      path: '/admin/jobs',
      icon: Briefcase,
      superAdminOnly: false,
    },
    {
      name: 'Hiring Leads',
      path: '/admin/leads',
      icon: Building2,
      superAdminOnly: false,
    },
    {
      name: 'Blog & SEO',
      path: '/admin/blog',
      icon: BookOpen,
      superAdminOnly: false,
    },
  ];

  const visibleItems = navItems.filter(item => !item.superAdminOnly || isSuperAdmin);

  return (
    <div className="sticky top-16 sm:top-18 z-40 w-full bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-md border-b border-[#e6e8ec] dark:border-zinc-800 transition-colors select-none font-['Onest',system-ui,sans-serif]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-12 sm:h-13">
          
          {/* Scrollable Navigation Tabs */}
          <nav 
            className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-2 px-2 min-w-0 flex-1"
            aria-label="Admin Navigation Tabs"
          >
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/admin/dashboard'}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#0f2f63] dark:bg-[#0066FF] text-white shadow-xs'
                        : 'text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-[#f4f4f4] dark:hover:bg-zinc-800/70'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#717784] dark:text-zinc-400'}`} />
                      <span>{item.name}</span>
                      
                      {/* Count Badge (e.g. Pending verifications) */}
                      {typeof item.countBadge === 'number' && item.countBadge > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none ${
                          isActive 
                            ? 'bg-rose-500 text-white' 
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                        }`}>
                          {item.countBadge}
                        </span>
                      )}

                      {/* Super Admin Badge for Directory */}
                      {item.badge && !isActive && (
                        <span className="hidden xl:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Right Status Badge */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 pl-2 border-l border-[#e6e8ec] dark:border-zinc-800">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isSuperAdmin
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-[#0f2f63] dark:text-[#38BDF8]'
            }`}>
              {isSuperAdmin ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Super Admin Authority</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                  <span>Admin Operations</span>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
