import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import Badge from '../../components/common/Badge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import blogService from '../../services/blogService.js';
import {
  BookOpen,
  Search,
  Clock,
  Calendar,
  ArrowRight,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

export default function BlogListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page'), 10) || 1;

  const [articles, setArticles] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 9, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState(currentSearch);

  usePageMeta({
    title: 'Marketplace Guides, Insights & Hiring Advice — KONNEVIA',
    description: 'Expert guides, line-item budgeting advice, and hiring checklists across Home & Construction, Events, Business, and Digital Services.',
    canonical: 'https://konnevia.com/blog',
  });

  // Fetch categories once on mount
  useEffect(() => {
    blogService
      .getBlogCategories()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCategoriesList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch articles on searchParams change
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setSearchInput(currentSearch);

    blogService
      .getBlogs({
        page: currentPage,
        limit: 9,
        category: currentCategory,
        search: currentSearch,
      })
      .then((res) => {
        if (res.success && res.data) {
          setArticles(res.data.blogs || []);
          setPagination(res.data.pagination || { page: 1, limit: 9, total: 0, pages: 1 });
        } else {
          setError('Failed to load editorial articles.');
        }
      })
      .catch((err) => {
        console.error('Blog listing error:', err);
        setError('Unable to reach the editorial service. Please try again shortly.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [currentCategory, currentSearch, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput.trim()) {
      params.set('search', searchInput.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleCategoryClick = (cat) => {
    const params = new URLSearchParams(searchParams);
    if (cat === currentCategory) {
      params.delete('category');
    } else {
      params.set('category', cat);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const featuredArticle = articles.length > 0 && !currentSearch && !currentCategory && currentPage === 1
    ? articles[0]
    : null;

  const gridArticles = featuredArticle
    ? articles.slice(1)
    : articles;

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Blog & Guides' }]} />
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10 sm:mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
            Resources & Editorial Insights
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-3">
            Guides, Checklists & Cost Breakdowns
          </h1>
          <p className="text-text-muted text-base sm:text-lg leading-relaxed">
            Unbiased advice written by certified practitioners to help Indian homeowners, event planners, and businesses hire verified professionals with confidence.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-border/80 shadow-xs mb-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => handleCategoryClick('')}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  !currentCategory
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-text-muted hover:text-primary hover:bg-slate-200/80'
                }`}
              >
                All Verticals
              </button>
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    currentCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 text-text-muted hover:text-primary hover:bg-slate-200/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Keyword Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-shrink-0 w-full md:w-72">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search articles & topics..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-border rounded-lg text-primary focus:outline-none focus:border-accent focus:bg-white transition-colors"
              />
            </form>
          </div>

          {(currentCategory || currentSearch) && (
            <div className="flex items-center justify-between pt-3 border-t border-border/60 text-xs text-text-muted">
              <span>
                Filtered by:{' '}
                {currentCategory && <strong>Category: {currentCategory} </strong>}
                {currentSearch && <strong>Keyword: "{currentSearch}"</strong>}
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-text-muted">Loading editorial articles...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-lg mx-auto">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-xs py-2 px-4"
            >
              Retry Loading
            </button>
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Articles Found"
            description="We couldn't find any articles matching your search or category filter. Try clearing your filters to explore all guides."
            actionLabel="View All Articles"
            actionHref="/blog"
          />
        ) : (
          <div className="space-y-10">
            {/* Featured Article Card */}
            {featuredArticle && (
              <div className="bg-white rounded-2xl border border-border/80 overflow-hidden shadow-xs hover:border-accent/40 transition-colors">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent-50 px-2 py-0.5 rounded">
                          Featured Insight
                        </span>
                        <Badge variant="teal">{featuredArticle.category}</Badge>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight leading-tight mb-3">
                        <Link
                          to={`/blog/${featuredArticle.slug}`}
                          className="hover:text-accent transition-colors"
                        >
                          {featuredArticle.title}
                        </Link>
                      </h2>

                      <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-6">
                        {featuredArticle.excerpt}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-4 text-xs text-text-muted mb-6">
                        <span>By {featuredArticle.author?.name || 'KONNEVIA Staff'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          {featuredArticle.readingTimeMinutes || 5} min read
                        </span>
                      </div>

                      <Link
                        to={`/blog/${featuredArticle.slug}`}
                        className="btn-primary py-2.5 px-6 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-xs"
                      >
                        <span>Read Full Guide</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-slate-100 flex items-center justify-center p-8 border-t lg:border-t-0 lg:border-l border-border/80">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mx-auto mb-4 text-accent">
                        <Sparkles className="w-8 h-8" />
                      </div>
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">
                        Practitioner Knowledge
                      </span>
                      <p className="text-xs text-text-muted max-w-xs">
                        Scrutinized frameworks written to protect clients from common contract pitfalls.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid of Articles */}
            {gridArticles.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {gridArticles.map((article) => (
                  <article
                    key={article.slug}
                    className="card-hover bg-white p-6 rounded-2xl border border-border/80 flex flex-col justify-between h-full"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="teal">{article.category}</Badge>
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3 text-accent" />
                          {article.readingTimeMinutes || 5} min read
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-primary mb-2 line-clamp-2 leading-snug">
                        <Link
                          to={`/blog/${article.slug}`}
                          className="hover:text-accent transition-colors"
                        >
                          {article.title}
                        </Link>
                      </h3>

                      <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {article.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-medium bg-slate-100 text-text-muted px-2 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-border/60 flex items-center justify-between">
                      <span className="text-xs text-text-muted">
                        {article.author?.name || 'Editorial Team'}
                      </span>
                      <Link
                        to={`/blog/${article.slug}`}
                        className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                      >
                        <span>Read Article</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="btn-ghost p-2 text-xs border border-border rounded-lg disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-primary px-3">
                  Page {currentPage} of {pagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.pages}
                  className="btn-ghost p-2 text-xs border border-border rounded-lg disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
