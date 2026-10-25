import { prisma } from '../config/prisma';

export class SitemapService {
  private static readonly BASE_URL = 'https://trusthyre.com';

  /**
   * Generates a fully dynamic, standards-compliant XML sitemap.
   */
  static async generateSitemapXml(): Promise<string> {
    const staticRoutes = [
      { path: '/', priority: '1.0', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { path: '/search', priority: '0.9', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { path: '/find-workers', priority: '0.9', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { path: '/blog', priority: '0.9', changefreq: 'daily', lastmod: new Date().toISOString().split('T')[0] },
      { path: '/terms', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
      { path: '/privacy', priority: '0.4', changefreq: 'monthly', lastmod: '2026-10-22' },
    ];

    // Fetch published categories
    const categories = await (prisma as any).blog_categories.findMany({
      where: {
        posts: {
          some: { status: 'PUBLISHED' },
        },
      },
      select: {
        slug: true,
        updated_at: true,
      },
    }).catch(() => []);

    // Fetch all published articles that are not marked with no_index
    const posts = await (prisma as any).blog_posts.findMany({
      where: {
        status: 'PUBLISHED',
        no_index: false,
        published_at: { not: null },
      },
      select: {
        slug: true,
        updated_at: true,
        published_at: true,
      },
      orderBy: { published_at: 'desc' },
    }).catch(() => []);

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

    // 2. Category URLs
    for (const cat of categories) {
      const lastmodDate = cat.updated_at ? new Date(cat.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/blog/category/${cat.slug}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // 3. Article URLs
    for (const post of posts) {
      const rawDate = post.updated_at || post.published_at || new Date();
      const lastmodDate = new Date(rawDate).toISOString().split('T')[0];
      urlEntries.push(`  <url>
    <loc>${this.BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmodDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join('\n')}
</urlset>`;
  }
}
