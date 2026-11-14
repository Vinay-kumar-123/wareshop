import React from 'react';
import { usePageMeta } from '../../hooks/usePageMeta.js';
import Breadcrumb from '../../components/common/Breadcrumb.jsx';
import SectionHeading from '../../components/common/SectionHeading.jsx';
import CategoryCard from '../../components/marketplace/CategoryCard.jsx';
import { categories } from '../../data/categories.js';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CategoriesPage() {
  usePageMeta({
    title: 'Business Categories — WARESHOP',
    description: 'Explore verified service categories across Home & Construction, Events & Lifestyle, Business & Property, Digital & Professional, and Education.',
    canonical: 'https://konnevia.com/categories',
  });

  return (
    <div className="bg-background min-h-screen">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-border/80">
        <div className="container-max py-3 px-4 sm:px-6 lg:px-8">
          <Breadcrumb items={[{ label: 'Categories' }]} />
        </div>
      </div>

      <div className="container-max py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-3xl mb-10 sm:mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-accent mb-2 block">
            Directory & Verticals
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight leading-tight mb-4">
            Marketplace Service Categories
          </h1>
          <p className="text-text-muted text-base sm:text-lg leading-relaxed">
            Browse shops, offices, warehouses and godowns across India. Start with the business space that fits your operation.
          </p>
        </div>

        {/* 5 Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-16">
          {categories.map((category) => (
            <div key={category.id} className="h-full">
              <CategoryCard category={category} />
            </div>
          ))}
        </div>

        {/* Informational Callout */}
        <div className="bg-white rounded-xl border border-border/80 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-teal-50 text-accent flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary mb-1">
                Looking for a tailored or unlisted service?
              </h2>
              <p className="text-sm text-text-muted max-w-xl leading-relaxed">
                Our marketplace team assists with customized cross-vertical project scopes. Submit a general inquiry and our advisors will verify your requirement.
              </p>
            </div>
          </div>
          <Link
            to="/get-quote"
            className="btn-primary py-2.5 px-6 text-sm font-semibold whitespace-nowrap flex-shrink-0"
          >
            Submit Custom Scope
          </Link>
        </div>
      </div>
    </div>
  );
}
