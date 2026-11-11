import { Outlet } from 'react-router-dom';
import ScrollToTop from '../utils/ScrollToTop';
import { Toaster } from 'sonner';
import { NotificationListener } from '../modules/dashboard/components/NotificationListener';
import { CookieConsentBanner } from '../components/common/CookieConsentBanner';
import { PwaUpdateManager } from '../components/common/PwaUpdateManager';
import { useFullPageTranslator } from '../hooks/useFullPageTranslator';
import { useTheme } from '../providers/ThemeContext';

import { AnalyticsTracker } from '../components/common/AnalyticsTracker';

const RootLayout = () => {
  // Activate safe full-page dynamic translation engine across all routes
  useFullPageTranslator();
  const { resolvedTheme } = useTheme();

  return (
    <>
      <AnalyticsTracker />
      <Toaster position="top-right" expand={true} richColors theme={resolvedTheme} />
      <NotificationListener />
      <ScrollToTop />
      <Outlet />
      <CookieConsentBanner />
      <PwaUpdateManager />
    </>
  );
};

export default RootLayout;
