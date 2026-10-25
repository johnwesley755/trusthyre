import apiClient from '../api/apiClient';

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  sortOrder?: number;
  articleCount?: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string | null;
  authorName: string;
  authorRole?: string | null;
  categoryId?: string | null;
  category?: BlogCategory | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  readTimeMinutes: number;
  tags: string[];
  targetCity?: string | null;
  targetTrade?: string | null;
  viewCount: number;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  success: boolean;
  posts: BlogPost[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BlogDetailResponse {
  success: boolean;
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export interface CreateArticlePayload {
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

export interface UpdateArticlePayload extends Partial<CreateArticlePayload> {}

export const BlogService = {
  /**
   * Public: Retrieve published blog articles with search & filters
   */
  async getPublishedArticles(params: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
    trade?: string;
    search?: string;
  } = {}): Promise<BlogListResponse> {
    const res = await apiClient.get<BlogListResponse>('/api/blog', { params });
    return res.data;
  },

  /**
   * Public: Retrieve single published article by its unique slug
   */
  async getArticleBySlug(slug: string): Promise<BlogDetailResponse> {
    const res = await apiClient.get<BlogDetailResponse>(`/api/blog/${slug}`);
    return res.data;
  },

  /**
   * Public: Retrieve all blog categories
   */
  async getCategories(): Promise<{ success: boolean; categories: BlogCategory[] }> {
    const res = await apiClient.get<{ success: boolean; categories: BlogCategory[] }>('/api/blog/categories');
    return res.data;
  },

  /**
   * Admin: List all articles with draft status and admin filters
   */
  async getAdminArticles(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<BlogListResponse> {
    const res = await apiClient.get<BlogListResponse>('/api/admin/blog', { params });
    return res.data;
  },

  /**
   * Admin: Fetch a single article by ID
   */
  async getAdminArticleById(id: string): Promise<{ success: boolean; post: BlogPost }> {
    const res = await apiClient.get<{ success: boolean; post: BlogPost }>(`/api/admin/blog/${id}`);
    return res.data;
  },

  /**
   * Admin: Create a new article
   */
  async createArticle(data: CreateArticlePayload): Promise<{ success: boolean; post: BlogPost }> {
    const res = await apiClient.post<{ success: boolean; post: BlogPost }>('/api/admin/blog', data);
    return res.data;
  },

  /**
   * Admin: Update an existing article
   */
  async updateArticle(id: string, data: UpdateArticlePayload): Promise<{ success: boolean; post: BlogPost }> {
    const res = await apiClient.put<{ success: boolean; post: BlogPost }>(`/api/admin/blog/${id}`, data);
    return res.data;
  },

  /**
   * Admin: Toggle or set publish status
   */
  async togglePublish(id: string, publish: boolean): Promise<{ success: boolean; post: BlogPost }> {
    const res = await apiClient.post<{ success: boolean; post: BlogPost }>(`/api/admin/blog/${id}/publish`, { publish });
    return res.data;
  },

  /**
   * Admin: Delete an article
   */
  async deleteArticle(id: string): Promise<{ success: boolean; id: string }> {
    const res = await apiClient.delete<{ success: boolean; id: string }>(`/api/admin/blog/${id}`);
    return res.data;
  },
};

export default BlogService;
