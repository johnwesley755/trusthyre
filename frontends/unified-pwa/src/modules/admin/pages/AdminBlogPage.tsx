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

export const AdminBlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setActionLoadingId(id);
    try {
      const res = await BlogService.deleteArticle(id);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete article:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-['Onest',system-ui,sans-serif]">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-[#0a0a0a] flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#0f2f63]" />
            <span>Blog & SEO Editorial Suite</span>
          </h1>
          <p className="text-xs text-[#717784] mt-1">
            Author, publish, and optimize blue-collar trade articles to dominate Google organic search across India.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-full border border-[#e6e8ec] text-[#5a6270] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-[#0f2f63]" />
            <span>View Public Blog</span>
          </Link>

          <Link
            to="/admin/blog/new"
            className="px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e6e8ec] shadow-xs">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 flex items-center bg-[#f4f4f4] px-3.5 py-2 rounded-full border border-[#e6e8ec] focus-within:border-[#0f2f63] transition-all">
          <Search className="w-4 h-4 text-[#717784] mr-2 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, or author..."
            className="w-full bg-transparent text-xs text-[#0a0a0a] placeholder:text-[#717784] focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto scrollbar-none">
          {['ALL', 'PUBLISHED', 'DRAFT'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-[#0f2f63] text-white shadow-xs'
                  : 'bg-[#f4f4f4] text-[#5a6270] hover:text-[#0a0a0a] hover:bg-[#e6e8ec]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl border border-[#e6e8ec] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#717784] text-xs animate-pulse">
            Loading editorial database...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-[#717784] mx-auto opacity-40" />
            <p className="text-sm font-bold text-[#0a0a0a]">No articles found</p>
            <p className="text-xs text-[#717784] max-w-sm mx-auto">
              You haven't created any articles matching the current filter. Write your first blue-collar hiring guide now.
            </p>
            <Link
              to="/admin/blog/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Article</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e6e8ec] bg-[#f4f4f4]/60 text-[11px] font-bold uppercase tracking-wider text-[#717784]">
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Trade & Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Metrics</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e8ec] text-xs">
                {posts.map((post) => {
                  const isPub = post.status === 'PUBLISHED';
                  const isActionLoading = actionLoadingId === post.id;

                  return (
                    <tr key={post.id} className="hover:bg-[#f4f4f4]/40 transition-colors">
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-semibold text-[#0a0a0a] line-clamp-1">{post.title}</div>
                        <div className="text-[11px] text-[#717784] font-mono mt-0.5 truncate">/blog/{post.slug}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {post.targetTrade && (
                            <span className="px-2 py-0.5 bg-[#0f2f63]/10 text-[#0f2f63] rounded-full text-[10px] font-semibold flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              <span>{post.targetTrade}</span>
                            </span>
                          )}
                          {post.targetCity && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-semibold flex items-center gap-1 border border-emerald-100">
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
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {isPub ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}
                          <span>{post.status}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-[#5a6270]">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1" title="Views">
                            <Eye className="w-3.5 h-3.5 text-[#717784]" />
                            <span>{post.viewCount}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Reading time">
                            <Clock className="w-3.5 h-3.5 text-[#717784]" />
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
    </div>
  );
};

export default AdminBlogPage;
