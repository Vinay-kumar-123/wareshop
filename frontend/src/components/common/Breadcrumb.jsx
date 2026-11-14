import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="py-1">
      <ol className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
        <li className="flex items-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-[#F36B21] transition-colors font-medium"
            aria-label="Home"
          >
            <Home size={13} className="shrink-0" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight size={13} className="text-slate-300 shrink-0" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="text-slate-600 hover:text-[#F36B21] transition-colors font-medium truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-[#171717] font-semibold truncate max-w-[220px] sm:max-w-md"
                  aria-current="page"
                >
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
