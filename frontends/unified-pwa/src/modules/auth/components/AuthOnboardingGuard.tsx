import { useAuth, useUser } from "../../../providers/AuthContext";
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import apiClient from "../../../api/apiClient";
import { AppLoader } from "../../../components/common/AppLoader";

export const AuthOnboardingGuard = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn, isLoaded, updateUser } = useAuth();
  const { user } = useUser();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isCancelled = false;

    const checkOnboarding = async () => {
      if (isSignedIn && user) {
        const hasPhone = Boolean(user.phoneNumber || (user as any).phone_number);
        
        if (user.role === 'WORKER') {
          const isWorkerOnboarded = Boolean(user.onboarded && hasPhone);
          if (!isCancelled) {
            setIsOnboarded(isWorkerOnboarded);
            setLoading(false);
          }
          return;
        }

        const isLocalOnboarded = Boolean(user.onboarded || localStorage.getItem('onboarded') === 'true');

        if (isLocalOnboarded) {
          if (!isCancelled) {
            setIsOnboarded(true);
            setLoading(false);
          }
          return;
        }

        try {
          const response = await apiClient.post('/api/auth/sync', { role: "EMPLOYER" });
          const syncedUser = response.data?.data || response.data;
          if (!isCancelled) {
            setIsOnboarded(Boolean(syncedUser.onboarded));
            updateUser(syncedUser);
          }
        } catch (error) {
          console.error("Onboarding check failed:", error);
          if (!isCancelled) {
            setIsOnboarded(false);
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      } else if (isLoaded && !isSignedIn) {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    checkOnboarding();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn, isLoaded, user?.onboarded, user?.phoneNumber, user?.role, location.pathname]);

  if (!isLoaded || loading) {
    return <AppLoader variant="fullscreen" message="Checking your verified account..." />;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  const isEditMode = new URLSearchParams(location.search).get('edit') === 'true';

  // If user is not onboarded, redirect to /onboarding
  const isOnboardingPath = location.pathname.startsWith("/onboarding");
  if (isOnboarded === false && !isOnboardingPath) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user is already onboarded, prevent access to /onboarding unless edit mode is active
  if (isOnboarded === true && isOnboardingPath && !isEditMode) {
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.email?.toLowerCase() === 'admin@trusthyre.com';
    const target = isAdmin ? '/admin/dashboard' : user?.role === 'EMPLOYER' ? '/find-workers' : '/search';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
