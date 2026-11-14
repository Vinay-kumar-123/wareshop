import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Building2,
  Warehouse,
  Store,
  Package,
  Phone,
  PhoneCall,
  Loader2,
  ArrowUpRight,
  ShieldCheck,
  Image as ImageIcon,
} from 'lucide-react';
import providerService from '../../services/providerService.js';
import { getCategoryVisual } from '../../assets/categories/index.js';

const visuals = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

export default function ProviderCard({ provider }) {
  const [contactState, setContactState] = useState({
    loading: false,
    phone: null,
    telUri: null,
    error: '',
  });
  const [imageError, setImageError] = useState(false);

  const slugKey = String(provider.categorySlug || provider.category || '').toLowerCase();
  const Icon = visuals[slugKey] || Building2;
  const categoryLabel = provider.category || provider.categoryName || 'Commercial';
  const locationLabel =
    [provider.city, provider.state].filter(Boolean).join(', ') || provider.location || '';
  const servicesList = Array.isArray(provider.services)
    ? provider.services
    : Array.isArray(provider.servicesOffered)
      ? provider.servicesOffered
      : [];
  const hasUploadedImage = Boolean(provider.shopImage?.url && !imageError);
  const genericCategoryVisual = getCategoryVisual(slugKey || categoryLabel);

  const handleRevealContact = async (e) => {
    e.preventDefault();
    if (contactState.phone || contactState.loading) return;
    setContactState({ loading: true, phone: null, telUri: null, error: '' });
    try {
      const info = await providerService.getPublicContact(provider.slug);
      if (info?.contactNumber) {
        setContactState({
          loading: false,
          phone: info.contactNumber,
          telUri: info.telUri || `tel:+91${info.contactNumber}`,
          error: '',
        });
      } else {
        setContactState({
          loading: false,
          phone: null,
          telUri: null,
          error: 'Contact restricted by owner',
        });
      }
    } catch (err) {
      setContactState({
        loading: false,
        phone: null,
        telUri: null,
        error: err?.message || 'Unable to reveal contact',
      });
    }
  };

  return (
    <article className="group bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-card hover:shadow-card-hover hover:border-[#F36B21]/60 transition-all duration-200 flex flex-col h-full">
      {/* Top Media Area: Owner Uploaded Photo OR Clearly Labeled Generic Category Visual */}
      <Link
        to={`/providers/${provider.slug}`}
        className="block relative aspect-[16/10] overflow-hidden bg-slate-100"
      >
        {hasUploadedImage ? (
          <>
            <img
              src={provider.shopImage.url}
              alt={provider.businessName}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20" />
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 bg-slate-950/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-md text-[11px] font-bold">
                <Icon className="w-3 h-3 text-[#F36B21]" aria-hidden="true" />
                <span>{categoryLabel}</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-600/95 text-white px-2 py-0.5 rounded-md text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Owner Photo</span>
              </span>
            </div>
          </>
        ) : (
          <>
            <img
              src={genericCategoryVisual}
              alt={`${categoryLabel} generic category illustration`}
              className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-slate-950/25" />
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
              <span className="inline-flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-bold text-[#171717] shadow-2xs">
                <Icon className="w-3 h-3 text-[#F36B21]" aria-hidden="true" />
                <span>{categoryLabel}</span>
              </span>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-slate-900/80 backdrop-blur-xs border border-white/15 px-2 py-0.5 rounded"
                title="Generic category illustration shown because no owner photo was uploaded"
              >
                <ImageIcon className="w-2.5 h-2.5 text-amber-300" />
                <span>Category Visual</span>
              </span>
            </div>
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white/90 text-[11px]">
              <span className="font-medium truncate">
                {provider.city ? `${categoryLabel} in ${provider.city}` : `${categoryLabel} Listing`}
              </span>
            </div>
          </>
        )}

        {provider.isDemo && (
          <span className="absolute bottom-2.5 right-3 bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Sample
          </span>
        )}
      </Link>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          {locationLabel ? (
            <p className="text-xs text-slate-500 flex items-center gap-1 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-[#F36B21] shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </p>
          ) : (
            <span className="text-xs text-slate-400 font-medium">Pan-India Listing</span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified</span>
          </span>
        </div>

        <Link to={`/providers/${provider.slug}`} className="group/title">
          <h3 className="font-bold text-[#171717] group-hover/title:text-[#F36B21] transition-colors text-base leading-snug line-clamp-1">
            {provider.businessName}
          </h3>
        </Link>

        {provider.description && (
          <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
            {provider.description}
          </p>
        )}

        {servicesList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {servicesList.slice(0, 3).map((item) => (
              <span
                key={item}
                className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60"
              >
                {item}
              </span>
            ))}
            {servicesList.length > 3 && (
              <span className="text-[11px] font-semibold text-[#B4400E] bg-[#FFF5EF] px-2 py-0.5 rounded border border-[#FFE6D5]">
                +{servicesList.length - 3} more
              </span>
            )}
          </div>
        )}

        {contactState.error && (
          <p className="mt-2 text-[11px] text-rose-600 font-medium">{contactState.error}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-4 flex items-center gap-2">
          <Link
            to={`/providers/${provider.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[#171717] rounded-lg py-2.5 px-3 text-xs font-bold transition-colors"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>

          {provider.consentToDisplayPhone !== false ? (
            contactState.phone ? (
              <a
                href={contactState.telUri}
                className="flex-[1.3] inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 px-3 text-xs font-bold shadow-2xs transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{contactState.phone}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleRevealContact}
                disabled={contactState.loading}
                className="flex-[1.3] inline-flex items-center justify-center gap-1.5 bg-[#F36B21] hover:bg-[#D95513] disabled:opacity-60 text-white rounded-lg py-2.5 px-3 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                {contactState.loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>Call Owner</span>
                  </>
                )}
              </button>
            )
          ) : (
            <Link
              to={`/providers/${provider.slug}`}
              className="flex-[1.3] inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-2.5 px-3 text-xs font-bold transition-colors"
            >
              <span>View Profile</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
