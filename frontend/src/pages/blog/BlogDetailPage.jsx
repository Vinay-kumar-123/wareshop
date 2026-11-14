import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import blogService from '../../services/blogService.js';
import { getServiceBySlug } from '../../data/services.js';
import {
  Clock,
  Calendar,
  Share2,
  ArrowRight,
  BookOpen,
  User,
  ShieldCheck,
  FileQuestion,
  Layers,
  ArrowLeft
} from 'lucide-react';

export default function BlogDetailPage() {
  const { slug } = useParams();

  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dynamic meta tags & Article JSON-LD Structured Data
  const articleCanonical = article ? `https://konnevia.in/blog/${article.slug}` : undefined;
  const articleJsonLd = article
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.metaTitle || article.title,
        description: article.metaDescription || article.excerpt,
        image: article.coverImage
          ? (article.coverImage.startsWith('http') ? article.coverImage : `https://konnevia.in${article.coverImage.startsWith('/') ? '' : '/'}${article.coverImage}`)
          : 'https://konnevia.in/assets/og-image.jpg',
        datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
        dateModified: article.updatedAt ? new Date(article.updatedAt).toISOString() : (article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined),
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': articleCanonical,
        },
        author: {
          '@type': 'Person',
          name: article.author?.name || 'KONNEVIA Editorial Team',
          jobTitle: article.author?.role || 'Editorial Specialist',
        },
        publisher: {
          '@type': 'Organization',
          name: 'KONNEVIA',
          url: 'https://konnevia.in',
          logo: {
            '@type': 'ImageObject',
            url: 'https://konnevia.in/logo.svg',
          },
        },
        articleSection: article.category,
        keywords: Array.isArray(article.tags) ? article.tags.join(', ') : undefined,
      }
    : null;

  usePageMeta({
    title: article ? (article.metaTitle || article.title) : 'Editorial Guide',
    description: article ? (article.metaDescription || article.excerpt) : 'Editorial guide and service checklist on KONNEVIA.',
    canonical: articleCanonical,
    ogType: 'article',
    ogImage: article?.coverImage || '/assets/og-image.jpg',
    article: article,
    jsonLd: articleJsonLd,
  });

  useEffect(() => {
    setIsLoading(true);
    setNotFound(false);

    blogService
      .getBlogBySlug(slug)
      .then((res) => {
        if (res.success && res.data) {
          setArticle(res.data);
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        // C1 Fix: Expected 404 (article not found / unpublished) is a normal navigation event —
        // only log unexpected errors to avoid false positives in monitoring and test runners.
        if (err.status !== 404) {
          console.error('Error fetching blog detail:', err);
        }
        setNotFound(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-20 px-4 bg-background">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-text-muted">Loading article content...</p>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 bg-background">
        <EmptyState
          icon={FileQuestion}
          title="Article Not Found"
          description={`We couldn't locate an editorial article matching "${slug}". It may have been archived or moved.`}
          actionLabel="Browse All Guides"
          actionHref="/blog"
        />
      </div>
    );
  }

  // Related service lookup if mapped
  const linkedService = article.relatedServiceSlug
    ? getServiceBySlug(article.relatedServiceSlug)
    : null;

  // Markdown-like text segment formatter (handles bold, italic, and paragraphs)
  const formatInlineText = (text) => {
    if (!text) return text;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-primary">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Simple Markdown content renderer for clean readability
  const renderFormattedContent = (rawText) => {
    if (!rawText) return null;

    const sections = rawText.split('\n\n');
    return sections.map((para, idx) => {
      if (para.startsWith('### ')) {
        return (
          <h2 key={idx} className="text-xl sm:text-2xl font-bold text-primary mt-8 mb-4">
            {formatInlineText(para.replace('### ', ''))}
          </h2>
        );
      }
      if (para.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-2xl sm:text-3xl font-extrabold text-primary mt-10 mb-4">
            {formatInlineText(para.replace('## ', ''))}
          </h2>
        );
      }
      if (para.startsWith('---')) {
        return <hr key={idx} className="my-8 border-border/80" />;
      }
      if (para.startsWith('- ')) {
        const items = para.split('\n').filter((l) => l.startsWith('- '));
        return (
          <ul key={idx} className="list-disc list-inside space-y-2 text-text-primary text-sm sm:text-base leading-relaxed my-4 pl-2">
            {items.map((item, itemIdx) => (
              <li key={itemIdx}>{formatInlineText(item.replace('- ', ''))}</li>
            ))}
          </ul>
        );
      }
      if (/^\d+\.\s/.test(para)) {
        const items = para.split('\n').filter((l) => /^\d+\.\s/.test(l));
        return (
          <ol key={idx} className="list-decimal list-inside space-y-2 text-text-primary text-sm sm:text-base leading-relaxed my-4 pl-2">
            {items.map((item, itemIdx) => (
              <li key={itemIdx}>{formatInlineText(item.replace(/^\d+\.\s/, ''))}</li>
            ))}
          </ol>
        );
      }
      return (
        <p key={idx} className="text-text-primary text-sm sm:text-base leading-relaxed mb-4">
          {formatInlineText(para)}
        </p>
      );
    });
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Blog & Guides', href: '/blog' },
              { label: article.category, href: `/blog?category=${encodeURIComponent(article.category)}` },
              { label: article.title },
            ]}
          />
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Article Content Column (8 cols) */}
          <article className="lg:col-span-8 bg-white p-6 sm:p-10 rounded-2xl border border-border/80 shadow-xs">
            {/* Header info */}
            <div className="mb-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="teal">{article.category}</Badge>
                {article.isDevSample && (
                  <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                    Editorial Sample
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-4">
                {article.title}
              </h1>

              <p className="text-text-muted text-base sm:text-lg leading-relaxed mb-6 font-medium">
                {article.excerpt}
              </p>

              {/* Author & Meta bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-border/60 text-xs text-text-muted">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-50 text-accent font-bold flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-primary block">
                      {article.author?.name || 'KONNEVIA Editorial Staff'}
                    </span>
                    <span className="text-[11px]">{article.author?.role || 'Domain Contributor'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    {article.readingTimeMinutes || 5} min read
                  </span>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-accent transition-colors py-1 px-2.5 rounded bg-slate-50 border border-border"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copied ? 'Link Copied!' : 'Share'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Article Content Body */}
            <div className="prose-content my-8">
              {renderFormattedContent(article.content)}
            </div>

            {/* Tags Footer */}
            {article.tags && article.tags.length > 0 && (
              <div className="pt-6 border-t border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">
                  Related Topics
                </span>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-slate-100 text-text-primary px-3 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar Column (4 cols) */}
          <aside className="lg:col-span-4 space-y-8">
            {/* Linked Service Callout Box */}
            {linkedService && (
              <div className="bg-slate-50 border border-border/80 rounded-2xl p-6 shadow-xs">
                <span className="text-xs font-bold uppercase tracking-wider text-accent mb-1.5 block">
                  Hire Related Experts
                </span>
                <h3 className="text-lg font-bold text-primary mb-2">
                  Need {linkedService.name}?
                </h3>
                <p className="text-xs text-text-muted leading-relaxed mb-4">
                  Connect with verified {linkedService.name} specialists vetted by our operations desk.
                </p>
                <div className="space-y-2">
                  <Link
                    to={`/services/${linkedService.slug}`}
                    className="btn-secondary w-full py-2 px-4 text-xs font-semibold flex items-center justify-center gap-1 text-center"
                  >
                    <span>View {linkedService.name} Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    to={`/get-quote?service=${encodeURIComponent(linkedService.name)}&category=${encodeURIComponent(linkedService.categorySlug)}`}
                    className="btn-primary w-full py-2 px-4 text-xs font-semibold flex items-center justify-center gap-1 text-center shadow-xs"
                  >
                    <span>Request Free Quotes</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Related Articles in same category */}
            {article.relatedArticles && article.relatedArticles.length > 0 && (
              <div className="bg-white border border-border/80 rounded-2xl p-6 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-accent" />
                  <span>More in {article.category}</span>
                </h3>
                <div className="space-y-4">
                  {article.relatedArticles.map((rel) => (
                    <div key={rel.slug} className="group pb-3 border-b border-border/40 last:border-none last:pb-0">
                      <h4 className="text-xs sm:text-sm font-bold text-primary group-hover:text-accent transition-colors leading-snug mb-1">
                        <Link to={`/blog/${rel.slug}`}>{rel.title}</Link>
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-text-muted">
                        <Clock className="w-3 h-3 text-accent" />
                        <span>{rel.readingTimeMinutes || 5} min read</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back to Guides Link */}
            <div className="text-center">
              <Link
                to="/blog"
                className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to All Guides</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
