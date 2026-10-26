import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Globe, 
  Eye, 
  FileText, 
  Sparkles, 
  MapPin, 
  Briefcase, 
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2
} from 'lucide-react';
import { BlogService, type BlogCategory } from '../../../services/blog.service';
import { MarkdownContent, sanitizeUrl } from '../../../components/common/MarkdownContent';
import { mediaService } from '../../../services/media.service';
import { toast } from 'sonner';

const toSlug = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');

export const AdminBlogEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(isEditing);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Cloudinary Upload States
  const [uploadingCover, setUploadingCover] = useState<boolean>(false);
  const [uploadingContentImage, setUploadingContentImage] = useState<boolean>(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);

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
    if (!isEditing || !slug) {
      setSlug(toSlug(val));
    }
    if (!metaTitle) {
      setMetaTitle(val.slice(0, 60));
    }
  };

  const handleExcerptChange = (val: string) => {
    setExcerpt(val);
    if (!metaDescription) {
      setMetaDescription(val.slice(0, 160));
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadingCover(true);
    try {
      const res = await mediaService.uploadMedia(file);
      if (res && res.url) {
        setCoverImageUrl(res.url);
        toast.success('Cover image uploaded to Cloudinary!');
      } else {
        toast.error('Failed to get uploaded image URL');
      }
    } catch (err: any) {
      console.error('Cloudinary cover upload error:', err);
      toast.error(err.message || 'Failed to upload cover image to Cloudinary');
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };

  const handleContentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploadingContentImage(true);
    try {
      const res = await mediaService.uploadMedia(file);
      if (res && res.url) {
        const altText = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const markdownImage = `\n\n![${altText}](${res.url})\n\n`;
        setContent((prev) => prev + markdownImage);
        toast.success('Image uploaded to Cloudinary & inserted into article!');
      } else {
        toast.error('Failed to get uploaded image URL');
      }
    } catch (err: any) {
      console.error('Cloudinary content image upload error:', err);
      toast.error(err.message || 'Failed to upload image to Cloudinary');
    } finally {
      setUploadingContentImage(false);
      if (contentFileInputRef.current) {
        contentFileInputRef.current.value = '';
      }
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
      <div className="p-12 text-center text-[#717784] text-xs animate-pulse font-['Onest',system-ui,sans-serif]">
        Loading article editor...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl w-full mx-auto font-['Onest',system-ui,sans-serif]">
      {/* Editor Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-[#e6e8ec] shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blog"
            className="p-2 text-[#717784] hover:text-[#0a0a0a] hover:bg-[#f4f4f4] rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-[#0a0a0a]">
              {isEditing ? 'Edit Article' : 'Compose New Article'}
            </h1>
            <p className="text-[11px] text-[#717784] font-mono">
              /blog/{slug || 'url-slug'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-4 py-2 bg-[#f4f4f4] hover:bg-[#e6e8ec] text-[#0a0a0a] rounded-full text-xs font-semibold uppercase tracking-wider border border-[#e6e8ec] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4 text-[#717784]" />
            <span>{saving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-5 py-2 bg-[#0f2f63] hover:bg-[#2563c9] text-white rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
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
          <div className="bg-white p-6 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] mb-1.5">
                Article Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Electrician Jobs & Hiring in Chennai: Skills & Certifications"
                className="w-full px-4 py-2.5 rounded-xl border border-[#e6e8ec] text-sm font-semibold text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63] focus:ring-1 focus:ring-[#0f2f63] shadow-2xs transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#5a6270] uppercase mb-1">
                  URL Slug (Auto or Custom)
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                  placeholder="electrician-hiring-guide-chennai"
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs font-mono text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5a6270] uppercase mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63] bg-white cursor-pointer"
                >
                  <option value="">Select Topic Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5a6270] uppercase mb-1">
                Short Excerpt (Displayed on Cards & Search Previews)
              </label>
              <textarea
                rows={2}
                value={excerpt}
                onChange={(e) => handleExcerptChange(e.target.value)}
                placeholder="A concise 2-sentence summary outlining what this guide covers..."
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>
          </div>

          {/* Content Editor Tab Bar */}
          <div className="bg-white rounded-2xl border border-[#e6e8ec] shadow-xs overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#f4f4f4] border-b border-[#e6e8ec]">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('write')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'write' ? 'bg-[#0f2f63] text-white shadow-xs' : 'text-[#717784] hover:text-[#0a0a0a]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Write Content</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'preview' ? 'bg-[#0f2f63] text-white shadow-xs' : 'text-[#717784] hover:text-[#0a0a0a]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={contentFileInputRef}
                  onChange={handleContentImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => contentFileInputRef.current?.click()}
                  disabled={uploadingContentImage}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 bg-white border border-[#e6e8ec] text-[#0a0a0a] hover:bg-[#e6e8ec] disabled:opacity-50 cursor-pointer shadow-2xs"
                  title="Upload an image to Cloudinary and insert markdown into article"
                >
                  {uploadingContentImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f2f63]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#0f2f63]" />
                  )}
                  <span>{uploadingContentImage ? 'Uploading...' : 'Insert Image (Cloudinary)'}</span>
                </button>

                <div className="text-[10px] text-[#717784] font-mono hidden sm:block">
                  Markdown: ## H2, ### H3, - Lists, &gt; Quotes
                </div>
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article in Markdown or rich text...&#10;&#10;## 1. Introduction&#10;Explain the industry demand in the region...&#10;&#10;## 2. Required Qualifications&#10;- ITI Certification&#10;- Government Wireman License&#10;&#10;> Verified technicians on TrustHyre complete photo check-ins daily."
                className="w-full p-4 text-xs font-mono text-[#0a0a0a] leading-relaxed focus:outline-none resize-y min-h-[420px]"
              />
            ) : (
              <div className="p-6 max-w-none text-xs leading-relaxed min-h-[420px] bg-slate-50/30">
                <MarkdownContent content={content} />
              </div>
            )}
          </div>

        </div>

        {/* Sidebar Controls (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Target Geography & Trade Filter */}
          <div className="bg-white p-5 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>GEO & Trade Targeting</span>
            </h3>

            <div>
              <label className="block text-[11px] font-semibold text-[#5a6270] mb-1">Target City</label>
              <input
                type="text"
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                placeholder="e.g. Chennai, Bangalore, Coimbatore"
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5a6270] mb-1">Target Skilled Trade</label>
              <input
                type="text"
                value={targetTrade}
                onChange={(e) => setTargetTrade(e.target.value)}
                placeholder="e.g. Electrician, Warehouse Staff, Plumber"
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5a6270] mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Hiring, Blue Collar, Chennai"
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>
          </div>

          {/* Cover Image Settings */}
          <div className="bg-white p-5 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#0f2f63]" />
                <span>Cover Image</span>
              </h3>
              {coverImageUrl && (
                <button
                  type="button"
                  onClick={() => setCoverImageUrl('')}
                  className="text-rose-500 hover:text-rose-700 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={coverFileInputRef}
              onChange={handleCoverUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => coverFileInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[#0f2f63]/30 hover:border-[#0f2f63] bg-[#0f2f63]/5 hover:bg-[#0f2f63]/10 text-xs font-semibold text-[#0f2f63] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {uploadingCover ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload Image to Cloudinary</span>
                </>
              )}
            </button>

            <div>
              <label className="block text-[10px] font-semibold text-[#717784] uppercase mb-1">
                Or Paste Image URL directly
              </label>
              <input
                type="text"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/... or https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>

            {(() => {
              const sanitizedCoverUrl = sanitizeUrl(coverImageUrl);
              return sanitizedCoverUrl ? (
                <div className="rounded-xl overflow-hidden aspect-video bg-[#f4f4f4] border border-[#e6e8ec]">
                  <img src={sanitizedCoverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="p-4 text-center border-2 border-dashed border-[#e6e8ec] rounded-xl text-[#717784] text-[11px]">
                  Upload an image to Cloudinary or paste a valid URL to preview hero banner
                </div>
              );
            })()}
          </div>

          {/* SEO & SERP Snippet Preview */}
          <div className="bg-white p-5 rounded-2xl border border-[#e6e8ec] shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#0a0a0a] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0f2f63]" />
              <span>Search Engine Optimization</span>
            </h3>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-[#5a6270]">Meta Title</label>
                <span className={`text-[10px] font-mono ${metaTitle.length > 60 ? 'text-amber-600 font-bold' : 'text-[#717784]'}`}>
                  {metaTitle.length}/60
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Title shown on Google SERPs..."
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-semibold text-[#5a6270]">Meta Description</label>
                <span className={`text-[10px] font-mono ${metaDescription.length > 160 ? 'text-amber-600 font-bold' : 'text-[#717784]'}`}>
                  {metaDescription.length}/160
                </span>
              </div>
              <textarea
                rows={3}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Description snippet shown on search engines..."
                className="w-full px-3 py-2 rounded-xl border border-[#e6e8ec] text-xs text-[#0a0a0a] focus:outline-none focus:border-[#0f2f63]"
              />
            </div>

            {/* Google SERP Card Preview */}
            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase text-[#717784] mb-1.5">Google Search Preview</p>
              <div className="bg-[#f4f4f4] p-3 rounded-xl border border-[#e6e8ec] space-y-1">
                <div className="text-[10px] text-[#717784] font-mono flex items-center gap-1 truncate">
                  <span>https://trusthyre.com</span>
                  <span>›</span>
                  <span>blog</span>
                  <span>›</span>
                  <span className="truncate">{slug || 'article-slug'}</span>
                </div>
                <div className="text-xs font-bold text-[#0f2f63] line-clamp-1">
                  {metaTitle || title || 'Article Title'} | TrustHyre
                </div>
                <div className="text-[11px] text-[#5a6270] line-clamp-2 leading-snug">
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
