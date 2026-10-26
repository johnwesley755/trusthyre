import { Hono } from 'hono';
import * as blogController from '../controllers/blogController';
import { authenticateJWT, requireAdmin } from '../middlewares/auth';

/**
 * Public Blog Router - for reader queries and SEO indexers.
 */
export const blogRouter = new Hono();

blogRouter.get('/', blogController.getPublishedArticles);
blogRouter.get('/categories', blogController.getCategories);
blogRouter.get('/:slug', blogController.getArticleBySlug);

/**
 * Admin Blog Router - for editorial management.
 */
export const adminBlogRouter = new Hono();

// Enforce authentication & ADMIN role for all administrative editorial routes
adminBlogRouter.use('*', authenticateJWT);
adminBlogRouter.use('*', requireAdmin);

adminBlogRouter.get('/', blogController.getAdminArticles);
adminBlogRouter.post('/', blogController.createArticle);
adminBlogRouter.get('/:id', blogController.getAdminArticleById);
adminBlogRouter.put('/:id', blogController.updateArticle);
adminBlogRouter.post('/:id/publish', blogController.togglePublish);
adminBlogRouter.delete('/:id', blogController.deleteArticle);

export default blogRouter;
