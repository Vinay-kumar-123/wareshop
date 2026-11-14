import React, { lazy, Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ProtectedRoute from '../components/admin/ProtectedRoute.jsx';

// Lazy-loaded public page bundles
const HomePage = lazy(() => import('../pages/home/HomePage.jsx'));
const CategoriesPage = lazy(() => import('../pages/categories/CategoriesPage.jsx'));
const CategoryDetailPage = lazy(() => import('../pages/categories/CategoryDetailPage.jsx'));
const ServiceDetailPage = lazy(() => import('../pages/services/ServiceDetailPage.jsx'));
const ProvidersPage = lazy(() => import('../pages/providers/ProvidersPage.jsx'));
const ProviderProfilePage = lazy(() => import('../pages/providers/ProviderProfilePage.jsx'));
const BecomePartnerPage = lazy(() => import('../pages/partners/BecomePartnerPage.jsx'));
const AboutPage = lazy(() => import('../pages/about/AboutPage.jsx'));
const PrivacyPolicyPage = lazy(() => import('../pages/legal/PrivacyPolicyPage.jsx'));
const TermsPage = lazy(() => import('../pages/legal/TermsPage.jsx'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'));

// Lazy-loaded Admin Portal bundles
const AdminLoginPage = lazy(() => import('../pages/admin/AdminLoginPage.jsx'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage.jsx'));
const AdminApplicationsPage = lazy(() => import('../pages/admin/AdminApplicationsPage.jsx'));
const AdminApplicationDetailPage = lazy(() => import('../pages/admin/AdminApplicationDetailPage.jsx'));
const AdminProvidersPage = lazy(() => import('../pages/admin/AdminProvidersPage.jsx'));
const AdminProviderEditPage = lazy(() => import('../pages/admin/AdminProviderEditPage.jsx'));
const AdminCategoriesPage = lazy(() => import('../pages/admin/AdminCategoriesPage.jsx'));
const AdminActivityLogsPage = lazy(() => import('../pages/admin/AdminActivityLogsPage.jsx'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage.jsx'));

function PageFallback() {
  return (
    <div className="min-h-[55vh] flex items-center justify-center p-8">
      <LoadingSpinner size="lg" label="Loading page resources..." />
    </div>
  );
}

// Wrapper for public marketplace pages with standard customer Navbar and Footer
function PublicLayoutWrapper() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public Marketplace Layout Routes */}
        <Route element={<PublicLayoutWrapper />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/categories/:slug" element={<CategoryDetailPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/providers/:slug" element={<ProviderProfilePage />} />
          <Route path="/become-a-partner" element={<BecomePartnerPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Standalone Admin Portal Routes (No customer Navbar/Footer) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <ProtectedRoute>
              <AdminApplicationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/applications/:id"
          element={
            <ProtectedRoute>
              <AdminApplicationDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/providers"
          element={
            <ProtectedRoute>
              <AdminProvidersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/providers/:id"
          element={
            <ProtectedRoute>
              <AdminProviderEditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <ProtectedRoute>
              <AdminCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/activity-logs"
          element={
            <ProtectedRoute>
              <AdminActivityLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
