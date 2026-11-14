import React, { Suspense } from 'react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent/20 selection:text-primary">
      <Navbar />
      <main className="flex-1 pt-16 sm:pt-20" id="main-content">
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
