import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ServiceCard from '../../components/marketplace/ServiceCard.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import { getCategoryBySlug, categories } from '../../data/categories.js';
import { getServicesByCategory } from '../../data/services.js';
import { getProvidersByCategory } from '../../data/providers.js';
import {
  Store,
  Building2,
  Warehouse,
  Package,
  Layers,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FolderOpen
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
  const category = getCategoryBySlug(slug);

  usePageMeta({
    title: category ? `${category.name} Services — KONNEVIA` : 'Category Not Found — KONNEVIA',
    description: category
      ? category.metaDescription || category.description
      : 'The requested category does not exist in the KONNEVIA marketplace directory.',
    canonical: category ? `https://konnevia.com/categories/${category.slug}` : undefined,
  });

  if (!category) {
    return (
      <div className="bg-background min-h-[70vh] flex items-center justify-center py-16 px-4">
        <EmptyState
          icon={FolderOpen}
          title="Category Not Found"
          description={`We couldn't find a marketplace category matching "${slug}". Please browse our full directory to discover available verticals.`}
          actionLabel="Browse All Categories"
          actionHref="/categories"
        />
      </div>
    );
  }

  const IconComponent = iconMap[category.icon] || Layers;
  const categoryServices = getServicesByCategory(category.slug);
  const categoryProviders = getProvidersByCategory(category.slug);

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Categories', href: '/categories' },
              { label: category.name },
            ]}
          />
        </div>
      </div>

      {/* Hero Header for Category */}
      <div className="bg-white border-b border-border/60 py-10 sm:py-14">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ backgroundColor: category.bgColor || '#E8EDF3' }}
              >
                <IconComponent
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  style={{ color: category.color || '#142D4E' }}
                  aria-hidden="true"
                />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent mb-1.5 block">
                  Category Directory
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-2">
                  {category.name}
                </h1>
                <p className="text-text-muted text-sm sm:text-base max-w-2xl leading-relaxed">
                  {category.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to={`/get-quote?category=${encodeURIComponent(category.slug)}`}
                className="btn-primary py-3 px-6 text-sm font-semibold shadow-sm"
              >
                Get a Quote for this Vertical
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Subcategories Section */}
        {category.subcategories && category.subcategories.length > 0 && (
          <section aria-labelledby="subcategories-heading">
            <h2 id="subcategories-heading" className="text-xl sm:text-2xl font-bold text-primary mb-6">
              Specialized Subcategories
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {category.subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white p-5 rounded-lg border border-border/80 hover:border-accent/40 transition-colors shadow-xs"
                >
                  <h3 className="font-bold text-primary text-base mb-1.5">{sub.name}</h3>
                  <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-4">
                    {sub.description}
                  </p>
                  <Link
                    to={`/providers?category=${encodeURIComponent(category.slug)}&search=${encodeURIComponent(sub.name)}`}
                    className="text-xs font-semibold text-accent hover:text-accent-600 inline-flex items-center gap-1"
                  >
                    <span>View Providers in {sub.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Category Services */}
        <section aria-labelledby="category-services-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="category-services-heading" className="text-xl sm:text-2xl font-bold text-primary">
                Featured {category.name} Services
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Popular service offerings available for direct enquiry.
              </p>
            </div>
          </div>

          {categoryServices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border/80 p-8 text-center">
              <p className="text-text-muted text-sm mb-4">
                Specific structured service detail packages are currently being mapped for this category.
              </p>
              <Link
                to={`/get-quote?category=${encodeURIComponent(category.slug)}`}
                className="btn-primary text-xs py-2 px-4"
              >
                Inquire About Custom {category.name} Scope
              </Link>
            </div>
          )}
        </section>

        {/* Category Providers */}
        <section aria-labelledby="category-providers-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="category-providers-heading" className="text-xl sm:text-2xl font-bold text-primary">
                Listed Providers in {category.name}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Verified agencies and specialists vetted for this category.
              </p>
            </div>
            <Link
              to={`/providers?category=${encodeURIComponent(category.slug)}`}
              className="text-xs sm:text-sm font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>Explore All in {category.name}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {categoryProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border/80 p-8 text-center max-w-xl mx-auto">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-base font-bold text-primary mb-1">
                Provider Onboarding in Progress
              </h3>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-5">
                We are actively vetting service providers in {category.name}. To ensure quality, providers are listed only after manual credential and KYC verification.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={`/get-quote?category=${encodeURIComponent(category.slug)}`}
                  className="btn-primary text-xs py-2 px-4 w-full sm:w-auto"
                >
                  Submit Requirement Anyway
                </Link>
                <Link
                  to="/become-a-partner"
                  className="btn-secondary text-xs py-2 px-4 w-full sm:w-auto"
                >
                  Join as a Verified Partner
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
