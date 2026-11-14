import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import { getCategoryBySlug } from '../../data/categories.js';
import providerService from '../../services/providerService.js';
import {
  Store,
  Building2,
  Warehouse,
  Package,
  Layers,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  FolderOpen,
} from 'lucide-react';

const iconMap = {
  Store,
  Building2,
  Warehouse,
  Package,
  Layers,
};

export default function CategoryDetailPage() {
  const { slug } = useParams();
  const staticCategory = getCategoryBySlug(slug);
  const [category, setCategory] = useState(staticCategory || null);
  const [categoryChecked, setCategoryChecked] = useState(Boolean(staticCategory));

  const [categoryProviders, setCategoryProviders] = useState([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [providersError, setProvidersError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const localCat = getCategoryBySlug(slug);
    if (localCat) {
      setCategory(localCat);
      setCategoryChecked(true);
    } else {
      providerService
        .getPublicCategories()
        .then((cats) => {
          if (!isMounted) return;
          const found = cats.find((c) => c.slug === String(slug || '').toLowerCase());
          setCategory(found || null);
          setCategoryChecked(true);
        })
        .catch(() => {
          if (isMounted) setCategoryChecked(true);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!category) return;
    let isMounted = true;
    setIsLoadingProviders(true);
    setProvidersError(null);

    providerService
      .getProviders({ categorySlug: category.slug, limit: 24 })
      .then((res) => {
        if (isMounted) {
          setCategoryProviders(res.data || []);
          setIsLoadingProviders(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setCategoryProviders([]);
          setProvidersError(err.message || 'Unable to load businesses for this category.');
          setIsLoadingProviders(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [category, retryCount]);

  usePageMeta({
    title: category
      ? `${category.seoTitle || category.name} | WARESHOP`
      : 'Category Not Found | WARESHOP',
    description: category
      ? category.description
      : 'The requested commercial space category could not be found on WARESHOP.',
    canonical: category ? `https://wareshop.in/categories/${category.slug}` : undefined,
  });

  if (!categoryChecked) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <EmptyState
          icon={FolderOpen}
          title="Category Not Found"
          description={`We couldn't find an active category matching "${slug}". Browse our primary commercial verticals below.`}
          actionLabel="Browse All Categories"
          actionHref="/categories"
        />
      </div>
    );
  }

  const IconComponent = iconMap[category.icon] || Layers;

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Categories', href: '/categories' },
              { label: category.pluralName || category.name },
            ]}
          />
        </div>
      </div>

      {/* Category Banner */}
      <div className="bg-white border-b border-slate-200/80 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider mb-3">
                <IconComponent className="w-3.5 h-3.5" />
                <span>{category.shortDescription || 'Commercial Directory'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-3">
                {category.seoTitle || category.pluralName || category.name}
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed mb-6">
                {category.description}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/providers?category=${encodeURIComponent(category.slug)}`}
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  <span>Search {category.pluralName || category.name}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/become-a-partner?tab=submit"
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl border border-slate-300 hover:border-orange-400 bg-white text-slate-800 text-xs sm:text-sm font-bold transition-colors"
                >
                  <span>List Your {category.name}</span>
                </Link>
              </div>
            </div>

            {category.imageUrl && (
              <div className="lg:col-span-5">
                <div className="h-52 sm:h-64 rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                  <img
                    src={category.imageUrl}
                    alt={category.pluralName || category.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Subcategories Section */}
        {category.subcategories && category.subcategories.length > 0 && (
          <section aria-labelledby="subcategories-heading">
            <h2
              id="subcategories-heading"
              className="text-xl sm:text-2xl font-black text-slate-950 mb-5"
            >
              Space Types in {category.pluralName || category.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {category.subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 hover:border-orange-300 transition-colors shadow-xs"
                >
                  <h3 className="font-bold text-slate-900 text-base mb-1.5">{sub.name}</h3>
                  <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
                    {sub.description}
                  </p>
                  <Link
                    to={`/providers?category=${encodeURIComponent(category.slug)}&search=${encodeURIComponent(sub.name)}`}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                  >
                    <span>Browse {sub.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Published Listings in Category */}
        <section aria-labelledby="category-providers-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2
                id="category-providers-heading"
                className="text-xl sm:text-2xl font-black text-slate-950"
              >
                Published {category.pluralName || category.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Verified listings available for direct owner contact.
              </p>
            </div>
            <Link
              to={`/providers?category=${encodeURIComponent(category.slug)}`}
              className="text-xs sm:text-sm font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
            >
              <span>Filter in Directory</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {isLoadingProviders ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80">
              <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500">Loading listings in {category.name}...</p>
            </div>
          ) : providersError ? (
            <div
              role="alert"
              className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-xl mx-auto"
            >
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" aria-hidden="true" />
              <h3 className="text-sm font-bold text-rose-900 mb-1">Unable to Load Listings</h3>
              <p className="text-xs text-rose-700 mb-4">{providersError}</p>
              <button
                type="button"
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : categoryProviders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {categoryProviders.map((provider) => (
                <ProviderCard
                  key={provider._id || provider.slug || provider.id}
                  provider={provider}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={IconComponent}
              title={`No Published ${category.pluralName || category.name} Yet`}
              description={`There are currently no published listings in ${category.name}. Own a ${category.name.toLowerCase()}? Submit your property on WARESHOP.`}
              actionLabel={`List Your ${category.name}`}
              actionHref="/become-a-partner?tab=submit"
            />
          )}
        </section>
      </div>
    </div>
  );
}
