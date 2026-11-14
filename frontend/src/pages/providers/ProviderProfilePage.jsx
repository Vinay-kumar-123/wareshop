import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import providerService from '../../services/providerService.js';
import {
  MapPin,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  UserX,
  Briefcase,
  Layers,
  ShieldCheck,
  Phone,
  PhoneCall,
  Globe,
  Building2,
  Store,
  Warehouse,
  Package,
  ExternalLink,
} from 'lucide-react';

const categoryIcons = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

export default function ProviderProfilePage() {
  const { slug } = useParams();
  const [provider, setProvider] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [contact, setContact] = useState(null);
  const [contactError, setContactError] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);
    setContact(null);
    setContactError('');
    setImageError(false);

    providerService
      .getProviderBySlug(slug)
      .then((data) => {
        if (isMounted) {
          setProvider(data);
          setActiveImage(data?.shopImage?.url || '');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setProvider(null);
        if (err && err.status !== 404) {
          setLoadError(err.message || 'Unable to load business profile right now.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug, retryCount]);

  const handleRevealContact = async () => {
    setContactLoading(true);
    setContactError('');
    try {
      const data = await providerService.getPublicContact(slug);
      setContact(data);
    } catch (error) {
      setContactError(error.message || 'Unable to reveal owner contact right now.');
    } finally {
      setContactLoading(false);
    }
  };

  usePageMeta({
    title: provider ? `${provider.businessName} | WARESHOP` : 'Business Listing Not Found | WARESHOP',
    description: provider
      ? provider.metaDescription || provider.description
      : 'The requested commercial property or business listing is not available on WARESHOP.',
    canonical: provider ? `https://wareshop.in/providers/${provider.slug}` : undefined,
  });

  if (isLoading) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
        <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs sm:text-sm text-slate-500 font-medium">Loading business listing...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center max-w-xl mx-auto"
        >
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-lg font-bold text-rose-900 mb-1">Unable to Load Business Listing</h1>
          <p className="text-xs sm:text-sm text-rose-700 leading-relaxed mb-5">{loadError}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              to="/providers"
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold"
            >
              Back to Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="bg-[#F8FAFC] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <EmptyState
          icon={UserX}
          title="Business Listing Not Found"
          description={`We couldn't find an active published business matching "${slug}".`}
          actionLabel="Explore Directory"
          actionHref="/providers"
        />
      </div>
    );
  }

  const categoryLabel = provider.category || 'Commercial';
  const categorySlug = String(provider.categorySlug || '').toLowerCase();
  const CategoryIcon = categoryIcons[categorySlug] || Building2;
  const locationLabel = [provider.city, provider.state].filter(Boolean).join(', ');
  const fullAddress = [provider.address, provider.city, provider.state, provider.pinCode]
    .filter(Boolean)
    .join(', ');
  const servicesList = Array.isArray(provider.services) ? provider.services : [];
  const relatedList = Array.isArray(provider.relatedProviders) ? provider.relatedProviders : [];

  const galleryImages = [
    ...(provider.shopImage?.url ? [provider.shopImage.url] : []),
    ...(Array.isArray(provider.gallery) ? provider.gallery.map((g) => g?.url).filter(Boolean) : []),
  ];

  const hasValidMainImage = Boolean(activeImage && !imageError);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[
              { label: 'Commercial Directory', href: '/providers' },
              ...(categorySlug
                ? [{ label: categoryLabel, href: `/categories/${categorySlug}` }]
                : []),
              { label: provider.businessName },
            ]}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 8 Columns: Media Gallery, Overview, Services, Address */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header & Media Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
              {/* Image Gallery / Category Graphic */}
              <div className="relative h-64 sm:h-88 bg-slate-100 overflow-hidden">
                {hasValidMainImage ? (
                  <img
                    src={activeImage}
                    alt={provider.businessName}
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-50 via-slate-50 to-indigo-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-xs flex items-center justify-center text-orange-600 mb-3">
                      <CategoryIcon className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {categoryLabel} Category Placeholder
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      No property photograph uploaded by owner
                    </p>
                  </div>
                )}

                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Link
                    to={`/categories/${categorySlug || 'shop'}`}
                    className="bg-slate-950/85 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-bold hover:bg-orange-600 transition-colors"
                  >
                    {categoryLabel}
                  </Link>
                  {provider.isDemo && (
                    <span className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-bold">
                      Sample Listing
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail strip if multiple gallery images exist */}
              {galleryImages.length > 1 && (
                <div className="px-6 pt-4 flex items-center gap-2.5 overflow-x-auto">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageError(false);
                        setActiveImage(imgUrl);
                      }}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${
                        activeImage === imgUrl ? 'border-orange-500' : 'border-transparent'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Business Title & Location Summary */}
              <div className="p-6 sm:p-8">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
                  {provider.businessName}
                </h1>

                {locationLabel && (
                  <p className="mt-2 text-sm text-slate-600 flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>{fullAddress || locationLabel}</span>
                  </p>
                )}

                {provider.website && (
                  <div className="mt-3">
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Visit Official Website</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* About / Description */}
            <section
              aria-labelledby="about-heading"
              className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs"
            >
              <h2
                id="about-heading"
                className="text-lg sm:text-xl font-bold text-slate-900 mb-3 flex items-center gap-2"
              >
                <Briefcase className="w-5 h-5 text-orange-500" aria-hidden="true" />
                <span>Property & Business Overview</span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {provider.description}
              </p>
            </section>

            {/* Services / Facilities Offered */}
            {servicesList.length > 0 && (
              <section
                aria-labelledby="services-offered-heading"
                className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs"
              >
                <h2
                  id="services-offered-heading"
                  className="text-lg sm:text-xl font-bold text-slate-900 mb-4 flex items-center gap-2"
                >
                  <Layers className="w-5 h-5 text-orange-500" aria-hidden="true" />
                  <span>Services & Facilities Offered</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicesList.map((serviceName, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-2.5"
                    >
                      <CheckCircle2
                        className="w-4 h-4 text-orange-500 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{serviceName}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right 4 Columns: Direct Owner Contact Box & Location Details */}
          <div className="lg:col-span-4 space-y-6">
            {/* Protected Direct Contact Card */}
            <div className="bg-white border-2 border-orange-500/20 rounded-2xl p-6 shadow-sm sticky top-24">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-600 mb-2">
                <PhoneCall className="w-4 h-4" />
                <span>Direct Business Contact</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Contact {provider.businessName}
              </h2>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Connect directly with the owner of this listing using their OTP-verified phone
                number. WARESHOP does not intermediate or charge commissions on calls.
              </p>

              <div className="mt-5">
                {provider.consentToDisplayPhone === false ? (
                  <div className="p-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium text-center">
                    The owner of this listing has disabled public phone display.
                  </div>
                ) : contact ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                        Owner’s Verified Mobile Number
                      </span>
                      <p className="text-xl font-black text-emerald-950 mt-1 tracking-wide">
                        +91 {contact.contactNumber}
                      </p>
                    </div>
                    <a
                      href={contact.telUri || `tel:+91${contact.contactNumber}`}
                      className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Call Now (+91 {contact.contactNumber})</span>
                    </a>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRevealContact}
                    disabled={contactLoading}
                    className="w-full py-3.5 px-5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{contactLoading ? 'Verifying & Loading...' : 'Show Owner Phone Number'}</span>
                  </button>
                )}

                {contactError && (
                  <p className="mt-2.5 text-xs text-rose-600 font-medium text-center">
                    {contactError}
                  </p>
                )}
              </div>

              {/* Location & Coverage Details */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Property / Business Location
                  </span>
                  <p className="text-slate-800 font-semibold">{fullAddress || locationLabel}</p>
                </div>

                {Array.isArray(provider.serviceAreas) && provider.serviceAreas.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Service / Operating Areas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.serviceAreas.map((area, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100 text-slate-700 font-medium px-2.5 py-1 rounded-md"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Trust & Safety Note */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Always inspect commercial spaces and verify ownership documents in person before
                  making any financial payment.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Businesses Section */}
        {relatedList.length > 0 && (
          <section className="mt-14 pt-10 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-600">
                  More on WARESHOP
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 mt-1">
                  Related Commercial Listings
                </h2>
              </div>
              <Link
                to={`/providers?category=${encodeURIComponent(categorySlug)}`}
                className="text-xs sm:text-sm font-bold text-orange-600 hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedList.map((rel) => (
                <ProviderCard key={rel._id || rel.slug || rel.id} provider={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
