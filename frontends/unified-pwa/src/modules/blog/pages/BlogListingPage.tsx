import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Clock, 
  Calendar, 
  ArrowRight, 
  BookOpen, 
  MapPin, 
  Tag, 
  Sparkles,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import type { BlogPost, BlogCategory } from '../../../services/blog.service';
import { SeoHead, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { AppTopNavbar } from '../../../layouts/AppTopNavbar';
import { LandingFooter } from '../../landing/components/LandingFooter';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { sanitizeUrl } from '../../../components/common/MarkdownContent';

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
  const regularPosts = currentPage === 1 && !searchQueryParam && !selectedCategory ? posts.slice(1) : posts;

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    ...(selectedCategory ? [{ name: selectedCategory, path: `/blog?category=${selectedCategory}` }] : []),
  ]);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#0a0a0a] font-['Onest',system-ui,sans-serif] flex flex-col justify-between selection:bg-[#0f2f63] selection:text-white">
      <SeoHead
        title={selectedCategory ? `${selectedCategory.toUpperCase()} Articles & Guides | TrustHyre` : 'Blue-Collar Hiring & Industry Insights Blog'}
        description="Comprehensive guides, salary benchmarks, hiring checklists, and regulatory insights for hiring verified skilled trade workers, electricians, delivery drivers, and warehouse staff across India."
        canonicalPath={`/blog${selectedCategory ? `?category=${selectedCategory}` : ''}`}
        ogType="website"
        jsonLd={breadcrumbsJsonLd}
      />

      {/* Universal Top Navbar */}
      <AppTopNavbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Hallmark N13 Signature Hero Section */}
        <div className="bg-[#f4f4f4] rounded-[1.75rem] border border-[#e6e8ec] p-6 sm:p-8 md:p-10 mb-8 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Title & Subtitle */}
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
                <span className="text-[10px] sm:text-xs font-semibold uppercase text-[#0f2f63] tracking-wider">
                  TrustHyre Editorial & Research
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-medium uppercase leading-tight text-[#0a0a0a]">
                Blue-Collar Hiring & Skilled Trades Articles
              </h1>
              
              <p className="text-xs sm:text-sm text-[#717784] font-normal leading-relaxed">
                Actionable guides, wage standards, and verified employer articles for hiring electricians, technicians, delivery fleets, and warehouse logistics talent in India.
              </p>
            </div>

            {/* Inline Capsule Search Input */}
            <form onSubmit={handleSearchSubmit} className="w-full md:w-80 lg:w-96 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#717784] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search guides, trades, cities..."
                  className="w-full pl-10 pr-12 py-2.5 rounded-full bg-white border border-[#e6e8ec] text-xs font-medium text-[#0a0a0a] placeholder:text-[#717784] focus:outline-none focus:border-[#0f2f63] focus:ring-1 focus:ring-[#0f2f63] shadow-2xs transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete('search');
                      newParams.set('page', '1');
                      setSearchParams(newParams);
                    }}
                    className="absolute right-3 text-[#717784] hover:text-[#0a0a0a] text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          <button
            type="button"
            onClick={() => handleCategorySelect('')}
            className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
              !selectedCategory
                ? 'bg-[#0f2f63] text-white shadow-xs'
                : 'bg-white text-[#5a6270] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] border border-[#e6e8ec]'
            }`}
          >
            All Insights (<span className="tabular-nums">{pagination.total}</span>)
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#0f2f63] text-white shadow-xs'
                    : 'bg-white text-[#5a6270] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] border border-[#e6e8ec]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Active Filters Bar */}
        {(selectedCategory || searchQueryParam) && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-[#717784]">Active Filter:</span>
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] text-xs font-medium text-[#0f2f63]">
                Category: {selectedCategory}
                <button
                  type="button"
                  onClick={() => handleCategorySelect('')}
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
            {searchQueryParam && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f4f4f4] border border-[#e6e8ec] text-xs font-medium text-[#0f2f63]">
                Query: "{searchQueryParam}"
                <button
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('search');
                    setSearchParams(newParams);
                  }}
                  className="hover:text-rose-600 font-bold ml-1 cursor-pointer"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Content Section */}
        {loading ? (
          <div className="space-y-6 animate-pulse py-8">
            <div className="h-72 bg-[#f4f4f4] rounded-[1.75rem] border border-[#e6e8ec]" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-[#f4f4f4] rounded-[1.5rem] border border-[#e6e8ec]" />
              ))}
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[1.75rem] border border-[#e6e8ec] p-8 space-y-4">
            <BookOpen className="w-12 h-12 text-[#717784] mx-auto opacity-50" />
            <h3 className="text-lg font-semibold text-[#0a0a0a]">No Articles Found</h3>
            <p className="text-xs text-[#717784] max-w-sm mx-auto">
              We couldn't find any articles matching your search criteria. Try browsing all topics or clearing your search filter.
            </p>
            <button
              onClick={() => {
                setSearchParams({});
                setSearchTerm('');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured Article Spotlight Card (Only on Page 1 without active search) */}
            {currentPage === 1 && !searchQueryParam && !selectedCategory && featuredPost && (
              <div className="bg-white rounded-[1.75rem] border border-[#e6e8ec] p-6 sm:p-8 shadow-xs hover:border-[#0f2f63]/30 transition-all group">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  
                  {/* Left: Article Cover Image */}
                  <div className="lg:col-span-6 overflow-hidden rounded-2xl aspect-[16/10] bg-[#f4f4f4] border border-[#e6e8ec]">
                    <img
                      src={sanitizeUrl(featuredPost.coverImageUrl || '') || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1200'}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                    />
                  </div>

                  {/* Right: Article Metadata & Copy */}
                  <div className="lg:col-span-6 space-y-4 flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {featuredPost.category && (
                          <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#0f2f63]/10 text-[#0f2f63]">
                            {featuredPost.category.name}
                          </span>
                        )}
                        {featuredPost.targetCity && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#717784] bg-[#f4f4f4] px-2.5 py-1 rounded-full border border-[#e6e8ec]">
                            <MapPin className="w-3 h-3 text-[#0f2f63]" />
                            {featuredPost.targetCity}
                          </span>
                        )}
                        <span className="text-[10px] text-[#717784] flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {featuredPost.readTimeMinutes} min read
                        </span>
                      </div>

                      <Link to={`/blog/${featuredPost.slug}`} className="block group-hover:text-[#2563c9] transition-colors">
                        <h2 className="text-xl sm:text-2xl font-semibold text-[#0a0a0a] leading-snug">
                          {featuredPost.title}
                        </h2>
                      </Link>

                      <p className="text-xs sm:text-sm text-[#717784] font-normal leading-relaxed line-clamp-3">
                        {featuredPost.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#e6e8ec] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={featuredPost.authorName} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-[#0a0a0a] leading-none">
                            {featuredPost.authorName}
                          </p>
                          <p className="text-[10px] text-[#717784] mt-0.5">
                            {featuredPost.authorRole || 'Industry Specialist'}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/blog/${featuredPost.slug}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 shadow-xs"
                      >
                        <span>Read Article</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Standard 3-Column Article Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <article
                  key={post.id}
                  className="bg-white rounded-[1.5rem] border border-[#e6e8ec] hover:border-[#0f2f63]/30 transition-all p-4 sm:p-5 flex flex-col justify-between shadow-xs hover:shadow-md group"
                >
                  <div className="space-y-3">
                    {/* Cover Image */}
                    <Link to={`/blog/${post.slug}`} className="block overflow-hidden rounded-2xl aspect-[16/10] bg-[#f4f4f4] border border-[#e6e8ec]">
                      <img
                        src={sanitizeUrl(post.coverImageUrl || '') || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800'}
                        alt={post.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </Link>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {post.category && (
                        <span className="px-2.5 py-0.75 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#0f2f63]/10 text-[#0f2f63]">
                          {post.category.name}
                        </span>
                      )}
                      {post.targetCity && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#717784] bg-[#f4f4f4] px-2 py-0.5 rounded-full border border-[#e6e8ec]">
                          <MapPin className="w-2.5 h-2.5 text-[#0f2f63]" />
                          {post.targetCity}
                        </span>
                      )}
                      <span className="text-[10px] text-[#717784] flex items-center gap-1 ml-auto">
                        <Clock className="w-2.5 h-2.5" />
                        {post.readTimeMinutes}m
                      </span>
                    </div>

                    {/* Title */}
                    <Link to={`/blog/${post.slug}`} className="block group-hover:text-[#2563c9] transition-colors">
                      <h3 className="text-base font-semibold text-[#0a0a0a] leading-snug line-clamp-2">
                        {post.title}
                      </h3>
                    </Link>

                    {/* Excerpt */}
                    <p className="text-xs text-[#717784] font-normal leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 mt-4 border-t border-[#e6e8ec] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={post.authorName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[#0a0a0a] truncate leading-none">
                          {post.authorName}
                        </p>
                        <p className="text-[9px] text-[#717784] truncate mt-0.5">
                          {post.targetTrade || 'Verified Article'}
                        </p>
                      </div>
                    </div>

                    <Link
                      to={`/blog/${post.slug}`}
                      className="w-8 h-8 rounded-full bg-[#f4f4f4] group-hover:bg-[#0f2f63] text-[#0f2f63] group-hover:text-white flex items-center justify-center transition-all shadow-2xs"
                      aria-label={`Read ${post.title}`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                </article>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', String(currentPage - 1));
                    setSearchParams(newParams);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border border-[#e6e8ec] bg-white text-[#0a0a0a] hover:bg-[#f4f4f4] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-medium text-[#717784] px-3">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= pagination.totalPages}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', String(currentPage + 1));
                    setSearchParams(newParams);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider border border-[#e6e8ec] bg-white text-[#0a0a0a] hover:bg-[#f4f4f4] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        )}

      </main>

      {/* Consistent Landing Footer */}
      <LandingFooter />
    </div>
  );
};
