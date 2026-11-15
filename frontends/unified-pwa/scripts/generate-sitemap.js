/**
 * Build-time static sitemap generator for TrustHyre.
 * Fetches the comprehensive, dynamic sitemap from the production API (https://api.trusthyre.com/sitemap.xml)
 * so that both static CDN and rewrites provide 100% full coverage of all active job openings,
 * categories, articles, and programmatic hubs.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://trusthyre.com';

function resolveApiUrl() {
  const envUrl = process.env.VITE_API_URL;
  if (!envUrl) return 'https://api.trusthyre.com';
  try {
    const parsed = new URL(envUrl);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return 'https://api.trusthyre.com';
    }
    return envUrl;
  } catch {
    return 'https://api.trusthyre.com';
  }
}

const API_URL = resolveApiUrl();
const today = new Date().toISOString().split('T')[0];

const CORE_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily', lastmod: today },
  { path: '/blog', priority: '0.9', changefreq: 'daily', lastmod: today },
  { path: '/terms', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
  { path: '/privacy', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
];

const FEATURED_CITIES = ['chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'tiruppur', 'bengaluru'];
const FEATURED_TRADES = ['electrician', 'driver', 'cook', 'plumber', 'welder', 'security', 'warehouse'];

function isValidTrusthyreSitemap(xml) {
  if (!xml || typeof xml !== 'string') return false;
  if (!xml.includes('<urlset') || !xml.includes('</urlset>')) return false;

  const locMatches = xml.match(/<loc>(.*?)<\/loc>/g);
  if (!locMatches || locMatches.length === 0) return false;

  // Validate the URLs using WHATWG URL parser to ensure strict hostname matching
  const sampleUrls = locMatches.slice(0, 5).map(m => m.replace(/<\/?loc>/g, '').trim());
  return sampleUrls.every(u => {
    try {
      const parsed = new URL(u);
      return parsed.hostname === 'trusthyre.com' || parsed.hostname === 'www.trusthyre.com';
    } catch {
      return false;
    }
  });
}

async function generateSitemap() {
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const sitemapPath = path.join(publicDir, 'sitemap.xml');

  // 1. Attempt to fetch full live sitemap from the production API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${API_URL}/sitemap.xml`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const xml = await res.text();
      if (isValidTrusthyreSitemap(xml)) {
        fs.writeFileSync(sitemapPath, xml.trim(), 'utf8');
        console.log(`[generate-sitemap] Successfully mirrored dynamic sitemap from ${API_URL}/sitemap.xml (${xml.length} bytes) to ${sitemapPath}`);
        return;
      }
    }
  } catch (err) {
    console.warn(`[generate-sitemap] Could not fetch live sitemap from ${API_URL}/sitemap.xml (${err.message}). Generating comprehensive fallback.`);
  }

  // 2. Fallback: Generate comprehensive static sitemap including programmatic city & trade hubs
  const urlEntries = [];

  for (const route of CORE_ROUTES) {
    urlEntries.push(`  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
  }

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

  fs.writeFileSync(sitemapPath, xml.trim(), 'utf8');
  console.log(`[generate-sitemap] Wrote comprehensive fallback ${sitemapPath} (${urlEntries.length} indexable URLs)`);
}

generateSitemap().catch((err) => {
  console.error('[generate-sitemap] Error:', err);
});
