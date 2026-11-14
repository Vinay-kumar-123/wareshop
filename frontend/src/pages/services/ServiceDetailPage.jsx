import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import ServiceCard from '../../components/marketplace/ServiceCard.jsx';
import Badge from '../../components/common/Badge.jsx';
import { getServiceBySlug, services } from '../../data/services.js';
import { providers } from '../../data/providers.js';
import {
  Layers,
  Hammer,
  Heart,
  Code,
  CheckCircle,
  HelpCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  FileQuestion,
  CalendarCheck
} from 'lucide-react';

const iconMap = {
  Layers,
  Hammer,
  Heart,
  Code,
};

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = getServiceBySlug(slug);

  // Accordion state for FAQs
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  usePageMeta({
    title: service ? `${service.name} Services — KONNEVIA` : 'Service Not Found — KONNEVIA',
    description: service
      ? service.metaDescription || service.description
      : 'The requested service does not exist in the KONNEVIA catalog.',
    canonical: service ? `https://konnevia.com/services/${service.slug}` : undefined,
  });

  if (!service) {
    return (
      <div className="bg-background min-h-[70vh] flex items-center justify-center py-16 px-4">
        <EmptyState
          icon={FileQuestion}
          title="Service Not Found"
          description={`We couldn't locate a service offering for "${slug}". Browse all categories to explore our full list of offerings.`}
          actionLabel="Browse Marketplace Categories"
          actionHref="/categories"
        />
      </div>
    );
  }

  const IconComponent = iconMap[service.icon] || Layers;

  // Filter providers that offer this service
  const matchedProviders = providers.filter(
    (p) =>
      p.mainService.toLowerCase() === service.name.toLowerCase() ||
      p.servicesOffered.some((s) => s.toLowerCase().includes(service.name.toLowerCase()))
  );

  // Related services in the same category
  const relatedServices = services.filter(
    (s) => s.categorySlug === service.categorySlug && s.slug !== service.slug
  );

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Categories', href: '/categories' },
              { label: service.categoryName, href: `/categories/${service.categorySlug}` },
              { label: service.name },
            ]}
          />
        </div>
      </div>

      {/* Service Header Section */}
      <div className="bg-white border-b border-border/60 py-10 sm:py-14">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="teal">{service.categoryName}</Badge>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
                  Verified Scope Advisory
                </span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-50 text-accent flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-6 h-6" aria-hidden="true" />
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight">
                  {service.name}
                </h1>
              </div>
              <p className="text-text-muted text-base sm:text-lg leading-relaxed">
                {service.description}
              </p>

              {/* Service Areas */}
              {service.serviceAreas && (
                <div className="mt-6 flex items-start gap-2 text-xs sm:text-sm text-text-muted">
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong className="text-primary font-semibold">Active Coverage:</strong>{' '}
                    {service.serviceAreas.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Sticky/Primary Enquiry Action Card */}
            <div className="bg-slate-50/80 border border-border/80 rounded-2xl p-6 sm:p-8 lg:w-96 flex-shrink-0 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-2">
                Need {service.name}?
              </h2>
              <p className="text-xs text-text-muted leading-relaxed mb-6">
                Tell us about your project requirements. Our marketplace advisors will review and connect you with up to 2 vetted specialists.
              </p>
              <Link
                to={`/get-quote?service=${encodeURIComponent(service.name)}&category=${encodeURIComponent(service.categorySlug)}`}
                className="btn-primary w-full py-3 px-6 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm text-center mb-3"
              >
                <span>Request Free Quotes</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <p className="text-[11px] text-text-muted text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                Zero spam • Direct consent required
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16">
        {/* Core Offerings / Service Types */}
        {service.serviceTypes && service.serviceTypes.length > 0 && (
          <section aria-labelledby="offerings-heading">
            <h2 id="offerings-heading" className="text-xl sm:text-2xl font-bold text-primary mb-2">
              Types of {service.name} Offerings
            </h2>
            <p className="text-text-muted text-sm mb-6">
              Specific project scopes covered under this vertical.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.serviceTypes.map((type, idx) => (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-lg border border-border/80 flex items-start gap-3 shadow-xs"
                >
                  <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-sm font-medium text-text-primary leading-snug">{type}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Key Benefits */}
        {service.benefits && service.benefits.length > 0 && (
          <section aria-labelledby="benefits-heading" className="bg-white p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xs">
            <h2 id="benefits-heading" className="text-xl sm:text-2xl font-bold text-primary mb-2">
              Why Book {service.name} via KONNEVIA
            </h2>
            <p className="text-text-muted text-sm mb-6">
              Our human-assisted curation process ensures project accountability.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {service.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-accent-50 text-accent flex items-center justify-center flex-shrink-0 font-bold text-xs">
                    0{idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary leading-snug">{benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQs Section */}
        {service.faqs && service.faqs.length > 0 && (
          <section aria-labelledby="faqs-heading">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-5 h-5 text-accent" aria-hidden="true" />
              <h2 id="faqs-heading" className="text-xl sm:text-2xl font-bold text-primary">
                Frequently Asked Questions
              </h2>
            </div>
            <p className="text-text-muted text-sm mb-6">
              Clear answers to help you plan your project and budget accurately.
            </p>

            <div className="space-y-3 max-w-4xl">
              {service.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="bg-white border border-border/80 rounded-xl overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                      className="w-full flex items-center justify-between p-5 text-left text-primary font-bold text-base hover:bg-slate-50/50 transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className="pr-4">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" aria-hidden="true" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-text-muted text-sm leading-relaxed border-t border-border/40 pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Relevant Providers */}
        <section aria-labelledby="relevant-providers-heading">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 id="relevant-providers-heading" className="text-xl sm:text-2xl font-bold text-primary">
                Providers Offering {service.name}
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                Specialized professionals currently catalogued for this vertical.
              </p>
            </div>
            <Link
              to={`/providers?search=${encodeURIComponent(service.name)}`}
              className="text-xs sm:text-sm font-semibold text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>View All Matching Providers</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          {matchedProviders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchedProviders.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border/80 p-8 text-center max-w-xl mx-auto">
              <CalendarCheck className="w-10 h-10 text-accent mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-base font-bold text-primary mb-1">
                Custom Provider Sourcing
              </h3>
              <p className="text-text-muted text-xs sm:text-sm leading-relaxed mb-5">
                We are actively matching clients with unlisted offline specialists for {service.name}. Submit your enquiry and our desk will coordinate directly.
              </p>
              <Link
                to={`/get-quote?service=${encodeURIComponent(service.name)}&category=${encodeURIComponent(service.categorySlug)}`}
                className="btn-primary text-xs py-2 px-5"
              >
                Request Provider Pairing
              </Link>
            </div>
          )}
        </section>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <section aria-labelledby="related-services-heading" className="pt-8 border-t border-border/80">
            <h2 id="related-services-heading" className="text-xl font-bold text-primary mb-6">
              Related Services in {service.categoryName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedServices.map((relService) => (
                <ServiceCard key={relService.id} service={relService} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
