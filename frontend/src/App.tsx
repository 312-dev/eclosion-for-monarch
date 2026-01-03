/**
 * App - Root component with routing and providers
 *
 * Supports two modes:
 * - Production: Real API with authentication
 * - Demo: LocalStorage-based data, no auth required
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/Tooltip';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoProvider, isGlobalDemoMode } from './context/DemoContext';
import { DemoAuthProvider } from './context/DemoAuthContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UnlockPage } from './pages/UnlockPage';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { FeatureDetailPage } from './pages/FeatureDetailPage';
import { DocsPage } from './pages/DocsPage';
import { DashboardTab } from './components/tabs/DashboardTab';
import { RecurringTab } from './components/tabs/RecurringTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { RateLimitError, AuthRequiredError } from './api/client';
import { ErrorPage } from './components/ui/ErrorPage';

const LANDING_PAGE_KEY = 'eclosion-landing-page';

export function getLandingPage(): string {
  const stored = localStorage.getItem(LANDING_PAGE_KEY);
  return stored === 'recurring' ? '/recurring' : '/dashboard';
}

export function setLandingPage(page: 'dashboard' | 'recurring'): void {
  localStorage.setItem(LANDING_PAGE_KEY, page);
}

function DefaultRedirect() {
  return <Navigate to={getLandingPage()} replace />;
}

function DemoDefaultRedirect() {
  return <Navigate to="/demo/recurring" replace />;
}

function GlobalDemoDefaultRedirect() {
  return <Navigate to="/recurring" replace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry on rate limit or auth errors - these won't resolve with retries
      retry: (failureCount, error) => {
        if (error instanceof RateLimitError || error instanceof AuthRequiredError) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes default
    },
    mutations: {
      // Same retry logic for mutations
      retry: (failureCount, error) => {
        if (error instanceof RateLimitError || error instanceof AuthRequiredError) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

/**
 * Production routes with authentication
 */
function ProductionRoutes() {
  const { loading, error, checkAuth } = useAuth();

  // Show error page if auth check failed
  if (!loading && error) {
    return (
      <ErrorPage
        title="Connection Error"
        message={error}
        onRetry={() => {
          checkAuth();
        }}
      />
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unlock" element={<UnlockPage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<DefaultRedirect />} />
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/recurring" element={<RecurringTab />} />
          <Route path="/settings" element={<SettingsTab />} />
        </Route>
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * Demo routes - no authentication required
 * Used when accessing /demo/* paths
 */
function DemoRoutes() {
  return (
    <DemoAuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/demo" element={<DemoDefaultRedirect />} />
          <Route path="/demo/dashboard" element={<DashboardTab />} />
          <Route path="/demo/recurring" element={<RecurringTab />} />
          <Route path="/demo/settings" element={<SettingsTab />} />
        </Route>
        {/* Catch-all redirect within demo */}
        <Route path="*" element={<Navigate to="/demo/recurring" replace />} />
      </Routes>
    </DemoAuthProvider>
  );
}

/**
 * Global demo routes - entire app runs as demo
 * Used when VITE_DEMO_MODE=true is set at build time
 * Serves demo content at root paths (/, /dashboard, /recurring, /settings)
 */
function GlobalDemoRoutes() {
  return (
    <DemoAuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<GlobalDemoDefaultRedirect />} />
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/recurring" element={<RecurringTab />} />
          <Route path="/settings" element={<SettingsTab />} />
        </Route>
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/recurring" replace />} />
      </Routes>
    </DemoAuthProvider>
  );
}

/**
 * Main router that handles all route matching
 */
function AppRouter() {
  const location = useLocation();

  // Global demo mode - entire app is demo, serve at root paths
  // This is used for the official demo site (Railway) and GitHub Pages
  if (isGlobalDemoMode) {
    return <GlobalDemoRoutes />;
  }

  const isDemo = location.pathname.startsWith('/demo');
  const isLanding = location.pathname === '/';
  const isPublicDocs =
    location.pathname === '/features' ||
    location.pathname.startsWith('/features/') ||
    location.pathname === '/docs' ||
    location.pathname.startsWith('/docs/');

  // Landing page (marketing page)
  if (isLanding) {
    return <LandingPage />;
  }

  // Public documentation pages (no auth required)
  if (isPublicDocs) {
    return (
      <Routes>
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/features/:featureId" element={<FeatureDetailPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/*" element={<DocsPage />} />
      </Routes>
    );
  }

  // Demo mode routes (path-based /demo/*)
  if (isDemo) {
    return <DemoRoutes />;
  }

  // Production routes with auth
  return (
    <AuthProvider>
      <ProductionRoutes />
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider>
            <BrowserRouter>
              <DemoProvider>
                <AppRouter />
              </DemoProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
