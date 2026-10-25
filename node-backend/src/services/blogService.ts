import { prisma } from '../config/prisma';

export interface BlogFilterOptions {
  page?: number;
  limit?: number;
  categorySlug?: string;
  targetCity?: string;
  targetTrade?: string;
  search?: string;
}

export interface CreateArticleInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  authorName?: string;
  authorRole?: string;
  categoryId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  tags?: string[];
  targetCity?: string;
  targetTrade?: string;
}

export interface UpdateArticleInput extends Partial<CreateArticleInput> {
  publishedAt?: Date | null;
}

export class BlogService {
  /**
   * Helper to generate a clean, SEO-friendly URL slug.
   */
  static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  /**
   * Estimate reading time based on 200 words per minute.
   */
  static calculateReadingTime(content: string): number {
    if (!content) return 1;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  /**
   * Get all active categories with article counts.
   */
  static async getCategories() {
    const categories = await (prisma as any).blog_categories.findMany({
      orderBy: { sort_order: 'asc' },
      include: {
        _count: {
          select: {
            posts: {
              where: { status: 'PUBLISHED' },
            },
          },
        },
      },
    });

    return categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      color: cat.color,
      sortOrder: cat.sort_order,
      articleCount: cat._count?.posts || 0,
    }));
  }

  /**
   * Fetch published blog articles with pagination, search, and category/geo filters.
   */
  static async getPublishedArticles(options: BlogFilterOptions = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 12));
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'PUBLISHED',
      published_at: { not: null },
    };

    if (options.categorySlug) {
      where.category = {
        slug: options.categorySlug,
      };
    }

    if (options.targetCity) {
      where.target_city = {
        equals: options.targetCity,
        mode: 'insensitive',
      };
    }

    if (options.targetTrade) {
      where.target_trade = {
        equals: options.targetTrade,
        mode: 'insensitive',
      };
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { excerpt: { contains: term, mode: 'insensitive' } },
        { content: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, posts] = await Promise.all([
      (prisma as any).blog_posts.count({ where }),
      (prisma as any).blog_posts.findMany({
        where,
        skip,
        take: limit,
        orderBy: { published_at: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
        },
      }),
    ]);

    return {
      posts: posts.map(this.formatPostResponse),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Fetch a single published article by its SEO slug and safely increment its view count.
   */
  static async getArticleBySlug(slug: string) {
    if (!slug) return null;

    const post = await (prisma as any).blog_posts.findUnique({
      where: { slug },
      include: {
        category: true,
      },
    });

    if (!post || post.status !== 'PUBLISHED') {
      return null;
    }

    // Fire-and-forget view increment
    (prisma as any).blog_posts.update({
      where: { id: post.id },
      data: { view_count: { increment: 1 } },
    }).catch((err: any) => console.error('[BlogService] Failed to increment view count:', err));

    // Fetch up to 3 related articles (matching trade, category, or recent)
    const relatedPosts = await (prisma as any).blog_posts.findMany({
      where: {
        status: 'PUBLISHED',
        slug: { not: slug },
        OR: [
          ...(post.target_trade ? [{ target_trade: post.target_trade }] : []),
          ...(post.category_id ? [{ category_id: post.category_id }] : []),
          ...(post.target_city ? [{ target_city: post.target_city }] : []),
        ],
      },
      take: 3,
      orderBy: { published_at: 'desc' },
      include: {
        category: true,
      },
    });

    return {
      post: this.formatPostResponse(post),
      relatedPosts: relatedPosts.map(this.formatPostResponse),
    };
  }

  /**
   * Admin: List all articles (including drafts) with full filtering.
   */
  static async getAdminArticles(options: { page?: number; limit?: number; status?: string; search?: string } = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status && options.status !== 'ALL') {
      where.status = options.status;
    }
    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { author_name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, posts] = await Promise.all([
      (prisma as any).blog_posts.count({ where }),
      (prisma as any).blog_posts.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: 'desc' },
        include: {
          category: true,
        },
      }),
    ]);

    return {
      posts: posts.map(this.formatPostResponse),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Admin: Fetch article by ID for editing.
   */
  static async getArticleById(id: string) {
    const post = await (prisma as any).blog_posts.findUnique({
      where: { id },
      include: { category: true },
    });
    return post ? this.formatPostResponse(post) : null;
  }

  /**
   * Admin: Create a new blog article.
   */
  static async createArticle(input: CreateArticleInput) {
    let finalSlug = input.slug ? this.slugify(input.slug) : this.slugify(input.title);
    
    // Ensure slug uniqueness
    const existing = await (prisma as any).blog_posts.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36)}`;
    }

    const readTime = this.calculateReadingTime(input.content);
    const isPublished = input.status === 'PUBLISHED';

    const post = await (prisma as any).blog_posts.create({
      data: {
        slug: finalSlug,
        title: input.title.trim(),
        excerpt: input.excerpt.trim(),
        content: input.content,
        cover_image_url: input.coverImageUrl || null,
        author_name: input.authorName?.trim() || 'TrustHyre Editorial Team',
        author_role: input.authorRole?.trim() || 'Industry Specialist',
        category_id: input.categoryId || null,
        status: input.status || 'DRAFT',
        meta_title: input.metaTitle?.trim() || input.title.trim(),
        meta_description: input.metaDescription?.trim() || input.excerpt.trim(),
        canonical_url: input.canonicalUrl?.trim() || null,
        no_index: Boolean(input.noIndex),
        read_time_minutes: readTime,
        tags: Array.isArray(input.tags) ? input.tags : [],
        target_city: input.targetCity?.trim() || null,
        target_trade: input.targetTrade?.trim() || null,
        published_at: isPublished ? new Date() : null,
      },
      include: {
        category: true,
      },
    });

    return this.formatPostResponse(post);
  }

  /**
   * Admin: Update an existing article.
   */
  static async updateArticle(id: string, input: UpdateArticleInput) {
    const existing = await (prisma as any).blog_posts.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Article with ID ${id} not found`);
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title.trim();
    if (input.excerpt !== undefined) updateData.excerpt = input.excerpt.trim();
    if (input.content !== undefined) {
      updateData.content = input.content;
      updateData.read_time_minutes = this.calculateReadingTime(input.content);
    }
    if (input.coverImageUrl !== undefined) updateData.cover_image_url = input.coverImageUrl;
    if (input.authorName !== undefined) updateData.author_name = input.authorName.trim();
    if (input.authorRole !== undefined) updateData.author_role = input.authorRole.trim();
    if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
    if (input.metaTitle !== undefined) updateData.meta_title = input.metaTitle.trim();
    if (input.metaDescription !== undefined) updateData.meta_description = input.metaDescription.trim();
    if (input.canonicalUrl !== undefined) updateData.canonical_url = input.canonicalUrl.trim();
    if (input.noIndex !== undefined) updateData.no_index = Boolean(input.noIndex);
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.targetCity !== undefined) updateData.target_city = input.targetCity?.trim() || null;
    if (input.targetTrade !== undefined) updateData.target_trade = input.targetTrade?.trim() || null;

    if (input.slug && input.slug !== existing.slug) {
      const cleanSlug = this.slugify(input.slug);
      const conflict = await (prisma as any).blog_posts.findUnique({ where: { slug: cleanSlug } });
      if (conflict && conflict.id !== id) {
        throw new Error(`Slug '${cleanSlug}' is already in use by another article`);
      }
      updateData.slug = cleanSlug;
    }

    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'PUBLISHED' && !existing.published_at) {
        updateData.published_at = new Date();
      }
    }

    const post = await (prisma as any).blog_posts.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return this.formatPostResponse(post);
  }

  /**
   * Admin: Toggle or set publish status.
   */
  static async togglePublish(id: string, publish: boolean) {
    const existing = await (prisma as any).blog_posts.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Article with ID ${id} not found`);
    }

    const post = await (prisma as any).blog_posts.update({
      where: { id },
      data: {
        status: publish ? 'PUBLISHED' : 'DRAFT',
        published_at: publish ? (existing.published_at || new Date()) : existing.published_at,
        updated_at: new Date(),
      },
      include: { category: true },
    });

    return this.formatPostResponse(post);
  }

  /**
   * Admin: Delete an article.
   */
  static async deleteArticle(id: string) {
    await (prisma as any).blog_posts.delete({
      where: { id },
    });
    return { success: true, id };
  }

  /**
   * Formats raw Prisma database model into a clean frontend contract.
   */
  private static formatPostResponse(post: any) {
    if (!post) return null;
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.cover_image_url,
      authorName: post.author_name,
      authorRole: post.author_role,
      categoryId: post.category_id,
      category: post.category ? {
        id: post.category.id,
        name: post.category.name,
        slug: post.category.slug,
        color: post.category.color,
      } : null,
      status: post.status,
      metaTitle: post.meta_title || post.title,
      metaDescription: post.meta_description || post.excerpt,
      canonicalUrl: post.canonical_url,
      noIndex: post.no_index,
      readTimeMinutes: post.read_time_minutes || 5,
      tags: post.tags || [],
      targetCity: post.target_city,
      targetTrade: post.target_trade,
      viewCount: post.view_count || 0,
      publishedAt: post.published_at ? post.published_at.toISOString() : null,
      createdAt: post.created_at ? post.created_at.toISOString() : null,
      updatedAt: post.updated_at ? post.updated_at.toISOString() : null,
    };
  }
}
