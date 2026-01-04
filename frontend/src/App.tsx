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
import { DashboardTab } from './components/tabs/DashboardTab';
import { RecurringTab } from './components/tabs/RecurringTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { GuidePage } from './pages/GuidePage';
import { TechnicalDocsPage } from './pages/TechnicalDocsPage';
import { RateLimitError, AuthRequiredError } from './api/client';
import { ErrorPage } from './components/ui/ErrorPage';
import { useIsMarketingSite } from './hooks/useIsMarketingSite';
import { BetaBanner } from './components/ui/BetaBanner';

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
  return <Navigate to="/demo/dashboard" replace />;
}

function GlobalDemoDefaultRedirect() {
  return <Navigate to="/dashboard" replace />;
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
        {/* Bundled docs - open in new tab, no AppShell */}
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/guide/:slug" element={<GuidePage />} />
        <Route path="/docs" element={<TechnicalDocsPage />} />
        <Route path="/docs/:slug" element={<TechnicalDocsPage />} />
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
        <Route path="*" element={<Navigate to="/demo/dashboard" replace />} />
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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DemoAuthProvider>
  );
}

/**
 * Main router that handles all route matching
 */
function AppRouter() {
  const location = useLocation();
  const isMarketingSite = useIsMarketingSite();

  const isDemo = location.pathname.startsWith('/demo');
  const isLanding = location.pathname === '/';
  const isFeatures =
    location.pathname === '/features' ||
    location.pathname.startsWith('/features/');
  const isDocs =
    location.pathname === '/docs' ||
    location.pathname.startsWith('/docs/');
  const isGuide =
    location.pathname === '/guide' ||
    location.pathname.startsWith('/guide/');

  // Marketing site (Cloudflare Pages): Show landing page, docs, and demo at /demo/*
  if (isMarketingSite) {
    // Landing page
    if (isLanding) {
      return (
        <>
          <BetaBanner />
          <LandingPage />
        </>
      );
    }

    // Features pages
    if (isFeatures) {
      return (
        <>
          <BetaBanner />
          <Routes>
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/features/:featureId" element={<FeatureDetailPage />} />
          </Routes>
        </>
      );
    }

    // Documentation pages
    if (isDocs) {
      return (
        <>
          <BetaBanner />
          <Routes>
            <Route path="/docs" element={<TechnicalDocsPage />} />
            <Route path="/docs/:slug" element={<TechnicalDocsPage />} />
          </Routes>
        </>
      );
    }

    // User guide pages
    if (isGuide) {
      return (
        <>
          <BetaBanner />
          <Routes>
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/guide/:slug" element={<GuidePage />} />
          </Routes>
        </>
      );
    }

    // Demo at /demo/* paths
    if (isDemo) {
      return (
        <>
          <BetaBanner />
          <DemoRoutes />
        </>
      );
    }

    // Catch-all: redirect to landing
    return <Navigate to="/" replace />;
  }

  // Global demo mode (Railway demo site): Serve demo at root paths
  if (isGlobalDemoMode) {
    return <GlobalDemoRoutes />;
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
