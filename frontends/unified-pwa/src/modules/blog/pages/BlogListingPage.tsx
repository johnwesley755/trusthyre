import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Clock, 
  Calendar, 
  User, 
  ArrowRight, 
  BookOpen, 
  Briefcase, 
  MapPin, 
  Tag, 
  Sparkles,
  ChevronRight,
  Filter
} from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import type { BlogPost, BlogCategory } from '../../../services/blog.service';
import { SeoHead, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { LandingNavbar } from '../../landing/components/LandingNavbar';

export const BlogListingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || '';
  const selectedCity = searchParams.get('city') || '';
  const searchQueryParam = searchParams.get('search') || '';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>(searchQueryParam);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [selectedCategory, selectedCity, searchQueryParam, currentPage]);

  const loadCategories = async () => {
    try {
      const res = await BlogService.getCategories();
      if (res.success) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadArticles = async () => {
    setLoading(true);
    try {
      const res = await BlogService.getPublishedArticles({
        page: currentPage,
        limit: 12,
        category: selectedCategory || undefined,
        city: selectedCity || undefined,
        search: searchQueryParam || undefined,
      });

      if (res.success) {
        setPosts(res.posts);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (searchTerm.trim()) {
      newParams.set('search', searchTerm.trim());
    } else {
      newParams.delete('search');
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handleCategorySelect = (slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === selectedCategory || !slug) {
      newParams.delete('category');
    } else {
      newParams.set('category', slug);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const featuredPost = posts[0];
  const regularPosts = posts.slice(1);

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    ...(selectedCategory ? [{ name: selectedCategory, path: `/blog?category=${selectedCategory}` }] : []),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <SeoHead
        title={selectedCategory ? `${selectedCategory.toUpperCase()} Articles & Guides | TrustHyre` : 'Blue-Collar Hiring & Industry Insights Blog'}
        description="Comprehensive guides, salary benchmarks, hiring checklists, and regulatory insights for hiring verified skilled trade workers, electricians, delivery drivers, and warehouse staff across India."
        canonicalPath={`/blog${selectedCategory ? `?category=${selectedCategory}` : ''}`}
        ogType="website"
        jsonLd={breadcrumbsJsonLd}
      />

      <LandingNavbar />

      <main className="pt-24 pb-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-blue-900 via-indigo-900 to-slate-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-b border-indigo-950/40 shadow-inner">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>TrustHyre Editorial & Research</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              Blue-Collar Hiring & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">Skilled Trades</span> Insights
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
              Actionable guides, wage standards, and verified employer playbooks for hiring electricians, technicians, delivery fleets, and warehouse logistics talent in India.
            </p>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex items-center bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl focus-within:border-blue-400 transition-all">
              <Search className="w-5 h-5 text-slate-300 ml-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search trades, cities (e.g. Chennai Electricians)..."
                className="w-full bg-transparent px-3 py-2 text-white placeholder-slate-300 text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <span>Search</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
          
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-slate-200 mb-10">
            <button
              onClick={() => handleCategorySelect('')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                !selectedCategory
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>All Topics</span>
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.slug)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  selectedCategory === cat.slug
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                {cat.articleCount !== undefined && cat.articleCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    selectedCategory === cat.slug ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {cat.articleCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Active Search Notification */}
          {searchQueryParam && (
            <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-3 rounded-xl">
              <p className="text-xs text-blue-900 font-medium">
                Showing results for <span className="font-bold">"{searchQueryParam}"</span>
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('search');
                  setSearchParams(newParams);
                }}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm animate-pulse space-y-4">
                  <div className="h-48 bg-slate-200 rounded-xl w-full" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-6 bg-slate-200 rounded w-5/6" />
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-200 rounded w-4/6" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && posts.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8 max-w-lg mx-auto shadow-sm">
              <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-800">No articles found</h3>
              <p className="text-xs text-slate-500 mt-2">
                We couldn't find any articles matching your search criteria. Try selecting another topic or clearing your search.
              </p>
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="mt-6 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors"
              >
                View All Articles
              </button>
            </div>
          )}

          {/* Articles Content */}
          {!loading && posts.length > 0 && (
            <div className="space-y-12">
              
              {/* Featured Top Article */}
              {featuredPost && currentPage === 1 && !searchQueryParam && (
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl hover:shadow-2xl transition-all group grid grid-cols-1 lg:grid-cols-12">
                  <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-full min-h-[300px] overflow-hidden bg-slate-900">
                    {featuredPost.coverImageUrl ? (
                      <img
                        src={featuredPost.coverImageUrl}
                        alt={featuredPost.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-950 p-8 text-center text-white">
                        <Briefcase className="w-16 h-16 text-blue-400/40 mb-2" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                        Featured Guide
                      </span>
                      {featuredPost.targetCity && (
                        <span className="bg-slate-900/80 backdrop-blur-md text-slate-200 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{featuredPost.targetCity}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span>{featuredPost.readTimeMinutes} min read</span>
                        </span>
                        {featuredPost.publishedAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(featuredPost.publishedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </span>
                        )}
                      </div>

                      <Link to={`/blog/${featuredPost.slug}`} className="block">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {featuredPost.title}
                        </h2>
                      </Link>

                      <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                          {featuredPost.authorName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{featuredPost.authorName}</p>
                          <p className="text-[10px] text-slate-500">{featuredPost.authorRole || 'Contributor'}</p>
                        </div>
                      </div>

                      <Link
                        to={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform"
                      >
                        <span>Read Guide</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid of Regular Articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(currentPage === 1 && !searchQueryParam ? regularPosts : posts).map((post) => (
                  <article
                    key={post.id}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    <Link to={`/blog/${post.slug}`} className="block relative h-48 overflow-hidden bg-slate-100">
                      {post.coverImageUrl ? (
                        <img
                          src={post.coverImageUrl}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white p-4">
                          <BookOpen className="w-10 h-10 text-slate-400/50" />
                        </div>
                      )}
                      {post.category && (
                        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm border border-slate-200/50">
                          {post.category.name}
                        </span>
                      )}
                    </Link>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 font-semibold">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>{post.readTimeMinutes} min read</span>
                          </span>
                          {post.targetCity && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{post.targetCity}</span>
                            </span>
                          )}
                        </div>

                        <Link to={`/blog/${post.slug}`} className="block">
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                            {post.title}
                          </h3>
                        </Link>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {post.excerpt}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-600 font-medium truncate max-w-[130px]">{post.authorName}</span>
                        </div>

                        <Link
                          to={`/blog/${post.slug}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <span>Read</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => {
                        const newParams = new URLSearchParams(searchParams);
                        newParams.set('page', String(pageNum));
                        setSearchParams(newParams);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Bottom Conversion CTA Banner */}
          <div className="mt-20 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-3xl p-8 sm:p-12 text-white text-center shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hire Verified Blue-Collar Talent Across India
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed font-normal">
                Looking for commercial chefs, licensed electricians, warehouse crews, or delivery fleets? TrustHyre verifies worker identity and skills before direct hiring.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <Link
                  to="/find-workers"
                  className="px-6 py-3 bg-white text-blue-900 rounded-xl text-xs font-bold hover:bg-blue-50 transition-all shadow-md"
                >
                  Post a Job for Free
                </Link>
                <Link
                  to="/search"
                  className="px-6 py-3 bg-blue-900/60 hover:bg-blue-900/80 border border-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Explore Verified Workers
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default BlogListingPage;
