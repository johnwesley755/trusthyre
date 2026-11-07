import { prisma } from '../config/prisma';
import { generateJobSeoSlug, ALLOWED_CITIES, ALLOWED_TRADES, TRADE_KEYWORD_MAP } from '../utils/seoSlug.util';

export class SitemapService {
  private static readonly BASE_URL = 'https://trusthyre.com';

  /**
   * Generates a fully dynamic, standards-compliant XML sitemap.
   * Includes static pages, active job openings, blog categories, and all published articles with image tags.
   * Returns { xml: string, dbError: boolean } for clear visibility on DB health.
   */
  static async generateSitemapXml(): Promise<{ xml: string; dbError: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const staticRoutes = [
      { path: '/', priority: '1.0', changefreq: 'daily', lastmod: today },
      // Note: /search removed as listing/search-result pages should not be in sitemaps per Google JobPosting guidelines
      // Note: /find-workers removed as it is protected behind RoleGuard for EMPLOYER
      { path: '/blog', priority: '0.9', changefreq: 'daily', lastmod: today },
      { path: '/terms', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
      { path: '/privacy', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
    ];

    let categories: any[] = [];
    let posts: any[] = [];
    let activeJobs: any[] = [];
    let dbError = false;

    try {
      [categories, posts, activeJobs] = await Promise.all([
        (prisma as any).blog_categories.findMany({
          where: {
            posts: {
              some: {
                status: 'PUBLISHED',
                no_index: false,
                published_at: { not: null },
              },
            },
          },
          select: {
            slug: true,
            updated_at: true,
          },
        }),
        (prisma as any).blog_posts.findMany({
          where: {
            status: 'PUBLISHED',
            no_index: false,
            published_at: { not: null },
          },
          select: {
            slug: true,
            title: true,
            cover_image_url: true,
            updated_at: true,
            published_at: true,
          },
          orderBy: { published_at: 'desc' },
        }),
        (prisma as any).jobs.findMany({
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
            industry: true,
            city: true,
            location: true,
            payout_frequency: true,
            updated_at: true,
            created_at: true,
            cover_image_url: true,
          },
          take: 5000,
          orderBy: { created_at: 'desc' },
        })
      ]);
    } catch (err) {
      console.error('[SitemapService] DB query failed during sitemap generation:', err);
      dbError = true;
    }

    const urlEntries: string[] = [];

    // 1. Static URLs
    for (const route of staticRoutes) {
      urlEntries.push(`  <url>
    <loc>${this.BASE_URL}${route.path}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
    }

    // 1.8 Programmatic City & Trade Hub URLs (Only emitted when containing active indexable job openings)
    for (const city of ALLOWED_CITIES) {
      const cityJobs = activeJobs.filter(j => j.city && j.city.toLowerCase().includes(city));
      if (cityJobs.length > 0) {
        const latestCityDate = cityJobs.reduce((acc, curr) => {
          const d = curr.updated_at || curr.created_at;
          return d && new Date(d) > acc ? new Date(d) : acc;
        }, new Date(0));
        const hubLastmod = latestCityDate.getTime() > 0 ? latestCityDate.toISOString().split('T')[0] : today;

        urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/jobs-in-${city}</loc>
    <lastmod>${hubLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);

        for (const trade of ALLOWED_TRADES) {
          const tradeKeywords = TRADE_KEYWORD_MAP[trade] || [trade];
          const tradeJobs = cityJobs.filter(j => {
            const titleMatch = tradeKeywords.some(kw => (j.title || '').toLowerCase().includes(kw));
            const indMatch = tradeKeywords.some(kw => (j.industry || '').toLowerCase().includes(kw));
            return titleMatch || indMatch;
          });

          if (tradeJobs.length > 0) {
            const latestTradeDate = tradeJobs.reduce((acc, curr) => {
              const d = curr.updated_at || curr.created_at;
              return d && new Date(d) > acc ? new Date(d) : acc;
            }, new Date(0));
            const tradeLastmod = latestTradeDate.getTime() > 0 ? latestTradeDate.toISOString().split('T')[0] : today;

            urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/jobs-in-${city}/${trade}</loc>
    <lastmod>${tradeLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>
  </url>`);
          }
        }
      }
    }

    // 2. Category URLs (Only when categories successfully loaded and have indexable posts)
    for (const cat of categories) {
      const lastmodDate = cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : today;
      urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/blog/category/${cat.slug}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // 3. Article URLs (with Google Image extension)
    for (const post of posts) {
      const rawDate = post.updated_at || post.published_at || new Date();
      const lastmodDate = new Date(rawDate).toISOString().split('T')[0];
      const imageTag = post.cover_image_url
        ? `\n    <image:image>\n      <image:loc>${this.escapeXml(post.cover_image_url)}</image:loc>\n      <image:title>${this.escapeXml(post.title)}</image:title>\n    </image:image>`
        : '';
      urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${imageTag}
  </url>`);
    }

    // 4. Active Job URLs (Formatted with unified SEO slug)
    for (const job of activeJobs) {
      const rawDate = job.updated_at || job.created_at || new Date();
      const lastmodDate = new Date(rawDate).toISOString().split('T')[0];
      const seoSlug = generateJobSeoSlug(job);
      const imageTag = job.cover_image_url
        ? `\n    <image:image>\n      <image:loc>${this.escapeXml(job.cover_image_url)}</image:loc>\n      <image:title>${this.escapeXml(job.title)}</image:title>\n    </image:image>`
        : '';
      urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/job/${seoSlug}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>${imageTag}
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join('\n')}
</urlset>`;

    return { xml, dbError };
  }

  /**
   * Generates a standard RSS 2.0 feed for blog articles.
   */
  static async generateRssXml(): Promise<string> {
    const posts = await (prisma as any).blog_posts.findMany({
      where: {
        status: 'PUBLISHED',
        no_index: false,
        published_at: { not: null },
      },
      include: {
        category: true,
      },
      orderBy: { published_at: 'desc' },
      take: 50,
    }).catch(() => []);

    const itemsXml = posts.map((post: any) => {
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : new Date().toUTCString();
      const link = `${this.BASE_URL}/blog/${post.slug}`;
      return `    <item>
      <title>${this.escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${this.escapeXml(post.excerpt || '')}</description>
      <pubDate>${pubDate}</pubDate>
      <author>editorial@trusthyre.com (${this.escapeXml(post.author_name || 'TrustHyre Editorial Team')})</author>
      ${post.category ? `<category>${this.escapeXml(post.category.name)}</category>` : ''}
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>TrustHyre Blog &amp; Blue-Collar Hiring Insights</title>
    <link>${this.BASE_URL}/blog</link>
    <description>Guides, market wage benchmarks, and workforce compliance insights for hiring verified skilled trade talent across India.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${this.BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;
  }

  private static escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
