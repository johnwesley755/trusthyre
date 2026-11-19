import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserAvatar } from '../components/common/UserAvatar';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useTranslation, SUPPORTED_LANGUAGES } from '../providers/TranslationContext';
import {
  User,
  Settings,
  LogOut,
  Bookmark,
  Briefcase,
  Activity,
  CheckCircle2,
  LayoutDashboard,
  FileText,
  Users,
  Bell,
  Globe,
  BookOpen,
  Building2,
  BarChart3,
  Clock,
  Mail,
  MessageSquare,
  PlusCircle,
  X,
} from 'lucide-react';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  displayName: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEmployer: boolean;
  isWorker: boolean;
  unreadCount: number;
  conversationUnreadCount: number;
  handleLogout: () => Promise<void>;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isOpen,
  onClose,
  user,
  displayName,
  isSuperAdmin,
  isAdmin,
  isEmployer,
  isWorker,
  unreadCount,
  conversationUnreadCount,
  handleLogout,
}) => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  const roleBadge = (
    <span
      className={`inline-block mt-1 px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider border ${
        isSuperAdmin
          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800'
          : isAdmin
          ? 'bg-blue-50 dark:bg-blue-950/60 text-[#0f2f63] dark:text-[#38BDF8] border-blue-200 dark:border-blue-800'
          : isEmployer
          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
          : 'bg-[#e6eefc] dark:bg-blue-950/40 text-[#0f2f63] dark:text-[#38BDF8] border-blue-100 dark:border-blue-900'
      }`}
    >
      {isSuperAdmin
        ? 'Super Admin'
        : isAdmin
        ? 'Admin'
        : isEmployer
        ? t('Verified Employer', 'Verified Employer')
        : t('Specialist Candidate', 'Specialist Candidate')}
    </span>
  );

  const languageSelector = (
    <div className="p-3 border-b border-[#e6e8ec] dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/70">
      <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
        <Globe className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
        <span>Language / மொழி / भाषा</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`py-1 px-1 rounded-lg text-center text-[11px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800'
              }`}
            >
              <span className="truncate block">{lang.native}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const navigationLinks = (
    <div className="py-1">
      {/* SUPER ADMIN & ADMIN LINKS */}
      {isAdmin && (
        <>
          <button
            onClick={() => handleNavigate('/admin/dashboard')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <LayoutDashboard className="w-4 h-4 text-[#717784]" />
            <span>{isSuperAdmin ? 'Super Admin Command Center' : 'Admin Operations Hub'}</span>
          </button>
          <button
            onClick={() => handleNavigate('/admin/analytics')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <BarChart3 className="w-4 h-4 text-[#717784]" />
            <span>Visitor Analytics</span>
          </button>
          <button
            onClick={() => handleNavigate('/admin/blog')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <BookOpen className="w-4 h-4 text-[#717784]" />
            <span>Blog & SEO Manager</span>
          </button>
          <button
            onClick={() => handleNavigate('/admin/email-templates')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Mail className="w-4 h-4 text-[#717784]" />
            <span>Email Templates</span>
          </button>
          <button
            onClick={() => handleNavigate('/admin/leads')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Building2 className="w-4 h-4 text-[#717784]" />
            <span>Hiring Companies</span>
          </button>
          <button
            onClick={() => handleNavigate('/admin/verifications')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <CheckCircle2 className="w-4 h-4 text-[#717784]" />
            <span>Identity Verifications</span>
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => handleNavigate('/admin/users')}
              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
            >
              <Users className="w-4 h-4 text-[#717784]" />
              <span>User Directory</span>
            </button>
          )}
          <button
            onClick={() => handleNavigate('/admin/jobs')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Briefcase className="w-4 h-4 text-[#717784]" />
            <span>Job Moderation</span>
          </button>
        </>
      )}

      {/* EMPLOYER LINKS */}
      {isEmployer && (
        <>
          <button
            onClick={() => handleNavigate('/profile')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <User className="w-4 h-4 text-[#717784]" />
            <span>{t('Company Profile')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/dashboard')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <LayoutDashboard className="w-4 h-4 text-[#717784]" />
            <span>{t('Employer Dashboard')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/find-workers')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Users className="w-4 h-4 text-[#717784]" />
            <span>{t('Find Workers')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/post-job')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <PlusCircle className="w-4 h-4 text-[#717784]" />
            <span>{t('Post a Job')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/jobs')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Briefcase className="w-4 h-4 text-[#717784]" />
            <span>{t('Active Jobs & Applicants')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/work-orders')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <FileText className="w-4 h-4 text-[#717784]" />
            <span>{t('Digital Work Orders')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/attendance')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Clock className="w-4 h-4 text-[#717784]" />
            <span>{t('Shift Attendance')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/saved-profiles')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Bookmark className="w-4 h-4 text-[#717784]" />
            <span>{t('Saved Talent Profiles')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/blog')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <BookOpen className="w-4 h-4 text-[#717784]" />
            <span>{t('Hiring Guides & Blog')}</span>
          </button>
        </>
      )}

      {/* WORKER / CANDIDATE LINKS */}
      {isWorker && (
        <>
          <button
            onClick={() => handleNavigate('/dashboard')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <LayoutDashboard className="w-4 h-4 text-[#717784]" />
            <span>{t('Candidate Dashboard')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/profile')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <User className="w-4 h-4 text-[#717784]" />
            <span>{t('My Profile & CV')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/search')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Briefcase className="w-4 h-4 text-[#717784]" />
            <span>{t('Find Jobs')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/work-orders')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <FileText className="w-4 h-4 text-[#717784]" />
            <span>{t('Digital Work Orders')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/attendance')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Clock className="w-4 h-4 text-[#717784]" />
            <span>{t('Today Shift & Attendance')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/applied-jobs')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <CheckCircle2 className="w-4 h-4 text-[#717784]" />
            <span>{t('Applied Jobs')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/saved-jobs')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Bookmark className="w-4 h-4 text-[#717784]" />
            <span>{t('Saved Jobs')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/tracker')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <Activity className="w-4 h-4 text-[#717784]" />
            <span>{t('Activity Tracker')}</span>
          </button>
          <button
            onClick={() => handleNavigate('/blog')}
            className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
          >
            <BookOpen className="w-4 h-4 text-[#717784]" />
            <span>{t('Career Guides & Blog')}</span>
          </button>
        </>
      )}

      {/* COMMON LINKS: MESSAGES, NOTIFICATIONS & SETTINGS */}
      <button
        onClick={() => handleNavigate('/messages')}
        className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center justify-between transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-4 h-4 text-[#717784]" />
          <span>{t('Messages')}</span>
        </div>
        {conversationUnreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
            {conversationUnreadCount}
          </span>
        )}
      </button>

      <button
        onClick={() => handleNavigate('/notifications')}
        className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center justify-between transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-[#717784]" />
          <span>{t('Notifications')}</span>
        </div>
        {unreadCount > 0 && (
          <span className="px-1.5 py-0.5 bg-blue-50 text-[#0f2f63] text-[10px] font-bold rounded-full border border-blue-200">
            {unreadCount}
          </span>
        )}
      </button>

      <button
        onClick={() => handleNavigate('/settings')}
        className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 flex items-center gap-3 transition-colors cursor-pointer text-left"
      >
        <Settings className="w-4 h-4 text-[#717784]" />
        <span>{t('Account Settings')}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Popover Dropdown (hidden on mobile) */}
      <div className="hidden md:block">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.25rem)] bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-2xl border border-[#e6e8ec] dark:border-zinc-800 py-2 text-[#0a0a0a] dark:text-zinc-100 z-50 font-['Onest',system-ui,sans-serif] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain touch-pan-y"
            >
              {/* User Profile Card Header */}
              <div className="px-4 py-3 border-b border-[#e6e8ec] dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <UserAvatar src={user?.profileImageUrl} name={displayName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#0a0a0a] dark:text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-[#717784] dark:text-zinc-400 font-normal truncate">{user?.email}</p>
                    {roleBadge}
                  </div>
                </div>
              </div>

              {/* Language Switcher */}
              {languageSelector}

              {/* Navigation Links */}
              {navigationLinks}

              {/* Sign Out */}
              <div className="pt-1 border-t border-[#e6e8ec] dark:border-zinc-800">
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-3 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>{t('Sign Out')}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Mobile Full-Height Slide-Over Drawer with Backdrop (hidden on desktop) */}
      <div className="md:hidden">
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              {/* Backdrop Scrim */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />

              {/* Slide-in Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                className="relative w-[85vw] max-w-sm h-full bg-white dark:bg-[#0a0a0a] border-l border-[#e6e8ec] dark:border-zinc-800 shadow-2xl flex flex-col z-10 select-none font-['Onest',system-ui,sans-serif]"
              >
                {/* Fixed Drawer Header with User Card & Close Button */}
                <div className="px-4 py-3.5 border-b border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#0a0a0a]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar src={user?.profileImageUrl} name={displayName} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#0a0a0a] dark:text-white truncate">{displayName}</p>
                      <p className="text-[10px] text-[#717784] dark:text-zinc-400 truncate">{user?.email}</p>
                      {roleBadge}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer shrink-0 ml-2"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Drawer Body */}
                <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y py-1 text-[#0a0a0a] dark:text-zinc-100">
                  {/* Regional Language Quick-Switch Bar */}
                  {languageSelector}

                  {/* Mobile Theme Switcher Row */}
                  <div className="px-4 py-2.5 border-b border-[#e6e8ec] dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/70">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Theme Mode</span>
                    <ThemeToggle variant="pill" showLabel={true} />
                  </div>

                  {/* Role Navigation Items */}
                  {navigationLinks}
                </div>

                {/* Fixed Drawer Footer: Sign Out Button */}
                <div className="p-3 border-t border-[#e6e8ec] dark:border-zinc-800 shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/60 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>{t('Sign Out')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
