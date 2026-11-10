import { Context, Next } from 'hono';
import { ApiResponse } from '../utils/ApiResponse';

/**
 * Verified search engine bots & social preview unfurlers that MUST NEVER be blocked
 * (preserves full SEO indexing and social preview link generation).
 */
const ALLOWED_CRAWLERS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'twitterbot',
  'facebookexternalhit',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'whatsapp',
  'telegrambot',
  'applebot'
];

/**
 * Automated scraping libraries, HTTP scripting clients, and exploit scanners.
 */
const BLOCKED_USER_AGENTS = [
  'python-requests',
  'python-urllib',
  'aiohttp',
  'httpx',
  'scrapy',
  'curl/',
  'wget/',
  'go-http-client',
  'java/',
  'apache-httpclient',
  'okhttp',
  'postmanruntime', // Block Postman on production public routes unless internal key provided
  'sqlmap',
  'nikto',
  'zgrab',
  'masscan',
  'dirbuster',
  'gobuster',
  'nmap',
  'censys',
  'shodan'
];

/**
 * Checks if a given User-Agent string belongs to an authorized search or preview crawler.
 */
export const isAllowedCrawler = (userAgent: string): boolean => {
  const ua = userAgent.toLowerCase();
  return ALLOWED_CRAWLERS.some(crawler => ua.includes(crawler));
};

/**
 * Checks if a given User-Agent string is a known scraper or exploit tool.
 */
export const isKnownBadBot = (userAgent: string): boolean => {
  const ua = userAgent.toLowerCase();
  return BLOCKED_USER_AGENTS.some(blocked => ua.includes(blocked));
};

/**
 * Bot Detection Middleware for Hono.
 * Blocks automated scraping tools and vulnerability scanners on public endpoints,
 * while transparently allowing legitimate search engine crawlers and browser users.
 */
export const botDetectionMiddleware = async (c: Context, next: Next) => {
  const path = c.req.path;

  // 1. Bypass health checks and webhook synchronization
  if (path === '/api/health' || path.startsWith('/api/auth/webhooks/')) {
    return next();
  }

  // 2. Bypass internal service calls authenticated with internal secret
  const internalSecret = c.req.header('x-internal-secret');
  if (internalSecret && internalSecret === process.env.JWT_SECRET) {
    return next();
  }

  const userAgent = c.req.header('user-agent') || '';

  // 3. Always allow verified SEO search bots and social crawlers
  if (isAllowedCrawler(userAgent)) {
    return next();
  }

  // 4. Reject empty or abnormally short User-Agents on mutation methods
  const method = c.req.method.toUpperCase();
  if (!userAgent || userAgent.trim().length < 5) {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
      return c.json(ApiResponse.error("Request rejected: Missing client identification"), 403 as any);
    }
  }

  // 5. Block known automated scraping and exploit tools
  // Allow curl/postman during non-production testing unless specifically blocked
  const isProd = process.env.NODE_ENV === 'production';
  if (isKnownBadBot(userAgent)) {
    // In production, strictly block all listed scrapers. In dev/test, block exploit tools and python/scrapy scrapers.
    const isExploitOrScraper = userAgent.toLowerCase().includes('sqlmap') ||
                               userAgent.toLowerCase().includes('nikto') ||
                               userAgent.toLowerCase().includes('scrapy') ||
                               userAgent.toLowerCase().includes('python-requests');

    if (isProd || isExploitOrScraper) {
      return c.json(
        ApiResponse.error("Automated access prohibited. Please use the official TrustHyre web or mobile application."),
        403 as any
      );
    }
  }

  await next();
};

/**
 * Validates invisible honeypot form fields.
 * If an automated bot populated the decoy field, returns true (indicating bot detected).
 */
export const isHoneypotTriggered = (body: any): boolean => {
  if (!body || typeof body !== 'object') return false;

  const honeypotKeys = [
    'website_hp',
    'company_tax_hp',
    'contact_fax_hp',
    'url_trap'
  ];

  for (const key of honeypotKeys) {
    if (body[key] && typeof body[key] === 'string' && body[key].trim().length > 0) {
      return true;
    }
  }

  return false;
};

/**
 * Validates form submission velocity (time-based anti-bot).
 * Rejects forms submitted in less than minMs (default 1200ms) or older than maxAgeMs (default 2 hours).
 */
export const isFormSubmittedTooFast = (formTimestamp: any, minMs: number = 1200): boolean => {
  if (!formTimestamp) return false; // If timing not present, let other gates handle

  const ts = Number(formTimestamp);
  if (isNaN(ts) || ts <= 0) return false;

  const now = Date.now();
  const elapsed = now - ts;

  // Submitted faster than minMs (humanly impossible)
  if (elapsed < minMs) {
    return true;
  }

  // Stale form submission older than 2 hours (replayed bot payload)
  if (elapsed > 2 * 60 * 60 * 1000) {
    return true;
  }

  return false;
};

