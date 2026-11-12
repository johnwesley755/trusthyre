import { Context, Next } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (c: Context) => string | Promise<string>;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export const getClientIp = (c: Context): string => {
  const cfIp = c.req.header('cf-connecting-ip');
  const forwarded = c.req.header('x-forwarded-for');
  return (cfIp ? cfIp.trim() : '') ||
         (forwarded ? forwarded.split(',')[0].trim() : '') ||
         c.req.header('x-real-ip') ||
         '127.0.0.1';
};

export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator
  } = options;

  const hits = new Map<string, ClientRecord>();

  return async (c: Context, next: Next) => {
    const now = Date.now();

    // Lazy cleanup inside request handler to prevent memory leaks without global scope timers
    if (hits.size > 200) {
      for (const [k, record] of hits.entries()) {
        if (now > record.resetTime) {
          hits.delete(k);
        }
      }
    }

    let key: string;
    if (keyGenerator) {
      key = await keyGenerator(c);
    } else {
      const authUser = c.get('user');
      const userId = authUser?.sub;
      const ip = getClientIp(c);
      // Key by authenticated userId if available, else route path and IP
      key = userId ? `${c.req.path}:user:${userId}` : `${c.req.path}:ip:${ip}`;
    }

    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

    if (record.count > max) {
      c.header('Retry-After', String(retryAfterSeconds));
      return c.json(
        ApiResponse.error(message, { retryAfter: retryAfterSeconds }),
        429 as any
      );
    }

    await next();
  };
};

/**
 * Baseline Global Limiter across all /api/* routes (300 requests/minute per IP)
 * Protects against bot floods and large-scale scraping.
 */
export const globalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  message: 'Global API rate limit exceeded. Please slow down your requests.',
  keyGenerator: (c) => `global:ip:${getClientIp(c)}`
});

/**
 * OTP Limiter: 5 attempts per 15 minutes
 * Protects SMS and Email transactional delivery budgets.
 */
export const otpLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many OTP requests. Please wait 15 minutes before requesting again.'
});

/**
 * Login Limiter: 10 attempts per minute
 * Protects credentials against automated brute-force attacks.
 */
export const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many login attempts. Please wait a minute before trying again.'
});

/**
 * Auth Action Limiter: 20 actions per minute
 * Protects registration, password reset, and token verification flows.
 */
export const authActionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many authentication attempts. Please try again later.'
});

/**
 * Upload Limiter: 20 uploads per 5 minutes
 * Protects media storage and image transformation quota.
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: 'Upload limit reached. Please wait a few minutes before uploading more assets.'
});

/**
 * Translation Limiter: 60 requests per minute
 * Protects external translation provider quotas.
 */
export const translationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Translation rate limit reached. Please slow down.'
});

/**
 * FCM & Push Limiter: 20 updates per minute
 * Protects notification token persistence.
 */
export const fcmLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many notification token updates. Please try again later.'
});

/**
 * Search Limiter: 120 queries per minute
 * Protects database search indexes and full-text search resources.
 */
export const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: 'Search query rate limit exceeded. Please wait a moment.'
});

/**
 * Write Action Limiter: 30 mutations per minute
 * Protects against rapid form submission spam (job applications, ratings).
 */
export const writeActionLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many submission requests. Please wait a moment before trying again.'
});

/**
 * Admin Invitation Limiter: 5 attempts per 15 minutes
 * Protects administrator invitation verification and onboarding from brute-forcing.
 */
export const invitationLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many invitation attempts. Please wait 15 minutes before trying again.',
  keyGenerator: (c) => `invitation:ip:${getClientIp(c)}`
});
