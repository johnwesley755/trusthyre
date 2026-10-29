import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { setupInterceptors } from '../api/apiClient';
import type { User, UserRole } from '../types';
import { auth, googleProvider, signInWithPopup, signOut as firebaseSignOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import apiClient from '../api/apiClient';
import { secureStorage } from '../utils/secureStorage';

interface AuthContextType {
  user: User | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  role: UserRole | null;
  getToken: () => Promise<string | null>;
  updateUser: (data: Partial<User>) => void;
  login: (token: string, userData: any) => void;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  signInWithGoogle: (targetRole?: UserRole) => Promise<void>;
  sendEmployerOtp: (email: string) => Promise<void>;
  verifyEmployerOtp: (email: string, otp: string) => Promise<User>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const useUser = () => {
  const { user, isLoaded, isSignedIn } = useAuth();
  return { user, isLoaded, isSignedIn };
};

export const SignedIn = ({ children }: { children: ReactNode }) => {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
};

export const SignedOut = ({ children }: { children: ReactNode }) => {
  const { isSignedIn } = useAuth();
  return !isSignedIn ? <>{children}</> : null;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  const mapUserFields = (data: any): User => {
    return {
      id: data.userId || data.id,
      email: data.email,
      role: (data.role || 'WORKER') as UserRole,
      onboarded: !!data.onboarded,
      identityVerified: !!(data.identityVerified ?? data.identity_verified),
      firstName: data.firstName ?? data.first_name ?? (data.displayName?.split(' ')[0] || ''),
      lastName: data.lastName ?? data.last_name ?? (data.displayName?.split(' ').slice(1).join(' ') || ''),
      phoneNumber: data.phoneNumber ?? data.phone_number,
      profileImageUrl: data.profileImageUrl ?? data.profile_image_url ?? data.photoURL,
      companyName: data.companyName ?? data.company_name,
      location: data.location,
      createdAt: data.createdAt ?? data.created_at,
      updatedAt: data.updatedAt ?? data.updated_at,
    };
  };

  const syncInProgressRef = useRef(false);

  const login = (token: string, userData: any) => {
    const mappedUser = mapUserFields(userData);
    secureStorage.setItem('token', token);
    secureStorage.setItem('user', JSON.stringify(mappedUser));
    setUser(mappedUser);
  };

  const syncUserWithBackend = async (fbUser: any, targetRole: UserRole) => {
    const idToken = await fbUser.getIdToken(true);
    const nameParts = (fbUser.displayName || (targetRole === 'EMPLOYER' ? 'Employer' : 'Worker')).split(' ');
    const firstName = nameParts[0] || (targetRole === 'EMPLOYER' ? 'Employer' : 'Worker');
    const lastName = nameParts.slice(1).join(' ') || '';

    const syncRes = await apiClient.post('/api/auth/oauth-sync', {
      idToken,
      email: fbUser.email,
      firstName,
      lastName,
      profileImageUrl: fbUser.photoURL,
      role: targetRole,
    });

    const payload = syncRes.data?.data || syncRes.data;
    if (payload?.token && payload?.user) {
      setAuthError(null);
      login(payload.token, payload.user);
      return payload.user;
    }
    throw new Error(payload?.message || "Authentication sync returned an invalid response.");
  };

  useEffect(() => {
    const initAuth = () => {
      // 1. Check local session
      const token = secureStorage.getItem('token');
      const storedUser = secureStorage.getItem('user');
      if (token && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } catch (e) {
          console.error("Failed to parse stored user", e);
          secureStorage.removeItem('token');
          secureStorage.removeItem('user');
        }
      }
      setIsLoaded(true);
    };

    initAuth();

    // 2. Listen to Firebase Auth state changes (session restoration)
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && !syncInProgressRef.current) {
        const token = secureStorage.getItem('token');
        if (!token) {
          syncInProgressRef.current = true;
          const targetRole = (secureStorage.getItem('target_role') || 'WORKER') as UserRole;
          try {
            await syncUserWithBackend(fbUser, targetRole);
          } catch (syncErr: any) {
            console.error("Background oauth sync failed:", syncErr);
            const errorMessage = syncErr?.response?.data?.message || syncErr?.message || "Authentication failed.";
            setAuthError(errorMessage);
            window.dispatchEvent(new CustomEvent('auth:error', { detail: errorMessage }));
            await firebaseSignOut(auth).catch(() => {});
            secureStorage.removeItem('token');
            secureStorage.removeItem('user');
          } finally {
            syncInProgressRef.current = false;
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getToken = async () => secureStorage.getItem('token');

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      secureStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const switchRole = (newRole: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, role: newRole };
      secureStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch {
      // ignore
    }
    secureStorage.removeItem('token');
    secureStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const signInWithGoogle = async (targetRole: UserRole = 'WORKER') => {
    setAuthError(null);
    secureStorage.setItem('target_role', targetRole);
    try {
      syncInProgressRef.current = true;
      const result = await signInWithPopup(auth, googleProvider);
      if (!result?.user) {
        throw new Error("Google authentication did not return user credentials.");
      }

      const syncedUser = await syncUserWithBackend(result.user, targetRole);

      // Deterministic navigation after immediate sync
      if (!syncedUser?.phoneNumber && !syncedUser?.phone_number && syncedUser?.role !== 'EMPLOYER') {
        window.location.href = '/onboarding';
      } else {
        const dest = syncedUser?.role === 'ADMIN' ? '/admin/dashboard' : syncedUser?.role === 'EMPLOYER' ? '/find-workers' : '/search';
        window.location.href = dest;
      }
    } catch (error: any) {
      console.warn("Firebase Google Auth error:", error.code, error.message);
      // Suppress benign popup closure / cancellation
      if (
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      const errorMsg = error?.response?.data?.message || error?.message || "Google Sign-In failed.";
      setAuthError(errorMsg);
      window.dispatchEvent(new CustomEvent('auth:error', { detail: errorMsg }));
      await firebaseSignOut(auth).catch(() => {});
      secureStorage.removeItem('token');
      secureStorage.removeItem('user');
      throw error;
    } finally {
      syncInProgressRef.current = false;
    }
  };

  const sendEmployerOtp = async (email: string) => {
    await apiClient.post('/api/auth/send-otp', { email });
  };

  const verifyEmployerOtp = async (email: string, otp: string) => {
    const res = await apiClient.post('/api/auth/verify-employer-otp', { email, otp });
    const payload = res.data?.data || res.data;
    const userData = payload.user || payload;
    const token = payload.token;
    if (token && userData) {
      login(token, userData);
    }
    return mapUserFields(userData);
  };

  useEffect(() => {
    setupInterceptors(getToken);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: !!user,
        isLoaded,
        role: user?.role || null,
        getToken,
        updateUser,
        login,
        logout,
        switchRole,
        signInWithGoogle,
        sendEmployerOtp,
        verifyEmployerOtp,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
