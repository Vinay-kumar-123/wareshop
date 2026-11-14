import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta.js';
import Button from '../components/common/Button.jsx';

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page Not Found (404)',
    description: 'The requested page could not be found on WARESHOP.',
  });

  return (
    <div className="section-padding container-max min-h-[65vh] flex flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <span className="text-8xl sm:text-9xl font-black text-primary/10 tracking-tighter select-none">
          404
        </span>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl sm:text-2xl font-bold text-primary">Lost in Space?</span>
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-primary mb-3">
        Page Not Found
      </h1>
      <p className="text-text-muted text-base max-w-md leading-relaxed mb-8">
        The page you are looking for may have been relocated, renamed, or is temporarily unavailable.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link to="/" className="w-full sm:w-auto">
          <Button variant="primary" className="w-full">
            <Home size={16} aria-hidden="true" />
            <span>Return to Homepage</span>
          </Button>
        </Link>
        <Link to="/categories" className="w-full sm:w-auto">
          <Button variant="secondary" className="w-full">
            <Search size={16} aria-hidden="true" />
            <span>Browse Categories</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
