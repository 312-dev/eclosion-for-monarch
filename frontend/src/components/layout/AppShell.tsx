/**
 * App Shell
 *
 * Main layout component providing:
 * - App header with branding, help, and sign out
 * - Vertical sidebar navigation
 * - Outlet for routed tab content
 * - Tutorial walkthrough system
 * - Footer with GitHub link
 */

import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { TourProvider } from '@reactour/tour';
import { HelpCircle, ShieldCheck, BookOpen, FileText, ChevronDown } from 'lucide-react';
import { SidebarNavigation } from './SidebarNavigation';
import { SyncButton } from '../SyncButton';
import { SecurityInfo } from '../SecurityInfo';
import { UpdateBanner } from '../UpdateBanner';
import { VersionIndicator } from '../VersionIndicator';
import { NoticeBanner } from '../ui/NoticeBanner';
import { SecurityAlertBanner } from '../SecurityAlertBanner';
import { LeftToBudgetBadge } from '../LeftToBudgetBadge';
import { useDashboardQuery, useSyncMutation } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, isRateLimitError, getDocsUrl } from '../../utils';
import { AppIcon, TourController } from '../wizards/WizardComponents';

// Vite injects app version at build time
declare const __APP_VERSION__: string;

// Tour steps for the main app
const TOUR_STEPS = [
  {
    selector: '[data-tour="rollup-zone"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Rollup Zone
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)' }}>
          Your combined recurring expenses. Items here share a single category in Monarch for simplified budgeting.
        </p>
      </div>
    ),
    position: 'bottom' as const,
  },
  {
    selector: '[data-tour="recurring-list"]',
    content: () => (
      <div>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--monarch-text-dark)' }}>
          Individual Items
        </div>
        <p style={{ fontSize: '14px', color: 'var(--monarch-text-muted)' }}>
          Recurring expenses tracked individually. Each has its own category in Monarch.
        </p>
      </div>
    ),
    position: 'top' as const,
  },
];

// Tour styling to match app theme
const tourStyles = {
  popover: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-bg-card)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--monarch-border)',
    padding: '16px',
    maxWidth: '300px',
  }),
  maskArea: (base: object) => ({
    ...base,
    rx: 8,
  }),
  badge: (base: object) => ({
    ...base,
    backgroundColor: 'var(--monarch-orange)',
  }),
  controls: (base: object) => ({
    ...base,
    marginTop: '12px',
  }),
  close: (base: object) => ({
    ...base,
    color: 'var(--monarch-text-muted)',
    width: '12px',
    height: '12px',
    top: '12px',
    right: '12px',
  }),
};

export function AppShell() {
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showHelpDropdown, setShowHelpDropdown] = useState(false);
  const helpDropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const { logout } = useAuth();
  const isDemo = useDemo();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useDashboardQuery();
  const syncMutation = useSyncMutation();

  // Demo-aware path prefix
  const pathPrefix = isDemo ? '/demo' : '';

  // Check if current route has a tour available
  const hasTour = location.pathname === '/recurring' || location.pathname === '/demo/recurring';

  // Close help dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpDropdownRef.current && !helpDropdownRef.current.contains(event.target as Node)) {
        setShowHelpDropdown(false);
      }
    }
    if (showHelpDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHelpDropdown]);

  const handleHelpClick = () => {
    if (hasTour) {
      // On recurring page, open the tour directly
      setShowTour(true);
    } else {
      // On other pages, show the dropdown
      setShowHelpDropdown(!showHelpDropdown);
    }
  };

  // Build versioned docs URL (environment-aware: beta -> beta.eclosion.app)
  const userGuideUrl = getDocsUrl(__APP_VERSION__);
  const wikiUrl = 'https://github.com/GraysonCAdams/eclosion-for-monarch/wiki';

  const handleHelpOption = (url: string) => {
    setShowHelpDropdown(false);
    window.open(url, '_blank');
  };

  const handleSignOut = async () => {
    await logout();
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
      steps={TOUR_STEPS}
      styles={tourStyles}
      onClickMask={() => setShowTour(false)}
      onClickClose={() => setShowTour(false)}
    >
      <TourController isOpen={showTour} onClose={() => setShowTour(false)} />
      <div className="app-layout" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        {/* Update notification banner */}
        <UpdateBanner />

        {/* Skip to main content link for keyboard users */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        {/* App Header */}
        <header className="app-header" role="banner">
          <div className="app-header-content relative">
            <div className="app-brand">
              <Link to={`${pathPrefix}/`} className="flex items-center gap-2" style={{ textDecoration: 'none' }} aria-label="Eclosion - Go to home">
                <AppIcon size={32} />
                <h1 className="app-title hidden sm:block" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600 }}>
                  Eclosion
                </h1>
              </Link>
              <span className="app-slogan hidden lg:block" style={{ color: 'var(--monarch-text-muted)', fontSize: '14px', fontStyle: 'italic', marginLeft: '12px', paddingLeft: '12px', borderLeft: '1px solid var(--monarch-border)' }} aria-hidden="true">
                Your budgeting, evolved.
              </span>
              <div className="hidden md:block">
                <VersionIndicator />
              </div>
            </div>
            <LeftToBudgetBadge data={data.ready_to_assign} />
            <div className="app-header-actions" role="group" aria-label="Header actions">
              <SyncButton
                onSync={handleSync}
                isSyncing={syncMutation.isPending}
                lastSync={data.last_sync}
                compact
              />
              <button
                type="button"
                onClick={() => setShowSecurityInfo(true)}
                className="app-header-btn hidden sm:flex"
                style={{ color: 'var(--monarch-text-muted)' }}
                aria-label="View security information"
              >
                <ShieldCheck className="app-header-icon" aria-hidden="true" />
              </button>
              <div className="relative hidden sm:block" ref={helpDropdownRef}>
                <button
                  type="button"
                  onClick={handleHelpClick}
                  className="app-header-btn flex items-center gap-1"
                  style={{ color: 'var(--monarch-text-muted)' }}
                  aria-label={hasTour ? 'Show tutorial' : 'Get help'}
                  aria-expanded={showHelpDropdown}
                  aria-haspopup={!hasTour}
                >
                  <HelpCircle className="app-header-icon" aria-hidden="true" />
                  {!hasTour && <ChevronDown className="h-3 w-3" aria-hidden="true" />}
                </button>
                {showHelpDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-50"
                    style={{
                      backgroundColor: 'var(--monarch-bg-card)',
                      border: '1px solid var(--monarch-border)',
                    }}
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <button
                      type="button"
                      onClick={() => handleHelpOption(userGuideUrl)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--monarch-bg-page)]"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      role="menuitem"
                    >
                      <BookOpen className="h-4 w-4" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true" />
                      User Guide
                    </button>
                    <button
                      type="button"
                      onClick={() => handleHelpOption(wikiUrl)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--monarch-bg-page)]"
                      style={{ color: 'var(--monarch-text-dark)' }}
                      role="menuitem"
                    >
                      <FileText className="h-4 w-4" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true" />
                      Self-Hosting
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <SecurityInfo
          isOpen={showSecurityInfo}
          onClose={() => setShowSecurityInfo(false)}
        />

        {/* Main Layout: Sidebar + Content + Stats */}
        <div className="app-body">
          {/* Left Sidebar Navigation */}
          <SidebarNavigation onSignOut={handleSignOut} />

          {/* Main content wrapper */}
          <div className="app-content-wrapper">
            {/* Security Alert Banner - shown if failed login attempts detected */}
            <SecurityAlertBanner />

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
        </footer>
      </div>
    </TourProvider>
  );
}
