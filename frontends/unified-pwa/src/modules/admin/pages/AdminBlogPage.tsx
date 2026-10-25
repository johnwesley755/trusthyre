import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0066FF]" />
            <span>Blog & SEO Editorial Suite</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Author, publish, and optimize blue-collar trade articles to dominate Google organic search across India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>View Public Blog</span>
          </a>

          <Link
            to="/admin/blog/new"
            className="px-4 py-2 bg-[#0066FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 flex items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 focus-within:border-blue-400">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, slug, or author..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {['ALL', 'PUBLISHED', 'DRAFT'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                statusFilter === status
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading editorial database...
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No articles found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't created any articles matching the current filter. Write your first blue-collar hiring guide now.
            </p>
            <Link
              to="/admin/blog/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500"
            >
              <Plus className="w-4 h-4" />
              <span>Create Article</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Trade & Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Metrics</th>
                  <th className="py-3.5 px-4">Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {posts.map((post) => {
                  const isPub = post.status === 'PUBLISHED';
                  const isActionLoading = actionLoadingId === post.id;

                  return (
                    <tr key={post.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 line-clamp-1">{post.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">/blog/{post.slug}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {post.targetTrade && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold flex items-center gap-1">
                              <Briefcase className="w-3 h-3" />
                              <span>{post.targetTrade}</span>
                            </span>
                          )}
                          {post.targetCity && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{post.targetCity}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleTogglePublish(post)}
                          disabled={isActionLoading}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                            isPub
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {isPub ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-amber-600" />}
                          <span>{post.status}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1" title="Views">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>{post.viewCount}</span>
                          </span>
                          <span className="flex items-center gap-1" title="Reading time">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{post.readTimeMinutes}m</span>
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {new Date(post.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPub && (
                            <Link
                              to={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Live Article"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}

                          <Link
                            to={`/admin/blog/${post.id}/edit`}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Article"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            disabled={isActionLoading}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
