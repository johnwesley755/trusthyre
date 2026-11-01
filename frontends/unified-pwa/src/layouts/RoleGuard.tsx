import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth, useUser } from '../providers/AuthContext';
import { AppLoader } from '../components/common/AppLoader';
import type { UserRole } from '../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const location = useLocation();

  if (!isLoaded) {
    return <AppLoader variant="fullscreen" message="Verifying access permissions..." />;
  }

  if (!isSignedIn || !user) {
    const defaultRole = allowedRoles.includes('EMPLOYER') ? 'EMPLOYER' : 'WORKER';
    return <Navigate to={`/sign-in?role=${defaultRole}`} state={{ from: location }} replace />;
  }

  const userRole = (user.role || 'WORKER') as UserRole;
  const isAllowed = allowedRoles.includes(userRole) || (allowedRoles.includes('ADMIN') && userRole === 'SUPER_ADMIN');

  if (!isAllowed) {
    // Cross-role interception: redirect to the respective user workspace
    const targetDashboard = (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') ? '/admin/dashboard' : userRole === 'EMPLOYER' ? '/find-workers' : '/search';
    return <Navigate to={targetDashboard} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;
