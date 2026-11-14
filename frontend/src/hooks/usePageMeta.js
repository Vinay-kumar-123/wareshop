import { useEffect } from 'react';
import { siteConfig } from '../utils/seo.js';

/**
 * Custom hook to manage document title, core meta tags, Open Graph, Twitter Cards,
 * and JSON-LD structured data in client SPA.
 */
export function usePageMeta({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = '/assets/og-image.jpg',
  article = null,
  jsonLd = null,
}) {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title
      ? (title.includes(siteConfig.name) ? title : `${title} — ${siteConfig.name}`)
      : `${siteConfig.name} — ${siteConfig.tagline}`;
    document.title = formattedTitle;

    // Helper to set/create <meta> tags by name or property
    const setMetaTag = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // 2. Standard Meta Description
    const metaDescContent = description || siteConfig.description;
    setMetaTag('name', 'description', metaDescContent);

    // 3. Update Canonical URL
    const canonicalHref = canonical || (typeof window !== 'undefined' ? window.location.href : siteConfig.url);
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.rel = 'canonical';
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalHref;

    // 4. Open Graph Tags
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', metaDescContent);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalHref);
    setMetaTag('property', 'og:site_name', siteConfig.name);
    
    // Resolve absolute image URL if needed
    const absoluteOgImage = ogImage.startsWith('http')
      ? ogImage
      : `${siteConfig.url}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;
    setMetaTag('property', 'og:image', absoluteOgImage);

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', metaDescContent);
    setMetaTag('name', 'twitter:image', absoluteOgImage);

    // Article Specific OG Metadata if provided
    if (article) {
      if (article.publishedAt) {
        setMetaTag('property', 'article:published_time', new Date(article.publishedAt).toISOString());
      }
      if (article.updatedAt) {
        setMetaTag('property', 'article:modified_time', new Date(article.updatedAt).toISOString());
      }
      if (article.author?.name) {
        setMetaTag('property', 'article:author', article.author.name);
      }
      if (article.category) {
        setMetaTag('property', 'article:section', article.category);
      }
      if (Array.isArray(article.tags)) {
        article.tags.forEach((tag) => {
          setMetaTag('property', 'article:tag', tag);
        });
      }
    }

    // 6. JSON-LD Structured Data
    let scriptJsonLd = document.querySelector('script[data-schema="dynamic-jsonld"]');
    if (jsonLd) {
      if (!scriptJsonLd) {
        scriptJsonLd = document.createElement('script');
        scriptJsonLd.type = 'application/ld+json';
        scriptJsonLd.setAttribute('data-schema', 'dynamic-jsonld');
        document.head.appendChild(scriptJsonLd);
      }
      scriptJsonLd.textContent = JSON.stringify(jsonLd);
    } else if (scriptJsonLd) {
      scriptJsonLd.remove();
    }

    return () => {
      // Optional cleanup on unmount: remove article tags or dynamic json-ld if navigating away
      const dynamicSchema = document.querySelector('script[data-schema="dynamic-jsonld"]');
      if (dynamicSchema) dynamicSchema.remove();
    };
  }, [title, description, canonical, ogType, ogImage, article, jsonLd]);
}
