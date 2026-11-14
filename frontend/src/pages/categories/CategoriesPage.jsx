import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import CategoryCard from '../../components/marketplace/CategoryCard.jsx';
import { categories as staticCategories } from '../../data/categories.js';
import providerService from '../../services/providerService.js';
import { Building2, ArrowRight } from 'lucide-react';

export default function CategoriesPage() {
  usePageMeta({
    title: 'Commercial Property & Business Categories | WARESHOP',
    description:
      'Browse commercial shops, offices, warehouses and godowns available across India on WARESHOP.',
    canonical: 'https://wareshop.in/categories',
  });

  const [displayCategories, setDisplayCategories] = useState(staticCategories);

  useEffect(() => {
    let isMounted = true;
    providerService
      .getPublicCategories()
      .then((apiCats) => {
        if (!isMounted || !Array.isArray(apiCats) || apiCats.length === 0) return;
        const staticBySlug = new Map(staticCategories.map((c) => [c.slug, c]));
        const merged = apiCats.map((apiCat) => {
          const fallback = staticBySlug.get(apiCat.slug) || {};
          return {
            ...fallback,
            ...apiCat,
            id: apiCat._id || apiCat.slug,
            imageUrl: apiCat.imageUrl || fallback.imageUrl,
            shortDescription: apiCat.shortDescription || fallback.shortDescription,
            description: apiCat.description || fallback.description,
            subcategories: fallback.subcategories || [],
          };
        });
        setDisplayCategories(merged);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Categories' }]} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-2 block">
            Commercial Space Verticals
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-3">
            WARESHOP Commercial Categories
          </h1>
          <p className="text-slate-600 text-sm sm:text-lg leading-relaxed">
            Explore India’s commercial properties and businesses across four primary verticals:
            Shops, Offices, Warehouses, and Godowns.
          </p>
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {displayCategories.map((category) => (
            <div key={category.id || category.slug} className="h-full">
              <CategoryCard category={category} />
            </div>
          ))}
        </div>

        {/* Owner CTA Callout */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950 mb-1">
                Own a Commercial Property or Operate a Specialized Business?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Register on the WARESHOP Provider Portal using your mobile OTP. You can list under
                any active category or submit a custom category request for administrator review.
              </p>
            </div>
          </div>
          <Link
            to="/become-a-partner?tab=submit"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors"
          >
            <span>List Your Property</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
