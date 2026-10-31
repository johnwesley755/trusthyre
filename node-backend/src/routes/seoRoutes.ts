import { Hono } from 'hono';
import { prisma } from '../config/prisma';
import { SitemapService } from '../services/sitemapService';

export const seoRouter = new Hono();

const BASE_DOMAIN = 'https://trusthyre.com';

/**
 * GET /sitemap.xml
 * Dynamic XML Sitemap
 */
seoRouter.get('/sitemap.xml', async (c) => {
  const xml = await SitemapService.generateSitemapXml();
  return c.text(xml, 200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  });
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
    const post = await (prisma as any).blog_posts.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: { category: true },
    }).catch(() => null);

    if (post) {
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
  }

  // 1.5 Job Post Details: /job/:id or /jobs/:id
  if (cleanPath.startsWith('/job/') || cleanPath.startsWith('/jobs/')) {
    const jobId = cleanPath.replace(/^\/jobs?\//, '').trim();
    const job = await (prisma as any).jobs.findFirst({
      where: { id: jobId },
    }).catch(() => null);

    if (job) {
      const pageTitle = `${job.title} | ${job.city || 'India'} | TrustHyre Verified Jobs`;
      const pageDesc = job.description
        ? (job.description.length > 160 ? job.description.slice(0, 157) + '...' : job.description)
        : `Verified job opening for ${job.title} in ${job.city || 'India'}. Apply directly with verified skill check-in on TrustHyre.`;
      const canonical = `${BASE_DOMAIN}/job/${job.id}`;
      const imageUrl = job.cover_image_url || `${BASE_DOMAIN}/logo.png`;
      const pubDate = job.created_at ? new Date(job.created_at).toISOString() : new Date().toISOString();
      const validThrough = job.expires_at ? new Date(job.expires_at).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();

      const jobPostingJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: job.title,
        description: job.description || pageDesc,
        datePosted: pubDate,
        validThrough: validThrough,
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
            addressLocality: job.city || 'Chennai',
            streetAddress: job.address || job.city || 'India',
            addressCountry: 'IN',
          },
        },
        ...(job.budget && Number(job.budget) > 0 ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: 'INR',
            value: {
              '@type': 'QuantitativeValue',
              value: Number(job.budget),
              unitText: 'MONTH',
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
        ${job.budget && Number(job.budget) > 0 ? ` • Salary: <strong>₹${Number(job.budget).toLocaleString('en-IN')}/month</strong>` : ''}
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
  }

  // 2. Blog Listing Index: /blog
  if (cleanPath === '/blog') {
    const posts = await (prisma as any).blog_posts.findMany({
      where: { status: 'PUBLISHED', no_index: false },
      include: { category: true },
      orderBy: { published_at: 'desc' },
      take: 20,
    }).catch(() => []);

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

  // 3. Fallback generic crawl shell
  return c.text('TrustHyre SEO Crawl Endpoint', 200);
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

