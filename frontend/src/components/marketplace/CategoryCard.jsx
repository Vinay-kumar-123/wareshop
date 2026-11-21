import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Store, Building2, Warehouse, Package, Layers, CheckCircle2 } from 'lucide-react';
import { getCategoryVisual } from '../../assets/categories/index.js';
import { resolveMediaUrl } from '../../services/api.js';

const iconMap = {
  Store,
  Building2,
  Warehouse,
  Package,
  Layers,
};

export default function CategoryCard({ category }) {
  const resolvedImageUrl = resolveMediaUrl(category.imageUrl);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedImageUrl]);

  const IconComponent = iconMap[category.icon] || Layers;
  const slug = String(category.slug || '').toLowerCase();
  const fallbackVisual = getCategoryVisual(slug || category.name);
  const imageSrc = !imgFailed && resolvedImageUrl ? resolvedImageUrl : fallbackVisual;

  return (
    <Link
      to={`/categories/${category.slug}`}
      className="group rounded-xl overflow-hidden bg-white border border-slate-200 shadow-card hover:shadow-card-hover hover:border-[#F36B21]/60 transition-all duration-200 flex flex-col h-full"
      aria-label={`Explore ${category.pluralName || category.name} listings`}
    >
      {/* Category Visual Banner */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={imageSrc}
          alt={category.pluralName || category.name}
          onError={() => {
            if (!imgFailed) setImgFailed(true);
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />

        {/* Top Category Tag */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-[#171717] text-[11px] font-semibold shadow-2xs">
            <IconComponent className="w-3.5 h-3.5 text-[#F36B21]" aria-hidden="true" />
            <span>{category.shortDescription || 'Commercial Space'}</span>
          </span>
          {typeof category.listingCount === 'number' && category.listingCount > 0 && (
            <span className="bg-[#F36B21] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-md shadow-2xs">
              {category.listingCount} listed
            </span>
          )}
        </div>

        {/* Bottom Title Overlay */}
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h3 className="text-lg font-bold tracking-tight leading-snug">
            {category.pluralName || category.name}
          </h3>
        </div>
      </div>

      {/* Category Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
        <div>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-3.5 line-clamp-2">
            {category.description}
          </p>

          {category.subcategories && category.subcategories.length > 0 ? (
            <div className="space-y-1.5 mb-3.5">
              {category.subcategories.slice(0, 2).map((sub) => (
                <div
                  key={sub.id || sub.name}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#F36B21] shrink-0" aria-hidden="true" />
                  <span className="truncate">{sub.name}</span>
                </div>
              ))}
            </div>
          ) : (
            category.popularServices &&
            category.popularServices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {category.popularServices.slice(0, 2).map((srv) => (
                  <span
                    key={srv}
                    className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            )
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#F36B21] group-hover:text-[#D95513]">
          <span>Explore {category.pluralName || category.name}</span>
          <span className="w-6 h-6 rounded-md bg-[#FFF5EF] group-hover:bg-[#F36B21] group-hover:text-white flex items-center justify-center transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
