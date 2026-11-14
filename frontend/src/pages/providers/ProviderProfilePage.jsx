import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Badge from '../../components/common/Badge.jsx';
import providerService from '../../services/providerService.js';
import {
  MapPin,
  ShieldAlert,
  CheckCircle2,
  CalendarCheck,
  ArrowRight,
  UserX,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  Building,
  Phone
} from 'lucide-react';

export default function ProviderProfilePage() {
  const { slug } = useParams();
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [contactError, setContactError] = useState('');
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    providerService
      .getProviderBySlug(slug)
      .then((data) => {
        setProvider(data);
      })
      .catch(() => {
        setProvider(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);
  const showContact = async () => { setContactLoading(true); setContactError(''); try { setContact(await providerService.getPublicContact(slug)); } catch (error) { setContactError(error.message); } finally { setContactLoading(false); } };

  usePageMeta({
    title: provider
      ? `${provider.businessName} — WARESHOP`
      : 'Business Not Found — WARESHOP',
    description: provider
      ? provider.metaDescription || provider.description
      : 'The requested business profile does not exist in the WARESHOP directory.',
    canonical: provider ? `https://wareshop.in/providers/${provider.slug}` : undefined,
  });

  if (isLoading) {
    return (
      <div className="bg-background min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
        <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-text-muted">Loading business profile...</p>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="bg-background min-h-[70vh] flex items-center justify-center py-16 px-4">
        <EmptyState
          icon={UserX}
          title="Business Profile Not Found"
          description={`We couldn't find a service provider matching profile slug "${slug}".`}
          actionLabel="View All Businesses"
          actionHref="/providers"
        />
      </div>
    );
  }

  // Safe initials generator for avatar placeholder
  const getInitials = (name) => {
    if (!name) return 'KP';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Providers', href: '/providers' },
              { label: provider.businessName },
            ]}
          />
        </div>
      </div>

      {/* Header Profile Section */}
      <div className="bg-white border-b border-border/60 py-10 sm:py-14">
        <div className="container-max px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
            <div className="flex items-start gap-5 sm:gap-6">
              {/* Profile Avatar */}
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-xl sm:text-2xl flex-shrink-0 shadow-sm"
                aria-hidden="true"
              >
                {getInitials(provider.businessName)}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="teal">{provider.categoryName}</Badge>

                  {provider.isDevSample && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Development Sample Profile</span>
                    </span>
                  )}

                  {provider.verificationStatus === 'verified' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Manually Verified Partner</span>
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-2">
                  {provider.businessName}
                </h1>

                <p className="text-xs sm:text-sm text-text-muted flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                  <span>{provider.location}</span>
                </p>
              </div>
            </div>

            {/* Request Quote Action Box & Public Direct Call */}
            <div className="bg-slate-50/80 border border-border/80 rounded-2xl p-6 lg:w-88 flex-shrink-0 space-y-3">
              <div>
                <h2 className="text-base font-bold text-primary mb-1">Contact business</h2>
                <p className="text-xs text-text-muted leading-relaxed">
                  Contact this published business directly using its registered public number.
                </p>
              </div>

              {contact && (
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block mb-1">
                    Verified Public Contact
                  </span>
                  <a
                    href={`tel:${contact.contactNumber}`}
                    className="w-full py-2.5 px-4 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-accent" />
                    <span>Call {contact.contactNumber}</span>
                  </a>
                </div>
              )}

              {!contact && <button type="button" onClick={showContact} disabled={contactLoading} className="btn-primary w-full py-2.5 px-5 text-xs sm:text-sm font-semibold">{contactLoading ? 'Loading contact…' : 'Show contact number'} <Phone className="w-4 h-4" /></button>}
              {contactError && <p className="text-xs text-rose-700 text-center">{contactError}</p>}

              <p className="text-[11px] text-text-muted text-center flex items-center justify-center gap-1 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
                Direct business contact
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
          {/* Main Column (2 cols) */}
          <div className="lg:col-span-2 space-y-10">
            {/* Development Notice if applicable */}
            {provider.isDevSample && (
              <div className="p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs sm:text-sm text-amber-900 leading-relaxed flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong>Notice regarding this profile:</strong> This record is a development placeholder demonstrating structure and verification workflow. In production, only genuine businesses with signed partnership agreements are published. Zero fake reviews or fabricated client feedback are permitted.
                </div>
              </div>
            )}

            {/* About / Business Description */}
            <section aria-labelledby="about-heading" className="bg-white p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xs">
              <h2 id="about-heading" className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-accent" aria-hidden="true" />
                <span>About {provider.businessName}</span>
              </h2>
              <p className="text-text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {provider.description}
              </p>
            </section>

            {/* Services Offered */}
            {provider.servicesOffered && provider.servicesOffered.length > 0 && (
              <section aria-labelledby="services-offered-heading" className="bg-white p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xs">
                <h2 id="services-offered-heading" className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-accent" aria-hidden="true" />
                  <span>Specialized Services & Scope</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {provider.servicesOffered.map((serviceName, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50/80 rounded-lg border border-border/60 text-xs sm:text-sm font-medium text-text-primary flex items-center gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" aria-hidden="true" />
                      <span>{serviceName}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Portfolio Section — only if genuine items exist */}
            {provider.portfolio && provider.portfolio.length > 0 ? (
              <section aria-labelledby="portfolio-heading" className="bg-white p-6 sm:p-8 rounded-2xl border border-border/80 shadow-xs">
                <h2 id="portfolio-heading" className="text-xl font-bold text-primary mb-4">
                  Verified Portfolio Works
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {provider.portfolio.map((item, idx) => (
                    <div key={idx} className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-primary text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-text-muted">{item.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          {/* Sidebar / Meta Details (1 col) */}
          <div className="space-y-6">
            {/* Service Areas Card */}
            <div className="bg-white p-6 rounded-2xl border border-border/80 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-accent" aria-hidden="true" />
                <span>Service Coverage Areas</span>
              </h3>
              {provider.serviceAreas && provider.serviceAreas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {provider.serviceAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium bg-slate-100 text-text-primary px-2.5 py-1 rounded"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Direct citywide coverage.</p>
              )}
            </div>

            {/* Transparency & Quality Assurances */}
            <div className="bg-white p-6 rounded-2xl border border-border/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
                <span>Platform Safeguards</span>
              </h3>
              <ul className="space-y-3 text-xs text-text-muted">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Contact details appear only for eligible public listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Business contact is sourced from the published listing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>WARESHOP does not intermediate customer enquiries</span>
                </li>
              </ul>
            </div>

            {/* Back to Directory Link */}
            <div className="text-center">
              <Link
                to="/providers"
                className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
              >
                <span>← Back to Providers Directory</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
