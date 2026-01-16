/* eslint-disable max-lines -- Root component with all routes and providers */
/**
 * App - Root component with routing and providers
 *
 * Supports two modes:
 * - Production: Real API with authentication
 * - Demo: LocalStorage-based data, no auth required
 */

import { useEffect } from 'react';
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/Tooltip';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoProvider, isGlobalDemoMode } from './context/DemoContext';
import { RateLimitProvider } from './context/RateLimitContext';
import { DemoAuthProvider } from './context/DemoAuthContext';
import { MonthTransitionProvider } from './context/MonthTransitionContext';
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
import { SettingsTab } from './components/tabs/SettingsTab';
import { RateLimitError, AuthRequiredError } from './api/client';
import { ErrorPage } from './components/ui/ErrorPage';
import { useIsMarketingSite } from './hooks/useIsMarketingSite';
import { useElectronNavigation } from './hooks/useElectronNavigation';
import { BetaBanner } from './components/ui/BetaBanner';
import { MfaReauthPrompt } from './components/MfaReauthPrompt';
import { SessionExpiredOverlay } from './components/SessionExpiredOverlay';
import { UpdateProvider } from './context/UpdateContext';

const LANDING_PAGE_KEY = 'eclosion-landing-page';

/**
 * Scrolls to top on route changes, unless there's a hash anchor
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash, let the browser handle scrolling to the element
    if (hash) {
      const element = document.getElementById(hash.slice(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Otherwise scroll to top
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
  const { loading, error, checkAuth, mfaRequiredData, clearMfaRequired, setAuthenticated } =
    useAuth();
  const navigate = useNavigate();

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

  // Show MFA re-auth prompt if needed (desktop mode, 6-digit code users on restart)
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
          // Clear stored credentials so user can log in fresh
          globalThis.electron?.credentials.clear();
          navigate('/login', { replace: true });
        }}
      />
    );
  }

  return (
    <>
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
            <Route path="/notes" element={<NotesTab />} />
            <Route path="/settings" element={<SettingsTab />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Session expired overlay - shows when session expires during normal use */}
      <SessionExpiredOverlay />
    </>
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
          <Route path="/demo/notes" element={<NotesTab />} />
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
 * Serves demo content at root paths (/, /dashboard, /recurring, /settings, /notes)
 */
function GlobalDemoRoutes() {
  return (
    <DemoAuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<GlobalDemoDefaultRedirect />} />
          <Route path="/dashboard" element={<DashboardTab />} />
          <Route path="/recurring" element={<RecurringTab />} />
          <Route path="/notes" element={<NotesTab />} />
          <Route path="/settings" element={<SettingsTab />} />
        </Route>
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DemoAuthProvider>
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
 * Handles routing for the marketing site (Cloudflare Pages)
 */
function MarketingSiteRoutes() {
  const location = useLocation();

  const isDemo = location.pathname.startsWith('/demo');
  const isLanding = location.pathname === '/';
  const isDownload = location.pathname === '/download' || location.pathname === '/download/';
  const isFeatures =
    location.pathname === '/features' || location.pathname.startsWith('/features/');
  const isDocs = location.pathname.startsWith('/docs');

  if (isLanding) {
    return (
      <>
        <BetaBanner />
        <LandingPage />
      </>
    );
  }

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

  if (isDownload) {
    return (
      <>
        <BetaBanner />
        <DownloadPage />
      </>
    );
  }

  if (isDemo) {
    return (
      <>
        <BetaBanner />
        <DemoRoutes />
      </>
    );
  }

  if (isDocs) {
    const isLocalhost =
      globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return <DocsDevMessage />;
    }
    globalThis.location.replace(location.pathname + location.search + location.hash);
    return null;
  }

  return <Navigate to="/" replace />;
}

/**
 * Main router that handles all route matching
 */
function AppRouter() {
  const location = useLocation();
  const isMarketingSite = useIsMarketingSite();

  // Listen for navigation events from Electron main process (e.g., Settings menu)
  useElectronNavigation();

  if (isMarketingSite) {
    return <MarketingSiteRoutes />;
  }

  if (isGlobalDemoMode) {
    return <GlobalDemoRoutes />;
  }

  if (location.pathname.startsWith('/demo')) {
    return <DemoRoutes />;
  }

  return (
    <AuthProvider>
      <ProductionRoutes />
    </AuthProvider>
  );
}

// Use HashRouter for desktop (Electron) to handle refresh properly with file:// protocol
const isDesktop = globalThis.window !== undefined && globalThis.electron !== undefined;
const Router = isDesktop ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TooltipProvider>
            <Router>
              <MacOSDragRegion />
              <ScrollToTop />
              <RateLimitProvider>
                <DemoProvider>
                  <MonthTransitionProvider>
                    <UpdateProvider>
                      <AppRouter />
                    </UpdateProvider>
                  </MonthTransitionProvider>
                </DemoProvider>
              </RateLimitProvider>
            </Router>
          </TooltipProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
