/**
 * Role & Privilege Verification Utilities
 * Provides consistent role checking across controllers and services,
 * resolving role hierarchy inconsistencies between ADMIN and SUPER_ADMIN (OWASP A01).
 */

export const isAppAdmin = (role?: string | null): boolean => {
  if (!role) return false;
  const normalized = role.trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
};

export const isSuperAdmin = (role?: string | null): boolean => {
  if (!role) return false;
  const normalized = role.trim().toUpperCase();
  return normalized === 'SUPER_ADMIN';
};

export const isWorker = (role?: string | null): boolean => {
  if (!role) return false;
  return role.trim().toUpperCase() === 'WORKER';
};

export const isEmployer = (role?: string | null): boolean => {
  if (!role) return false;
  return role.trim().toUpperCase() === 'EMPLOYER';
};

