/**
 * Referral storage utility for preserving first-touch referral attribution across sessions.
 * Captures `ref` (referral code) and `src` (acquisition channel) from URL parameters.
 * Retains first-touch attribution for 30 days and prevents silent overwriting.
 */

const REFERRAL_STORAGE_KEY = 'th_referral_attribution_v1';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface StoredReferralData {
  referralCode: string;
  referralSource: string;
  capturedAt: number;
  expiresAt: number;
}

/**
 * Captures referral parameters from the current URL if present.
 * Implements first-touch preservation: will not overwrite an unexpired referral touch.
 */
export function captureReferralParams(): StoredReferralData | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral') || params.get('ref_code');
    const src = params.get('src') || params.get('utm_source') || params.get('source') || 'direct_invite';

    if (!ref) {
      return getStoredReferral();
    }

    const cleanCode = ref.trim().toUpperCase();
    if (cleanCode.length < 4 || cleanCode.length > 32) {
      return getStoredReferral();
    }

    const cleanSource = src.trim().toLowerCase().slice(0, 50);

    // Check if a valid, unexpired first touch already exists
    const existing = getStoredReferral();
    if (existing) {
      // Preserve first touch
      return existing;
    }

    const now = Date.now();
    const data: StoredReferralData = {
      referralCode: cleanCode,
      referralSource: cleanSource,
      capturedAt: now,
      expiresAt: now + THIRTY_DAYS_MS
    };

    localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (err) {
    console.warn('[referralStorage] Failed to access localStorage:', err);
    return null;
  }
}

/**
 * Retrieves the currently stored referral attribution if unexpired.
 */
export function getStoredReferral(): StoredReferralData | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;

    const data: StoredReferralData = JSON.parse(raw);
    if (!data.referralCode || !data.expiresAt) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Clears stored referral data once registration/attribution has succeeded.
 */
export function clearStoredReferral(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch (err) {
    console.warn('[referralStorage] Failed to clear referral storage:', err);
  }
}
