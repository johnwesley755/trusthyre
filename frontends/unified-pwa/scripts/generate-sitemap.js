/**
 * Build-time static sitemap preview generator for TrustHyre.
 * Produces clean core routes without hardcoded mock articles or mock jobs.
 * The production authority remains the dynamic backend sitemap at https://api.trusthyre.com/sitemap.xml
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
  { path: '/blog', priority: '0.9', changefreq: 'daily', lastmod: today },
  { path: '/terms', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
  { path: '/privacy', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
];

const FEATURED_CITIES = ['chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'tiruppur', 'bengaluru'];
const FEATURED_TRADES = ['electrician', 'driver', 'cook', 'plumber', 'welder', 'security', 'warehouse'];

async function generateSitemap() {
  const urlEntries = [];

  // Core Static Routes
  for (const route of CORE_ROUTES) {
    urlEntries.push(`  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

  // Programmatic Hub Routes
  for (const city of FEATURED_CITIES) {
    urlEntries.push(`  <url>
    <loc>${BASE_URL}/jobs-in-${city}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);

    for (const trade of FEATURED_TRADES) {
      urlEntries.push(`  <url>
    <loc>${BASE_URL}/jobs-in-${city}/${trade}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;

  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(sitemapPath, xml.trim(), 'utf8');
  console.log(`[generate-sitemap] Wrote updated ${sitemapPath} (${urlEntries.length} indexable URLs)`);
}

generateSitemap().catch((err) => {
  console.error('[generate-sitemap] Error:', err);
});
