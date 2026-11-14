import { useEffect } from 'react';
import { buildCanonical, buildPageTitle, siteConfig } from '../utils/seo.js';

/**
 * Custom hook to manage document title, core meta tags, Open Graph, Twitter Cards,
 * and JSON-LD structured data in client SPA.
 */
export function usePageMeta({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = siteConfig.defaultImage,
  article = null,
  jsonLd = null,
  noIndex = false,
}) {
  const articlePublishedAt = article?.publishedAt || '';
  const articleUpdatedAt = article?.updatedAt || '';
  const articleAuthor = article?.author?.name || '';
  const articleCategory = article?.category || '';
  const articleTags = Array.isArray(article?.tags) ? article.tags : [];
  const articleTagsKey = articleTags.join('\u0000');
  const jsonLdContent = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const formattedTitle = buildPageTitle(title);
    document.title = formattedTitle;

    const setMetaTag = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (content == null || content === '') {
        if (el) el.remove();
        return;
      }
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const metaDescContent = description || siteConfig.description;
    setMetaTag('name', 'description', metaDescContent);

    const canonicalHref = canonical === false
      ? ''
      : canonical || buildCanonical(window.location.pathname);
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (canonicalHref && !linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    if (canonicalHref) {
      linkCanonical.href = canonicalHref;
    } else if (linkCanonical) {
      linkCanonical.remove();
    }

    setMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : '');
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', metaDescContent);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalHref);
    setMetaTag('property', 'og:site_name', siteConfig.name);
    const absoluteOgImage = new URL(ogImage, `${siteConfig.url}/`).href;
    setMetaTag('property', 'og:image', absoluteOgImage);

    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', metaDescContent);
    setMetaTag('name', 'twitter:image', absoluteOgImage);

    const toIsoDate = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString();
    };
    setMetaTag('property', 'article:published_time', toIsoDate(articlePublishedAt));
    setMetaTag('property', 'article:modified_time', toIsoDate(articleUpdatedAt));
    setMetaTag('property', 'article:author', articleAuthor);
    setMetaTag('property', 'article:section', articleCategory);

    document.querySelectorAll('meta[property="article:tag"]').forEach((tag) => tag.remove());
    articleTags.forEach((tag) => {
      const articleTag = document.createElement('meta');
      articleTag.setAttribute('property', 'article:tag');
      articleTag.setAttribute('content', tag);
      document.head.appendChild(articleTag);
    });

    let scriptJsonLd = document.querySelector('script[data-schema="dynamic-jsonld"]');
    if (jsonLdContent) {
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement('script');
        scriptJsonLd.type = 'application/ld+json';
        scriptJsonLd.setAttribute('data-schema', 'dynamic-jsonld');
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = jsonLdContent;
    } else if (scriptJsonLd) {
      scriptJsonLd.remove();
    }

    return () => {
      const dynamicSchema = document.querySelector('script[data-schema="dynamic-jsonld"]');
      if (dynamicSchema) dynamicSchema.remove();
    };
  }, [
    title,
    description,
    canonical,
    ogType,
    ogImage,
    noIndex,
    articlePublishedAt,
    articleUpdatedAt,
    articleAuthor,
    articleCategory,
    articleTagsKey,
    jsonLdContent,
  ]);
}
