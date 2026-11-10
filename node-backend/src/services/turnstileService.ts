/**
 * Cloudflare Turnstile Smart Captcha Verification Service
 * Handles server-side validation of Turnstile tokens for high-risk operations
 * (OTP requests, registration, password resets).
 */

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export class TurnstileService {
  private static readonly VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  /**
   * Verifies a Cloudflare Turnstile token.
   * If CF_TURNSTILE_SECRET_KEY is not configured, gracefully permits the request
   * to ensure local development, CI tests, and staged rollouts remain functional.
   */
  public static async verifyToken(token?: string, remoteIp?: string): Promise<{ success: boolean; message?: string }> {
    const secretKey = process.env.CF_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

    // Graceful fallback if Turnstile secret key is not configured in environment
    if (!secretKey) {
      return { success: true };
    }

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return {
        success: false,
        message: 'Bot verification token missing. Please complete the security check.'
      };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey);
      formData.append('response', token.trim());
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });

      if (!response.ok) {
        console.error(`[TurnstileService] Verification endpoint returned HTTP ${response.status}`);
        // Allow request on upstream Cloudflare outage to prevent service denial to users
        return { success: true };
      }

      const result = (await response.json()) as TurnstileVerifyResponse;

      if (!result.success) {
        console.warn(`[TurnstileService] Token validation failed:`, result['error-codes']);
        return {
          success: false,
          message: 'Security challenge verification failed. Please try again.'
        };
      }

      return { success: true };
    } catch (err) {
      console.error(`[TurnstileService] Error contacting Cloudflare verify API:`, err);
      // Fail open on network errors to avoid locking out legitimate users if Cloudflare is unreachable
      return { success: true };
    }
  }
}

