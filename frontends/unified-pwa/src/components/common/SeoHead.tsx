import React, { useEffect } from 'react';

export interface ArticleMeta {
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export interface SeoHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  noIndex?: boolean;
  articleMeta?: ArticleMeta;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

const DEFAULT_TITLE = 'TrustHyre | Hire Verified Skilled Workers & Blue-Collar Talent in India';
const DEFAULT_DESCRIPTION = "India's premier verified skilled workforce platform. Hire certified electricians, commercial chefs, warehouse logistics crew, plumbers, and technicians with photo check-in verification and direct employer matching.";
const BASE_DOMAIN = 'https://trusthyre.com';

/**
 * Helper to construct standard Google-compliant BlogPosting Schema.org JSON-LD
 */
export function buildArticleJsonLd(article: {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.canonicalUrl,
    },
    image: article.imageUrl ? [article.imageUrl] : [`${BASE_DOMAIN}/logo.png`],
    datePublished: article.datePublished || new Date().toISOString(),
    dateModified: article.dateModified || article.datePublished || new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: article.authorName || 'TrustHyre Editorial Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'TrustHyre',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_DOMAIN}/logo.png`,
      },
    },
  };
}

/**
 * Helper to construct standard BreadcrumbList Schema.org JSON-LD
 */
export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE_DOMAIN}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath = '',
  ogType = 'website',
  ogImage = `${BASE_DOMAIN}/logo.png`,
  noIndex = false,
  articleMeta,
  jsonLd,
}) => {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title ? `${title} | TrustHyre` : DEFAULT_TITLE;
    document.title = formattedTitle;

    // 2. Helper to set or create meta tag
    const setMetaTag = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
      let tag = document.querySelector(selector);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrVal);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', contentVal);
    };

    // 3. Helper to set or create canonical link
    const setCanonicalLink = (url: string) => {
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', url);
    };

    const fullUrl = `${BASE_DOMAIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`;

    // Update standard meta
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setCanonicalLink(fullUrl);

    // Robots noindex directive handling
    if (noIndex) {
      setMetaTag('meta[name="robots"]', 'name', 'robots', 'noindex, nofollow');
    } else {
      const robotsTag = document.querySelector('meta[name="robots"]');
      if (robotsTag && robotsTag.parentNode) {
        robotsTag.parentNode.removeChild(robotsTag);
      }
    }

    // Update Open Graph
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', formattedTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', fullUrl);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);

    // Article Specific Open Graph tags
    if (ogType === 'article' && articleMeta) {
      if (articleMeta.publishedTime) {
        setMetaTag('meta[property="article:published_time"]', 'property', 'article:published_time', articleMeta.publishedTime);
      }
      if (articleMeta.modifiedTime) {
        setMetaTag('meta[property="article:modified_time"]', 'property', 'article:modified_time', articleMeta.modifiedTime);
      }
      if (articleMeta.author) {
        setMetaTag('meta[property="article:author"]', 'property', 'article:author', articleMeta.author);
      }
      if (articleMeta.section) {
        setMetaTag('meta[property="article:section"]', 'property', 'article:section', articleMeta.section);
      }
    }

    // Update Twitter
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', formattedTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:url"]', 'name', 'twitter:url', fullUrl);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // 4. Inject Dynamic Schema.org JSON-LD if provided
    let scriptTag: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptTag = document.createElement('script');
      scriptTag.type = 'application/ld+json';
      scriptTag.id = 'dynamic-seo-jsonld';
      scriptTag.text = JSON.stringify(jsonLd);
      document.head.appendChild(scriptTag);
    }

    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, [title, description, canonicalPath, ogType, ogImage, noIndex, articleMeta, jsonLd]);

  return null;
};
