import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  // items: [{ label, href }] — last item has no href (current active)
  return (
    <nav aria-label="Breadcrumb" className="py-3 sm:py-4">
      <ol className="flex items-center gap-1.5 text-xs sm:text-sm text-text-muted flex-wrap">
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center gap-1 hover:text-accent transition-colors font-medium"
            aria-label="Home"
          >
            <Home size={14} className="text-text-muted hover:text-accent" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight size={13} className="text-border flex-shrink-0" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link to={item.href} className="hover:text-accent transition-colors font-medium">
                  {item.label}
                </Link>
              ) : (
                <span className="text-primary font-semibold truncate max-w-[200px] sm:max-w-none" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
