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

import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TourProvider } from '@reactour/tour';
import { SidebarNavigation } from './SidebarNavigation';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { appTourStyles } from './appShellTour';
import { SecurityInfo } from '../SecurityInfo';
import { UpdateBanner } from '../UpdateBanner';
import { UpdateReadyBanner, UpdateErrorBanner, DownloadProgressBanner } from '../update';
import { OfflineIndicator } from '../OfflineIndicator';
import { RateLimitBanner } from '../ui/RateLimitBanner';
import { WhatsNewModal } from '../WhatsNewModal';
import { NoticeBanner } from '../ui/NoticeBanner';
import { SecurityAlertBanner } from '../SecurityAlertBanner';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import { useDashboardQuery, useSyncMutation } from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, isRateLimitError } from '../../utils';
import { isDesktopMode } from '../../utils/apiBase';
import { TourController } from '../wizards/WizardComponents';
import { useMacOSElectron, useRecurringTour, useNotesTour } from '../../hooks';

export function AppShell() {
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const location = useLocation();
  const { lock } = useAuth();
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();
  const toast = useToast();
  const { data, isLoading, isFetching, error, refetch } = useDashboardQuery();
  const syncMutation = useSyncMutation();
  const isMacOSElectron = useMacOSElectron();

  // Get recurring tour steps and state
  const {
    steps: recurringTourSteps,
    hasSeenTour: hasSeenRecurringTour,
    markAsSeen: markRecurringTourSeen,
    hasTourSteps: hasRecurringTourSteps,
  } = useRecurringTour(data);

  // Get notes tour steps and state
  const {
    steps: notesTourSteps,
    hasSeenTour: hasSeenNotesTour,
    markAsSeen: markNotesTourSeen,
    hasTourSteps: hasNotesTourSteps,
  } = useNotesTour();

  // Demo-aware path prefix
  const pathPrefix = isDemo ? '/demo' : '';

  // Check which tour is available for current route
  const isRecurringPage = location.pathname === '/recurring' || location.pathname === '/demo/recurring';
  const isNotesPage = location.pathname === '/notes' || location.pathname === '/demo/notes';
  const hasTour = isRecurringPage || isNotesPage;

  // Check if recurring is configured (setup wizard completed)
  const isRecurringConfigured = data?.config.target_group_id != null;

  // Get the correct tour state based on current page
  const currentTourSteps = isNotesPage ? notesTourSteps : recurringTourSteps;
  const hasSeenCurrentTour = isNotesPage ? hasSeenNotesTour : hasSeenRecurringTour;
  const hasCurrentTourSteps = isNotesPage ? hasNotesTourSteps : hasRecurringTourSteps;

  // Auto-start tour on first visit to a page with a tour
  useEffect(() => {
    // Don't start recurring tour if setup wizard is still showing
    if (isRecurringPage && !isRecurringConfigured) return;

    if (hasTour && hasCurrentTourSteps && !hasSeenCurrentTour) {
      // Get the first step's selector to wait for it to exist
      const firstStepSelector = currentTourSteps[0]?.selector;
      if (!firstStepSelector) return;

      // Poll for the target element to exist before starting tour
      // This handles cases where the element hasn't rendered yet (e.g., first login in Electron)
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max wait
      const pollInterval = 100;

      const checkElement = () => {
        attempts++;
        const element = document.querySelector(firstStepSelector);
        if (element) {
          setShowTour(true);
        } else if (attempts < maxAttempts) {
          timerId = setTimeout(checkElement, pollInterval);
        }
      };

      let timerId = setTimeout(checkElement, pollInterval);
      return () => clearTimeout(timerId);
    }
  }, [hasTour, hasCurrentTourSteps, hasSeenCurrentTour, isRecurringPage, isNotesPage, isRecurringConfigured, currentTourSteps]);

  // Track if we've already notified the tray (only notify once on initial load)
  const hasNotifiedTray = useRef(false);

  // Sync tray menu with dashboard last_sync on initial load (desktop only)
  // Only runs once when data first loads to avoid excessive tray menu rebuilds
  useEffect(() => {
    if (!hasNotifiedTray.current && !isDemo && data?.last_sync && globalThis.electron?.pendingSync?.notifyCompleted) {
      hasNotifiedTray.current = true;
      globalThis.electron.pendingSync.notifyCompleted(data.last_sync).catch(() => {
        // Ignore errors - this is just for tray menu updates
      });
    }
  }, [isDemo, data?.last_sync]);

  // Expand window to full size when main app loads (desktop only)
  // The app starts in compact mode for loading/login screens, then expands here
  useEffect(() => {
    if (isDesktop && data && globalThis.electron?.windowMode?.setMode) {
      globalThis.electron.windowMode.setMode('full').catch(() => {
        // Ignore errors - window mode is a UX enhancement, not critical
      });
    }
  }, [isDesktop, data]);


  // Handle tour close - mark as seen
  const handleTourClose = () => {
    setShowTour(false);
    if (isNotesPage) {
      markNotesTourSeen();
    } else if (isRecurringPage) {
      markRecurringTourSeen();
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
        <PageLoadingSpinner />
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

  // Key to force TourProvider remount when switching between tour types
  const tourKey = isNotesPage ? 'notes-tour' : 'recurring-tour';

  return (
    <TourProvider
      key={tourKey}
      steps={currentTourSteps}
      styles={appTourStyles}
      padding={{ mask: 8, popover: [16, 16] }}
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
      <div
        className="app-layout"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          // Increase header height on macOS Electron to account for traffic lights
          ...(isMacOSElectron && { '--header-height': '73px' } as React.CSSProperties),
        }}
      >
        {/* Skip to main content link for keyboard users */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <AppHeader
          isDemo={isDemo}
          isDesktop={isDesktop}
          isMacOSElectron={isMacOSElectron}
          pathPrefix={pathPrefix}
          readyToAssign={data.ready_to_assign}
          lastSync={data.last_sync}
          isSyncing={syncMutation.isPending}
          isFetching={isFetching}
          hasTour={hasTour}
          onSync={handleSync}
          onStartTour={() => setShowTour(true)}
        />

        {/* Update notification banners - sticky below header for visibility on all pages */}
        <div className="app-notification-banners">
          <UpdateBanner />
          <DownloadProgressBanner />
          <UpdateReadyBanner />
          <UpdateErrorBanner />
          <RateLimitBanner />
          <OfflineIndicator />
        </div>

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
              <section className="px-4 pt-6" aria-label="Notifications">
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

        <AppFooter isDesktop={isDesktop} onShowSecurityInfo={() => setShowSecurityInfo(true)} />
      </div>
    </TourProvider>
  );
}
