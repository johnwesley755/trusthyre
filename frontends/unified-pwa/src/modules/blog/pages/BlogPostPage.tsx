import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  ArrowLeft, 
  Share2, 
  Check, 
  Briefcase, 
  ChevronRight, 
  BookOpen, 
  Sparkles,
  Eye,
  MessageCircle,
  Linkedin,
  Twitter
} from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import type { BlogPost } from '../../../services/blog.service';
import { SeoHead, buildArticleJsonLd, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { LandingNavbar } from '../../landing/components/LandingNavbar';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  useEffect(() => {
    if (slug) {
      loadArticle(slug);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // Track window scroll progress for reading progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadArticle = async (articleSlug: string) => {
    setLoading(true);
    try {
      const res = await BlogService.getArticleBySlug(articleSlug);
      if (res.success && res.post) {
        setPost(res.post);
        setRelatedPosts(res.relatedPosts || []);
      } else {
        setPost(null);
      }
    } catch (err) {
      console.error('Failed to load article:', err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://trusthyre.com/blog/${slug}`;
  const shareTitle = post?.title || 'TrustHyre Blue-Collar Insights';

  // Construct structured data
  const articleJsonLd = post ? buildArticleJsonLd({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    canonicalUrl: post.canonicalUrl || `https://trusthyre.com/blog/${post.slug}`,
    imageUrl: post.coverImageUrl || undefined,
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    authorName: post.authorName,
  }) : undefined;

  const breadcrumbsJsonLd = post ? buildBreadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    ...(post.category ? [{ name: post.category.name, path: `/blog?category=${post.category.slug}` }] : []),
    { name: post.title, path: `/blog/${post.slug}` },
  ]) : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <LandingNavbar />
        <div className="max-w-4xl mx-auto pt-32 pb-20 px-4 animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded w-3/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-80 bg-slate-200 rounded-3xl w-full" />
          <div className="space-y-3 pt-6">
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <LandingNavbar />
        <div className="max-w-lg mx-auto pt-40 pb-20 px-4 text-center">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900">Article Not Found</h1>
          <p className="text-sm text-slate-600 mt-2">
            The article you are looking for has been moved, unpublished, or does not exist.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Blog Listing</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Dynamic SEO Head with Article Structured Data */}
      <SeoHead
        title={post.metaTitle || post.title}
        description={post.metaDescription || post.excerpt}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.coverImageUrl || undefined}
        noIndex={post.noIndex}
        articleMeta={{
          publishedTime: post.publishedAt || undefined,
          modifiedTime: post.updatedAt || undefined,
          author: post.authorName,
          section: post.category?.name || 'Skilled Trades',
          tags: post.tags,
        }}
        jsonLd={[articleJsonLd, breadcrumbsJsonLd].filter(Boolean) as any}
      />

      {/* Sticky Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-1.5 bg-gradient-to-r from-blue-600 via-teal-400 to-indigo-600 z-[60] transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <LandingNavbar />

      <main className="pt-24 pb-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 py-4 overflow-x-auto no-scrollbar">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
            {post.category && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <Link to={`/blog?category=${post.category.slug}`} className="hover:text-blue-600 transition-colors">
                  {post.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-xs">{post.title}</span>
          </nav>

          {/* Article Header */}
          <header className="space-y-6 pt-4 pb-8 border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              {post.category && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase rounded-full border border-blue-200/60">
                  {post.category.name}
                </span>
              )}
              {post.targetCity && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{post.targetCity}</span>
                </span>
              )}
              {post.targetTrade && (
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{post.targetTrade}</span>
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              {post.excerpt}
            </p>

            {/* Author Meta & Social Share Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow">
                  {post.authorName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{post.authorName}</p>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                      Verified Author
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(post.publishedAt).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>{post.readTimeMinutes} min read</span>
                    </span>
                    {post.viewCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-slate-400" />
                          <span>{post.viewCount} views</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${shareTitle} - ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                  title="Share on WhatsApp"
                  aria-label="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors"
                  title="Share on LinkedIn"
                  aria-label="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Share on X"
                  aria-label="Share on X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Hero Cover Image */}
          {post.coverImageUrl && (
            <div className="my-8 rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-900 aspect-video max-h-[460px]">
              <img
                src={post.coverImageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Article Body Content */}
          <div className="mt-8 prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-blue-600 prose-a:font-bold hover:prose-a:underline prose-img:rounded-2xl">
            {post.content.split('\n\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-2xl sm:text-3xl font-black text-slate-900 mt-10 mb-4 pt-4 border-t border-slate-100">
                    {trimmed.replace('## ', '')}
                  </h2>
                );
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xl sm:text-2xl font-bold text-slate-800 mt-6 mb-3">
                    {trimmed.replace('### ', '')}
                  </h3>
                );
              }
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote key={idx} className="my-6 pl-4 border-l-4 border-blue-600 bg-blue-50/60 p-4 rounded-r-2xl text-slate-800 italic font-medium">
                    {trimmed.replace('> ', '')}
                  </blockquote>
                );
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const items = trimmed.split('\n').filter(Boolean);
                return (
                  <ul key={idx} className="my-4 space-y-2 list-disc list-inside text-slate-700 leading-relaxed">
                    {items.map((it, i) => (
                      <li key={i}>{it.replace(/^[-*]\s*/, '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-base sm:text-lg text-slate-700 leading-relaxed my-4 font-normal">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Contextual TrustHyre Conversion Callout */}
          <div className="my-12 p-8 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/20 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>TrustHyre Direct Matching</span>
              </div>
              <h3 className="text-2xl font-black text-white">
                {post.targetTrade 
                  ? `Need Verified ${post.targetTrade}s in ${post.targetCity || 'India'}?`
                  : 'Hire Verified Blue-Collar Talent with Photo Check-In'}
              </h3>
              <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
                TrustHyre eliminates absenteeism and identity fraud with photo check-in verification and direct employer matching. Post your requirements or search verified candidates now.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/find-workers"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  Post a Job for Free
                </Link>
                <Link
                  to="/search"
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Browse Verified Talent
                </Link>
              </div>
            </div>
          </div>

          {/* Related Articles Section */}
          {relatedPosts.length > 0 && (
            <section className="mt-16 pt-10 border-t border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Related Insights & Guides</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.id}
                    to={`/blog/${related.slug}`}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {related.category?.name || 'Guide'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {related.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {related.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>{related.readTimeMinutes} min read</span>
                      <span className="text-blue-600 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                        <span>Read</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </article>
      </main>
    </div>
  );
};

export default BlogPostPage;
