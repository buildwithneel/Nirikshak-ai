import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ScanPage } from './pages/Scan/ScanPage';
import { ScanResultPage } from './pages/ScanResult/ScanResultPage';
import { InspectionsPage } from './pages/Inspections/InspectionsPage';
import { InspectionDetailPage } from './pages/Inspections/InspectionDetailPage';
import { LoginPage } from './pages/Login/LoginPage';
import { UnauthorizedPage } from './pages/Unauthorized/UnauthorizedPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { OfficerComplaintsPage } from './pages/Complaints/OfficerComplaintsPage';
import { OfficerComplaintDetailPage } from './pages/Complaints/OfficerComplaintDetailPage';
import { ConsumerCheckPage } from './pages/Consumer/ConsumerCheckPage';
import { ConsumerResultPage } from './pages/Consumer/ConsumerResultPage';
import { ConsumerComplaintPage } from './pages/Consumer/ConsumerComplaintPage';
import { ConsumerComplaintSuccessPage } from './pages/Consumer/ConsumerComplaintSuccessPage';
import { ConsumerMyComplaintsPage } from './pages/Consumer/ConsumerMyComplaintsPage';
import { ConsumerComplaintDetailPage } from './pages/Consumer/ConsumerComplaintDetailPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Code-split heavy routes for optimal bundle footprint and field load performance
const AnalyticsPage = lazy(() => import('./pages/Analytics/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const ReportsPage = lazy(() => import('./pages/Reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ProductsPage = lazy(() => import('./pages/Products/ProductsPage').then(m => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('./pages/Products/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const RulesPage = lazy(() => import('./pages/Rules/RulesPage').then(m => ({ default: m.RulesPage })));
const OfficerInspectionWorkspacePage = lazy(() =>
  import('./pages/Inspections/OfficerInspectionWorkspacePage').then(m => ({ default: m.OfficerInspectionWorkspacePage }))
);

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-mono text-ink-muted">Loading module...</span>
    </div>
  </div>
);

const RootRedirector: React.FC = () => {
  const { isAuthenticated, isOfficer, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return isOfficer ? <Navigate to="/dashboard" replace /> : <Navigate to="/check" replace />;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Root Smart Redirect */}
          <Route path="/" element={<RootRedirector />} />

          {/* Protected Application Shell with Sidebar + Header */}
          <Route element={<AppLayout />}>
            {/* Officer Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['OFFICER']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/scan/result" element={<ScanResultPage />} />
              <Route path="/inspections" element={<InspectionsPage />} />
              <Route path="/inspections/:id" element={<InspectionDetailPage />} />
              <Route path="/inspections/:id/workspace" element={<OfficerInspectionWorkspacePage />} />
              <Route path="/complaints" element={<OfficerComplaintsPage />} />
              <Route path="/complaints/:id" element={<OfficerComplaintDetailPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Consumer Protected Routes (Consumers + Officers) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/check" element={<ConsumerCheckPage />} />
              <Route path="/check/result" element={<ConsumerResultPage />} />
              <Route path="/complaint" element={<ConsumerComplaintPage />} />
              <Route path="/complaint/success" element={<ConsumerComplaintSuccessPage />} />
              <Route path="/my-complaints" element={<ConsumerMyComplaintsPage />} />
              <Route path="/my-complaints/:id" element={<ConsumerComplaintDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
