/**
 * Protected Route
 *
 * Route guard that checks authentication status.
 * Redirects to login/unlock page based on auth state.
 *
 * Note: Per-tool configuration is now handled within each tab,
 * not at the route level.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';

export function ProtectedRoute() {
  const location = useLocation();
  const { authenticated, needsUnlock, loading: authLoading } = useAuth();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        <PageLoadingSpinner />
      </div>
    );
  }

  // Redirect to unlock if credentials need passphrase
  if (needsUnlock) {
    return <Navigate to="/unlock" state={{ from: location }} replace />;
  }

  // Redirect to login if not authenticated
  if (authenticated === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render protected content
  // Per-tool configuration is handled within each tab (e.g., RecurringTab shows its own setup wizard)
  return <Outlet />;
}
