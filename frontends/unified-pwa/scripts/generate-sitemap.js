/**
 * Build-time static sitemap generator for TrustHyre
 * Runs during prebuild to guarantee public/sitemap.xml is always up to date
 * with all core landing pages, blog categories, published articles, and active job postings.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://trusthyre.com';
const today = new Date().toISOString().split('T')[0];

const CORE_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily', lastmod: today },
  { path: '/search', priority: '0.9', changefreq: 'daily', lastmod: today },
  { path: '/find-workers', priority: '0.9', changefreq: 'daily', lastmod: today },
  { path: '/blog', priority: '0.9', changefreq: 'daily', lastmod: today },
  { path: '/terms', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
  { path: '/privacy', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
];

const KNOWN_BLOG_CATEGORIES = [
  'hiring-guides',
  'salary-benchmarks',
  'verification-standards',
  'career-guides',
];

const KNOWN_PUBLISHED_ARTICLES = [
  {
    slug: 'electrician-jobs-in-chennai',
    title: 'Electrician Jobs in Chennai: Skills, Qualifications and How to Apply',
    lastmod: today,
    priority: '0.9',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'solving-absenteeism-blue-collar-workforce-india',
    title: "How Photo Check-In & Skill Verification Is Solving Absenteeism in India's Blue-Collar Workforce",
    lastmod: today,
    priority: '0.9',
    image: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'hiring-delivery-drivers-warehouse-staff-chennai',
    title: 'Hiring Delivery Drivers & Warehouse Staff in Chennai: Complete Employer Compliance & Verification Checklist',
    lastmod: today,
    priority: '0.9',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    slug: 'electrician-hiring-guide-chennai',
    title: 'Electrician Jobs & Hiring in Chennai: Required Skills, Safety Certifications, and Standard Rates (2026 Guide)',
    lastmod: today,
    priority: '0.9',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
  },
];

// Fallback seed jobs if build is offline
const KNOWN_ACTIVE_JOBS = [
  {
    id: 'b30f01f0-9a0e-4c14-ae67-c061005cf80c',
    title: 'Hair Cutting Executive',
    lastmod: today,
    priority: '0.8',
    image: null,
  },
];

async function generateSitemap() {
  let articles = [...KNOWN_PUBLISHED_ARTICLES];
  let jobs = [...KNOWN_ACTIVE_JOBS];

  const apiTarget = process.env.VITE_API_URL || 'https://api.trusthyre.com';

  // 1. Fetch fresh articles from live backend if available
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiTarget}/api/blog`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data.posts && Array.isArray(data.posts) && data.posts.length > 0) {
        articles = data.posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          lastmod: p.updatedAt ? p.updatedAt.split('T')[0] : (p.publishedAt ? p.publishedAt.split('T')[0] : today),
          priority: '0.9',
          image: p.coverImageUrl || null,
        }));
      }
    }
  } catch (e) {
    // Graceful fallback to embedded verified article list
  }

  // 2. Fetch fresh active jobs from live backend
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiTarget}/api/jobs`, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const rawJobs = Array.isArray(data) ? data : (data.data || data.jobs || []);
      if (Array.isArray(rawJobs) && rawJobs.length > 0) {
        jobs = rawJobs.map((j) => ({
          id: j.id,
          title: j.title,
          lastmod: j.updated_at ? j.updated_at.split('T')[0] : (j.created_at ? j.created_at.split('T')[0] : today),
          priority: '0.8',
          image: j.cover_image_url || null,
        }));
      }
    }
  } catch (e) {
    // Graceful fallback to embedded verified job list
  }

  const urlEntries = [];

  // Core Pages
  for (const r of CORE_ROUTES) {
    urlEntries.push(`  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`);
  }

  // Blog Categories
  for (const cat of KNOWN_BLOG_CATEGORIES) {
    urlEntries.push(`  <url>
    <loc>${BASE_URL}/blog/category/${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // Articles
  for (const art of articles) {
    const imageXml = art.image
      ? `\n    <image:image>\n      <image:loc>${escapeXml(art.image)}</image:loc>\n      <image:title>${escapeXml(art.title)}</image:title>\n    </image:image>`
      : '';
    urlEntries.push(`  <url>
    <loc>${BASE_URL}/blog/${art.slug}</loc>
    <lastmod>${art.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${art.priority}</priority>${imageXml}
  </url>`);
  }

  // Active Job Postings
  for (const job of jobs) {
    const imageXml = job.image
      ? `\n    <image:image>\n      <image:loc>${escapeXml(job.image)}</image:loc>\n      <image:title>${escapeXml(job.title)}</image:title>\n    </image:image>`
      : '';
    urlEntries.push(`  <url>
    <loc>${BASE_URL}/job/${job.id}</loc>
    <lastmod>${job.lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>${job.priority}</priority>${imageXml}
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join('\n')}
</urlset>`;

  const publicSitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xml, 'utf8');
  console.log(`[generate-sitemap] Wrote updated ${publicSitemapPath} (${urlEntries.length} indexable URLs)`);
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

generateSitemap();
