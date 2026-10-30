import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '../providers/AuthContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { NotificationCenter } from '../modules/dashboard/features/notifications/NotificationCenter';
import { NavbarSearchInput } from '../modules/search/components/NavbarSearchInput';
import { useAppNotifications } from '../hooks/useAppNotifications';
import trustHyreLogo from '../assets/TrustHyre Skills and Opportunities Logo.png';
import { 
  Upload, 
  PlusCircle, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bookmark,
  Search,
  Briefcase,
  Award,
  Activity,
  CheckCircle2,
  LayoutDashboard,
  FileText,
  Users,
  Bell,
  Globe,
  BookOpen,
  ShieldCheck,
  Building2,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, SUPPORTED_LANGUAGES } from '../providers/TranslationContext';

export const AppTopNavbar = () => {
  const { user } = useUser();
  const { logout } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useAppNotifications();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = Boolean(user);
  const isSuperAdmin = (user?.role as string) === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;
  const isEmployer = user?.role === 'EMPLOYER';
  const isWorker = !isAdmin && !isEmployer && Boolean(user);
  const logoDestination = isAdmin ? '/admin/dashboard' : isEmployer ? '/find-workers' : isWorker ? '/search' : '/';

  const guestNavLinks = [
    { name: 'Find Jobs', path: '/search', icon: Briefcase },
    { name: 'Find Workers', path: '/find-workers', icon: Users },
    { name: 'Blog & Guides', path: '/blog', icon: BookOpen },
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route navigation
  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout();
    navigate('/');
  };

  const displayName = user?.firstName 
    ? `${user.firstName} ${user.lastName || ''}`.trim() 
    : (user?.email?.split('@')[0] || 'My Account');

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-[#e6e8ec] shadow-xs text-[#0a0a0a] select-none font-['Onest',system-ui,sans-serif]">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4 overflow-visible">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-4 shrink-0">
          <Link to={logoDestination} className="flex items-center group py-1 shrink-0" aria-label="TrustHyre Home">
            <img 
              src={trustHyreLogo} 
              alt="TrustHyre" 
              className="h-9 sm:h-10 md:h-12 w-auto object-contain block select-none mix-blend-multiply group-hover:opacity-90 transition-opacity" 
            />
          </Link>
        </div>

        {/* Center: Search Bar Only */}
        <div className="hidden md:flex items-center flex-1 max-w-lg lg:max-w-xl mx-4 lg:mx-8">
          <NavbarSearchInput 
            className="w-full" 
            placeholder={
              isAdmin 
                ? "Search users, jobs, records..." 
                : isEmployer 
                ? "Search specialists, skills..." 
                : "Search jobs, roles, companies..."
            } 
          />
        </div>

        {/* Right Actions: CTA + Notifications + Profile Menu / Guest Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {isAdmin && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] shrink-0 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f2f63]">
                {isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          )}

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 rounded-full text-[#717784] hover:text-[#0a0a0a] bg-[#f4f4f4] hover:bg-[#e6e8ec] transition-colors cursor-pointer"
            aria-label="Toggle mobile search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Authenticated Controls */}
          {isAuthenticated ? (
            <>
              {/* Quick Primary CTA Action Button */}
              {isEmployer ? (
                <Link
                  to="/post-job"
                  className="hidden xl:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap h-9 leading-none"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Post a Job</span>
                </Link>
              ) : isWorker ? (
                <Link
                  to="/profile"
                  className="hidden xl:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0f2f63] border border-[#e6e8ec] text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap h-9 leading-none"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Upload Resume</span>
                </Link>
              ) : null}

              {/* Notification Center */}
              <div className="relative shrink-0">
                <NotificationCenter />
              </div>

              {/* User Profile Dropdown Pill */}
              <div className="relative shrink-0" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] border border-[#e6e8ec] transition-all cursor-pointer shrink-0 whitespace-nowrap h-9"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="User navigation menu"
                >
                  <UserAvatar
                    src={user?.profileImageUrl}
                    name={displayName}
                    size="sm"
                  />
                  <span className="hidden lg:block text-xs font-medium text-[#0a0a0a] max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#717784] shrink-0 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu Modal */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-[#e6e8ec] py-2 text-[#0a0a0a] z-50 font-['Onest',system-ui,sans-serif] max-h-[calc(100vh-5rem)] overflow-y-auto"
                    >
                      {/* User Profile Card Header */}
                      <div className="px-4 py-3 border-b border-[#e6e8ec]">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={user?.profileImageUrl}
                            name={displayName}
                            size="md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#0a0a0a] truncate">
                              {displayName}
                            </p>
                            <p className="text-[10px] text-[#717784] font-normal truncate">
                              {user?.email}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 bg-[#e6eefc] text-[#0f2f63] text-[9px] font-semibold rounded-full uppercase tracking-wider">
                              {isSuperAdmin
                                ? 'Super Admin'
                                : isAdmin
                                ? 'Admin'
                                : isEmployer
                                ? t('Verified Employer', 'Verified Employer')
                                : t('Specialist Candidate', 'Specialist Candidate')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Language Quick-Switch Bar inside Dropdown */}
                      <div className="p-3 border-b border-[#e6e8ec] bg-slate-50/70">
                        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <Globe className="w-3.5 h-3.5 text-[#0f2f63]" />
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
                                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                <span className="truncate block">{lang.native}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Menu Items strictly distinguished by Role */}
                      <div className="py-1">
                        {/* SUPER ADMIN & ADMIN LINKS */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/dashboard');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <LayoutDashboard className="w-4 h-4 text-[#717784]" />
                              <span>Admin Dashboard</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/analytics');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <BarChart3 className="w-4 h-4 text-[#717784]" />
                              <span>Visitor Analytics</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/blog');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <BookOpen className="w-4 h-4 text-[#717784]" />
                              <span>Blog & SEO Manager</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/leads');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Building2 className="w-4 h-4 text-[#717784]" />
                              <span>Hiring Companies</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/verifications');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#717784]" />
                              <span>Identity Verifications</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/users');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Users className="w-4 h-4 text-[#717784]" />
                              <span>User Directory</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/admin/jobs');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
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
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/profile');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <User className="w-4 h-4 text-[#717784]" />
                              <span>{t('Company Profile')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/dashboard');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <LayoutDashboard className="w-4 h-4 text-[#717784]" />
                              <span>{t('Employer Dashboard')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/find-workers');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Users className="w-4 h-4 text-[#717784]" />
                              <span>{t('Find Workers')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/post-job');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <PlusCircle className="w-4 h-4 text-[#717784]" />
                              <span>{t('Post a Job')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/jobs');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Briefcase className="w-4 h-4 text-[#717784]" />
                              <span>{t('Active Jobs & Applicants')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/saved-profiles');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Bookmark className="w-4 h-4 text-[#717784]" />
                              <span>{t('Saved Talent Profiles')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/blog');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
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
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/profile');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <User className="w-4 h-4 text-[#717784]" />
                              <span>{t('My Profile & CV')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/search');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Briefcase className="w-4 h-4 text-[#717784]" />
                              <span>{t('Find Jobs')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/applied-jobs');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <CheckCircle2 className="w-4 h-4 text-[#717784]" />
                              <span>{t('Applied Jobs')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/saved-jobs');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Bookmark className="w-4 h-4 text-[#717784]" />
                              <span>{t('Saved Jobs')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/tracker');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <Activity className="w-4 h-4 text-[#717784]" />
                              <span>{t('Activity Tracker')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                navigate('/blog');
                              }}
                              className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                            >
                              <BookOpen className="w-4 h-4 text-[#717784]" />
                              <span>{t('Career Guides & Blog')}</span>
                            </button>
                          </>
                        )}

                        {/* COMMON LINKS: NOTIFICATIONS & SETTINGS */}
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigate('/notifications');
                          }}
                          className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center justify-between transition-colors cursor-pointer text-left"
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
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            navigate('/settings');
                          }}
                          className="w-full px-4 py-2.5 text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] flex items-center gap-3 transition-colors cursor-pointer text-left"
                        >
                          <Settings className="w-4 h-4 text-[#717784]" />
                          <span>{t('Account Settings')}</span>
                        </button>
                      </div>

                      {/* Divider & Sign Out */}
                      <div className="pt-1 border-t border-[#e6e8ec]">
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>{t('Sign Out')}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* Guest / Unauthenticated Actions */
            <div className="flex items-center gap-2">
              <Link
                to="/sign-in"
                className="px-4 py-2 rounded-full text-xs font-medium text-[#0a0a0a] hover:bg-[#f4f4f4] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-medium uppercase shadow-xs transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button - Only for Guests */}
          {!isAuthenticated && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[#0a0a0a] hover:bg-[#f4f4f4] rounded-full border border-[#e6e8ec] cursor-pointer"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}

        </div>

      </div>

      {/* Expandable Mobile Search Row */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[#e6e8ec] px-4 py-2.5 bg-[#f4f4f4]"
          >
            <NavbarSearchInput 
              className="w-full bg-white" 
              placeholder={
                isAdmin 
                  ? "Search users, jobs, records..." 
                  : isEmployer 
                  ? "Search specialists, skills..." 
                  : "Search jobs, roles..."
              } 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer Menu - Only for Unauthenticated Guests */}
      <AnimatePresence>
        {!isAuthenticated && isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t border-[#e6e8ec] px-4 py-4 space-y-3 shadow-xl max-h-[calc(100vh-4.5rem)] overflow-y-auto"
          >
            {/* Mobile Regional Language Quick-Switch Bar */}
            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-[#0f2f63]" />
                <span>Language / மொழி / भाषा</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className={`py-1.5 px-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0f2f63] text-white shadow-2xs'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <div className="truncate text-[11px]">{lang.native}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guest Navigation Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#717784] px-3.5">
                Navigation
              </span>
              {guestNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive 
                        ? 'bg-[#0f2f63] text-white' 
                        : 'text-[#0a0a0a] hover:bg-[#f4f4f4]'
                    }`}
                  >
                    {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#717784]'}`} />}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Guest Action Buttons */}
            <div className="pt-3 border-t border-[#e6e8ec] flex flex-col gap-2">
              <Link
                to="/sign-in"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] border border-[#e6e8ec] rounded-full text-xs font-medium uppercase text-center"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-medium uppercase text-center shadow-xs"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};


