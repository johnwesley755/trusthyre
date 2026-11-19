import { Hono } from 'hono';
import { prisma } from '../config/prisma';
import { SitemapService } from '../services/sitemapService';
import { 
  generateJobSeoSlug, 
  generateHierarchicalJobUrl, 
  ALLOWED_CITIES, 
  ALLOWED_TRADES, 
  TRADE_KEYWORD_MAP,
  isValidNeighborhoodForCity,
  getTaluksForCity,
  getWorkerRoleTitle,
} from '../utils/seoSlug.util';

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
      const wordCount = (post.content || '').split(/\s+/).filter(Boolean).length;

      // Extract FAQs for Schema.org FAQPage structured data
      const faqs = extractFaqsFromMarkdown(post.content || '');
      const faqJsonLd = faqs.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: f.answer,
          },
        })),
      } : null;

      const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_DOMAIN },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_DOMAIN}/blog` },
          ...(post.category ? [{ '@type': 'ListItem', position: 3, name: post.category.name, item: `${BASE_DOMAIN}/blog/category/${post.category.slug}` }] : []),
          { '@type': 'ListItem', position: post.category ? 4 : 3, name: post.title, item: canonical },
        ],
      };

      const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: pageDesc,
        image: [imageUrl],
        datePublished: pubDate,
        dateModified: modDate,
        wordCount: wordCount,
        inLanguage: 'en-IN',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonical,
        },
        author: {
          '@type': 'Person',
          name: post.author_name || 'TrustHyre Editorial Team',
          jobTitle: post.author_role || 'Industry Specialist',
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

      // Fetch related articles from the same category for silo linking
      let relatedPosts: any[] = [];
      try {
        if (post.category_id) {
          relatedPosts = await (prisma as any).blog_posts.findMany({
            where: {
              category_id: post.category_id,
              id: { not: post.id },
              status: 'PUBLISHED',
              no_index: false,
            },
            select: {
              slug: true,
              title: true,
              excerpt: true,
              read_time_minutes: true,
            },
            take: 3,
            orderBy: { published_at: 'desc' },
          });
        }
      } catch (err) {
        console.warn('[prerender /blog/:slug] Related posts query failed:', err);
      }

      const relatedPostsHtml = relatedPosts.length > 0 ? `
        <section style="margin-top: 48px; border-top: 2px solid #e2e8f0; padding-top: 32px;">
          <h3 style="font-size: 1.3rem; color: #0f2f63; margin-bottom: 20px; font-weight: 700;">
            Related Guides &amp; Workforce Benchmarks
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
            ${relatedPosts.map(rp => `
              <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc;">
                <h4 style="font-size: 1rem; margin: 0 0 8px 0;">
                  <a href="${BASE_DOMAIN}/blog/${rp.slug}" style="color: #0f2f63; text-decoration: underline; font-weight: 600;">
                    ${escapeHtml(rp.title)}
                  </a>
                </h4>
                <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">
                  ${escapeHtml(rp.excerpt ? rp.excerpt.slice(0, 110) + '...' : '')}
                </p>
                <span style="font-size: 0.75rem; color: #0284c7; font-weight: 600;">⚡ ${rp.read_time_minutes || 5} min read</span>
              </div>
            `).join('')}
          </div>
        </section>
      ` : '';

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
${JSON.stringify(breadcrumbJsonLd, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(articleJsonLd, null, 2)}
  </script>
  ${faqJsonLd ? `
  <script type="application/ld+json">
${JSON.stringify(faqJsonLd, null, 2)}
  </script>
  ` : ''}
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 860px; margin: 0 auto; padding: 24px; color: #111; background: #ffffff;">
  <nav style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 12px; font-size: 0.9rem;">
    <a href="${BASE_DOMAIN}/" style="text-decoration: none; font-weight: bold; color: #0f2f63;">TrustHyre</a> &gt; 
    <a href="${BASE_DOMAIN}/blog" style="text-decoration: none; color: #555;">Blog</a>
    ${post.category ? `&gt; <a href="${BASE_DOMAIN}/blog/category/${post.category.slug}" style="text-decoration: none; color: #555;">${escapeHtml(post.category.name)}</a>` : ''}
    &gt; <span style="color: #64748b;">${escapeHtml(post.title)}</span>
  </nav>
  <article>
    <header style="margin-bottom: 24px;">
      <h1 style="font-size: 2.2rem; color: #0a0a0a; margin-bottom: 12px; line-height: 1.25; font-weight: 800;">${escapeHtml(post.title)}</h1>
      <p style="color: #64748b; font-size: 0.95rem;">
        By <strong>${escapeHtml(post.author_name || 'TrustHyre Team')}</strong> (${escapeHtml(post.author_role || 'Industry Specialist')}) • Published on ${new Date(pubDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} • ⏱️ ${post.read_time_minutes || 6} min read (${wordCount} words)
      </p>
    </header>
    ${post.cover_image_url ? `<img src="${post.cover_image_url}" alt="${escapeHtml(post.title)}" style="width: 100%; max-height: 420px; object-fit: cover; border-radius: 12px; margin-bottom: 28px;">` : ''}
    <div style="font-size: 1.05rem; color: #334155; line-height: 1.7;">
      ${renderMarkdownPreview(post.content || post.excerpt)}
    </div>
  </article>

  <!-- Job Hub Discovery Banner -->
  <div style="margin-top: 40px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 8px;">
    <h3 style="margin: 0; color: #1e3a8a; font-size: 1.15rem; font-weight: 700;">Find Verified Trade &amp; Blue-Collar Opportunities</h3>
    <p style="margin: 0; color: #1e40af; font-size: 0.95rem;">Looking for verified jobs or pre-screened specialists? TrustHyre connects contractors, facility managers, and enterprise employers with audited blue-collar specialists.</p>
    <div style="margin-top: 8px;">
      <a href="${BASE_DOMAIN}/search" style="display: inline-block; background: #0f2f63; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem; margin-right: 12px;">Browse Jobs</a>
      <a href="${BASE_DOMAIN}/find-workers" style="display: inline-block; background: #ffffff; color: #0f2f63; border: 1px solid #0f2f63; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">Hire Workers</a>
    </div>
  </div>

  ${relatedPostsHtml}

  <footer style="margin-top: 48px; border-top: 1px solid #eee; padding-top: 24px; font-size: 0.9rem; color: #64748b;">
    <p>Discover verified blue-collar opportunities and hire top skilled talent at <a href="${BASE_DOMAIN}/" style="color: #0f2f63; text-decoration: underline;">TrustHyre.com</a>.</p>
    <p><a href="${BASE_DOMAIN}/blog">All Blog Articles</a> • <a href="${BASE_DOMAIN}/blog/category/salary-benchmarks">Wage Benchmarks</a> • <a href="${BASE_DOMAIN}/blog/category/hiring-guides">Hiring Playbooks</a> • <a href="${BASE_DOMAIN}/blog/category/trade-jobs">Trade Jobs</a></p>
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

    const ALLOWED_CITIES_LOCAL = [
      'chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem', 'tiruppur', 
      'bengaluru', 'hyderabad', 'mumbai', 'pune', 'delhi', 'kolkata', 'sriperumbudur'
    ];
    const ALLOWED_TRADES_LOCAL = [
      'electricians', 'electrician', 
      'drivers', 'driver', 
      'cooks', 'cook', 
      'plumbers', 'plumber', 
      'welders', 'welder', 
      'warehouse', 'warehouses', 'warehouse-staff', 'warehouse-workers', 'logistics',
      'security', 'security-guard', 'security-guards',
      'housekeeping', 'cleaners', 'cleaner',
      'carpenters', 'carpenter', 'carpentry',
      'masons', 'mason', 'masonry',
      'painters', 'painter',
      'mechanics', 'mechanic',
      'tailors', 'tailor',
      'fitters', 'fitter',
      'workers', 'worker'
    ];

    if (!ALLOWED_CITIES_LOCAL.includes(citySlug) || !ALLOWED_TRADES_LOCAL.includes(tradeSlug)) {
      return c.text('Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    // 301 Permanent Redirect for nonsensical plural facility URLs like /hire-warehouses-in-:city to canonical /hire-warehouse-in-:city
    if (tradeSlug === 'warehouses' || tradeSlug === 'warehouse-staff' || tradeSlug === 'warehouse-workers') {
      return c.redirect(`/hire-warehouse-in-${citySlug}`, 301);
    }

    const normCity = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
    const normTrade = getWorkerRoleTitle(tradeSlug);

    const pageTitle = `Hire Verified ${normTrade} in ${normCity} | Direct & Zero Brokerage - TrustHyre`;
    const pageDesc = `Looking to hire verified ${normTrade.toLowerCase()} in ${normCity}? Connect directly with skill-tested candidates and verified work records with zero agency commissions on TrustHyre.`;
    const canonical = `${BASE_DOMAIN}/hire-${tradeSlug === 'warehouses' ? 'warehouse' : tradeSlug}-in-${citySlug}`;

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

  // 1.4.5 Hyper-Local Neighborhood Landing Pages: /:city/:neighborhood-jobs or /:city/:neighborhood-jobs/:trade
  const neighborhoodMatch = cleanPath.match(/^\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+-jobs)(?:\/([a-zA-Z0-9_-]+))?$/);
  if (neighborhoodMatch) {
    const citySlug = (neighborhoodMatch[1] || 'chennai').toLowerCase().trim();
    const neighborhoodSlug = (neighborhoodMatch[2] || '').replace(/-jobs$/, '').toLowerCase().trim();
    const tradeSlug = (neighborhoodMatch[3] || '').toLowerCase().trim();

    const { valid: isValidArea, areaName } = isValidNeighborhoodForCity(citySlug, neighborhoodSlug);

    if (!ALLOWED_CITIES.includes(citySlug) || !isValidArea || (tradeSlug && !ALLOWED_TRADES.includes(tradeSlug))) {
      return c.text('Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const normCity = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
    const normTrade = tradeSlug ? tradeSlug.charAt(0).toUpperCase() + tradeSlug.slice(1) : '';

    let areaJobs: any[] = [];
    let areaDbFailed = false;

    try {
      const whereClause: any = {
        city: { contains: normCity, mode: 'insensitive' },
        OR: [
          { location: { contains: areaName, mode: 'insensitive' } },
          { address: { contains: areaName, mode: 'insensitive' } },
          { location: { contains: neighborhoodSlug.replace(/-/g, ' '), mode: 'insensitive' } },
        ],
        AND: [
          { OR: [{ status: 'ACTIVE' }, { status: 'OPEN' }] },
          {
            OR: [
              { expires_at: null },
              { expires_at: { gt: new Date() } }
            ]
          }
        ]
      };

      if (tradeSlug) {
        const tradeKeywords = TRADE_KEYWORD_MAP[tradeSlug] || [tradeSlug];
        whereClause.AND.push({
          OR: [
            { industry: { in: tradeKeywords, mode: 'insensitive' } },
            ...tradeKeywords.map((kw: string) => ({ title: { contains: kw, mode: 'insensitive' } }))
          ]
        });
      }

      areaJobs = await (prisma as any).jobs.findMany({
        where: whereClause,
        take: 30,
        orderBy: { created_at: 'desc' },
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
          expires_at: true,
          payout_frequency: true,
        },
      });
    } catch (err) {
      console.error('[prerender /:city/:neighborhood-jobs] DB query failed:', err);
      areaDbFailed = true;
    }

    if (areaDbFailed) {
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    // Google Doorway Page protection: return 404 if no content in this neighborhood
    if (areaJobs.length === 0) {
      return c.text('Not Found', 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    }

    const pageTitle = tradeSlug
      ? `${normTrade} Jobs in ${areaName}, ${normCity} | Direct Employer Hiring | TrustHyre`
      : `Verified Blue-Collar Jobs in ${areaName}, ${normCity} | Direct Hiring | TrustHyre`;

    const pageDesc = `Explore ${areaJobs.length}+ verified job openings in ${areaName}, ${normCity}. Direct employer hiring with zero broker fee, confirmed worksites, and transparent wages.`;
    const canonical = `${BASE_DOMAIN}/${citySlug}/${neighborhoodSlug}-jobs${tradeSlug ? `/${tradeSlug}` : ''}`;

    const itemListJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: pageTitle,
      description: pageDesc,
      numberOfItems: areaJobs.length,
      itemListElement: areaJobs.map((job: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: job.title,
        url: `${BASE_DOMAIN}${generateHierarchicalJobUrl(job)}`,
        item: {
          '@type': 'JobPosting',
          title: job.title,
          hiringOrganization: {
            '@type': 'Organization',
            name: job.employer_name || 'TrustHyre Verified Employer',
          },
          jobLocation: {
            '@type': 'Place',
            address: {
              '@type': 'PostalAddress',
              ...resolveGeoAddress(job.city || normCity, job.address || job.location),
            },
          },
        },
      })),
    };

    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What jobs are available in ${areaName}, ${normCity}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Verified openings in ${areaName} include skilled technicians, drivers, helpers, and service staff with direct employer contacts.`
          }
        },
        {
          '@type': 'Question',
          name: `Is there any agent or broker fee?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Zero commission. TrustHyre is 100% free for job seekers.`
          }
        }
      ]
    };

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_DOMAIN}/` },
        { '@type': 'ListItem', position: 2, name: `${normCity} Jobs`, item: `${BASE_DOMAIN}/jobs-in-${citySlug}` },
        { '@type': 'ListItem', position: 3, name: `${areaName} Jobs`, item: canonical },
      ],
    };

    const cityTaluks = getTaluksForCity(citySlug);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
${JSON.stringify(itemListJsonLd, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(faqJsonLd, null, 2)}
  </script>
  <script type="application/ld+json">
${JSON.stringify(breadcrumbJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 24px; color: #111;">
  <header style="margin-bottom: 24px; border-bottom: 1px solid #eee; padding-bottom: 16px;">
    <h1 style="font-size: 2rem; color: #0f2f63; margin-bottom: 8px;">${escapeHtml(pageTitle)}</h1>
    <p style="color: #555; font-size: 1rem;">${escapeHtml(pageDesc)}</p>
    ${cityTaluks.length > 0 ? `
    <div style="margin-top: 12px; font-size: 0.9rem; color: #444;">
      <strong>Nearby ${escapeHtml(normCity)} Areas:</strong> ${escapeHtml(cityTaluks.slice(0, 8).join(' • '))}
    </div>` : ''}
  </header>
  <section>
    <h2 style="font-size: 1.3rem; color: #0f2f63;">Active Openings in ${escapeHtml(areaName)} (${areaJobs.length})</h2>
    <ul style="list-style: none; padding: 0;">
      ${areaJobs.map((job: any) => `
        <li style="margin-bottom: 16px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; font-size: 1.1rem;">
            <a href="${BASE_DOMAIN}${generateHierarchicalJobUrl(job)}" style="color: #0f2f63; text-decoration: none; font-weight: bold;">${escapeHtml(job.title)}</a>
          </h3>
          <p style="margin: 0 0 4px 0; color: #4a5568; font-size: 0.9rem;">
            Employer: <strong>${escapeHtml(job.employer_name || 'Verified Employer')}</strong> | Location: <strong>${escapeHtml(job.location || areaName)}</strong>
          </p>
          <p style="margin: 0; color: #2b6cb0; font-weight: bold; font-size: 0.9rem;">
            ${job.budget ? `Salary: ₹${Number(job.budget).toLocaleString('en-IN')}` : 'Market Competitive'}
          </p>
        </li>
      `).join('')}
    </ul>
  </section>
</body>
</html>`;

    return c.html(html, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600',
    });
  }

  // 1.5 Job Post Details:
  // Supports both canonical hierarchical format: /:city/:title/job/:id
  // and legacy formats: /job/:slug-or-id or /jobs/:slug-or-id
  const isHierarchicalJobPath = cleanPath.includes('/job/') && !cleanPath.startsWith('/job/') && !cleanPath.startsWith('/jobs/');
  const isLegacyJobPath = cleanPath.startsWith('/job/') || cleanPath.startsWith('/jobs/');

  if (isHierarchicalJobPath || isLegacyJobPath) {
    let rawSlugOrId = '';
    
    if (isHierarchicalJobPath) {
      // Format: /:city/:title/job/:id
      const parts = cleanPath.split('/job/');
      rawSlugOrId = (parts[1] || '').trim();
    } else {
      rawSlugOrId = cleanPath.replace(/^\/jobs?\//, '').trim();
    }

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

    const expectedCanonicalPath = generateHierarchicalJobUrl(job);

    // Server-side 301 Permanent Redirect for crawlers hitting legacy /job/:uuid or /job/:slug
    if (cleanPath !== expectedCanonicalPath) {
      return c.redirect(`${BASE_DOMAIN}${expectedCanonicalPath}`, 301);
    }

    const pageTitle = `${job.title} | ${job.city || 'India'} | TrustHyre Verified Jobs`;
    const pageDesc = job.description
      ? (job.description.length > 160 ? job.description.slice(0, 157) + '...' : job.description)
      : `Verified job opening for ${job.title} in ${job.city || 'India'}. Apply directly with verified skill check-in on TrustHyre.`;
    const canonical = `${BASE_DOMAIN}${expectedCanonicalPath}`;
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
    let allCategories: any[] = [];

    try {
      [catPosts, allCategories] = await Promise.all([
        (prisma as any).blog_posts.findMany({
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
            read_time_minutes: true,
            cover_image_url: true,
            author_name: true,
          },
          orderBy: { published_at: 'desc' },
          take: 30,
        }),
        (prisma as any).blog_categories.findMany({
          select: { slug: true, name: true, color: true },
          orderBy: { sort_order: 'asc' },
        }),
      ]);
    } catch (err) {
      console.error('[prerender /blog/category] Data query failed:', err);
      return c.text('Service temporarily unavailable', 503, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Retry-After': '300',
      });
    }

    const canonical = `${BASE_DOMAIN}/blog/category/${categorySlug}`;
    const pageTitle = `${category.name} | Hiring Guides & Workforce Benchmarks | TrustHyre`;
    const pageDesc = category.description || `Browse ${category.name} articles and market hiring guides on TrustHyre. Verified wage benchmarks and trade recruitment strategies.`;

    const breadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_DOMAIN },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_DOMAIN}/blog` },
        { '@type': 'ListItem', position: 3, name: category.name, item: canonical },
      ],
    };

    const collectionJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: pageTitle,
      description: pageDesc,
      url: canonical,
      hasPart: catPosts.map((p: any) => ({
        '@type': 'BlogPosting',
        headline: p.title,
        description: p.excerpt,
        url: `${BASE_DOMAIN}/blog/${p.slug}`,
      })),
    };

    const categoryNavPills = allCategories.map((c: any) => {
      const isCurrent = c.slug === categorySlug;
      return `<a href="${BASE_DOMAIN}/blog/category/${c.slug}" style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; text-decoration: none; margin: 4px; ${
        isCurrent
          ? 'background: #0f2f63; color: #ffffff;'
          : 'background: #e2e8f0; color: #334155;'
      }">${escapeHtml(c.name)}</a>`;
    }).join('');

    const postListHtml = catPosts.map((p: any) => `
      <article style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h2 style="font-size: 1.25rem; margin: 0 0 8px 0; line-height: 1.35;">
          <a href="${BASE_DOMAIN}/blog/${p.slug}" style="color: #0f2f63; text-decoration: underline; font-weight: 700;">
            ${escapeHtml(p.title)}
          </a>
        </h2>
        <p style="color: #64748b; font-size: 0.95rem; margin: 0 0 12px 0; line-height: 1.5;">
          ${escapeHtml(p.excerpt || '')}
        </p>
        <div style="font-size: 0.8rem; color: #94a3b8; display: flex; gap: 12px; align-items: center;">
          <span>By ${escapeHtml(p.author_name || 'TrustHyre Team')}</span>
          <span>•</span>
          <span>${p.published_at ? new Date(p.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently'}</span>
          <span>•</span>
          <span style="color: #0284c7; font-weight: 600;">⏱️ ${p.read_time_minutes || 5} min read</span>
        </div>
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
  <script type="application/ld+json">
${JSON.stringify(collectionJsonLd, null, 2)}
  </script>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 900px; margin: 0 auto; padding: 24px; color: #0a0a0a; background: #f8fafc;">
  <nav style="margin-bottom: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; font-size: 0.9rem;">
    <a href="${BASE_DOMAIN}/" style="color: #0f2f63; text-decoration: none; font-weight: bold;">TrustHyre</a> &gt; 
    <a href="${BASE_DOMAIN}/blog" style="color: #0f2f63; text-decoration: none;">Blog</a> &gt; 
    <span style="color: #64748b;">${escapeHtml(category.name)}</span>
  </nav>

  <header style="margin-bottom: 28px;">
    <h1 style="color: #0f2f63; font-size: 2rem; margin: 0 0 10px 0; font-weight: 800;">${escapeHtml(category.name)}</h1>
    <p style="color: #475569; margin: 0 0 20px 0; font-size: 1.05rem; line-height: 1.6;">${escapeHtml(pageDesc)}</p>
    
    <!-- Category Switcher Nav -->
    <div style="margin-top: 16px; padding: 12px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
      <span style="font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 8px;">Explore All Categories:</span>
      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
        <a href="${BASE_DOMAIN}/blog" style="display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; text-decoration: none; margin: 4px; background: #e2e8f0; color: #334155;">All Articles</a>
        ${categoryNavPills}
      </div>
    </div>
  </header>

  <main>
    <div style="margin-bottom: 16px; font-size: 0.9rem; color: #64748b; font-weight: 600;">
      Showing ${catPosts.length} published guides &amp; reports:
    </div>
    ${catPosts.length > 0 ? postListHtml : '<p style="color: #64748b;">No articles published yet in this category.</p>'}
  </main>

  <footer style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 0.9rem;">
    <p><a href="${BASE_DOMAIN}/" style="color: #0f2f63;">TrustHyre Home</a> • <a href="${BASE_DOMAIN}/blog" style="color: #0f2f63;">Blog &amp; Knowledge Base</a> • <a href="${BASE_DOMAIN}/search" style="color: #0f2f63;">Find Jobs</a> • <a href="${BASE_DOMAIN}/find-workers" style="color: #0f2f63;">Hire Workers</a></p>
    <p>© ${new Date().getFullYear()} TrustHyre. Verified Blue-Collar &amp; Skilled Workforce Platform.</p>
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

function formatInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace;">$1</code>');
  // Bold: **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italics: *text*
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Markdown links: [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const cleanHref = href.replace(/&amp;/g, '&');
    return `<a href="${cleanHref}" style="color: #0f2f63; text-decoration: underline; font-weight: 500;">${label}</a>`;
  });
  return out;
}

function renderMarkdownTable(tableBlock: string): string {
  const rows = tableBlock.trim().split('\n').map(r => r.trim()).filter(Boolean);
  if (rows.length < 2) return '';

  const parseCells = (row: string) => {
    const trimmed = row.replace(/^\|\s*/, '').replace(/\s*\|$/, '');
    return trimmed.split('|').map(c => c.trim());
  };

  const headers = parseCells(rows[0]);
  const dataRows = rows.slice(2).map(parseCells);

  const theadHtml = `<thead><tr style="background: #f8fafc; border-bottom: 2px solid #cbd5e1;">${headers
    .map(h => `<th style="padding: 12px 14px; text-align: left; font-weight: 700; color: #0f2f63; border: 1px solid #e2e8f0;">${formatInlineMarkdown(h)}</th>`)
    .join('')}</tr></thead>`;

  const tbodyHtml = `<tbody>${dataRows
    .map((cells, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `<tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">${cells
        .map(c => `<td style="padding: 10px 14px; color: #334155; border: 1px solid #e2e8f0; vertical-align: top;">${formatInlineMarkdown(c)}</td>`)
        .join('')}</tr>`;
    })
    .join('')}</tbody>`;

  return `<div style="overflow-x: auto; margin: 24px 0;"><table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 0.95rem; line-height: 1.5;">${theadHtml}${tbodyHtml}</table></div>`;
}

function extractFaqsFromMarkdown(markdown: string): Array<{ question: string; answer: string }> {
  const faqs: Array<{ question: string; answer: string }> = [];
  const lines = markdown.split('\n');
  let currentQ = '';
  let currentA: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const qMatch = line.match(/^###\s*(?:Q\d*[:.]?|FAQ\s*\d*[:.]?)\s*(.+)$/i);
    if (qMatch) {
      if (currentQ && currentA.length > 0) {
        faqs.push({ question: currentQ.trim(), answer: currentA.join(' ').trim() });
      }
      currentQ = qMatch[1].trim();
      currentA = [];
    } else if (currentQ) {
      if (line.startsWith('## ') || line.startsWith('### ')) {
        faqs.push({ question: currentQ.trim(), answer: currentA.join(' ').trim() });
        currentQ = '';
        currentA = [];
      } else if (line.length > 0 && !line.startsWith('---')) {
        currentA.push(line);
      }
    }
  }

  if (currentQ && currentA.length > 0) {
    faqs.push({ question: currentQ.trim(), answer: currentA.join(' ').trim() });
  }

  return faqs;
}

function renderMarkdownPreview(markdown: string): string {
  const blocks = String(markdown || '').split(/\n\s*\n/);
  
  return blocks
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Markdown Table: starts with | and has at least one newline with |
      if (trimmed.startsWith('|') && trimmed.includes('\n|')) {
        return renderMarkdownTable(trimmed);
      }

      // Code block
      if (trimmed.startsWith('```')) {
        const codeContent = trimmed.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        return `<pre style="background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 0.9rem; line-height: 1.4;"><code>${escapeHtml(codeContent)}</code></pre>`;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***') {
        return '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />';
      }

      // Headings
      if (trimmed.startsWith('# ')) {
        return `<h1 style="font-size: 1.75rem; color: #0a0a0a; margin: 32px 0 16px 0; font-weight: 800; line-height: 1.25;">${formatInlineMarkdown(trimmed.slice(2))}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2 style="font-size: 1.4rem; color: #0f2f63; margin: 28px 0 12px 0; font-weight: 700; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">${formatInlineMarkdown(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3 style="font-size: 1.15rem; color: #1e293b; margin: 22px 0 8px 0; font-weight: 700;">${formatInlineMarkdown(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith('#### ')) {
        return `<h4 style="font-size: 1.02rem; color: #334155; margin: 18px 0 6px 0; font-weight: 600;">${formatInlineMarkdown(trimmed.slice(5))}</h4>`;
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        const quoteText = trimmed.split('\n').map(l => l.replace(/^>\s*/, '')).join(' ');
        return `<blockquote style="border-left: 4px solid #0f2f63; padding: 12px 18px; margin: 20px 0; background: #f8fafc; color: #475569; font-style: italic; border-radius: 0 8px 8px 0;">${formatInlineMarkdown(quoteText)}</blockquote>`;
      }

      // Checklist (- [ ] or 1. [ ])
      if (/^[-*]\s*\[[ xX]\]/m.test(trimmed) || /^\d+\.\s*\[[ xX]\]/m.test(trimmed)) {
        const items = trimmed.split('\n').map(line => {
          const isChecked = /\[[xX]\]/.test(line);
          const cleanText = line.replace(/^[-*]\s*\[[ xX]\]\s*/, '').replace(/^\d+\.\s*\[[ xX]\]\s*/, '');
          const mark = isChecked ? '☑ ' : '☐ ';
          return `<li style="margin: 6px 0; list-style-type: none; display: flex; align-items: flex-start; gap: 8px;">
            <span style="color: ${isChecked ? '#10b981' : '#64748b'}; font-weight: bold;">${mark}</span>
            <span>${formatInlineMarkdown(cleanText)}</span>
          </li>`;
        }).join('');
        return `<ul style="padding-left: 0; margin: 16px 0;">${items}</ul>`;
      }

      // Unordered list
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const items = trimmed.split('\n').map(li => `<li style="margin: 6px 0;">${formatInlineMarkdown(li.replace(/^[-*]\s*/, ''))}</li>`).join('');
        return `<ul style="padding-left: 24px; margin: 16px 0; color: #334155;">${items}</ul>`;
      }

      // Ordered list
      if (/^\d+\.\s/.test(trimmed)) {
        const items = trimmed.split('\n').map(li => `<li style="margin: 6px 0;">${formatInlineMarkdown(li.replace(/^\d+\.\s*/, ''))}</li>`).join('');
        return `<ol style="padding-left: 24px; margin: 16px 0; color: #334155;">${items}</ol>`;
      }

      // Regular paragraph
      return `<p style="margin: 16px 0; color: #334155; line-height: 1.7;">${formatInlineMarkdown(trimmed)}</p>`;
    })
    .join('\n');
}

