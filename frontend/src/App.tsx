/* eslint-disable max-lines -- Root component with all routes and providers */
/**
 * App - Root component with routing and providers
 *
 * Supports two modes:
 * - Production: Real API with authentication
 * - Demo: LocalStorage-based data, no auth required
 *
 * Uses React Router's data router API (createBrowserRouter/createHashRouter)
 * which enables features like useBlocker for navigation guards.
 */

import { useEffect } from 'react';
import {
  createBrowserRouter,
  createHashRouter,
  RouterProvider,
  Navigate,
  useLocation,
  useNavigate,
  Outlet,
  type RouteObject,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/Tooltip';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoProvider, isGlobalDemoMode } from './context/DemoContext';
import { RateLimitProvider } from './context/RateLimitContext';
import { RateLimitToastBridge } from './components/RateLimitToastBridge';
import { DemoAuthProvider } from './context/DemoAuthContext';
import { MonthTransitionProvider } from './context/MonthTransitionContext';
import { DistributionModeProvider } from './context/DistributionModeContext';
import { AppShell } from './components/layout/AppShell';
import { MacOSDragRegion } from './components/layout/MacOSDragRegion';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { UnlockPage } from './pages/UnlockPage';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { FeatureDetailPage } from './pages/FeatureDetailPage';
import { DownloadPage } from './pages/download';
import { DashboardTab } from './components/tabs/DashboardTab';
import { RecurringTab } from './components/tabs/RecurringTab';
import { NotesTab } from './components/tabs/NotesTab';
import { StashTab } from './components/tabs/StashTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { RateLimitError, AuthRequiredError } from './api/client';
import { ErrorPage } from './components/ui/ErrorPage';
import { useElectronNavigation } from './hooks/useElectronNavigation';
import { BetaBanner } from './components/ui/BetaBanner';
import { MfaReauthPrompt } from './components/MfaReauthPrompt';
import { SessionExpiredOverlay } from './components/SessionExpiredOverlay';
import { UpdateProvider } from './context/UpdateContext';

const LANDING_PAGE_KEY = 'eclosion-landing-page';

/**
 * Marketing site hostnames.
 * Keep in sync with useIsMarketingSite.ts
 */
const MARKETING_HOSTNAMES = ['eclosion.app', 'pages.dev'];

/**
 * Check if current hostname is marketing site (non-hook version for router creation)
 */
function isMarketingSiteHostname(): boolean {
  if (globalThis.electron !== undefined) return false;
  const hostname = globalThis.location?.hostname ?? '';
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  return MARKETING_HOSTNAMES.some((domain) => hostname.includes(domain));
}

/**
 * Scrolls to top on route changes, unless there's a hash anchor
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

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
      retry: (failureCount, error) => {
        if (error instanceof RateLimitError || error instanceof AuthRequiredError) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000,
    },
    mutations: {
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
 * Root layout that provides context needed by all routes.
 * Contains providers that need router context.
 */
function RootLayout() {
  useElectronNavigation();

  return (
    <>
      <MacOSDragRegion />
      <ScrollToTop />
      <RateLimitProvider>
        <RateLimitToastBridge />
        <DemoProvider>
          <MonthTransitionProvider>
            <UpdateProvider>
              <DistributionModeProvider>
                <Outlet />
              </DistributionModeProvider>
            </UpdateProvider>
          </MonthTransitionProvider>
        </DemoProvider>
      </RateLimitProvider>
    </>
  );
}

/**
 * Production root with AuthProvider
 */
function ProductionRootLayout() {
  useElectronNavigation();

  return (
    <>
      <MacOSDragRegion />
      <ScrollToTop />
      <RateLimitProvider>
        <RateLimitToastBridge />
        <DemoProvider>
          <MonthTransitionProvider>
            <UpdateProvider>
              <DistributionModeProvider>
                <AuthProvider>
                  <ProductionAuthWrapper />
                </AuthProvider>
              </DistributionModeProvider>
            </UpdateProvider>
          </MonthTransitionProvider>
        </DemoProvider>
      </RateLimitProvider>
    </>
  );
}

/**
 * Handles auth state and renders appropriate UI
 */
function ProductionAuthWrapper() {
  const { loading, error, checkAuth, mfaRequiredData, clearMfaRequired, setAuthenticated } =
    useAuth();
  const navigate = useNavigate();

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

  if (mfaRequiredData) {
    return (
      <MfaReauthPrompt
        email={mfaRequiredData.email}
        initialMfaMode={mfaRequiredData.mfaMode}
        onSuccess={() => {
          clearMfaRequired();
          setAuthenticated(true);
          navigate(getLandingPage(), { replace: true });
        }}
        onUseOtherAccount={() => {
          clearMfaRequired();
          globalThis.electron?.credentials.clear();
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  return (
    <>
      <Outlet />
      <SessionExpiredOverlay />
    </>
  );
}

/**
 * Demo layout with DemoAuthProvider
 */
function DemoLayout() {
  return (
    <DemoAuthProvider>
      <Outlet />
    </DemoAuthProvider>
  );
}

/**
 * Marketing layout with BetaBanner
 */
function MarketingLayout() {
  return (
    <>
      <BetaBanner />
      <Outlet />
    </>
  );
}

/**
 * Development-only message for docs routes
 */
function DocsDevMessage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="text-center max-w-md">
        <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
          Docs not available here
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
          In development, Docusaurus runs on a separate port. Start it with:
        </p>
        <code
          className="block p-3 rounded-lg text-sm mb-4"
          style={{ backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text)' }}
        >
          cd docusaurus && npm start
        </code>
        <a href="/" className="text-sm" style={{ color: 'var(--monarch-orange)' }}>
          ← Back to home
        </a>
      </div>
    </div>
  );
}

/**
 * Handles /docs route - redirects in production, shows message in dev
 */
function DocsHandler() {
  const location = useLocation();
  const isLocalhost =
    globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1';

  useEffect(() => {
    if (!isLocalhost) {
      globalThis.location.replace(location.pathname + location.search + location.hash);
    }
  }, [isLocalhost, location]);

  if (isLocalhost) {
    return <DocsDevMessage />;
  }

  return null;
}

// ============================================================================
// Route Configurations
// ============================================================================

/**
 * App shell routes - used by production and demo modes
 */
const appShellChildren: RouteObject[] = [
  { path: 'dashboard', element: <DashboardTab /> },
  { path: 'recurring', element: <RecurringTab /> },
  { path: 'notes', element: <NotesTab /> },
  { path: 'stash', element: <StashTab /> },
  { path: 'settings', element: <SettingsTab /> },
];

/**
 * Production routes (desktop and self-hosted web)
 */
const productionRoutes: RouteObject[] = [
  {
    element: <ProductionRootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/unlock', element: <UnlockPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [{ index: true, element: <DefaultRedirect /> }, ...appShellChildren],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

/**
 * Demo routes (/demo/*)
 */
const demoRouteChildren: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <DemoDefaultRedirect /> },
      { path: 'dashboard', element: <DashboardTab /> },
      { path: 'recurring', element: <RecurringTab /> },
      { path: 'notes', element: <NotesTab /> },
      { path: 'stash', element: <StashTab /> },
      { path: 'settings', element: <SettingsTab /> },
    ],
  },
  { path: '*', element: <Navigate to="/demo/dashboard" replace /> },
];

/**
 * Global demo routes (VITE_DEMO_MODE=true)
 * Serves demo at root paths
 */
const globalDemoRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <DemoLayout />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <GlobalDemoDefaultRedirect /> },
              ...appShellChildren,
            ],
          },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
];

/**
 * Marketing site routes (Cloudflare Pages)
 * Includes landing page, features, download, and demo routes
 */
const marketingRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      // Landing page
      {
        path: '/',
        element: <MarketingLayout />,
        children: [{ index: true, element: <LandingPage /> }],
      },
      // Features pages
      {
        path: '/features',
        element: <MarketingLayout />,
        children: [
          { index: true, element: <FeaturesPage /> },
          { path: ':featureId', element: <FeatureDetailPage /> },
        ],
      },
      // Download page
      {
        path: '/download',
        element: <MarketingLayout />,
        children: [{ index: true, element: <DownloadPage /> }],
      },
      // Docs handler
      { path: '/docs/*', element: <DocsHandler /> },
      // Demo routes
      {
        path: '/demo',
        element: (
          <>
            <BetaBanner />
            <DemoLayout />
          </>
        ),
        children: demoRouteChildren,
      },
      // Catch-all redirect to landing
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];

// ============================================================================
// Router Creation
// ============================================================================

// Determine environment before creating router
const isDesktop = globalThis.window !== undefined && globalThis.electron !== undefined;
const isMarketingSite = isMarketingSiteHostname();

/**
 * Create the appropriate router based on environment
 *
 * Priority:
 * 1. Marketing site (Cloudflare Pages) - has demo at /demo/*
 * 2. Global demo mode (VITE_DEMO_MODE=true without marketing hostname) - demo at root
 * 3. Production (desktop or self-hosted)
 */
function createAppRouter() {
  const createRouter = isDesktop ? createHashRouter : createBrowserRouter;

  // Marketing site (Cloudflare Pages) - check first since marketing builds
  // also set VITE_DEMO_MODE=true for demo functionality at /demo/*
  if (isMarketingSite) {
    return createRouter(marketingRoutes);
  }

  // Global demo mode (VITE_DEMO_MODE=true) - for standalone demo deployments
  if (isGlobalDemoMode) {
    return createRouter(globalDemoRoutes);
  }

  // Production (desktop or self-hosted)
  return createRouter(productionRoutes);
}

const router = createAppRouter();

// ============================================================================
// App Component
// ============================================================================

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
