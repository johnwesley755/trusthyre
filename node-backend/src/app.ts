import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Fix: Prevent "Do not know how to serialize a BigInt" in JSON.stringify
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};

import authRoutes from './routes/authRoutes';
import workerRoutes from './routes/workerRoutes';
import employerRoutes from './routes/employerRoutes';
import jobRoutes from './routes/jobRoutes';
import mediaRoutes from './routes/mediaRoutes';
import activityRoutes from './routes/activityRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import earlyAccessRoutes from './routes/earlyAccessRoutes';
import jobApplicationRoutes from './routes/jobApplicationRoutes';
import levelRoutes from './routes/levelRoutes';
import notificationRoutes from './routes/notificationRoutes';
import ratingRoutes from './routes/ratingRoutes';
import searchRoutes from './routes/searchRoutes';
import settingsRoutes from './routes/settingsRoutes';
import translationRoutes from './routes/translationRoutes';
import skillTestRoutes from './routes/skillTestRoutes';
import verificationRoutes from './routes/verificationRoutes';
import savedRoutes from './routes/savedRoutes';
import adminRoutes, { adminAnalyticsRouter } from './routes/adminRoutes';
import searchAlertRoutes from './routes/searchAlertRoutes';
import { leadRouter } from './routes/leadRoutes';
import metadataRoutes from './routes/metadataRoutes';
import { blogRouter, adminBlogRouter } from './routes/blogRoutes';
import { seoRouter } from './routes/seoRoutes';
import { SitemapService } from './services/sitemapService';


import { requestContextStorage, RequestScope } from './config/prisma';

export type AppContext = {
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
};

const app = new Hono<AppContext>();

app.use('*', async (c, next) => {
  if (typeof process === 'undefined') {
    (globalThis as any).process = { env: c.env };
  } else {
    Object.assign(process.env, c.env || {});
  }

  const existingStore = requestContextStorage.getStore();
  if (existingStore) {
    await next();
    return;
  }

  let executionCtx: any = null;
  try {
    executionCtx = c.executionCtx;
  } catch {
    // no executionCtx
  }

  const store: RequestScope = { env: c.env, ctx: executionCtx };
  return requestContextStorage.run(store, async () => {
    try {
      await next();
    } finally {
      if (store.pool) {
        executionCtx?.waitUntil?.(store.pool.end());
      }
    }
  });
});

import { secureHeaders } from 'hono/secure-headers';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:8787',
  'http://127.0.0.1:5173',
  'https://trusthyre.com',
  'https://www.trusthyre.com',
  'https://app.trusthyre.com',
  'https://api.trusthyre.com',
  'https://trusthire.in',
  'https://www.trusthire.in',
  'https://app.trusthire.in',
  'https://trust-hire-one.vercel.app',
  'https://trust-hire-6edba.web.app',
  'https://trust-hire-6edba.firebaseapp.com'
];

app.use('*', secureHeaders({
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  crossOriginResourcePolicy: 'cross-origin',
}));

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return ALLOWED_ORIGINS[0];
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    try {
      const url = new URL(origin);
      const host = url.hostname.toLowerCase();
      if (
        host === 'trusthyre.com' ||
        host.endsWith('.trusthyre.com') ||
        host === 'trusthire.in' ||
        host.endsWith('.trusthire.in') ||
        host === 'trust-hire-one.vercel.app' ||
        host.endsWith('.trust-hire-one.vercel.app') ||
        host === 'trust-hire-6edba.web.app' ||
        host === 'trust-hire-6edba.firebaseapp.com'
      ) {
        return origin;
      }
    } catch {
      // Invalid URL origin format
    }
    return '';
  },
  allowHeaders: ['Content-Type', 'Authorization', 'x-internal-secret', 'dnt', 'x-requested-with', 'accept', 'origin'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

app.route('/api/auth', authRoutes);
app.route('/api/worker', workerRoutes);
app.route('/api/employer', employerRoutes);
app.route('/api/jobs', jobRoutes);
app.route('/api/media', mediaRoutes);
app.route('/api/activities', activityRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/early-access', earlyAccessRoutes);
app.route('/api/jobs/applications', jobApplicationRoutes);
app.route('/api/levels', levelRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/ratings', ratingRoutes);
app.route('/api/search/alerts', searchAlertRoutes);
app.route('/api/search', searchRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/translate', translationRoutes);
app.route('/api/skill-tests', skillTestRoutes);
app.route('/api/verification', verificationRoutes);
app.route('/api/saved', savedRoutes);
app.route('/api/admin/leads', leadRouter);
app.route('/api/admin/blog', adminBlogRouter);
app.route('/api/admin/analytics', adminAnalyticsRouter);
app.route('/api/admin', adminRoutes);
app.route('/api/metadata', metadataRoutes);
app.route('/api/blog', blogRouter);
app.route('/api/seo', seoRouter);




app.get('/api/health', (c) => {
  return c.json({ status: 'UP', runtime: 'Hono' });
});

app.get('/sitemap.xml', async (c) => {
  const xml = await SitemapService.generateSitemapXml();
  return c.text(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  });
});

app.get('/rss.xml', async (c) => {
  const rss = await SitemapService.generateRssXml();
  return c.text(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  });
});

app.onError((err, c) => {
  console.error('Unhandled Application Error:', err);
  const origin = c.req.header('Origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  const isProd = process.env.NODE_ENV === 'production';
  const safeMessage = isProd ? 'An unexpected error occurred. Please try again later.' : (err?.message || 'Internal Server Error');
  return c.json({ success: false, message: safeMessage }, 500);
});

export default app;


