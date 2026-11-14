import React from 'react';
import { SearchX, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon = SearchX,
  title = 'No listings found',
  description = 'We couldn’t find any matching records for your current search criteria.',
  actionLabel,
  actionHref,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-white rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="w-14 h-14 rounded-xl bg-[#FFF5EF] border border-[#FFE6D5] flex items-center justify-center mb-4">
        <Icon size={26} className="text-[#F36B21]" aria-hidden="true" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-[#171717] mb-1.5">{title}</h3>
      {description && (
        <p className="text-slate-600 text-xs sm:text-sm max-w-md leading-relaxed mb-6">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link
          to={actionHref}
          className="inline-flex items-center gap-2 bg-[#F36B21] hover:bg-[#D95513] text-white font-bold text-xs sm:text-sm py-2.5 px-5 rounded-lg shadow-2xs transition-colors"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
