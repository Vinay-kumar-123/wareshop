import React from 'react';
import { SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EmptyState({
  icon: Icon = SearchX,
  title = 'No items found',
  description = 'We couldn’t find any matching records for your request.',
  actionLabel,
  actionHref,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-md border border-border">
      <div className="w-14 h-14 rounded-full bg-accent-50 flex items-center justify-center mb-4">
        <Icon size={26} className="text-accent" aria-hidden="true" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-text-muted text-sm max-w-md leading-relaxed mb-6">
          {description}
        </p>
      )}
      {actionHref && actionLabel && (
        <Link to={actionHref} className="btn-primary text-sm py-2.5 px-5">
          {actionLabel}
        </Link>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
