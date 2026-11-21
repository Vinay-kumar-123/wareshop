import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import CategoryCard from '../../components/marketplace/CategoryCard.jsx';
import { categories as staticCategories } from '../../data/categories.js';
import providerService from '../../services/providerService.js';
import { Building2, ArrowRight, Sparkles } from 'lucide-react';

export default function CategoriesPage() {
  usePageMeta({
    title: 'Commercial Property & Business Categories | WARERENT',
    description:
      'Browse commercial shops, offices, warehouses and godowns available across India on WARERENT.',
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
            imageUrl: apiCat.imageUrl || fallback.imageUrl || '',
            shortDescription: apiCat.shortDescription || fallback.shortDescription,
            description: apiCat.description || fallback.description,
            subcategories: fallback.subcategories || [],
            listingCount:
              typeof apiCat.publishedCount === 'number'
                ? apiCat.publishedCount
                : apiCat.listingCount,
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
    <div className="bg-[#F7F8FA] min-h-screen pb-16">
      {/* Top Breadcrumb */}
      <div className="bg-white border-b border-slate-200/90">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Categories' }]} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 sm:pt-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#F36B21] mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Commercial Space Verticals</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[#171717] tracking-tight leading-tight mb-3">
            WARERENT Commercial Categories
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Explore India’s commercial properties and businesses across four primary verticals:
            <strong className="text-[#171717] font-semibold">
              {' '}
              Shops, Offices, Warehouses, and Godowns
            </strong>
            .
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
        <div className="bg-white rounded-xl border border-slate-200/90 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFF5EF] border border-[#FFE6D5] text-[#F36B21] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-[#171717] mb-1">
                Own a Commercial Property or Operate a Specialized Business?
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                Register on the WARERENT Provider Portal using your mobile OTP. You can list under
                any active category or submit a custom category request for administrator review.
              </p>
            </div>
          </div>
          <Link
            to="/become-a-partner?tab=submit"
            className="inline-flex items-center gap-2 py-3 px-6 rounded-lg bg-[#F36B21] hover:bg-[#D95513] text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-colors"
          >
            <span>List Your Property</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
