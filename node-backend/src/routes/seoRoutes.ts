import { Hono } from 'hono';
import { prisma } from '../config/prisma';
import { SitemapService } from '../services/sitemapService';
import { generateJobSeoSlug, ALLOWED_CITIES, ALLOWED_TRADES, TRADE_KEYWORD_MAP } from '../utils/seoSlug.util';

const CITY_STATE_PIN_MAP: Record<string, { state: string; postalCode: string }> = {
  chennai: { state: 'Tamil Nadu', postalCode: '600001' },
  coimbatore: { state: 'Tamil Nadu', postalCode: '641001' },
  madurai: { state: 'Tamil Nadu', postalCode: '625001' },
  tiruchirappalli: { state: 'Tamil Nadu', postalCode: '620001' },
  trichy: { state: 'Tamil Nadu', postalCode: '620001' },
  salem: { state: 'Tamil Nadu', postalCode: '636001' },
  tiruppur: { state: 'Tamil Nadu', postalCode: '641601' },
  bengaluru: { state: 'Karnataka', postalCode: '560001' },
  bangalore: { state: 'Karnataka', postalCode: '560001' },
  hyderabad: { state: 'Telangana', postalCode: '500001' },
  mumbai: { state: 'Maharashtra', postalCode: '400001' },
  pune: { state: 'Maharashtra', postalCode: '411001' },
  delhi: { state: 'Delhi', postalCode: '110001' },
  kolkata: { state: 'West Bengal', postalCode: '700001' },
};

function resolveGeoAddress(city?: string | null, rawAddress?: string | null) {
  const normCity = (city || 'Chennai').trim().toLowerCase();
  const info = CITY_STATE_PIN_MAP[normCity] || { state: 'Tamil Nadu', postalCode: '600001' };

  // Try extracting 6-digit pin code if present in rawAddress
  let postalCode = info.postalCode;
  if (rawAddress) {
    const pinMatch = rawAddress.match(/\b\d{6}\b/);
    if (pinMatch) postalCode = pinMatch[0];
  }

  return {
    addressLocality: city || 'Chennai',
    addressRegion: info.state,
    postalCode: postalCode,
    streetAddress: rawAddress || city || 'India',
    addressCountry: 'IN',
  };
}

export const seoRouter = new Hono();

const BASE_DOMAIN = 'https://trusthyre.com';

/**
 * GET /sitemap.xml
 * Dynamic XML Sitemap
 */
seoRouter.get('/sitemap.xml', async (c) => {
  try {
    const { xml, dbError } = await SitemapService.generateSitemapXml();
    return c.text(xml, dbError ? 503 : 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': dbError
        ? 'no-cache, no-store'
        : 'public, max-age=3600, s-maxage=86400',
      ...(dbError ? { 'Retry-After': '300' } : {}),
    });
  } catch (err) {
    console.error('[seoRoutes /sitemap.xml] Fatal error:', err);
    return c.text(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      503,
      { 'Content-Type': 'application/xml; charset=utf-8', 'Retry-After': '300' }
    );
  }
});

/**
 * GET /rss.xml or /feed.xml
 * Dynamic RSS 2.0 Article Feed
 */
seoRouter.get('/rss.xml', async (c) => {
  const rss = await SitemapService.generateRssXml();
  return c.text(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  });
});

seoRouter.get('/feed.xml', async (c) => {
  const rss = await SitemapService.generateRssXml();
  return c.text(rss, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  });
});

/**
 * GET /api/seo/prerender
 * High-performance SSR pre-rendering for search crawlers (Googlebot, Bingbot, Social scrapers).
 * Query param: ?path=/blog/slug-name or ?path=/job/uuid
 */
seoRouter.get('/prerender', async (c) => {
  const rawPath = c.req.query('path') || '/';
  const cleanPath = rawPath.split('?')[0].replace(/\/+$/, '') || '/';

  // 1. Blog Post Details: /blog/:slug
  if (cleanPath.startsWith('/blog/') && !cleanPath.startsWith('/blog/category/')) {
    const slug = cleanPath.replace('/blog/', '').trim();
    let post: any = null;
    let blogDbFailed = false;

    try {
      post = await (prisma as any).blog_posts.findFirst({
        where: { slug, status: 'PUBLISHED', no_index: false },
        include: { category: true },
      });
    } catch (err) {
      console.error('[prerender /blog/:slug] DB query failed:', err);
      blogDbFailed = true;
    }

    if (blogDbFailed) {
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    if (!post) {
      return c.text('Post Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
      const pageTitle = post.meta_title || `${post.title} | TrustHyre`;
      const pageDesc = post.meta_description || post.excerpt || '';
      const canonical = post.canonical_url || `${BASE_DOMAIN}/blog/${post.slug}`;
      const imageUrl = post.cover_image_url || `${BASE_DOMAIN}/logo.png`;
      const pubDate = post.published_at ? new Date(post.published_at).toISOString() : new Date().toISOString();
      const modDate = post.updated_at ? new Date(post.updated_at).toISOString() : pubDate;

      const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: pageDesc,
        image: [imageUrl],
        datePublished: pubDate,
        dateModified: modDate,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical,
        },
        author: {
          '@type': 'Person',
          name: post.author_name || 'TrustHyre Editorial Team',
        },
        publisher: {
          '@type': 'Organization',
          name: 'TrustHyre',
          url: BASE_DOMAIN,
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_DOMAIN}/logo.png`,
          },
        },
      };

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
  <link rel="canonical" href="${canonical}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="TrustHyre">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="article:published_time" content="${pubDate}">
  <meta property="article:modified_time" content="${modDate}">
  <meta property="article:author" content="${escapeHtml(post.author_name || 'TrustHyre')}">
  ${post.category ? `<meta property="article:section" content="${escapeHtml(post.category.name)}">` : ''}

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonical}">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Schema.org JSON-LD -->
  <script type="application/ld+json">
${JSON.stringify(articleJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 24px; color: #111;">
  <nav style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
    <a href="${BASE_DOMAIN}/" style="text-decoration: none; font-weight: bold; color: #0f2f63;">TrustHyre</a> &gt; 
    <a href="${BASE_DOMAIN}/blog" style="text-decoration: none; color: #555;">Blog</a>
    ${post.category ? `&gt; <a href="${BASE_DOMAIN}/blog/category/${post.category.slug}" style="text-decoration: none; color: #555;">${escapeHtml(post.category.name)}</a>` : ''}
  </nav>
  <article>
    <header style="margin-bottom: 24px;">
      <h1 style="font-size: 2rem; color: #0a0a0a; margin-bottom: 8px;">${escapeHtml(post.title)}</h1>
      <p style="color: #666; font-size: 0.9rem;">
        By <strong>${escapeHtml(post.author_name || 'TrustHyre Team')}</strong> • Published on ${new Date(pubDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </header>
    ${post.cover_image_url ? `<img src="${post.cover_image_url}" alt="${escapeHtml(post.title)}" style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 12px; margin-bottom: 24px;">` : ''}
    <div style="font-size: 1.05rem; color: #222;">
      ${renderMarkdownPreview(post.content || post.excerpt)}
    </div>
  </article>
  <footer style="margin-top: 48px; border-top: 1px solid #eee; padding-top: 24px;">
    <p>Discover verified blue-collar opportunities and hire top skilled talent at <a href="${BASE_DOMAIN}/">TrustHyre.com</a>.</p>
  </footer>
</body>
</html>`;
      return c.html(html, 200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      });
  }

  // 1.4 Programmatic City & Trade Hubs: /jobs-in-:city or /jobs-in-:city/:trade
  if (cleanPath.startsWith('/jobs-in-')) {
    const hubParts = cleanPath.replace(/^\/jobs-in-/, '').split('/');
    const citySlug = (hubParts[0] || 'chennai').toLowerCase().trim();
    const tradeSlug = (hubParts[1] || '').toLowerCase().trim();

    if (!ALLOWED_CITIES.includes(citySlug) || (tradeSlug && !ALLOWED_TRADES.includes(tradeSlug))) {
      return c.text('Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const normCity = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

    const tradeKeywords = tradeSlug ? (TRADE_KEYWORD_MAP[tradeSlug] || [tradeSlug]) : [];

    let hubJobs: any[] = [];
    let hubDbFailed = false;

    try {
      const whereClause: any = {
        city: { contains: normCity, mode: 'insensitive' },
        OR: [{ status: 'ACTIVE' }, { status: 'OPEN' }],
        AND: [
          {
            OR: [
              { expires_at: null },
              { expires_at: { gt: new Date() } }
            ]
          }
        ]
      };

      if (tradeKeywords.length > 0) {
        whereClause.AND.push({
          OR: [
            ...tradeKeywords.map(kw => ({ title: { contains: kw, mode: 'insensitive' } })),
            ...tradeKeywords.map(kw => ({ industry: { contains: kw, mode: 'insensitive' } }))
          ]
        });
      }

      hubJobs = await (prisma as any).jobs.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          city: true,
          location: true,
          employer_name: true,
          budget: true,
          payout_frequency: true,
          description: true,
          created_at: true,
        },
        take: 20,
        orderBy: { created_at: 'desc' },
      });
    } catch (err) {
      console.error('[prerender /jobs-in-*] DB query failed:', err);
      hubDbFailed = true;
    }

    if (hubDbFailed) {
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    // Guard against thin empty pages triggering soft-404
    if (hubJobs.length === 0) {
      return c.text(`No active ${tradeSlug || 'trade'} job openings found in ${normCity}`, 404, {
        'Content-Type': 'text/plain; charset=utf-8',
      });
    }

    const pageTitle = tradeSlug
      ? `${tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1)} Jobs in ${normCity} | Verified Openings - TrustHyre`
      : `Verified Skilled & Blue Collar Jobs in ${normCity} - TrustHyre`;

    const pageDesc = tradeSlug
      ? `Apply to verified ${tradeSlug} vacancies in ${normCity}. Transparent wage pay, direct employer hiring, and zero middleman commissions on TrustHyre.`
      : `Explore verified frontline and skilled trade jobs across ${normCity}. Instant direct application with photo-verified worksite inspections.`;

    const canonical = `${BASE_DOMAIN}${cleanPath}`;

    const itemListJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: pageTitle,
      description: pageDesc,
      numberOfItems: hubJobs.length,
      itemListElement: hubJobs.map((j: any, idx: number) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${BASE_DOMAIN}/job/${generateJobSeoSlug(j)}`,
        name: j.title,
        item: {
          '@type': 'JobPosting',
          title: j.title,
          hiringOrganization: {
            '@type': 'Organization',
            name: j.employer_name || 'TrustHyre Verified Employer',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              ...resolveGeoAddress(j.city || normCity, j.location),
            },
          },
        },
      })),
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${JSON.stringify(itemListJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 24px; color: #111;">
  <header style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
    <h1 style="font-size: 2rem; color: #0f2f63; margin-bottom: 8px;">${escapeHtml(pageTitle)}</h1>
    <p style="color: #555; font-size: 1rem;">${escapeHtml(pageDesc)}</p>
  </header>
  <section>
    <h2 style="font-size: 1.3rem; margin-bottom: 16px;">Active Verified Openings in ${escapeHtml(normCity)} (${hubJobs.length})</h2>
    <div style="display: grid; gap: 16px;">
      ${hubJobs.map((j: any) => {
        const payFreq = (j.payout_frequency || 'MONTHLY').toUpperCase();
        const payLabelMap: Record<string, string> = {
          MONTHLY: 'month',
          WEEKLY: 'week',
          DAILY: 'day',
          HOURLY: 'hour',
        };
        const payLabel = payLabelMap[payFreq] || 'month';
        const seoSlug = generateJobSeoSlug(j);

        return `
        <article style="border: 1px solid #e2e4e9; border-radius: 12px; padding: 16px; background: #fff;">
          <h3 style="margin: 0 0 8px 0; font-size: 1.15rem;">
            <a href="${BASE_DOMAIN}/job/${seoSlug}" style="color: #0f2f63; text-decoration: none; font-weight: bold;">${escapeHtml(j.title)}</a>
          </h3>
          <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9rem;">
            Employer: <strong>${escapeHtml(j.employer_name || 'TrustHyre Verified Employer')}</strong> • Location: <strong>${escapeHtml(j.city || normCity)}</strong>
            ${j.budget ? ` • Salary: <strong>₹${Number(j.budget).toLocaleString('en-IN')}/${payLabel}</strong>` : ''}
          </p>
          <a href="${BASE_DOMAIN}/job/${seoSlug}" style="display: inline-block; background: #0f2f63; color: white; padding: 6px 14px; border-radius: 9999px; text-decoration: none; font-size: 0.85rem; font-weight: bold;">View Details &amp; Apply</a>
        </article>`;
      }).join('')}
    </div>
  </section>
</body>
</html>`;

    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    });
  }

  // 1.45 Programmatic Employer Hiring Hubs: /hire-:trade-in-:city or /hire-workers-in-:city
  if (cleanPath.startsWith('/hire-')) {
    const hubParts = cleanPath.replace(/^\/hire-/, '').split('-in-');
    const tradeSlug = (hubParts[0] || 'workers').toLowerCase().trim();
    const citySlug = (hubParts[1] || 'chennai').toLowerCase().trim();

    const ALLOWED_CITIES = ['chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'tiruppur', 'bengaluru'];
    const ALLOWED_TRADES = ['electricians', 'drivers', 'cooks', 'plumbers', 'welders', 'warehouse', 'workers'];

    if (!ALLOWED_CITIES.includes(citySlug) || !ALLOWED_TRADES.includes(tradeSlug)) {
      return c.text('Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const normCity = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
    const normTrade = tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1);

    const pageTitle = `Hire Verified ${normTrade} in ${normCity} | Zero Brokerage - TrustHyre`;
    const pageDesc = `Looking to hire verified ${normTrade.toLowerCase()} in ${normCity}? Connect directly with skill-tested candidates and verified work records with zero agency commissions on TrustHyre.`;
    const canonical = `${BASE_DOMAIN}${cleanPath}`;

    const serviceJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `Hire ${normTrade} in ${normCity}`,
      provider: {
        '@type': 'Organization',
        name: 'TrustHyre',
        url: BASE_DOMAIN,
      },
      areaServed: {
        '@type': 'City',
        name: normCity,
      },
      description: pageDesc,
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${JSON.stringify(serviceJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 24px; color: #111;">
  <header style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
    <h1 style="font-size: 2rem; color: #0f2f63; margin-bottom: 8px;">${escapeHtml(pageTitle)}</h1>
    <p style="color: #555; font-size: 1rem;">${escapeHtml(pageDesc)}</p>
  </header>
  <section style="background: #f8f9fa; border: 1px solid #e2e4e9; border-radius: 12px; padding: 24px; text-align: center;">
    <h2 style="color: #0f2f63; margin-top: 0;">Direct Employer Candidate Gateway</h2>
    <p style="color: #666; max-width: 600px; margin: 0 auto 16px auto;">Connect with verified, skill-evaluated ${escapeHtml(normTrade.toLowerCase())} in ${escapeHtml(normCity)} without paying middle-men recruiter commissions.</p>
    <a href="${BASE_DOMAIN}/post-job" style="display: inline-block; background: #0f2f63; color: white; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-size: 0.95rem; font-weight: bold;">Post Job &amp; Hire Talent</a>
  </section>
</body>
</html>`;

    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    });
  }

  // 1.5 Job Post Details: /job/:slug-or-id or /jobs/:slug-or-id
  if (cleanPath.startsWith('/job/') || cleanPath.startsWith('/jobs/')) {
    const rawSlugOrId = cleanPath.replace(/^\/jobs?\//, '').trim();
    // Two-stage UUID extraction: extract trailing 36-char UUID or exact UUID
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const uuidMatch = rawSlugOrId.match(uuidRegex);
    const jobId = uuidMatch ? uuidMatch[0] : (rawSlugOrId.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/) ? rawSlugOrId : null);
    
    // Malformed ID check before calling database
    if (!jobId) {
      return c.text('Job Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    
    let job: any = null;
    let jobDbFailed = false;

    try {
      job = await (prisma as any).jobs.findFirst({
        where: { id: jobId },
        select: {
          id: true,
          title: true,
          description: true,
          employer_name: true,
          city: true,
          location: true,
          address: true,
          budget: true,
          created_at: true,
          updated_at: true,
          expires_at: true,
          status: true,
          cover_image_url: true,
          payout_frequency: true,
        },
      });
    } catch (err) {
      console.error('[prerender /job/:id] DB query failed:', err);
      jobDbFailed = true;
    }

    if (jobDbFailed) {
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    if (!job) {
      return c.text('Job Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const jobStatus = (job.status || '').toUpperCase().trim();
    const isDraftOrUnpublished = ['DRAFT', 'PENDING', 'PENDING_REVIEW', 'UNPUBLISHED'].includes(jobStatus);
    if (isDraftOrUnpublished) {
      return c.text('Job Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const isExpired = job.expires_at && new Date(job.expires_at) < new Date();
    const isClosedStatus = ['CLOSED', 'EXPIRED', 'FILLED', 'CANCELLED', 'ARCHIVED'].includes(jobStatus);

    if (isExpired || isClosedStatus) {
      return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Job No Longer Available | TrustHyre</title>
  <meta name="robots" content="noindex, nofollow">
</head>
<body style="font-family: system-ui, sans-serif; padding: 48px 24px; text-align: center; color: #1e293b;">
  <h1 style="color: #0f2f63; font-size: 1.75rem;">This job opening has closed</h1>
  <p style="color: #64748b; margin: 12px 0 24px 0;">This position has been filled or the posting is no longer active.</p>
  <a href="${BASE_DOMAIN}/search" style="display: inline-block; background: #0f2f63; color: white; padding: 10px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold;">Browse Open Verified Jobs</a>
</body>
</html>`, 410, { 'Content-Type': 'text/html; charset=utf-8' });
    }

    if (!['ACTIVE', 'OPEN'].includes(jobStatus)) {
      return c.text('Job Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const canonicalSlug = generateJobSeoSlug(job);
    const expectedCanonicalPath = `/job/${canonicalSlug}`;

    // Server-side 301 Permanent Redirect for crawlers hitting legacy /job/:uuid or /jobs/:uuid
    if (cleanPath !== expectedCanonicalPath) {
      return c.redirect(`${BASE_DOMAIN}${expectedCanonicalPath}`, 301);
    }

    const pageTitle = `${job.title} | ${job.city || 'India'} | TrustHyre Verified Jobs`;
    const pageDesc = job.description
      ? (job.description.length > 160 ? job.description.slice(0, 157) + '...' : job.description)
      : `Verified job opening for ${job.title} in ${job.city || 'India'}. Apply directly with verified skill check-in on TrustHyre.`;
    const canonical = `${BASE_DOMAIN}/job/${generateJobSeoSlug(job)}`;
    const imageUrl = job.cover_image_url || `${BASE_DOMAIN}/logo.png`;
    const pubDate = job.created_at ? new Date(job.created_at).toISOString() : new Date().toISOString();
    const validThrough = job.expires_at ? new Date(job.expires_at).toISOString() : undefined;

    const payFreq = (job.payout_frequency || 'MONTHLY').toUpperCase();
    const unitTextMap: Record<string, string> = {
      MONTHLY: 'MONTH',
      WEEKLY: 'WEEK',
      DAILY: 'DAY',
      HOURLY: 'HOUR',
    };
    const unitText = unitTextMap[payFreq];
    const payLabelMap: Record<string, string> = {
      MONTHLY: 'month',
      WEEKLY: 'week',
      DAILY: 'day',
      HOURLY: 'hour',
      ONE_TIME: 'project',
    };
    const payLabel = payLabelMap[payFreq] || 'project';

    const jobPostingJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description || pageDesc,
      datePosted: pubDate,
      ...(validThrough ? { validThrough } : {}),
      employmentType: 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: job.employer_name || 'TrustHyre Verified Employer',
        sameAs: BASE_DOMAIN,
        logo: `${BASE_DOMAIN}/logo.png`,
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          ...resolveGeoAddress(job.city, job.address || job.location),
        },
      },
      ...(job.budget && Number(job.budget) > 0 && unitText ? {
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: 'INR',
          value: {
            '@type': 'QuantitativeValue',
            value: Number(job.budget),
            unitText: unitText,
          },
        },
      } : {}),
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="TrustHyre">
  <meta property="og:url" content="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:image" content="${imageUrl}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonical}">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}">
  <meta name="twitter:image" content="${imageUrl}">

  <script type="application/ld+json">
${JSON.stringify(jobPostingJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 24px; color: #111;">
  <nav style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 12px;">
    <a href="${BASE_DOMAIN}/" style="text-decoration: none; font-weight: bold; color: #0f2f63;">TrustHyre</a> &gt; 
    <a href="${BASE_DOMAIN}/search" style="text-decoration: none; color: #555;">Jobs</a> &gt; 
    <span style="color: #777;">${escapeHtml(job.title)}</span>
  </nav>
  <article>
    <header style="margin-bottom: 24px;">
      <h1 style="font-size: 2rem; color: #0a0a0a; margin-bottom: 8px;">${escapeHtml(job.title)}</h1>
      <p style="color: #666; font-size: 0.95rem;">
        Employer: <strong>${escapeHtml(job.employer_name || 'TrustHyre Verified Employer')}</strong> • Location: <strong>${escapeHtml(job.city || 'India')}</strong>
        ${job.budget && Number(job.budget) > 0 ? ` • Salary: <strong>₹${Number(job.budget).toLocaleString('en-IN')}/${payLabel}</strong>` : ''}
      </p>
    </header>
    <div style="font-size: 1.05rem; color: #222; margin-bottom: 32px;">
      <p>${escapeHtml(job.description || 'Verified job requisition on TrustHyre.')}</p>
    </div>
    <div style="margin: 24px 0;">
      <a href="${canonical}" style="display: inline-block; background-color: #0f2f63; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold;">Apply on TrustHyre</a>
    </div>
  </article>
</body>
</html>`;

    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    });
  }

  // 2. Blog Listing Index: /blog
  if (cleanPath === '/blog') {
    let posts: any[] = [];
    try {
      posts = await (prisma as any).blog_posts.findMany({
        where: { status: 'PUBLISHED', no_index: false },
        include: { category: true },
        orderBy: { published_at: 'desc' },
        take: 20,
      });
    } catch (err) {
      console.error('[prerender /blog] DB query failed:', err);
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    const postItems = posts.map((p: any) => `
      <article style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
        <h2 style="font-size: 1.3rem; margin: 0 0 6px 0;">
          <a href="${BASE_DOMAIN}/blog/${p.slug}" style="color: #0f2f63; text-decoration: none;">${escapeHtml(p.title)}</a>
        </h2>
        <p style="color: #666; font-size: 0.85rem; margin: 0 0 8px 0;">
          ${p.published_at ? new Date(p.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : ''} 
          ${p.category ? `• ${escapeHtml(p.category.name)}` : ''}
        </p>
        <p style="color: #333; font-size: 0.95rem; margin: 0;">${escapeHtml(p.excerpt || '')}</p>
      </article>
    `).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TrustHyre Blog | Blue-Collar Hiring Guides &amp; Trade Insights India</title>
  <meta name="description" content="Explore expert hiring checklists, blue-collar wage benchmarks, and workforce compliance guides for India's verified trades.">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${BASE_DOMAIN}/blog">
</head>
<body style="font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 24px;">
  <header style="margin-bottom: 32px; border-bottom: 2px solid #0f2f63; padding-bottom: 16px;">
    <h1 style="color: #0f2f63; margin: 0;">TrustHyre Blog &amp; Hiring Guides</h1>
    <p style="color: #666; margin-top: 4px;">Industry insights and actionable hiring resources for skilled trade professionals in India.</p>
  </header>
  <main>
    ${postItems}
  </main>
</body>
</html>`;
    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    });
  }

  // 2.5 Blog Category Pages: /blog/category/:slug
  if (cleanPath.startsWith('/blog/category/')) {
    const categorySlug = cleanPath.replace('/blog/category/', '').trim();

    let category: any = null;
    let categoryDbFailed = false;

    try {
      category = await (prisma as any).blog_categories.findFirst({
        where: { slug: categorySlug },
      });
    } catch (err) {
      console.error('[prerender /blog/category] Category query failed:', err);
      categoryDbFailed = true;
    }

    if (categoryDbFailed) {
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    if (!category) {
      return c.text('Category Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    let catPosts: any[] = [];

    try {
      catPosts = await (prisma as any).blog_posts.findMany({
        where: {
          status: 'PUBLISHED',
          no_index: false,
          published_at: { not: null },
          category_id: category.id,
        },
        select: {
          slug: true,
          title: true,
          excerpt: true,
          published_at: true,
          cover_image_url: true,
        },
        orderBy: { published_at: 'desc' },
        take: 20,
      });
    } catch (err) {
      console.error('[prerender /blog/category] Posts query failed:', err);
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    const canonical = `${BASE_DOMAIN}/blog/category/${categorySlug}`;
    const pageTitle = `${category.name} | Hiring Guides & Workforce Insights | TrustHyre`;
    const pageDesc = `Browse ${category.name} articles and market hiring guides on TrustHyre. Verified wage benchmarks and trade recruitment strategies.`;

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_DOMAIN },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_DOMAIN}/blog` },
        { '@type': 'ListItem', position: 3, name: category.name, item: canonical },
      ],
    };

    const postListHtml = catPosts.map((p: any) => `
      <article style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; background: #fff;">
        <h2 style="font-size: 1.15rem; margin: 0 0 6px 0;">
          <a href="${BASE_DOMAIN}/blog/${p.slug}" style="color: #0f2f63; text-decoration: underline;">
            ${escapeHtml(p.title)}
          </a>
        </h2>
        <p style="color: #64748b; font-size: 0.9rem; margin: 0;">
          ${escapeHtml(p.excerpt || '')}
        </p>
      </article>
    `).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${JSON.stringify(breadcrumbJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 24px; color: #0a0a0a; background: #f8fafc;">
  <nav style="margin-bottom: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; font-size: 0.9rem;">
    <a href="${BASE_DOMAIN}/" style="color: #0f2f63; text-decoration: none;">TrustHyre</a> &gt; 
    <a href="${BASE_DOMAIN}/blog" style="color: #0f2f63; text-decoration: none;">Blog</a> &gt; 
    <span style="color: #64748b;">${escapeHtml(category.name)}</span>
  </nav>
  <header style="margin-bottom: 24px;">
    <h1 style="color: #0f2f63; font-size: 1.75rem; margin: 0 0 8px 0;">${escapeHtml(category.name)}</h1>
    <p style="color: #64748b; margin: 0;">${escapeHtml(pageDesc)}</p>
  </header>
  <main>
    ${catPosts.length > 0 ? postListHtml : '<p style="color: #64748b;">No articles published yet in this category.</p>'}
  </main>
  <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 0.85rem;">
    <a href="${BASE_DOMAIN}/">Home</a> • <a href="${BASE_DOMAIN}/blog">Blog</a> • <a href="${BASE_DOMAIN}/search">Search Jobs</a>
  </footer>
</body>
</html>`;

    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=14400',
    });
  }

  // 3. Crawler pre-render for /search or /jobs (Solves Googlebot "No referring sitemaps/pages detected" on CSR SPAs)
  if (cleanPath === '/search' || cleanPath === '/jobs' || cleanPath === '/find-jobs') {
    let activeJobs: any[] = [];
    let searchDbFailed = false;

    try {
      activeJobs = await (prisma as any).jobs.findMany({
        where: {
          AND: [
            {
              OR: [
                { status: 'ACTIVE' },
                { status: 'OPEN' }
              ]
            },
            {
              OR: [
                { expires_at: null },
                { expires_at: { gt: new Date() } }
              ]
            }
          ]
        },
        select: {
          id: true,
          title: true,
          employer_name: true,
          city: true,
          location: true,
          budget: true,
          industry: true,
          created_at: true,
          payout_frequency: true,
        },
        orderBy: { created_at: 'desc' },
        take: 50,
      });
    } catch (err) {
      console.error('[prerender /search] DB query failed:', err);
      searchDbFailed = true;
    }

    if (searchDbFailed) {
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    const jobListItems = activeJobs.map((j: any) => {
      const payFreq = (j.payout_frequency || 'MONTHLY').toUpperCase();
      const freqLabel: Record<string, string> = {
        MONTHLY: 'month',
        WEEKLY: 'week',
        DAILY: 'day',
        HOURLY: 'hour',
      };
      const payLabel = freqLabel[payFreq] || 'month';
      const seoSlug = generateJobSeoSlug(j);

      return `
      <article style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; background: #fff;">
        <h2 style="font-size: 1.15rem; margin: 0 0 6px 0;">
          <a href="${BASE_DOMAIN}/job/${seoSlug}" style="color: #0f2f63; text-decoration: underline;">${escapeHtml(j.title || 'Verified Job Opening')}</a>
        </h2>
        <p style="color: #475569; font-size: 0.9rem; margin: 0 0 6px 0;">
          <strong>${escapeHtml(j.employer_name || 'Verified Direct Employer')}</strong> • ${escapeHtml(j.city || 'India')} • <span>${escapeHtml(j.industry || 'Trade')}</span>
        </p>
        <p style="color: #16a34a; font-weight: bold; font-size: 0.95rem; margin: 0;">
          ${j.budget && Number(j.budget) > 0 ? `₹${Number(j.budget).toLocaleString('en-IN')} / ${payLabel}` : 'Attractive Verified Wage'}
        </p>
      </article>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Search Verified Jobs in India | Direct Employer Hiring | TrustHyre</title>
  <meta name="description" content="Apply for verified jobs in India on TrustHyre. Filter by salary, daily wage, trade, experience, and location. Call employers directly with zero consultant commission.">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${BASE_DOMAIN}/search">
  <meta property="og:title" content="Search Verified Jobs in India | Direct Employer Hiring | TrustHyre">
  <meta property="og:description" content="Apply for verified jobs in India on TrustHyre. Filter by salary, daily wage, trade & city. Call employers directly with zero consultant commission.">
  <meta property="og:url" content="${BASE_DOMAIN}/search">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 24px; color: #0a0a0a; background: #f8fafc;">
  <header style="margin-bottom: 24px; border-bottom: 2px solid #0f2f63; padding-bottom: 16px;">
    <h1 style="color: #0f2f63; margin: 0; font-size: 1.75rem;">Verified Job Vacancies in India</h1>
    <p style="color: #64748b; margin-top: 6px;">Browse verified job openings with direct employer hiring and zero agency commission on TrustHyre.</p>
  </header>
  <main>
    ${jobListItems}
  </main>
  <footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 0.85rem;">
    <a href="${BASE_DOMAIN}/">Home</a> • <a href="${BASE_DOMAIN}/search">Search Jobs</a> • <a href="${BASE_DOMAIN}/blog">Blog</a>
  </footer>
</body>
</html>`;

    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    });
  }

  // 4. Fallback generic crawl shell
  return c.text('Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
});

function escapeHtml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdownPreview(markdown: string): string {
  return String(markdown || '')
    .split('\n\n')
    .map(p => {
      const trimmed = p.trim();
      if (trimmed.startsWith('# ')) return `<h1 style="font-size: 1.6rem; margin-top: 24px;">${escapeHtml(trimmed.slice(2))}</h1>`;
      if (trimmed.startsWith('## ')) return `<h2 style="font-size: 1.3rem; margin-top: 20px;">${escapeHtml(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith('### ')) return `<h3 style="font-size: 1.1rem; margin-top: 16px;">${escapeHtml(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map(li => `<li>${escapeHtml(li.replace(/^[-*]\s*/, ''))}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .join('');
}

