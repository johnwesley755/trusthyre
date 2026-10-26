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
  MessageCircle,
  Linkedin,
  Twitter,
  ShieldCheck,
  ArrowRight,
  Globe
} from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import type { BlogPost } from '../../../services/blog.service';
import { SeoHead, buildArticleJsonLd, buildBreadcrumbJsonLd } from '../../../components/common/SeoHead';
import { AppTopNavbar } from '../../../layouts/AppTopNavbar';
import { LandingFooter } from '../../landing/components/LandingFooter';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { MarkdownContent } from '../../../components/common/MarkdownContent';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../../providers/TranslationContext';

export const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language, setLanguage, translate, t } = useTranslation();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const tText = (text: string | null | undefined): string => {
    if (!text || language === 'en') return text || '';
    return translate(text);
  };

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
      <div className="min-h-screen bg-[#fafbfc] font-['Onest',system-ui,sans-serif] flex flex-col justify-between">
        <AppTopNavbar />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-pulse space-y-6 w-full">
          <div className="h-4 bg-[#e6e8ec] rounded-full w-1/4" />
          <div className="h-10 bg-[#e6e8ec] rounded-2xl w-3/4" />
          <div className="h-4 bg-[#e6e8ec] rounded-full w-1/2" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-96 bg-[#e6e8ec] rounded-[1.75rem] w-full" />
              <div className="space-y-3 pt-6">
                <div className="h-4 bg-[#e6e8ec] rounded-full w-full" />
                <div className="h-4 bg-[#e6e8ec] rounded-full w-full" />
                <div className="h-4 bg-[#e6e8ec] rounded-full w-5/6" />
              </div>
            </div>
            <div className="hidden lg:block lg:col-span-4 space-y-4">
              <div className="h-64 bg-[#e6e8ec] rounded-[1.75rem] w-full" />
              <div className="h-72 bg-[#e6e8ec] rounded-[1.75rem] w-full" />
            </div>
          </div>
        </div>
        <LandingFooter />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#fafbfc] font-['Onest',system-ui,sans-serif] flex flex-col justify-between">
        <AppTopNavbar />
        <div className="max-w-lg mx-auto py-20 px-4 text-center space-y-4">
          <BookOpen className="w-16 h-16 text-[#717784] mx-auto opacity-50" />
          <h1 className="text-2xl font-bold uppercase tracking-tight text-[#0a0a0a]">Article Not Found</h1>
          <p className="text-xs text-[#717784]">
            The article you are looking for has been moved, unpublished, or does not exist.
          </p>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to All Articles</span>
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#0a0a0a] font-['Onest',system-ui,sans-serif] flex flex-col justify-between selection:bg-[#0f2f63] selection:text-white">
      <SeoHead
        title={post.metaTitle || `${post.title} | TrustHyre`}
        description={post.metaDescription || post.excerpt}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.coverImageUrl || undefined}
        articleMeta={{
          publishedTime: post.publishedAt || post.createdAt,
          modifiedTime: post.updatedAt,
          author: post.authorName,
          section: post.category?.name,
          tags: post.tags,
        }}
        noIndex={post.noIndex}
        jsonLd={[...(articleJsonLd ? [articleJsonLd] : []), ...(breadcrumbsJsonLd ? [breadcrumbsJsonLd] : [])]}
      />

      {/* Universal Top Navbar Alone */}
      <AppTopNavbar />

      {/* Sticky Scroll Reading Indicator */}
      <div
        className="fixed top-16 sm:top-18 left-0 right-0 h-1 bg-[#0f2f63] z-50 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 w-full space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5 text-xs text-[#717784] overflow-x-auto scrollbar-none">
          <Link to="/" className="hover:text-[#0f2f63] transition-colors whitespace-nowrap">Home</Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
          <Link to="/blog" className="hover:text-[#0f2f63] transition-colors whitespace-nowrap">Blog</Link>
          {post.category && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
              <Link to={`/blog?category=${post.category.slug}`} className="hover:text-[#0f2f63] transition-colors whitespace-nowrap">
                {post.category.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-40" />
          <span className="text-[#0a0a0a] font-medium truncate max-w-[200px] sm:max-w-md">{post.title}</span>
        </nav>

        {/* 12-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Main Article Column (8 Cols) */}
          <div className="lg:col-span-8 min-w-0 space-y-8">
            {/* Article Header Meta Pills */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {post.category && (
                  <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#0f2f63]/10 text-[#0f2f63]">
                    {tText(post.category.name)}
                  </span>
                )}
                {post.targetCity && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#717784] bg-[#f4f4f4] px-2.5 py-1 rounded-full border border-[#e6e8ec]">
                    <MapPin className="w-3 h-3 text-[#0f2f63]" />
                    {tText(post.targetCity)}
                  </span>
                )}
                {post.targetTrade && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#717784] bg-[#f4f4f4] px-2.5 py-1 rounded-full border border-[#e6e8ec]">
                    <Briefcase className="w-3 h-3 text-[#0f2f63]" />
                    {tText(post.targetTrade)}
                  </span>
                )}
                <span className="text-[10px] text-[#717784] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {post.readTimeMinutes} min read
                </span>

                {/* Multilingual Switcher Bar */}
                <div className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50 border border-[#e6e8ec] rounded-full text-xs ml-auto">
                  <Globe className="w-3.5 h-3.5 text-[#0f2f63] shrink-0" />
                  <span className="text-[10px] font-bold text-[#717784] uppercase tracking-wider hidden sm:inline">Translate:</span>
                  <div className="flex items-center gap-1">
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setLanguage(lang.code)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          language === lang.code
                            ? 'bg-[#0f2f63] text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-[#0a0a0a] border border-slate-200'
                        }`}
                      >
                        {lang.native}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold uppercase tracking-tight text-[#0a0a0a] leading-tight">
                {tText(post.title)}
              </h1>

              <p className="text-sm sm:text-base text-[#717784] font-normal leading-relaxed">
                {tText(post.excerpt)}
              </p>
            </div>

            {/* Author Capsule & Social Sharing Row */}
            <div className="p-4 sm:p-5 bg-[#f4f4f4] rounded-2xl border border-[#e6e8ec] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UserAvatar name={post.authorName} size="md" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#0a0a0a] leading-none">
                    {post.authorName}
                  </p>
                  <p className="text-[11px] text-[#717784] mt-0.5">
                    {tText(post.authorRole || 'Industry Specialist')} • Published {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Social Share Pills */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} - ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white hover:bg-emerald-50 text-[#717784] hover:text-emerald-600 border border-[#e6e8ec] transition-colors"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white hover:bg-blue-50 text-[#717784] hover:text-[#0f2f63] border border-[#e6e8ec] transition-colors"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-white hover:bg-slate-100 text-[#717784] hover:text-[#0a0a0a] border border-[#e6e8ec] transition-colors"
                  title="Share on X"
                >
                  <Twitter className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#f4f4f4] text-[#0a0a0a] border border-[#e6e8ec] text-xs font-medium transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#717784]" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Featured Cover Image */}
            {post.coverImageUrl && (
              <div className="overflow-hidden rounded-[1.75rem] border border-[#e6e8ec] shadow-xs aspect-[16/9] w-full bg-[#f4f4f4]">
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Article Body Content */}
            <article className="bg-white rounded-[1.75rem] border border-[#e6e8ec] p-6 sm:p-10 shadow-xs">
              <div className="prose max-w-none text-[#0a0a0a]">
                <MarkdownContent content={post.content} />
              </div>
            </article>

            {/* Article Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#717784] font-medium mr-1">Related Tags:</span>
                {post.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-white border border-[#e6e8ec] text-xs text-[#5a6270] shadow-2xs font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* High-Converting TrustHyre Conversion Card */}
            <div className="bg-[#0f2f63] text-white rounded-[1.75rem] p-6 sm:p-8 md:p-10 shadow-md relative overflow-hidden">
              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-semibold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{tText("Direct Verified Hiring")}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-medium uppercase tracking-tight text-white">
                  {tText(`Need Verified ${post.targetTrade || 'Trade'} Workers in ${post.targetCity || 'India'}?`)}
                </h3>
                <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-normal">
                  {tText("TrustHyre connects businesses directly with government ID-verified, trade-tested technicians, delivery executives, and facility crew with zero contractor commissions.")}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link
                    to="/find-workers"
                    className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-[#0f2f63] text-xs font-semibold uppercase tracking-wider shadow-xs transition-all active:scale-95"
                  >
                    {tText("Browse Verified Talent")}
                  </Link>
                  <Link
                    to="/post-job"
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold uppercase tracking-wider transition-all active:scale-95"
                  >
                    {tText("Post a Job in 2 Minutes")}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Sticky Sidebar (4 Cols) */}
          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-6 sticky top-24">
            {/* Quick Action Hiring Card */}
            <div className="bg-white rounded-3xl border border-[#e6e8ec] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#0f2f63]/10 text-[#0f2f63]">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-[#0a0a0a]">
                    {tText("Verified Hiring")}
                  </h4>
                  <p className="text-[11px] text-[#717784]">
                    {tText(`Direct to ${post.targetTrade || 'Talent'} in ${post.targetCity || 'All India'}`)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 py-2 border-y border-[#e6e8ec]">
                <div className="flex items-center gap-2 text-xs text-[#0a0a0a]">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{tText("Govt ID & Background Checked")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#0a0a0a]">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{tText("Direct phone connect, zero middlemen")}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#0a0a0a]">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{tText("Fair compensation benchmarking")}</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  to="/find-workers"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#0f2f63] hover:bg-[#2563c9] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-xs"
                >
                  <span>{tText(`Browse ${post.targetTrade || 'Specialists'}`)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/post-job"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] border border-[#e6e8ec] text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  <span>{tText("Post Hiring Need")}</span>
                </Link>
              </div>
            </div>

            {/* Sidebar Related Articles (Compact List) */}
            {relatedPosts.length > 0 && (
              <div className="bg-white rounded-3xl border border-[#e6e8ec] p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0a0a0a]">
                    Top Related Reads
                  </h4>
                  <Link
                    to="/blog"
                    className="text-[11px] font-semibold text-[#0f2f63] hover:underline"
                  >
                    See all
                  </Link>
                </div>

                <div className="space-y-3">
                  {relatedPosts.slice(0, 3).map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/blog/${rel.slug}`}
                      className="group block p-3 rounded-2xl bg-[#f4f4f4] hover:bg-[#e6e8ec] transition-colors border border-[#e6e8ec]"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#0f2f63] bg-[#0f2f63]/10 px-2 py-0.5 rounded-full">
                          {rel.targetTrade || 'Article'}
                        </span>
                        <span className="text-[10px] text-[#717784] ml-auto">
                          {rel.readTimeMinutes}m
                        </span>
                      </div>
                      <h5 className="text-xs font-semibold text-[#0a0a0a] group-hover:text-[#0f2f63] transition-colors line-clamp-2">
                        {rel.title}
                      </h5>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share Widget */}
            <div className="bg-white rounded-3xl border border-[#e6e8ec] p-5 shadow-xs text-center space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#717784] block">
                Share this Article
              </span>
              <div className="flex items-center justify-center gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle} - ${shareUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full bg-[#f4f4f4] hover:bg-emerald-50 text-[#717784] hover:text-emerald-600 border border-[#e6e8ec] transition-colors"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full bg-[#f4f4f4] hover:bg-blue-50 text-[#717784] hover:text-[#0f2f63] border border-[#e6e8ec] transition-colors"
                  title="Share on LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full bg-[#f4f4f4] hover:bg-slate-100 text-[#717784] hover:text-[#0a0a0a] border border-[#e6e8ec] transition-colors"
                  title="Share on X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <button
                  onClick={handleCopyLink}
                  className="p-2.5 rounded-full bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] border border-[#e6e8ec] transition-colors cursor-pointer"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4 text-[#717784]" />}
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Articles Carousel / Grid */}
        {relatedPosts.length > 0 && (
          <div className="space-y-6 pt-6 border-t border-[#e6e8ec]">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-medium uppercase tracking-tight text-[#0a0a0a]">
                  Related Articles
                </h3>
                <p className="text-xs text-[#717784]">
                  More insights in {post.category?.name || 'Skilled Workforce Management'}
                </p>
              </div>
              <Link
                to="/blog"
                className="text-xs font-semibold uppercase tracking-wider text-[#0f2f63] hover:text-[#2563c9] transition-colors"
              >
                View All
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/blog/${rel.slug}`}
                  className="bg-white rounded-[1.5rem] border border-[#e6e8ec] hover:border-[#0f2f63]/30 transition-all p-5 shadow-xs hover:shadow-md group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0f2f63] bg-[#0f2f63]/10 px-2.5 py-0.5 rounded-full">
                        {rel.targetTrade || 'Article'}
                      </span>
                      <span className="text-[10px] text-[#717784] flex items-center gap-1 ml-auto">
                        <Clock className="w-2.5 h-2.5" />
                        {rel.readTimeMinutes}m read
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-semibold text-[#0a0a0a] group-hover:text-[#2563c9] transition-colors line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>

                    <p className="text-xs text-[#717784] font-normal leading-relaxed line-clamp-2">
                      {rel.excerpt}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#e6e8ec] flex items-center justify-between text-xs font-semibold text-[#0f2f63]">
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to Blog Button */}
        <div className="pt-4 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white hover:bg-[#f4f4f4] text-[#0a0a0a] border border-[#e6e8ec] text-xs font-semibold uppercase tracking-wider transition-all shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#717784]" />
            <span>Back to All Insights</span>
          </Link>
        </div>

      </main>

      {/* Consistent Landing Footer */}
      <LandingFooter />
    </div>
  );
};
