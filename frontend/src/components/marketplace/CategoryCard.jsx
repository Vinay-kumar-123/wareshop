import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Store, Building2, Warehouse, Package, Layers } from 'lucide-react';

const iconMap = {
  Store,
  Building2,
  Warehouse,
  Package,
  Layers,
};

const defaultCategoryImages = {
  shop: '/images/categories/shop.jpg',
  office: '/images/categories/office.jpg',
  warehouse: '/images/categories/warehouse.jpg',
  godown: '/images/categories/godown.jpg',
};

export default function CategoryCard({ category }) {
  const [imgFailed, setImgFailed] = useState(false);
  const IconComponent = iconMap[category.icon] || Layers;
  const slug = String(category.slug || '').toLowerCase();
  const imageSrc = category.imageUrl || defaultCategoryImages[slug] || '';

  return (
    <Link
      to={`/categories/${category.slug}`}
      className="group rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-orange-300 transition-all duration-200 flex flex-col h-full"
      aria-label={`Explore ${category.name} listings`}
    >
      {/* Category Visual Banner */}
      <div className="relative h-40 sm:h-44 overflow-hidden bg-slate-100">
        {imageSrc && !imgFailed ? (
          <img
            src={imageSrc}
            alt={category.pluralName || category.name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: category.bgColor || '#FFF7ED' }}
          >
            <IconComponent
              className="w-14 h-14"
              style={{ color: category.color || '#EA580C' }}
              aria-hidden="true"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white/95 text-slate-900 flex items-center justify-center shadow-xs">
              <IconComponent
                className="w-4 h-4"
                style={{ color: category.color || '#EA580C' }}
                aria-hidden="true"
              />
            </span>
            <h3 className="text-lg font-extrabold tracking-tight">
              {category.pluralName || category.name}
            </h3>
          </div>
          {typeof category.listingCount === 'number' && category.listingCount > 0 && (
            <span className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {category.listingCount} listed
            </span>
          )}
        </div>
      </div>

      {/* Category Details */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
            {category.shortDescription || 'Commercial Space'}
          </p>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
            {category.description}
          </p>

          {category.subcategories && category.subcategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {category.subcategories.slice(0, 3).map((sub) => (
                <span
                  key={sub.id || sub.name}
                  className="inline-block text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md"
                >
                  {sub.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-bold text-orange-600 group-hover:text-orange-700">
          <span>Browse {category.pluralName || category.name}</span>
          <ArrowUpRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </Link>
  );
}
