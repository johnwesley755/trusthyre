import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/apiClient';
import { useAuth } from '../../../providers/AuthContext';
import { queryKeys } from '../../../lib/queryKeys';
import { notificationService } from '../../../services/notification.service';
import { useTranslation } from '../../../providers/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  ArrowUpRight, 
  Loader2,
  Mail, 
  Smartphone, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Briefcase, 
  Zap, 
  Check, 
  BellRing, 
  Send, 
  ExternalLink, 
  Lock, 
  Eye, 
  EyeOff, 
  Globe, 
  ArrowLeft, 
  KeyRound, 
  FileText, 
  Save, 
  CheckCheck,
  RefreshCw,
  LogOut,
  ChevronRight,
  Sparkles,
  Sliders,
  Laptop,
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { fcmService } from '../../../services/fcm.service';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { AppLoader } from '../../../components/common/AppLoader';

interface UserSettings {
  email_notifications?: boolean;
  emailNotifications?: boolean;
  push_notifications?: boolean;
  pushNotifications?: boolean;
  marketing_emails?: boolean;
  marketingEmails?: boolean;
  language?: string;
}

type SettingsTab = 'account' | 'security' | 'notifications' | 'preferences';

export const SettingsPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { language: activeLanguage, setLanguage: setAppLanguage, t } = useTranslation();

  const isEmployer = user?.role === 'EMPLOYER';

  // Synchronize Tab with URL query param ?tab=
  const validTabs: SettingsTab[] = ['account', 'security', 'notifications', 'preferences'];
  const tabFromUrl = searchParams.get('tab') as SettingsTab;
  const initialTab: SettingsTab = validTabs.includes(tabFromUrl) ? tabFromUrl : 'account';

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    fullName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
    companyName: user?.companyName || '',
    industry: '',
    companyWebsite: '',
    phoneNumber: user?.phoneNumber || '',
    location: user?.location || '',
    city: '',
    address: '',
    bio: '',
    hourlyRate: '',
    experienceYears: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Sync state when URL param updates
  useEffect(() => {
    const currentTab = searchParams.get('tab') as SettingsTab;
    if (validTabs.includes(currentTab) && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (tab === 'account') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tab');
      setSearchParams(nextParams);
    } else {
      setSearchParams({ tab });
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // 1. Settings Query
  const { data: settings, isLoading: isSettingsLoading } = useQuery<UserSettings>({
    queryKey: queryKeys.settings.user,
    queryFn: async () => {
      const response = await apiClient.get('/api/settings');
      return response.data;
    }
  });

  // 2. Profile Details Query
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: isEmployer ? queryKeys.employer.profile : ['worker', 'profile', user?.id],
    queryFn: async () => {
      try {
        const endpoint = isEmployer ? '/api/employer/profile' : '/api/worker/profile';
        const res = await apiClient.get(endpoint);
        return res.data;
      } catch (e) {
        return null;
      }
    },
    enabled: !!user?.id
  });

  // 3. Unread Notifications Count Query (fetched on mount/invalidation, no polling)
  const { data: unreadNotificationsCount = 0 } = useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationService.getUnreadCount(),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Populate profile form when user or profile data is fetched
  useEffect(() => {
    if (profileData || user) {
      setProfileForm(prev => ({
        ...prev,
        fullName: profileData?.fullName || profileData?.full_name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : prev.fullName),
        companyName: profileData?.companyName || profileData?.company_name || user?.companyName || prev.companyName,
        industry: profileData?.industry || prev.industry || '',
        companyWebsite: profileData?.companyWebsite || profileData?.company_website || prev.companyWebsite || '',
        phoneNumber: profileData?.phoneNumber || profileData?.phone_number || user?.phoneNumber || prev.phoneNumber,
        location: profileData?.location || user?.location || prev.location,
        city: profileData?.city || prev.city || '',
        address: profileData?.address || prev.address || '',
        bio: profileData?.bio || profileData?.profileBio || profileData?.profile_bio || prev.bio || '',
        hourlyRate: profileData?.hourlyRate ? String(profileData.hourlyRate) : prev.hourlyRate,
        experienceYears: profileData?.experienceYears ? String(profileData.experienceYears) : prev.experienceYears
      }));
    }
  }, [profileData, user]);

  // Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      const newSettings = { ...settings, ...updates };
      const response = await apiClient.put('/api/settings', newSettings);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.user, data);
      showFeedback('success', 'Preferences updated successfully');
    },
    onError: (err: any) => {
      showFeedback('error', err?.response?.data?.message || err.message || 'Failed to update preferences');
    }
  });

  // Toggle Switch Handler
  const handleToggle = async (key: string, currentValue: boolean) => {
    const nextValue = !currentValue;

    if (key === 'push_notifications' || key === 'pushNotifications') {
      if (nextValue) {
        const result = await fcmService.requestPushPermissionAndRegister(user?.id, true);
        if (result.status === 'denied') {
          showFeedback('error', 'Push permission was denied in your browser settings. Please enable notifications in your browser.');
          return;
        } else if (result.status === 'unsupported') {
          showFeedback('error', 'Web Push notifications are not supported on this device/browser.');
          return;
        }
        showFeedback('success', 'Push alerts successfully activated on this device.');
      } else {
        await fcmService.unregisterPushToken();
        showFeedback('success', 'Push alerts deactivated for this device.');
      }
    }

    updateSettingsMutation.mutate({ [key]: nextValue });
  };

  // Diagnostic Test Push Dispatch
  const handleSendTestPush = async () => {
    try {
      setTestingPush(true);
      const perm = await fcmService.requestPushPermissionAndRegister(user?.id, true);
      if (perm.status === 'denied') {
        showFeedback('error', 'Push permission is blocked in your browser settings. Please allow notifications to receive alerts.');
        return;
      }

      const response = await apiClient.post('/api/notifications/test-push');
      // If the request completed without throwing, it was dispatched successfully
      if (response.status === 200 || response.data) {
        showFeedback('success', 'Test push notification dispatched! Check your desktop/mobile notifications.');
      } else {
        showFeedback('error', 'Failed to dispatch test push.');
      }
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || err.message || 'Error dispatching test push');
    } finally {
      setTestingPush(false);
    }
  };

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const endpoint = isEmployer ? '/api/employer/profile' : '/api/worker/profile';
      
      const payload = isEmployer ? {
        companyName: profileForm.companyName,
        industry: profileForm.industry,
        companyWebsite: profileForm.companyWebsite,
        phone_number: profileForm.phoneNumber,
        phoneNumber: profileForm.phoneNumber,
        location: profileForm.location,
        city: profileForm.city,
        address: profileForm.address,
        profileBio: profileForm.bio,
        profile_bio: profileForm.bio
      } : {
        fullName: profileForm.fullName,
        phone_number: profileForm.phoneNumber,
        phoneNumber: profileForm.phoneNumber,
        location: profileForm.location,
        city: profileForm.city,
        bio: profileForm.bio,
        hourlyRate: profileForm.hourlyRate ? parseFloat(profileForm.hourlyRate) : undefined,
        experienceYears: profileForm.experienceYears ? parseInt(profileForm.experienceYears, 10) : undefined
      };

      await apiClient.put(endpoint, payload);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: isEmployer ? queryKeys.employer.profile : ['worker', 'profile'] });

      // Update AuthContext user metadata
      const nameParts = profileForm.fullName.split(' ');
      updateUser({
        firstName: nameParts[0] || user?.firstName,
        lastName: nameParts.slice(1).join(' ') || user?.lastName,
        companyName: profileForm.companyName || user?.companyName,
        phoneNumber: profileForm.phoneNumber || user?.phoneNumber,
        location: profileForm.location || user?.location
      });

      showFeedback('success', 'Profile information updated and saved successfully.');
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || err.message || 'Failed to update profile information');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.oldPassword) {
      showFeedback('error', 'Please enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showFeedback('error', 'New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback('error', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await apiClient.post('/api/settings/password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });

      // When the endpoint succeeds, res.data or res.status indicates success
      if (res.status === 200 || res.data === 'success' || res.data?.success) {
        showFeedback('success', 'Password updated successfully! Your account credentials are secured.');
        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showFeedback('error', res.data?.message || 'Failed to update password.');
      }
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || err.message || 'Incorrect old password or password change failed.');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    const p = passwordForm.newPassword;
    if (!p) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-[#2563c9]' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 15, label: 'Very Weak', color: 'bg-rose-500' };
    }
  }, [passwordForm.newPassword]);

  // Profile Completion Percentage
  const profileStrength = useMemo(() => {
    let completed = 0;
    const total = 5;
    if (isEmployer) {
      if (profileForm.companyName) completed++;
      if (profileForm.phoneNumber) completed++;
      if (profileForm.location) completed++;
      if (profileForm.bio) completed++;
      if (profileForm.companyWebsite || profileForm.industry) completed++;
    } else {
      if (profileForm.fullName) completed++;
      if (profileForm.phoneNumber) completed++;
      if (profileForm.location) completed++;
      if (profileForm.bio) completed++;
      if (profileForm.hourlyRate || profileForm.experienceYears) completed++;
    }
    return Math.round((completed / total) * 100);
  }, [profileForm, isEmployer]);

  if (isSettingsLoading) {
    return <AppLoader variant="page" message="Loading Settings & Preferences..." />;
  }

  const emailNotifs = settings?.email_notifications ?? settings?.emailNotifications ?? true;
  const pushNotifs = settings?.push_notifications ?? settings?.pushNotifications ?? true;
  const marketingNotifs = settings?.marketing_emails ?? settings?.marketingEmails ?? false;
  const currentLanguage = activeLanguage || settings?.language || 'en';

  const tabItems = [
    { 
      id: 'account' as const, 
      label: isEmployer ? 'Company Profile' : 'Personal Profile', 
      subtitle: 'Contact info, bio, & public details',
      icon: isEmployer ? Building2 : User 
    },
    { 
      id: 'security' as const, 
      label: 'Security & Access', 
      subtitle: 'Password, sessions, & protection',
      icon: KeyRound 
    },
    { 
      id: 'notifications' as const, 
      label: 'Notifications & Alerts', 
      subtitle: 'Push delivery, emails, & testing',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined
    },
    { 
      id: 'preferences' as const, 
      label: 'Preferences & Regional', 
      subtitle: 'Language, currency, & legal',
      icon: Globe 
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 pt-6 px-4 sm:px-6 lg:px-8 font-['Onest',system-ui,sans-serif] text-[#0A1931]">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header & Breadcrumb Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Account Hub</span>
              <span>/</span>
              <span className="text-[#0f2f63] font-extrabold">{tabItems.find(t => t.id === activeTab)?.label}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A1931] tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-slate-500 font-medium text-xs sm:text-sm max-w-2xl leading-relaxed">
              Configure your profile identity, security credentials, real-time push alerts, and regional marketplace preferences.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/notifications')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95"
              title="Go to Notifications Inbox"
            >
              <Bell className="w-4 h-4 text-[#0f2f63]" />
              <span>Inbox</span>
              {unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                  {unreadNotificationsCount}
                </span>
              )}
              <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#0f2f63]/10 hover:bg-[#0f2f63]/15 text-[#0f2f63] border border-[#0f2f63]/20 text-xs font-semibold transition-all cursor-pointer active:scale-95"
            >
              <span>View Public Profile</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Feedback Alert Toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border shadow-xs transition-all ${
                feedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="flex-1">{feedback.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile / Tablet Horizontal Tab Navigation Bar */}
        <nav className="lg:hidden flex items-center p-1.5 bg-slate-200/70 rounded-full border border-slate-200 overflow-x-auto no-scrollbar [scrollbar-width:none] gap-1 sticky top-3 z-20 backdrop-blur-md shadow-xs">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex-1 justify-center ${
                  isActive
                    ? 'bg-white text-[#0f2f63] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0f2f63]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Desktop 2-Column Responsive Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">

          {/* Left Column (Desktop Navigation & Profile Summary Card) */}
          <aside className="hidden lg:block lg:col-span-4 space-y-6 sticky top-6">

            {/* Vertical Navigation Menu */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-2.5 space-y-1.5">
              {tabItems.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as SettingsTab)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition-all cursor-pointer group active:scale-[0.99] ${
                      isActive 
                        ? 'bg-[#0f2f63]/10 text-[#0f2f63] border border-[#0f2f63]/20 shadow-2xs' 
                        : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'bg-[#0f2f63] text-white shadow-2xs' : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-bold truncate ${isActive ? 'text-[#0f2f63]' : 'text-[#0A1931]'}`}>
                            {tab.label}
                          </p>
                          {tab.badge && (
                            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black">
                              {tab.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                          {tab.subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-[#0f2f63] translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Account Profile Card */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  src={user?.profileImageUrl}
                  name={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                  size="md"
                />
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-sm font-bold text-[#0A1931] truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.companyName || user?.email || 'Account User')}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1 uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                    <span className="text-[10px] font-bold text-[#0f2f63] uppercase tracking-wider">
                      {isEmployer ? 'Hiring Partner' : 'Specialist'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Strength Progress Meter */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Profile Completion</span>
                  <span className="text-[#0f2f63]">{profileStrength}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#2563c9] to-[#0f2f63] rounded-full transition-all duration-500"
                    style={{ width: `${profileStrength}%` }}
                  />
                </div>
              </div>

              {/* Account Status */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] font-medium">
                  Account Standing
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Active & Verified
                </span>
              </div>
            </div>

            {/* TrustHyre Support Help Box */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0A1931]">
                <HelpCircle className="w-4 h-4 text-[#0f2f63]" />
                <span>Need Assistance?</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                Have questions about billing, account verification, or enterprise accounts? Our team is available 24/7.
              </p>
              <div className="pt-1">
                <a
                  href="mailto:support@trusthyre.com"
                  className="text-xs font-bold text-[#0f2f63] hover:underline flex items-center gap-1"
                >
                  <span>support@trusthyre.com</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>

          </aside>

          {/* Right Column (Active Tab Content Views) */}
          <main className="lg:col-span-8 space-y-6">
            <AnimatePresence mode="wait">

              {/* TAB 1: ACCOUNT & PROFILE DETAILS */}
              {activeTab === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Hero Summary Banner */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <UserAvatar
                        src={user?.profileImageUrl}
                        name={user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                        size="lg"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg font-black text-[#0A1931] truncate">
                            {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.companyName || user?.email || 'Account User')}
                          </h2>
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-full border border-emerald-200 flex items-center gap-1 uppercase tracking-wider shrink-0">
                            <ShieldCheck className="w-3 h-3" /> Verified Partner
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#0f2f63] uppercase tracking-wide">
                            {isEmployer ? 'Verified Hiring Partner' : 'Certified Specialist'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => navigate('/profile')}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white font-medium text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <span>View Profile</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Profile Edit Form Card */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
                    {/* <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#0A1931]">
                          {isEmployer ? 'Company & Business Details' : 'Personal & Contact Details'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Update your official display name, operating location, and public bio.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f2f63] bg-[#0f2f63]/10 px-2.5 py-1 rounded-full border border-[#0f2f63]/20">
                        Live Sync
                      </span>
                    </div> */}

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {isEmployer ? (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization Name</label>
                            <div className="relative">
                              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={profileForm.companyName}
                                onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                                placeholder="e.g. Acme Logistics India"
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
                            <div className="relative">
                              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={profileForm.fullName}
                                onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                                placeholder="e.g. John Wesley"
                                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone Number</label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={profileForm.phoneNumber}
                              onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                              placeholder="+91 98765 43210"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Primary Operating City / Hub</label>
                          <div className="relative">
                            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={profileForm.location}
                              onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                              placeholder="e.g. Chennai, Tamil Nadu"
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Registered Account Email</label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              disabled
                              value={user?.email || ''}
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-medium text-slate-500 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Employer specific fields: Industry & Website */}
                      {isEmployer && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Business Industry / Sector</label>
                            <input
                              type="text"
                              value={profileForm.industry}
                              onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                              placeholder="e.g. Logistics & Warehousing"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Company Website</label>
                            <input
                              type="url"
                              value={profileForm.companyWebsite}
                              onChange={(e) => setProfileForm({ ...profileForm, companyWebsite: e.target.value })}
                              placeholder="https://example.com"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Worker specific fields: Rate & Experience */}
                      {!isEmployer && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Expected Rate (₹ / Day or Hr)</label>
                            <input
                              type="number"
                              value={profileForm.hourlyRate}
                              onChange={(e) => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                              placeholder="e.g. 800"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Years of Work Experience</label>
                            <input
                              type="number"
                              value={profileForm.experienceYears}
                              onChange={(e) => setProfileForm({ ...profileForm, experienceYears: e.target.value })}
                              placeholder="e.g. 4"
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Bio / Description */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            {isEmployer ? 'Company Overview & About' : 'Professional Summary & Bio'}
                          </label>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {profileForm.bio.length} / 500
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                          placeholder={isEmployer 
                            ? "Tell candidates about your company culture, scale, and work environment..." 
                            : "Share your top skills, past projects, punctuality, and specialties..."}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all"
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="submit"
                          disabled={isSavingProfile}
                          className="px-6 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-medium uppercase tracking-wider rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isSavingProfile ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Saving Changes...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              <span>Save Profile Changes</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Identity Verification & Compliance Banner */}
                  <div className="bg-white p-5 rounded-[2rem] border border-slate-200/90 shadow-xs flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#0f2f63]/10 border border-[#0f2f63]/20 flex items-center justify-center text-[#0f2f63] shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-[#0A1931]">{t('Identity Verification')}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          Verified Partner
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Your account is linked to verified business registration under TrustHyre compliance standards. To request updates to legal names or certificates, please contact compliance support.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: SECURITY & PASSWORD */}
              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Change Password Card */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
                    <div className="pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-[#0f2f63]/10 text-[#0f2f63] flex items-center justify-center border border-[#0f2f63]/20">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-[#0A1931]">Change Account Password</h2>
                          <p className="text-xs text-slate-500 font-medium">
                            Protect your credentials with a strong, multi-factor compliant password.
                          </p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                        <div className="relative">
                          <input
                            type={showOldPass ? 'text' : 'password'}
                            value={passwordForm.oldPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                            placeholder="Enter current password"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPass(!showOldPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="Minimum 8 characters"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Interactive Password Strength Meter */}
                        {passwordForm.newPassword && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-medium">Password Strength:</span>
                              <span className="font-bold text-[#0A1931]">{passwordStrength.label}</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                style={{ width: `${passwordStrength.score}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            placeholder="Re-enter your new password"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0A1931] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0f2f63]/20 focus:border-[#0f2f63] transition-all pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Password Requirements Checklist */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-[11px]">
                        <p className="font-bold text-slate-700 mb-1">Security Checklist:</p>
                        <div className="flex items-center gap-2 text-slate-600">
                          {passwordForm.newPassword.length >= 8 ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 shrink-0" />
                          )}
                          <span>At least 8 characters long</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          {/[0-9]/.test(passwordForm.newPassword) || /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 shrink-0" />
                          )}
                          <span>Contains numbers or special characters</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          {passwordForm.newPassword && passwordForm.newPassword === passwordForm.confirmPassword ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 shrink-0" />
                          )}
                          <span>Passwords match</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isChangingPass}
                          className="px-6 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-medium uppercase tracking-wider rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {isChangingPass ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4" />
                              <span>Update Password</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Session Security & Login Activity */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#0A1931]">Active Session Security</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Account protected by JWT tokens and 256-bit encryption.
                        </p>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Active Session
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Current Device:</span>
                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                          <Laptop className="w-3.5 h-3.5 text-slate-400" />
                          Web Browser (Current)
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Authentication Type:</span>
                        <span className="font-bold text-slate-700 text-[11px]">
                          Password / SMS OTP Verified
                        </span>
                      </div>
                    </div>

                    {/* Session Sign Out Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-medium">
                        Need to log out from this browser?
                      </p>
                      <button
                        type="button"
                        onClick={logout}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        <span>Sign Out of Device</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: NOTIFICATIONS & PUSH */}
              {activeTab === 'notifications' && (
                <motion.div
                  key="notifications"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Notification Channels Card */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
                    <div className="pb-4 border-b border-slate-100">
                      <h2 className="text-base font-bold text-[#0A1931]">Notification Channels & Delivery</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Customize how and when you receive critical alerts regarding jobs, applications, and messages.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Web Push Alerts */}
                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 flex items-center justify-center text-[#0f2f63] shrink-0 mt-0.5 shadow-2xs">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-[#0A1931]">Real-time Browser & Push Alerts</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                pushNotifs ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {pushNotifs ? 'Active' : 'Off'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Instant notifications when a job offer arrives, an application status changes, or an employer contacts you.
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => handleToggle('push_notifications', pushNotifs)}
                          disabled={updateSettingsMutation.isPending}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                            pushNotifs ? 'bg-[#0f2f63]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                              pushNotifs ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Email Notifications */}
                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 flex items-center justify-center text-[#0f2f63] shrink-0 mt-0.5 shadow-2xs">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-[#0A1931]">Email Summaries & Updates</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                emailNotifs ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {emailNotifs ? 'Active' : 'Off'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Receive daily job digests, interview notifications, and application status summaries.
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => handleToggle('email_notifications', emailNotifs)}
                          disabled={updateSettingsMutation.isPending}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                            emailNotifs ? 'bg-[#0f2f63]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                              emailNotifs ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Market & Intelligence Updates */}
                      <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-xl bg-[#0f2f63]/10 border border-[#0f2f63]/15 flex items-center justify-center text-[#0f2f63] shrink-0 mt-0.5 shadow-2xs">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-[#0A1931]">Market Rates & Hiring Intel</h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                marketingNotifs ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {marketingNotifs ? 'Active' : 'Off'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Weekly market rate reports, local employer demand trends, and feature announcements.
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => handleToggle('marketing_emails', marketingNotifs)}
                          disabled={updateSettingsMutation.isPending}
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                            marketingNotifs ? 'bg-[#0f2f63]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                              marketingNotifs ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Push Diagnostic & Testing Box */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-[#0f2f63]/10 border border-[#0f2f63]/20 flex items-center justify-center text-[#0f2f63] shrink-0 mt-0.5 shadow-2xs">
                          <BellRing className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-[#0A1931]">FCM Push Diagnostic & Live Test</h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Verify browser push delivery, TrustHyre logo branding, and click-to-inbox routing.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/notifications')}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span>Open Inbox</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSendTestPush}
                          disabled={testingPush}
                          className="px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-white bg-[#0f2f63] hover:bg-[#2563c9] disabled:opacity-50 rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                          {testingPush ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Dispatching...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send Test Push</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Browser Permission:</span>
                        <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Device Token Sync:</span>
                        <span className="font-bold text-slate-700 text-[11px]">
                          {pushNotifs ? 'Active & Auto-Synced' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                      💡 Tip: Clicking "Send Test Push" triggers an instant message from the backend notification dispatcher directly to your registered browser device token. When clicked, it routes immediately to your Notifications Inbox.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: PREFERENCES & REGIONAL */}
              {activeTab === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Language Selector Card */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-[#0A1931]">Language & Regional Localization</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        Choose your primary display language for job posts, messages, and platform notifications.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { code: 'en', name: 'English', native: 'English', region: 'India / Global' },
                        { code: 'hi', name: 'Hindi', native: 'हिन्दी', region: 'North / Central India' },
                        { code: 'ta', name: 'Tamil', native: 'தமிழ்', region: 'Tamil Nadu & Puducherry' },
                        { code: 'te', name: 'Telugu', native: 'తెలుగు', region: 'Andhra Pradesh & Telangana' }
                      ].map((lang) => {
                        const isSelected = currentLanguage === lang.code;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => {
                              setAppLanguage(lang.code as any);
                              updateSettingsMutation.mutate({ language: lang.code });
                            }}
                            className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                              isSelected
                                ? 'bg-[#0f2f63]/5 border-[#0f2f63] shadow-2xs ring-1 ring-[#0f2f63]'
                                : 'bg-slate-50/50 hover:bg-slate-100/60 border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5" translate="no">
                              <p className={`text-xs font-bold ${isSelected ? 'text-[#0f2f63]' : 'text-[#0A1931]'}`}>
                                {lang.name}
                              </p>
                              <p className="text-xs font-black text-slate-800">{lang.native}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{lang.region}</p>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-5 h-5 text-[#0f2f63] shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Regional Currency & Timezone Card */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-[#0A1931]">Marketplace Regional Configuration</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        Default currency and timezone applied to job compensation details and shift schedules.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Display Currency:</span>
                        <span className="font-bold text-[#0A1931] bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                          ₹ INR (Indian Rupee)
                        </span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Standard Timezone:</span>
                        <span className="font-bold text-[#0A1931] bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs">
                          IST (UTC +05:30)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Legal Terms & Data Privacy Card */}
                  <div className="bg-white rounded-[2rem] p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-base font-bold text-[#0A1931]">Compliance, Privacy & Terms</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                        TrustHyre operates under verified employer and candidate safety standards.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Link
                        to="/terms"
                        className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors active:scale-95"
                      >
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>Terms of Service</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>

                      <Link
                        to="/privacy"
                        className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors active:scale-95"
                      >
                        <ShieldCheck className="w-4 h-4 text-slate-400" />
                        <span>Data Privacy Policy</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>

        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
