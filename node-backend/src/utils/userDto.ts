/**
 * User Data Transfer Object (DTO) Sanitizer
 * Strips password hashes, reset tokens, and sensitive internal security metadata
 * before serializing user records to frontend clients.
 */

export interface SafeUserDto {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phoneNumber?: string | null;
  phone_number?: string | null;
  profileImageUrl?: string | null;
  profile_image_url?: string | null;
  role: string;
  emailVerified?: boolean;
  email_verified?: boolean;
  onboarded?: boolean;
  referralCode?: string | null;
  referral_code?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

export function sanitizeUserDto(user: any): SafeUserDto | null {
  if (!user) return null;

  const {
    password_hash,
    reset_token,
    reset_token_expiry,
    ...rest
  } = user;

  return {
    id: rest.id,
    email: rest.email,
    firstName: rest.first_name || rest.firstName || null,
    lastName: rest.last_name || rest.lastName || null,
    first_name: rest.first_name || rest.firstName || null,
    last_name: rest.last_name || rest.lastName || null,
    phoneNumber: rest.phone_number || rest.phoneNumber || null,
    phone_number: rest.phone_number || rest.phoneNumber || null,
    profileImageUrl: rest.profile_image_url || rest.profileImageUrl || null,
    profile_image_url: rest.profile_image_url || rest.profileImageUrl || null,
    role: rest.role || 'WORKER',
    emailVerified: Boolean(rest.email_verified || rest.emailVerified),
    email_verified: Boolean(rest.email_verified || rest.emailVerified),
    onboarded: Boolean(rest.onboarded),
    referralCode: rest.referral_code || rest.referralCode || null,
    referral_code: rest.referral_code || rest.referralCode || null,
    createdAt: rest.created_at || rest.createdAt || null,
    updatedAt: rest.updated_at || rest.updatedAt || null,
  };
}
