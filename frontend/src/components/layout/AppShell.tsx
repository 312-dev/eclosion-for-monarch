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
import { Outlet } from 'react-router-dom';
import { TourProvider } from '@reactour/tour';
import { SidebarNavigation } from './SidebarNavigation';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { appTourStyles } from './appShellTour';
import { SecurityInfo } from '../SecurityInfo';
import { WhatsNewModal } from '../WhatsNewModal';
import { NoticeBanner } from '../ui/NoticeBanner';
import { SecurityAlertBanner } from '../SecurityAlertBanner';
import {
  useDashboardQuery,
  useStashQuery,
  useStashConfigQuery,
  usePendingCountQuery,
  useAutoSyncStatusQuery,
  useMonarchGoalsQuery,
} from '../../api/queries';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage, isRateLimitError } from '../../utils';
import { isDesktopMode } from '../../utils/apiBase';
import { TourController } from '../wizards/WizardComponents';
import {
  useMacOSElectron,
  useWindowsElectron,
  useAppTour,
  useAutoSyncVisibility,
  usePageSync,
  useCurrentPage,
  useBackgroundPoller,
} from '../../hooks';

export function AppShell() {
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  const { lock } = useAuth();
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDashboardQuery();
  const isMacOSElectron = useMacOSElectron();

  // Page-aware sync - only syncs data relevant to current page
  const currentPage = useCurrentPage();
  const { sync: pageSync, isSyncing: isPageSyncing } = usePageSync(currentPage);

  // Background polling - keeps data fresh while app is visible
  useBackgroundPoller();
  const isWindowsElectron = useWindowsElectron();

  // Stash data for tour (lightweight queries)
  const { data: stashData } = useStashQuery();
  const { data: stashConfig } = useStashConfigQuery();
  const { data: pendingCount = 0 } = usePendingCountQuery();
  const { data: monarchGoals = [] } = useMonarchGoalsQuery();

  // Auto-sync visibility management (5 min foreground, 60 min background)
  const { data: autoSyncStatus } = useAutoSyncStatusQuery();
  useAutoSyncVisibility(autoSyncStatus?.enabled ?? false);

  // Use the app tour hook for all tour-related logic
  const { showTour, setShowTour, currentTourSteps, tourKey, hasTour, handleTourClose, pathPrefix } =
    useAppTour({
      dashboardData: data,
      stashItemCount: stashData?.items?.length ?? 0,
      pendingCount,
      isBrowserConfigured: !!stashConfig?.selectedBrowser,
      isDesktop,
      hasMonarchGoalsEnabled: stashConfig?.showMonarchGoals ?? false,
      monarchGoalCount: monarchGoals.filter((g) => !g.isCompleted).length,
    });

  // Track if we've already notified the tray (only notify once on initial load)
  const hasNotifiedTray = useRef(false);

  // Sync tray menu with dashboard last_sync on initial load (desktop only)
  useEffect(() => {
    if (
      !hasNotifiedTray.current &&
      !isDemo &&
      data?.last_sync &&
      globalThis.electron?.pendingSync?.notifyCompleted
    ) {
      hasNotifiedTray.current = true;
      globalThis.electron.pendingSync.notifyCompleted(data.last_sync).catch(() => {});
    }
  }, [isDemo, data?.last_sync]);

  // Expand window to full size and activate full menu when main app loads (desktop only)
  useEffect(() => {
    if (isDesktop && data) {
      globalThis.electron?.windowMode?.setMode('full').catch(() => {});
      globalThis.electron?.menu?.setFull().catch(() => {});
    }
  }, [isDesktop, data]);

  const handleLock = () => lock();

  const handleSync = async () => {
    try {
      await pageSync();
    } catch (err) {
      toast.error(isRateLimitError(err) ? err.message : getErrorMessage(err));
    }
  };

  // Error state (no cached data)
  if (error && !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
        role="alert"
      >
        <div
          className="rounded-lg shadow-lg max-w-md w-full p-6 text-center"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <div className="mb-4" style={{ color: 'var(--monarch-error)' }}>
            {getErrorMessage(error)}
          </div>
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
        style={
          {
            backgroundColor: 'var(--monarch-bg-page)',
            '--header-height': '48px',
          } as React.CSSProperties
        }
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <AppHeader
          isDemo={isDemo}
          isMacOSElectron={isMacOSElectron}
          isWindowsElectron={isWindowsElectron}
          pathPrefix={pathPrefix}
          isSyncing={isPageSyncing}
          isFetching={isFetching}
          hasTour={hasTour}
          onSync={handleSync}
          onStartTour={() => setShowTour(true)}
        />

        <SecurityInfo isOpen={showSecurityInfo} onClose={() => setShowSecurityInfo(false)} />
        <WhatsNewModal />
        <div className="app-scroll-area">
          <div className="app-body">
            <SidebarNavigation onLock={handleLock} />
            <div className="app-content-wrapper">
              {!isDesktop && <SecurityAlertBanner />}
              {data?.notices && data.notices.length > 0 && (
                <section className="px-4 pt-6" aria-label="Notifications">
                  {data.notices.map((notice) => (
                    <NoticeBanner key={notice.id} notice={notice} onDismiss={() => refetch()} />
                  ))}
                </section>
              )}
              <main id="main-content" className="app-main" role="main" aria-label="Main content">
                <Outlet />
              </main>
            </div>
          </div>
        </div>

        <AppFooter isDesktop={isDesktop} onShowSecurityInfo={() => setShowSecurityInfo(true)} />
      </div>
    </TourProvider>
  );
}
