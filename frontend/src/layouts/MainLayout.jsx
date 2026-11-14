import React, { Suspense } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#171717]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#F36B21] focus:text-white focus:rounded-lg focus:font-bold focus:text-xs"
      >
        Skip to main content
      </a>
      <Navbar />
      <main className="flex-1" id="main-content">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <LoadingSpinner size="lg" label="Loading marketplace view..." showLabel />
            </div>
          }
        >
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
