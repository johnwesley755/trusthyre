import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Globe, 
  Eye, 
  FileText, 
  Sparkles, 
  Check, 
  MapPin, 
  Briefcase, 
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import type { BlogCategory } from '../../../services/blog.service';

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-]+/g, '-')
    .replace(/\-\-+/g, '-')
    .replace(/^-|-$/g, '');

export const AdminBlogEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(isEditing);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Form Fields
  const [title, setTitle] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [excerpt, setExcerpt] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('TrustHyre Editorial Team');
  const [authorRole, setAuthorRole] = useState<string>('Industry Specialist');
  const [targetCity, setTargetCity] = useState<string>('Chennai');
  const [targetTrade, setTargetTrade] = useState<string>('Electrician');
  const [tagsInput, setTagsInput] = useState<string>('Hiring, Blue Collar, Chennai');
  const [metaTitle, setMetaTitle] = useState<string>('');
  const [metaDescription, setMetaDescription] = useState<string>('');
  const [noIndex, setNoIndex] = useState<boolean>(false);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  useEffect(() => {
    loadCategories();
    if (id) {
      loadArticle(id);
    }
  }, [id]);

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

  const loadArticle = async (articleId: string) => {
    setLoading(true);
    try {
      const res = await BlogService.getAdminArticleById(articleId);
      if (res.success && res.post) {
        const p = res.post;
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt);
        setContent(p.content);
        setCoverImageUrl(p.coverImageUrl || '');
        setCategoryId(p.categoryId || '');
        setAuthorName(p.authorName);
        setAuthorRole(p.authorRole || '');
        setTargetCity(p.targetCity || '');
        setTargetTrade(p.targetTrade || '');
        setTagsInput((p.tags || []).join(', '));
        setMetaTitle(p.metaTitle || '');
        setMetaDescription(p.metaDescription || '');
        setNoIndex(Boolean(p.noIndex));
        setStatus(p.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT');
      }
    } catch (err) {
      console.error('Failed to load article:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && !slug) {
      setSlug(toSlug(val));
    }
    if (!metaTitle) {
      setMetaTitle(val);
    }
  };

  const handleExcerptChange = (val: string) => {
    setExcerpt(val);
    if (!metaDescription) {
      setMetaDescription(val);
    }
  };

  const handleSubmit = async (publishNow = false) => {
    if (!title.trim()) {
      alert('Article title is required');
      return;
    }
    if (!content.trim()) {
      alert('Article content is required');
      return;
    }

    setSaving(true);
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const targetStatus = publishNow ? 'PUBLISHED' : status;

    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || title.trim(),
      content,
      coverImageUrl: coverImageUrl.trim() || undefined,
      authorName: authorName.trim() || undefined,
      authorRole: authorRole.trim() || undefined,
      categoryId: categoryId || undefined,
      status: targetStatus,
      metaTitle: metaTitle.trim() || title.trim(),
      metaDescription: metaDescription.trim() || excerpt.trim(),
      noIndex,
      tags,
      targetCity: targetCity.trim() || undefined,
      targetTrade: targetTrade.trim() || undefined,
    };

    try {
      if (isEditing && id) {
        await BlogService.updateArticle(id, payload);
      } else {
        await BlogService.createArticle(payload);
      }
      navigate('/admin/blog');
    } catch (err: any) {
      console.error('Save article error:', err);
      alert(err.message || 'Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
        Loading article editor...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      {/* Editor Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blog"
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Edit Article' : 'Compose New Article'}
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              /blog/{slug || 'url-slug'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <Globe className="w-4 h-4" />
            <span>{status === 'PUBLISHED' ? 'Update Live' : 'Publish Article'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Editorial Canvas (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Article Core Metadata Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Article Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Electrician Jobs & Hiring in Chennai: Skills & Certifications"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  URL Slug (Auto or Custom)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]+/g, ''))}
                  placeholder="electrician-hiring-guide-chennai"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Select Topic Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Short Excerpt (Displayed on Cards & Search Previews)
              </label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => handleExcerptChange(e.target.value)}
                placeholder="A concise 2-sentence summary outlining what this guide covers..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Content Editor Tab Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'write' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Write Content</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'preview' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-600 font-mono">
                Markdown headings: ## H2, ### H3, - Lists, &gt; Quotes
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your guide in Markdown or rich text...&#10;&#10;## 1. Introduction&#10;Explain the industry demand in the region...&#10;&#10;## 2. Required Qualifications&#10;- ITI Certification&#10;- Government Wireman License&#10;&#10;> Verified technicians on TrustHyre complete photo check-ins daily."
                className="w-full p-4 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none resize-y min-h-[420px]"
              />
            ) : (
              <div className="p-6 prose prose-slate max-w-none text-xs leading-relaxed min-h-[420px] bg-slate-50/50">
                {content.split('\n\n').map((para, i) => {
                  const t = para.trim();
                  if (t.startsWith('## ')) return <h2 key={i} className="text-lg font-black text-slate-900 mt-4 mb-2">{t.replace('## ', '')}</h2>;
                  if (t.startsWith('### ')) return <h3 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1">{t.replace('### ', '')}</h3>;
                  if (t.startsWith('> ')) return <blockquote key={i} className="pl-3 border-l-2 border-blue-600 italic bg-blue-50/50 p-2 text-slate-700">{t.replace('> ', '')}</blockquote>;
                  if (t.startsWith('- ')) {
                    return (
                      <ul key={i} className="list-disc list-inside space-y-1 text-slate-700">
                        {t.split('\n').map((item, idx) => <li key={idx}>{item.replace(/^- /, '')}</li>)}
                      </ul>
                    );
                  }
                  return <p key={i} className="my-2 text-slate-700">{t}</p>;
                })}
              </div>
            )}
          </div>

        </div>

        {/* Sidebar Controls (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Geography & Trade Filter */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>GEO & Trade Targeting</span>
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target City</label>
              <input
                type="text"
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                placeholder="e.g. Chennai, Bangalore, Coimbatore"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Skilled Trade</label>
              <input
                type="text"
                value={targetTrade}
                onChange={(e) => setTargetTrade(e.target.value)}
                placeholder="e.g. Electrician, Warehouse Staff, Plumber"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Hiring, Blue Collar, Chennai"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Cover Image Settings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Cover Image</span>
            </h3>

            <div>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>

            {coverImageUrl ? (
              <div className="rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                <img src={coverImageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[11px]">
                Paste an image URL to preview hero banner
              </div>
            )}
          </div>

          {/* SEO & SERP Snippet Preview */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Search Engine Optimization</span>
            </h3>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Meta Title</label>
                <span className={`text-[10px] font-mono ${metaTitle.length > 60 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                  {metaTitle.length}/60
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Title shown on Google SERPs..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-slate-600">Meta Description</label>
                <span className={`text-[10px] font-mono ${metaDescription.length > 160 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                  {metaDescription.length}/160
                </span>
              </div>
              <textarea
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Description snippet shown on search engines..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              />
            </div>

            {/* Google SERP Card Preview */}
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Google Search Preview</p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 truncate">
                  <span>https://trusthyre.com</span>
                  <span>›</span>
                  <span>blog</span>
                  <span>›</span>
                  <span className="truncate">{slug || 'article-slug'}</span>
                </div>
                <div className="text-xs font-bold text-blue-800 line-clamp-1">
                  {metaTitle || title || 'Article Title'} | TrustHyre
                </div>
                <div className="text-[11px] text-slate-600 line-clamp-2 leading-snug">
                  {metaDescription || excerpt || 'Article excerpt and meta summary will appear here on Google searches.'}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminBlogEditorPage;
