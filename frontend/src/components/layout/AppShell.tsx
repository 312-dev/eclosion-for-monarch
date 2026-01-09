/**
 * App Shell
 *
 * Main layout component providing:
 * - App header with branding, help, and lock
 * - Vertical sidebar navigation
 * - Outlet for routed tab content
 * - Tutorial walkthrough system
 * - Footer with GitHub link
 */

import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TourProvider } from '@reactour/tour';
import { ShieldCheck } from 'lucide-react';
import { SidebarNavigation } from './SidebarNavigation';
import { HelpDropdown } from './HelpDropdown';
import { appTourStyles } from './appShellTour';
import { SyncButton } from '../SyncButton';
import { SecurityInfo } from '../SecurityInfo';
import { UpdateBanner } from '../UpdateBanner';
import { UpdateReadyBanner, UpdateErrorBanner } from '../update';
import { OfflineIndicator } from '../OfflineIndicator';
import { WhatsNewModal } from '../WhatsNewModal';
import { VersionIndicator } from '../VersionIndicator';
import { NoticeBanner } from '../ui/NoticeBanner';
import { SecurityAlertBanner } from '../SecurityAlertBanner';
import { LeftToBudgetBadge } from '../LeftToBudgetBadge';
import { useDashboardQuery, useSyncMutation } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, isRateLimitError } from '../../utils';
import { isDesktopMode } from '../../utils/apiBase';
import { AppIcon, TourController } from '../wizards/WizardComponents';
import { useMacOSElectron, useRecurringTour } from '../../hooks';

export function AppShell() {
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const location = useLocation();
  const { lock } = useAuth();
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useDashboardQuery();
  const syncMutation = useSyncMutation();
  const isMacOSElectron = useMacOSElectron();

  // Get recurring tour steps and state
  const {
    steps: recurringTourSteps,
    hasSeenTour,
    markAsSeen,
    hasTourSteps,
  } = useRecurringTour(data);

  // Demo-aware path prefix
  const pathPrefix = isDemo ? '/demo' : '';

  // Check if current route has a tour available
  const hasTour = location.pathname === '/recurring' || location.pathname === '/demo/recurring';

  // Auto-start tour on first visit to recurring page
  useEffect(() => {
    if (hasTour && hasTourSteps && !hasSeenTour) {
      const timer = setTimeout(() => setShowTour(true), 500);
      return () => clearTimeout(timer);
    }
  }, [hasTour, hasTourSteps, hasSeenTour]);

  // Handle tour close - mark as seen
  const handleTourClose = () => {
    setShowTour(false);
    if (hasTour) {
      markAsSeen();
    }
  };

  const handleLock = () => {
    lock();
  };

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync();
    } catch (err) {
      if (isRateLimitError(err)) {
        toast.error(err.message);
      } else {
        toast.error(getErrorMessage(err));
      }
    }
  };

  // Loading state
  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--monarch-bg-page)' }} role="status" aria-live="polite">
        <div style={{ color: 'var(--monarch-text-muted)' }}>
          <span className="sr-only">Loading application</span>
          Loading...
        </div>
      </div>
    );
  }

  // Error state (no cached data)
  if (error) {
    const errorMessage = getErrorMessage(error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--monarch-bg-page)' }} role="alert">
        <div className="rounded-lg shadow-lg max-w-md w-full p-6 text-center" style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}>
          <div className="mb-4" style={{ color: 'var(--monarch-error)' }}>{errorMessage}</div>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-4 py-2 text-white rounded-lg transition-colors hover-bg-orange-to-orange-hover"
            style={{ backgroundColor: 'var(--monarch-orange)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <TourProvider
      steps={recurringTourSteps}
      styles={appTourStyles}
      onClickMask={handleTourClose}
      onClickClose={handleTourClose}
      afterOpen={() => {
        document.documentElement.style.overflow = 'hidden';
      }}
      beforeClose={() => {
        document.documentElement.style.overflow = '';
      }}
    >
      <TourController isOpen={showTour} onClose={handleTourClose} />
      <div className="app-layout" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        {/* Skip to main content link for keyboard users */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* App Header */}
        <header className="app-header" role="banner">
          <div
            className="app-header-content relative"
            style={isDesktop ? { justifyContent: 'center', paddingLeft: isMacOSElectron ? '80px' : undefined } : undefined}
          >
            {/* Logo/brand - hidden on desktop app (shown in sidebar instead) */}
            {!isDesktop && (
              <div className="app-brand">
                <Link to={isDemo ? '/' : `${pathPrefix}/`} className="flex items-center gap-2" style={{ textDecoration: 'none' }} aria-label="Eclosion - Go to home" onClick={() => isDemo && window.scrollTo(0, 0)}>
                  <AppIcon size={32} />
                  <h1 className="app-title hidden sm:block" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600 }}>
                    Eclosion
                  </h1>
                </Link>
                {/* Demo mode: show slogan; Non-demo: show version in slogan position */}
                {isDemo ? (
                  <span className="app-slogan hidden lg:block" style={{ color: 'var(--monarch-text-muted)', fontSize: '14px', fontStyle: 'italic', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--monarch-border)' }} aria-hidden="true">
                    Your budgeting, evolved.
                  </span>
                ) : (
                  <div className="hidden md:block" style={{ marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--monarch-border)' }}>
                    <VersionIndicator />
                  </div>
                )}
              </div>
            )}
            <LeftToBudgetBadge data={data.ready_to_assign} />
            <div
              className="app-header-actions"
              role="group"
              aria-label="Header actions"
              style={isDesktop ? { position: 'absolute', right: '1rem' } : undefined}
            >
              <SyncButton
                onSync={handleSync}
                isSyncing={syncMutation.isPending}
                lastSync={data.last_sync}
                compact
              />
              {/* Hide security info button on desktop - only relevant for web deployments */}
              {!isDesktop && (
                <button
                  type="button"
                  onClick={() => setShowSecurityInfo(true)}
                  className="app-header-btn hidden sm:flex"
                  style={{ color: 'var(--monarch-text-muted)' }}
                  aria-label="View security information"
                >
                  <ShieldCheck className="app-header-icon" aria-hidden="true" />
                </button>
              )}
              <HelpDropdown hasTour={hasTour} onStartTour={() => setShowTour(true)} />
            </div>
          </div>
        </header>

        {/* Update notification banners - below header to avoid traffic light overlap */}
        <UpdateBanner />
        <UpdateReadyBanner />
        <UpdateErrorBanner />
        <OfflineIndicator />

        <SecurityInfo
          isOpen={showSecurityInfo}
          onClose={() => setShowSecurityInfo(false)}
        />

        {/* What's New modal - shows on first open after upgrade */}
        <WhatsNewModal />

        {/* Main Layout: Sidebar + Content + Stats */}
        <div className="app-body">
          {/* Left Sidebar Navigation */}
          <SidebarNavigation onLock={handleLock} />

          {/* Main content wrapper */}
          <div className="app-content-wrapper">
            {/* Security Alert Banner - shown if failed login attempts detected (hidden on desktop) */}
            {!isDesktop && <SecurityAlertBanner />}

            {/* Notices - announced to screen readers */}
            {data.notices && data.notices.length > 0 && (
              <section className="px-4 pt-2" aria-label="Notifications">
                {data.notices.map((notice) => (
                  <NoticeBanner
                    key={notice.id}
                    notice={notice}
                    onDismiss={() => refetch()}
                  />
                ))}
              </section>
            )}

            {/* Main content area - renders the active tab */}
            <main id="main-content" className="app-main" role="main" aria-label="Main content">
              <Outlet />
            </main>
          </div>
        </div>

        {/* Footer */}
        <footer className="app-footer" role="contentinfo">
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            <a
              href="https://github.com/graysoncadams/eclosion-for-monarch"
              target="_blank"
              rel="noopener noreferrer"
              className="app-footer-link"
              style={{ color: 'var(--monarch-text-muted)' }}
              aria-label="View source code on GitHub (opens in new tab)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <span style={{ color: 'var(--monarch-border)' }}>•</span>
            <span>
              Logo by{' '}
              <a
                href="https://thenounproject.com/rosa991/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Rosa Lia
              </a>
              {' '}from{' '}
              <a
                href="https://thenounproject.com/icon/butterfly-7666562/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Noun Project
              </a>
            </span>
          </div>
          {/* Version indicator - desktop app only, bottom right */}
          {isDesktop && (
            <div className="ml-auto">
              <VersionIndicator />
            </div>
          )}
        </footer>
      </div>
    </TourProvider>
  );
}
