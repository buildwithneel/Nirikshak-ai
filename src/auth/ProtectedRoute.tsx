import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from './authTypes';
import { Layers } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-institutional-bg flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 animate-page-enter">
          <div className="w-12 h-12 rounded-xl bg-govgreen-900 text-white flex items-center justify-center shadow-subtle animate-soft-pulse">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-govgreen-700 animate-ping" />
            <span className="text-xs font-bold text-govink-secondary font-mono tracking-wide">
              VERIFYING CREDENTIALS…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Preserve attempted destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    // User is authenticated but lacks required role
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
