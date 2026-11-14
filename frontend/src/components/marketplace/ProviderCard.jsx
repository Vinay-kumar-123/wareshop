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
} from 'lucide-react';
import providerService from '../../services/providerService.js';

const visuals = {
  shop: Store,
  office: Building2,
  warehouse: Warehouse,
  godown: Package,
};

const tones = {
  shop: 'from-orange-50 via-amber-50/70 to-slate-50 text-orange-700 border-orange-100',
  office: 'from-blue-50 via-indigo-50/70 to-slate-50 text-blue-700 border-blue-100',
  warehouse: 'from-emerald-50 via-teal-50/70 to-slate-50 text-emerald-700 border-emerald-100',
  godown: 'from-violet-50 via-purple-50/70 to-slate-50 text-violet-700 border-violet-100',
};

export default function ProviderCard({ provider }) {
  const [contactState, setContactState] = useState({
    loading: false,
    phone: null,
    telUri: null,
    error: '',
  });
  const [imageError, setImageError] = useState(false);

  const slugKey = String(provider.categorySlug || '').toLowerCase();
  const Icon = visuals[slugKey] || Building2;
  const tone = tones[slugKey] || tones.office;
  const categoryLabel = provider.category || provider.categoryName || 'Commercial';
  const locationLabel =
    [provider.city, provider.state].filter(Boolean).join(', ') || provider.location || '';
  const servicesList = Array.isArray(provider.services)
    ? provider.services
    : Array.isArray(provider.servicesOffered)
      ? provider.servicesOffered
      : [];
  const hasUploadedImage = Boolean(provider.shopImage?.url && !imageError);

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
    <article className="group bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-200 flex flex-col h-full">
      {/* Top Media Area: Owner Uploaded Photo or Clearly Labeled Category Placeholder */}
      <Link
        to={`/providers/${provider.slug}`}
        className="block relative h-44 overflow-hidden bg-slate-100"
      >
        {hasUploadedImage ? (
          <img
            src={provider.shopImage.url}
            alt={provider.businessName}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${tone} p-5 flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="absolute -right-4 -bottom-6 opacity-15 pointer-events-none">
              <Icon className="w-36 h-36" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-[11px] font-bold text-slate-900 shadow-2xs">
                {categoryLabel}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-white/75 px-2 py-0.5 rounded">
                Category Graphic
              </span>
            </div>
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-white/90 shadow-xs flex items-center justify-center">
                <Icon className="w-6 h-6" aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {provider.city ? `${categoryLabel} in ${provider.city}` : categoryLabel}
              </span>
            </div>
          </div>
        )}

        {/* Overlay Category Badge when Owner Photo is shown */}
        {hasUploadedImage && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span className="bg-slate-950/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[11px] font-bold">
              {categoryLabel}
            </span>
            {provider.isDemo && (
              <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                Sample
              </span>
            )}
          </div>
        )}

        {!hasUploadedImage && provider.isDemo && (
          <span className="absolute bottom-3 right-3 bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Sample
          </span>
        )}
      </Link>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <Link to={`/providers/${provider.slug}`} className="group/title">
          <h3 className="font-bold text-slate-900 group-hover/title:text-orange-600 transition-colors text-base sm:text-lg leading-snug line-clamp-1">
            {provider.businessName}
          </h3>
        </Link>

        {locationLabel && (
          <p className="mt-1.5 text-xs text-slate-600 flex items-center gap-1.5 font-medium">
            <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </p>
        )}

        {provider.description && (
          <p className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
            {provider.description}
          </p>
        )}

        {servicesList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {servicesList.slice(0, 3).map((item) => (
              <span
                key={item}
                className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md"
              >
                {item}
              </span>
            ))}
            {servicesList.length > 3 && (
              <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                +{servicesList.length - 3} more
              </span>
            )}
          </div>
        )}

        {contactState.error && (
          <p className="mt-2 text-[11px] text-red-600 font-medium">{contactState.error}</p>
        )}

        {/* Action Buttons */}
        <div className="mt-auto pt-4 flex items-center gap-2.5">
          <Link
            to={`/providers/${provider.slug}`}
            className="flex-1 inline-flex items-center justify-center gap-1 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl py-2.5 px-3 text-xs font-bold transition-colors"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
          </Link>

          {provider.consentToDisplayPhone !== false ? (
            contactState.phone ? (
              <a
                href={contactState.telUri}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 px-3 text-xs font-bold shadow-2xs transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                <span>{contactState.phone}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleRevealContact}
                disabled={contactState.loading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-xl py-2.5 px-3 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-2.5 px-3 text-xs font-bold transition-colors"
            >
              <span>Profile Info</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
