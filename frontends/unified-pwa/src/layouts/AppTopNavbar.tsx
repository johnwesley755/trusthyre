import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useUser } from '../providers/AuthContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { NotificationCenter } from '../modules/dashboard/features/notifications/NotificationCenter';
import { NavbarSearchInput } from '../modules/search/components/NavbarSearchInput';
import { useAppNotifications } from '../hooks/useAppNotifications';
import trustHyreLogoLight from '../assets/TrustHyre Skills and Opportunities Logo.png';
import trustHyreLogoDark from '../assets/TrustHyre Logo with Skills Tagline.png';
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
  BarChart3,
  Clock,
  Mail,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, SUPPORTED_LANGUAGES } from '../providers/TranslationContext';
import { useTheme } from '../providers/ThemeContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useConversationUnreadCount } from '../services/conversation.service';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ProfileMenu } from './ProfileMenu';

export const AppTopNavbar = () => {
  const { user } = useUser();
  const { logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { unreadCount } = useAppNotifications();
  const { data: conversationUnreadCount = 0 } = useConversationUnreadCount(Boolean(user));

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Lock background scroll ONLY when mobile menu drawer is open or mobile screen profile drawer is open
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  useBodyScrollLock(isMobileMenuOpen || (isProfileMenuOpen && isMobileViewport));

  const isAuthenticated = Boolean(user);
  const isSuperAdmin = (user?.role as string) === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'admin@trusthyre.com';
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
    <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-[#e6e8ec] dark:border-zinc-800 shadow-xs text-[#0a0a0a] dark:text-white select-none font-['Onest',system-ui,sans-serif] transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2 sm:gap-4 overflow-visible">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link to={logoDestination} className="flex items-center group py-1 shrink-0" aria-label="TrustHyre Home">
            {/* Dynamic theme-aware logo */}
            <img 
              src={isDark ? trustHyreLogoDark : trustHyreLogoLight} 
              alt="TrustHyre" 
              className="h-10 sm:h-11 md:h-12 w-auto object-contain select-none group-hover:opacity-90 transition-opacity" 
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

        {/* Right Actions: CTA + Notifications + ThemeToggle + Profile Menu / Guest Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {isAdmin && (
            <div className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full border shrink-0 mr-1 text-xs font-semibold ${
              isSuperAdmin 
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300' 
                : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-[#0f2f63] dark:text-[#38BDF8]'
            }`}>
              <span>{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
            </div>
          )}

          {/* Theme Mode Toggle (Pill) - Desktop & Tablet */}
          <div className="hidden md:inline-flex shrink-0">
            <ThemeToggle variant="pill" className="shrink-0" />
          </div>

          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 rounded-full text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white bg-[#f4f4f4] dark:bg-zinc-900 hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
                  className="hidden xl:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#0f2f63] dark:bg-[#0066FF] hover:bg-[#2563c9] dark:hover:bg-[#0052cc] text-white text-xs font-semibold uppercase tracking-wider shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap h-9 leading-none"
                >
                  <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Post a Job</span>
                </Link>
              ) : isWorker ? (
                <Link
                  to="/profile"
                  className="hidden xl:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f4f4f4] dark:bg-zinc-900 hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 text-[#0f2f63] dark:text-[#38BDF8] border border-[#e6e8ec] dark:border-zinc-800 text-xs font-semibold transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap h-9 leading-none"
                >
                  {/* <Upload className="w-3.5 h-3.5 shrink-0" /> */}
                  <span className="whitespace-nowrap">View Profile</span>
                </Link>
              ) : null}

              {/* Messages Center Button */}
              <Link
                to="/messages"
                className="relative p-2 rounded-full text-[#717784] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white bg-[#f4f4f4] dark:bg-zinc-900 hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                aria-label="Messages"
                title="Messages"
              >
                <MessageSquare className="w-4 h-4" />
                {conversationUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-black">
                    {conversationUnreadCount > 99 ? '99+' : conversationUnreadCount}
                  </span>
                )}
              </Link>

              {/* Notification Center */}
              <div className="relative shrink-0">
                <NotificationCenter />
              </div>

              {/* User Profile Dropdown Pill */}
              <div className="relative shrink-0" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full bg-[#f4f4f4] dark:bg-zinc-900 hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 border border-[#e6e8ec] dark:border-zinc-800 transition-all cursor-pointer shrink-0 whitespace-nowrap h-9"
                  aria-expanded={isProfileMenuOpen}
                  aria-label="User navigation menu"
                >
                  <UserAvatar
                    src={user?.profileImageUrl}
                    name={displayName}
                    size="sm"
                  />
                  <span className="hidden lg:block text-xs font-medium text-[#0a0a0a] dark:text-white max-w-[100px] truncate">
                    {displayName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#717784] dark:text-zinc-400 shrink-0 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Menu (Desktop Popover + Mobile Slide-Over Drawer) */}
                <ProfileMenu
                  isOpen={isProfileMenuOpen}
                  onClose={() => setIsProfileMenuOpen(false)}
                  user={user}
                  displayName={displayName}
                  isSuperAdmin={isSuperAdmin}
                  isAdmin={isAdmin}
                  isEmployer={isEmployer}
                  isWorker={isWorker}
                  unreadCount={unreadCount}
                  conversationUnreadCount={conversationUnreadCount}
                  handleLogout={handleLogout}
                />
              </div>
            </>
          ) : (
            /* Guest / Unauthenticated Actions */
            <div className="flex items-center gap-2">
              <Link
                to="/sign-in"
                className="px-4 py-2 rounded-full text-xs font-medium text-[#0a0a0a] dark:text-white hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 border border-transparent dark:border-zinc-800 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-4 py-2 rounded-full bg-[#0f2f63] dark:bg-[#2563EB] hover:bg-[#2563c9] dark:hover:bg-[#1D4ED8] text-white text-xs font-medium uppercase shadow-xs transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button - Only for Guests */}
          {!isAuthenticated && (
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-[#0a0a0a] dark:text-white hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 rounded-full border border-[#e6e8ec] dark:border-zinc-800 cursor-pointer"
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
            className="md:hidden border-t border-[#e6e8ec] dark:border-zinc-800 px-4 py-2.5 bg-[#f4f4f4] dark:bg-[#121215]"
          >
            <NavbarSearchInput 
              className="w-full bg-white dark:bg-[#1C1C21]" 
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
            className="lg:hidden bg-white dark:bg-[#0a0a0a] border-t border-[#e6e8ec] dark:border-zinc-800 px-4 py-4 space-y-3 shadow-xl max-h-[calc(100vh-4.5rem)] overflow-y-auto overscroll-contain touch-pan-y"
          >
            {/* Mobile Regional Language Quick-Switch Bar */}
            <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-1.5">
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-[#0f2f63] dark:text-[#38BDF8]" />
                <span>Language / மொழி / भाषा</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                          : 'bg-white dark:bg-black hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="truncate text-[11px]">{lang.native}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Theme Switcher Row */}
            <div className="p-2.5 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Theme Mode</span>
              <ThemeToggle variant="pill" showLabel={true} />
            </div>

            {/* Guest Navigation Links */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#717784] dark:text-zinc-400 px-3.5">
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
                        : 'text-[#0a0a0a] dark:text-zinc-200 hover:bg-[#f4f4f4] dark:hover:bg-zinc-900'
                    }`}
                  >
                    {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#717784] dark:text-zinc-400'}`} />}
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Guest Action Buttons */}
            <div className="pt-3 border-t border-[#e6e8ec] dark:border-zinc-800 flex flex-col gap-2">
              <Link
                to="/sign-in"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full py-2.5 px-4 bg-[#f4f4f4] dark:bg-zinc-900 hover:bg-[#e6e8ec] dark:hover:bg-zinc-800 text-[#0a0a0a] dark:text-white border border-[#e6e8ec] dark:border-zinc-800 rounded-full text-xs font-medium uppercase text-center"
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


