import { Context } from 'hono';
import { BlogService } from '../services/blogService';

/**
 * Public: List published blog articles with pagination and filtering.
 * GET /api/blog
 */
export async function getPublishedArticles(c: Context) {
  try {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 12;
    const categorySlug = c.req.query('category');
    const targetCity = c.req.query('city');
    const targetTrade = c.req.query('trade');
    const search = c.req.query('search');

    const result = await BlogService.getPublishedArticles({
      page,
      limit,
      categorySlug,
      targetCity,
      targetTrade,
      search,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[BlogController] getPublishedArticles error:', error);
    return c.json({ success: false, message: 'Failed to retrieve blog articles' }, 500);
  }
}

/**
 * Public: Get single published article by slug with related posts.
 * GET /api/blog/:slug
 */
export async function getArticleBySlug(c: Context) {
  try {
    const slug = c.req.param('slug');
    if (!slug) {
      return c.json({ success: false, message: 'Article slug is required' }, 400);
    }

    const data = await BlogService.getArticleBySlug(slug);
    if (!data) {
      return c.json({ success: false, message: 'Article not found' }, 404);
    }

    return c.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('[BlogController] getArticleBySlug error:', error);
    return c.json({ success: false, message: 'Failed to fetch article details' }, 500);
  }
}

/**
 * Public: Get all active blog categories.
 * GET /api/blog/categories
 */
export async function getCategories(c: Context) {
  try {
    const categories = await BlogService.getCategories();
    return c.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error('[BlogController] getCategories error:', error);
    return c.json({ success: false, message: 'Failed to fetch blog categories' }, 500);
  }
}

/**
 * Admin: List all articles with draft status.
 * GET /api/admin/blog
 */
export async function getAdminArticles(c: Context) {
  try {
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const status = c.req.query('status') || 'ALL';
    const search = c.req.query('search');

    const result = await BlogService.getAdminArticles({ page, limit, status, search });
    return c.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[BlogController] getAdminArticles error:', error);
    return c.json({ success: false, message: 'Failed to fetch admin articles' }, 500);
  }
}

/**
 * Admin: Get single article by ID.
 * GET /api/admin/blog/:id
 */
export async function getAdminArticleById(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Article ID is required' }, 400);
    }
    const post = await BlogService.getArticleById(id);
    if (!post) {
      return c.json({ success: false, message: 'Article not found' }, 404);
    }
    return c.json({ success: true, post });
  } catch (error: any) {
    console.error('[BlogController] getAdminArticleById error:', error);
    return c.json({ success: false, message: 'Failed to fetch article' }, 500);
  }
}

/**
 * Admin: Create a new blog post.
 * POST /api/admin/blog
 */
export async function createArticle(c: Context) {
  try {
    const body = await c.req.json();
    if (!body.title || !body.title.trim()) {
      return c.json({ success: false, message: 'Article title is required' }, 400);
    }
    if (!body.content || !body.content.trim()) {
      return c.json({ success: false, message: 'Article content is required' }, 400);
    }
    if (!body.excerpt || !body.excerpt.trim()) {
      return c.json({ success: false, message: 'Article excerpt is required' }, 400);
    }

    const post = await BlogService.createArticle(body);
    return c.json({
      success: true,
      message: 'Article created successfully',
      post,
    }, 201);
  } catch (error: any) {
    console.error('[BlogController] createArticle error:', error);
    return c.json({ success: false, message: error.message || 'Failed to create article' }, 500);
  }
}

/**
 * Admin: Update an existing article.
 * PUT /api/admin/blog/:id
 */
export async function updateArticle(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Article ID is required' }, 400);
    }
    const body = await c.req.json();

    const post = await BlogService.updateArticle(id, body);
    return c.json({
      success: true,
      message: 'Article updated successfully',
      post,
    });
  } catch (error: any) {
    console.error('[BlogController] updateArticle error:', error);
    return c.json({ success: false, message: error.message || 'Failed to update article' }, 500);
  }
}

/**
 * Admin: Toggle or set publish status.
 * POST /api/admin/blog/:id/publish
 */
export async function togglePublish(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Article ID is required' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const publish = body.publish !== undefined ? Boolean(body.publish) : true;

    const post = await BlogService.togglePublish(id, publish);
    return c.json({
      success: true,
      message: publish ? 'Article published successfully' : 'Article unpublished to draft',
      post,
    });
  } catch (error: any) {
    console.error('[BlogController] togglePublish error:', error);
    return c.json({ success: false, message: error.message || 'Failed to toggle publication' }, 500);
  }
}

/**
 * Admin: Delete an article.
 * DELETE /api/admin/blog/:id
 */
export async function deleteArticle(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ success: false, message: 'Article ID is required' }, 400);
    }
    await BlogService.deleteArticle(id);
    return c.json({
      success: true,
      message: 'Article deleted successfully',
      id,
    });
  } catch (error: any) {
    console.error('[BlogController] deleteArticle error:', error);
    return c.json({ success: false, message: error.message || 'Failed to delete article' }, 500);
  }
}
