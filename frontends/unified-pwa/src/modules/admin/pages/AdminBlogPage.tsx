import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Clock, 
  Eye, 
  BookOpen, 
  CheckCircle, 
  AlertCircle,
  MapPin,
  Briefcase,
  Globe
} from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import type { BlogPost } from '../../../services/blog.service';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

export const AdminBlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [articleToDelete, setArticleToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadAdminArticles();
  }, [statusFilter]);

  const loadAdminArticles = async () => {
    setLoading(true);
    try {
      const res = await BlogService.getAdminArticles({
        status: statusFilter,
        search: search.trim() || undefined,
        limit: 50,
      });
      if (res.success) {
        setPosts(res.posts);
      }
    } catch (err) {
      console.error('Failed to load admin articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAdminArticles();
  };

  const handleTogglePublish = async (post: BlogPost) => {
    const isCurrentlyPublished = post.status === 'PUBLISHED';
    setActionLoadingId(post.id);
    try {
      const res = await BlogService.togglePublish(post.id, !isCurrentlyPublished);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? { ...p, status: res.post.status, publishedAt: res.post.publishedAt } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle publication status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = (id: string, title: string) => {
    setArticleToDelete({ id, title });
  };

  const handleConfirmDelete = async () => {
    if (!articleToDelete) return;
    const { id } = articleToDelete;
    setActionLoadingId(id);
    try {
      const res = await BlogService.deleteArticle(id);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setArticleToDelete(null);
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-['Onest',system-ui,sans-serif] w-full max-w-full min-w-0">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#09090b] p-5 sm:p-6 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs transition-colors">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#0a0a0a] dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0f2f63] dark:text-sky-400" />
            <span>Blog & SEO Editorial Suite</span>
          </h1>
          <p className="text-xs text-[#717784] dark:text-zinc-400 mt-1">
            Author, publish, and optimize blue-collar trade articles to dominate Google organic search across India.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full border border-[#e6e8ec] dark:border-zinc-700 text-[#5a6270] dark:text-zinc-300 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-[#f4f4f4] dark:hover:bg-zinc-800 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-[#0f2f63] dark:text-sky-400" />
            <span>View Public Blog</span>
          </Link>

          <Link
            to="/admin/blog/new"
            className="px-4 py-2 bg-[#0f2f63] dark:bg-sky-600 hover:bg-[#2563c9] dark:hover:bg-sky-500 text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-[#09090b] p-4 rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs transition-colors">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 flex items-center bg-[#f4f4f4] dark:bg-[#121215] px-3.5 py-2 rounded-full border border-[#e6e8ec] dark:border-zinc-800 focus-within:border-[#0f2f63] dark:focus-within:border-sky-500 transition-all">
          <Search className="w-4 h-4 text-[#717784] dark:text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, or author..."
            className="w-full bg-transparent text-xs text-[#0a0a0a] dark:text-white placeholder:text-[#717784] dark:placeholder:text-zinc-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none">
          {['ALL', 'PUBLISHED', 'DRAFT'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#0f2f63] dark:bg-sky-500 text-white shadow-xs'
                  : 'bg-[#f4f4f4] dark:bg-[#121215] text-[#5a6270] dark:text-zinc-400 hover:text-[#0a0a0a] dark:hover:text-white hover:bg-[#e6e8ec] dark:hover:bg-zinc-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white dark:bg-[#09090b] rounded-2xl border border-[#e6e8ec] dark:border-zinc-800 shadow-xs overflow-hidden transition-colors">
        {loading ? (
          <div className="p-12 text-center text-[#717784] dark:text-zinc-400 text-xs animate-pulse">
            Loading editorial database...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-[#717784] dark:text-zinc-600 mx-auto opacity-40" />
            <p className="text-sm font-bold text-[#0a0a0a] dark:text-white">No articles found</p>
            <p className="text-xs text-[#717784] dark:text-zinc-400 max-w-sm mx-auto">
              You haven't created any articles matching the current filter. Write your first blue-collar hiring guide now.
            </p>
            <Link
              to="/admin/blog/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2f63] dark:bg-sky-600 hover:bg-[#2563c9] dark:hover:bg-sky-500 text-white rounded-full text-xs font-semibold uppercase tracking-wider shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Article</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e6e8ec] dark:border-zinc-800 bg-[#f4f4f4]/60 dark:bg-[#121215] text-[11px] font-bold uppercase tracking-wider text-[#717784] dark:text-zinc-400">
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Trade & Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Metrics</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8ec] dark:divide-zinc-800 text-xs">
                {posts.map((post) => {
                  const isPub = post.status === 'PUBLISHED';
                  const isActionLoading = actionLoadingId === post.id;

                  return (
                    <tr key={post.id} className="hover:bg-[#f4f4f4]/40 dark:hover:bg-[#121215]/60 transition-colors">
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-semibold text-[#0a0a0a] dark:text-zinc-100 line-clamp-1">{post.title}</div>
                        <div className="text-[11px] text-[#717784] dark:text-zinc-400 font-mono mt-0.5 truncate">/blog/{post.slug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {post.targetTrade && (
                            <span className="px-2 py-0.5 bg-[#0f2f63]/10 dark:bg-sky-950/40 text-[#0f2f63] dark:text-sky-400 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-transparent dark:border-sky-900/40">
                              <Briefcase className="w-3 h-3" />
                              <span>{post.targetTrade}</span>
                            </span>
                          )}
                          {post.targetCity && (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-emerald-100 dark:border-emerald-900/40">
                              <MapPin className="w-3 h-3" />
                              <span>{post.targetCity}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          disabled={isActionLoading}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                            isPub
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                          }`}
                        >
                          {isPub ? <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                          <span>{post.status}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-[#5a6270] dark:text-zinc-400">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1" title="Views">
                            <Eye className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
                            <span>{post.viewCount}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Reading time">
                            <Clock className="w-3.5 h-3.5 text-[#717784] dark:text-zinc-400" />
                            <span>{post.readTimeMinutes}m</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[11px] text-[#717784]">
                        {new Date(post.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPub && (
                            <Link
                              to={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-[#717784] hover:text-[#0f2f63] hover:bg-[#f4f4f4] rounded-full transition-colors"
                              title="View Live Article"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}

                          <Link
                            to={`/admin/blog/${post.id}/edit`}
                            className="p-1.5 text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] rounded-full transition-colors"
                            title="Edit Article"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            disabled={isActionLoading}
                            className="p-1.5 text-[#717784] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(articleToDelete)}
        title="Delete Article"
        description="Are you sure you want to permanently delete this blog article? This action cannot be undone."
        entityName={articleToDelete?.title}
        confirmText="Delete Article"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={Boolean(articleToDelete && actionLoadingId === articleToDelete.id)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setArticleToDelete(null)}
      />
    </div>
  );
};

export default AdminBlogPage;
