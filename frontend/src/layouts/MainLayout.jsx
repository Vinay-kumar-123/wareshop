import React, { Suspense } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-orange-500/20 selection:text-slate-900">
      <Navbar />
      <main className="flex-1" id="main-content">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
              <LoadingSpinner size="lg" label="Loading page..." />
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
