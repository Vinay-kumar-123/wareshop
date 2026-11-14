import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import ProviderCard from '../../components/marketplace/ProviderCard.jsx';
import providerService from '../../services/providerService.js';
import { getCategoryVisual } from '../../assets/categories/index.js';
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
  Image as ImageIcon,
  Maximize2,
  XCircle,
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
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
    title: provider
      ? `${provider.businessName} | WARESHOP`
      : 'Business Listing Not Found | WARESHOP',
    description: provider
      ? provider.metaDescription || provider.description
      : 'The requested commercial property or business listing is not available on WARESHOP.',
    canonical: provider ? `https://wareshop.in/providers/${provider.slug}` : undefined,
  });

  if (isLoading) {
    return (
      <div className="bg-[#F7F8FA] min-h-[70vh] flex flex-col items-center justify-center py-16 px-4">
        <div className="w-9 h-9 border-3 border-slate-200 border-t-[#F36B21] rounded-full animate-spin mb-3" />
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Loading commercial business profile...
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-[#F7F8FA] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center max-w-xl mx-auto"
        >
          <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" aria-hidden="true" />
          <h1 className="text-lg font-bold text-rose-900 mb-1">Unable to Load Business Listing</h1>
          <p className="text-xs sm:text-sm text-rose-700 leading-relaxed mb-5">{loadError}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-5 py-2.5 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <Link
              to="/providers"
              className="px-5 py-2.5 rounded-lg border border-slate-300 bg-white text-[#171717] text-xs font-bold"
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
      <div className="bg-[#F7F8FA] min-h-[70vh] flex items-center justify-center py-16 px-4">
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
  const categorySlug = String(provider.categorySlug || provider.category || '').toLowerCase();
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
  const genericCategoryVisual = getCategoryVisual(categorySlug || categoryLabel);

  return (
    <div className="bg-[#F7F8FA] min-h-screen pb-16">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200/90">
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
      <div className="max-w-7xl mx-auto pt-8 sm:pt-10 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 Columns: Media Gallery, Overview, Services, Location */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header & Media Gallery Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-card">
              {/* Image Gallery / Generic Category Visual */}
              <div className="relative h-64 sm:h-96 bg-slate-900 overflow-hidden group">
                {hasValidMainImage ? (
                  <>
                    <img
                      src={activeImage}
                      alt={provider.businessName}
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="absolute bottom-4 right-4 bg-slate-950/80 hover:bg-slate-950 text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Expand Photo</span>
                    </button>
                  </>
                ) : (
                  <>
                    <img
                      src={genericCategoryVisual}
                      alt={`${categoryLabel} generic category illustration`}
                      className="w-full h-full object-cover opacity-75"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-slate-950/30" />
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/80 backdrop-blur-xs border border-white/15 rounded-lg p-3 text-white">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-lg bg-[#F36B21] text-white flex items-center justify-center shrink-0">
                          <CategoryIcon className="w-5 h-5" />
                        </span>
                        <div>
                          <span className="text-xs font-bold block">
                            Illustrative {categoryLabel} Category Visual
                          </span>
                          <span className="text-[11px] text-slate-300 block">
                            No property photograph was uploaded by the listing owner
                          </span>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded self-start sm:self-center">
                        <ImageIcon className="w-3 h-3 text-amber-300" />
                        <span>Generic Category Visual</span>
                      </span>
                    </div>
                  </>
                )}

                <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/categories/${categorySlug || 'shop'}`}
                      className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-xs text-[#171717] px-3 py-1 rounded-md text-xs font-bold hover:text-[#F36B21] shadow-2xs transition-colors"
                    >
                      <CategoryIcon className="w-3.5 h-3.5 text-[#F36B21]" />
                      <span>{categoryLabel}</span>
                    </Link>
                    <span className="inline-flex items-center gap-1 bg-emerald-600/95 text-white px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified Listing</span>
                    </span>
                  </div>

                  {provider.isDemo && (
                    <span className="bg-amber-500 text-white px-2.5 py-1 rounded-md text-xs font-bold">
                      Sample Listing
                    </span>
                  )}
                </div>
              </div>

              {/* Thumbnail strip if multiple gallery images exist */}
              {galleryImages.length > 1 && (
                <div className="px-6 pt-4 flex items-center gap-2.5 overflow-x-auto border-b border-slate-100 pb-4">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setImageError(false);
                        setActiveImage(imgUrl);
                      }}
                      className={`w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                        activeImage === imgUrl
                          ? 'border-[#F36B21] ring-2 ring-[#F36B21]/20'
                          : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Business Title, Location & Key Highlights */}
              <div className="p-6 sm:p-8">
                <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight leading-tight">
                  {provider.businessName}
                </h1>

                {locationLabel && (
                  <p className="mt-2.5 text-sm text-slate-600 flex items-start gap-2 font-medium">
                    <MapPin className="w-4 h-4 text-[#F36B21] shrink-0 mt-0.5" />
                    <span>{fullAddress || locationLabel}</span>
                  </p>
                )}

                {provider.website && (
                  <div className="mt-3">
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F36B21] hover:text-[#D95513] hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Visit Official Website ({provider.website})</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Quick Commercial Metadata Strip */}
                <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Space Category
                    </span>
                    <span className="font-bold text-[#171717] mt-0.5 block">{categoryLabel}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      City / Hub
                    </span>
                    <span className="font-bold text-[#171717] mt-0.5 block">
                      {provider.city || 'India'}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Verification
                    </span>
                    <span className="font-bold text-emerald-700 mt-0.5 block">OTP + Admin</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F8FA] border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Contact Mode
                    </span>
                    <span className="font-bold text-[#F36B21] mt-0.5 block">Direct Owner Call</span>
                  </div>
                </div>
              </div>
            </div>

            {/* About / Description */}
            <section
              aria-labelledby="about-heading"
              className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-card"
            >
              <h2
                id="about-heading"
                className="text-lg sm:text-xl font-bold text-[#171717] mb-3 pb-3 border-b border-slate-100 flex items-center gap-2"
              >
                <Briefcase className="w-5 h-5 text-[#F36B21]" aria-hidden="true" />
                <span>Property & Business Overview</span>
              </h2>
              <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {provider.description}
              </p>
            </section>

            {/* Services / Facilities Offered */}
            {servicesList.length > 0 && (
              <section
                aria-labelledby="services-offered-heading"
                className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-card"
              >
                <h2
                  id="services-offered-heading"
                  className="text-lg sm:text-xl font-bold text-[#171717] mb-4 pb-3 border-b border-slate-100 flex items-center gap-2"
                >
                  <Layers className="w-5 h-5 text-[#F36B21]" aria-hidden="true" />
                  <span>Services & Facilities Offered</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {servicesList.map((serviceName, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-[#F7F8FA] rounded-lg border border-slate-200/80 text-xs sm:text-sm font-semibold text-[#171717] flex items-center gap-2.5"
                    >
                      <CheckCircle2
                        className="w-4 h-4 text-[#F36B21] shrink-0"
                        aria-hidden="true"
                      />
                      <span>{serviceName}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Location & Service Coverage Details */}
            <section
              aria-labelledby="location-heading"
              className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-card"
            >
              <h2
                id="location-heading"
                className="text-lg sm:text-xl font-bold text-[#171717] mb-4 pb-3 border-b border-slate-100 flex items-center gap-2"
              >
                <MapPin className="w-5 h-5 text-[#F36B21]" aria-hidden="true" />
                <span>Location & Operating Coverage</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-lg bg-[#F7F8FA] border border-slate-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Property / Business Address
                  </span>
                  <p className="font-semibold text-[#171717] leading-relaxed">
                    {fullAddress || locationLabel || 'Address available upon direct owner call'}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#F7F8FA] border border-slate-200/80">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Service / Operating Localities
                  </span>
                  {Array.isArray(provider.serviceAreas) && provider.serviceAreas.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {provider.serviceAreas.map((area, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-slate-200 text-slate-700 font-semibold text-xs px-2.5 py-1 rounded-md"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="font-semibold text-[#171717]">
                      {provider.city || 'Pan-India'}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right 4 Columns: Sticky Direct Owner Contact Box */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border-2 border-[#F36B21]/25 rounded-xl p-6 shadow-elevated sticky top-24">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#B4400E] bg-[#FFF5EF] border border-[#FFE6D5] px-2.5 py-1 rounded-md">
                  <PhoneCall className="w-3.5 h-3.5 text-[#F36B21]" />
                  <span>Direct Owner Contact</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  0% Brokerage
                </span>
              </div>

              <h2 className="text-lg font-extrabold text-[#171717] leading-snug">
                Connect with {provider.businessName}
              </h2>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Speak directly with the authorized owner of this listing using their OTP-verified
                mobile number. WARESHOP never intercepts calls or charges brokerage fees.
              </p>

              <div className="mt-5">
                {provider.consentToDisplayPhone === false ? (
                  <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium text-center">
                    The owner of this listing has disabled public phone display.
                  </div>
                ) : contact ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                        Owner’s Verified Mobile Number
                      </span>
                      <p className="text-xl font-black text-emerald-950 mt-1 tracking-wide">
                        +91 {contact.contactNumber}
                      </p>
                    </div>
                    <a
                      href={contact.telUri || `tel:+91${contact.contactNumber}`}
                      className="w-full py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
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
                    className="w-full py-3.5 px-5 bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>
                      {contactLoading ? 'Verifying & Loading...' : 'Show Owner Phone Number'}
                    </span>
                  </button>
                )}

                {contactError && (
                  <p className="mt-2.5 text-xs text-rose-600 font-medium text-center">
                    {contactError}
                  </p>
                )}
              </div>

              {/* Trust & Safety Checklist */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Mobile number authenticated via 2Factor SMS OTP</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Listing reviewed and published by WARESHOP admin</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F7F8FA] border border-slate-200/80 flex items-start gap-2 text-[11px] text-slate-500 mt-3">
                  <ShieldCheck className="w-4 h-4 text-[#F36B21] shrink-0 mt-0.5" />
                  <span>
                    Always inspect commercial spaces and verify ownership documents in person before
                    making any financial payment.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Businesses Section */}
        {relatedList.length > 0 && (
          <section className="mt-14 pt-10 border-t border-slate-200/90">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#F36B21]">
                  More on WARESHOP
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-[#171717] mt-1">
                  Related Commercial Listings
                </h2>
              </div>
              <Link
                to={`/providers?category=${encodeURIComponent(categorySlug)}`}
                className="text-xs sm:text-sm font-bold text-[#F36B21] hover:underline"
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

      {/* Fullscreen Lightbox Modal for Owner Photo */}
      {lightboxOpen && hasValidMainImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activeImage}
              alt={provider.businessName}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute top-3 right-3 bg-slate-950/80 text-white rounded-full p-2 hover:bg-black cursor-pointer"
              aria-label="Close photo preview"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
