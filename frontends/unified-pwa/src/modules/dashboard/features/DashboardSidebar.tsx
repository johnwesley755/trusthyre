import React from 'react';
import { useAuth, useUser } from '../../../providers/AuthContext';
import trustHyreLightLogo from '../../../assets/TrustHyre Logo with Skills Tagline.png';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationCenter } from '../features/notifications/NotificationCenter';
import { UserAvatar } from '../../../components/common/UserAvatar';

interface DashboardSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isEmployer = user?.role === 'EMPLOYER';

  const employerMenuItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { name: 'Search Workers', icon: 'person_search', path: '/find-workers' },
    { name: 'Post a Job', icon: 'add_circle', path: '/post-job' },
    { name: 'My Active Jobs', icon: 'work', path: '/jobs' },
    { name: 'Profile', icon: 'person', path: '/profile' },
  ];

  const workerMenuItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { name: 'Find Jobs', icon: 'search', path: '/search' },
    { name: 'Applied Jobs', icon: 'work_history', path: '/applied-jobs' },
    { name: 'Activity Tracker', icon: 'monitoring', path: '/tracker' },
    { name: 'Profile', icon: 'person', path: '/profile' },
  ];

  const menuItems = isEmployer ? employerMenuItems : workerMenuItems;

  const secondaryItems = [
    { name: 'Notifications', icon: 'notifications', path: '/notifications' },
    { name: 'Settings', icon: 'settings', path: '/settings' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-60 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-60 md:w-68 bg-[#0A1931] p-4 gap-1.5 shrink-0 z-70 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:flex flex-col overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`}
      >
        {/* Logo Section */}
        <div
          className="mb-4 px-2 flex justify-between items-center cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="flex flex-col group py-1">
            <img 
              src={trustHyreLightLogo} 
              alt="TrustHyre" 
              className="h-9 w-auto object-contain block select-none drop-shadow-md group-hover:scale-105 transition-transform origin-left" 
            />
            <p className="text-[9px] font-bold text-[#FACD15] uppercase tracking-wider mt-1.5 pl-0.5">
              {isEmployer ? 'Employer Portal' : 'Worker Portal'}
            </p>
          </div>
          <button onClick={onClose} className="md:hidden text-white/50 hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Profile Card in Sidebar */}
        <div className="mb-3 px-3 py-2 bg-white/5 rounded-xl flex items-center gap-2.5 border border-white/5">
          <UserAvatar
            src={user?.profileImageUrl}
            name={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
            size="sm"
          />
          <div className="flex flex-col truncate flex-1 min-w-0">
            <span className="text-xs font-black text-white truncate leading-tight">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
            </span>
            <span className="text-[8px] text-[#FACD15] font-bold uppercase tracking-wider">
              {isEmployer ? 'Verified Employer' : 'Specialist Worker'}
            </span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-[#0066FF] text-white font-black shadow-md shadow-[#0066FF]/20'
                    : 'text-white/70 hover:bg-white/5 hover:text-white font-bold'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0", fontSize: '18px' }}
                >
                  {item.icon}
                </span>
                <span className="text-xs tracking-tight">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Secondary & Actions */}
        <div className="mt-auto flex flex-col gap-0.5 pt-3 border-t border-white/10 shrink-0">
          {secondaryItems.map((item) => (
            <button
              key={item.name}
              onClick={() => handleNavigate(item.path)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-white/60 hover:text-white transition-all text-left text-[11px] font-bold"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {item.icon}
              </span>
              <span>{item.name}</span>
            </button>
          ))}

          <button
            onClick={logout}
            className="flex items-center gap-2.5 px-3 py-1.5 text-red-300/70 hover:text-red-300 transition-all text-left text-[11px] font-bold"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              logout
            </span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export const MobileNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const navigate = useNavigate();

  return (
    <header className="md:hidden fixed top-0 w-full z-40 bg-[#F8FAFC] dark:bg-[#121215]/90 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.05)] border-b border-[#e2e8f0]">
      <div className="flex justify-between items-center px-6 py-4 w-full">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="active:scale-95 duration-200 transition-transform w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-[#0A1931] dark:text-white text-2xl">menu</span>
          </button>
          <h1
            className="text-xl font-black tracking-tight text-[#0A1931] dark:text-white cursor-pointer"
            onClick={() => navigate('/')}
          >
            TrustHyre
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationCenter />
        </div>
      </div>
    </header>
  );
};
