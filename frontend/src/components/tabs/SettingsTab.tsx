/**
 * Settings Tab
 *
 * General application settings including:
 * - Appearance (theme, landing page)
 * - Tool settings (recurring tool configuration)
 * - Syncing (auto-sync, background sync)
 * - Updates
 * - Account
 * - Security
 * - Data management
 * - Danger zone (reset, uninstall)
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { ResetAppModal } from '../ResetAppModal';
import { UninstallModal } from '../UninstallModal';
import { ImportSettingsModal } from '../ImportSettingsModal';
import { UpdateModal } from '../UpdateModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { DashboardData, AutoSyncStatus, VersionInfo } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { usePageTitle, useApiClient } from '../../hooks';
import { isDesktopMode } from '../../utils/apiBase';
import { UI } from '../../constants';
import * as api from '../../api/client';
import {
  AppearanceSettings,
  RecurringToolSettings,
  RecurringResetModal,
  NotesToolCard,
  WishlistToolSettings,
  SyncingSection,
  UpdatesSection,
  DesktopSection,
  LogViewerSection,
  AccountSection,
  SecuritySection,
  DemoModeSection,
  DataManagementSection,
  DangerZoneSection,
  CreditsSection,
  DeveloperSection,
} from '../settings';
import { BrowserBookmarksSetupWizard } from '../wizards/wishlist/BrowserBookmarksSetupWizard';
import {
  useUpdateWishlistConfigMutation,
  useClearUnconvertedBookmarksMutation,
} from '../../api/queries';

export function SettingsTab() {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRecurringResetModal, setShowRecurringResetModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showBookmarkSetupModal, setShowBookmarkSetupModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const toast = useToast();
  const isDemo = useDemo();
  const isDesktop = isDesktopMode();
  const recurringSettingsRef = useRef<HTMLDivElement>(null);
  const notesSettingsRef = useRef<HTMLDivElement>(null);
  const wishlistSettingsRef = useRef<HTMLDivElement>(null);
  const client = useApiClient();
  const updateWishlistConfig = useUpdateWishlistConfigMutation();
  const clearUnconvertedBookmarks = useClearUnconvertedBookmarksMutation();
  const location = useLocation();

  // Determine which tool settings should be auto-expanded based on URL hash
  const initialHash = useMemo(() => location.hash, [location.hash]);
  const expandedTool = useMemo(() => {
    if (initialHash === '#recurring') return 'recurring';
    if (initialHash === '#notes') return 'notes';
    if (initialHash === '#wishlist') return 'wishlist';
    return null;
  }, [initialHash]);

  usePageTitle('Settings', dashboardData?.config.user_first_name);

  useEffect(() => {
    fetchDashboardData();
    fetchAutoSyncStatus();
    fetchVersionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial mount only, functions are stable
  }, []);

  // Scroll to the specific tool settings card based on URL hash
  useEffect(() => {
    if (expandedTool) {
      setTimeout(() => {
        const refMap = {
          recurring: recurringSettingsRef,
          notes: notesSettingsRef,
          wishlist: wishlistSettingsRef,
        };
        refMap[expandedTool].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, UI.SCROLL.AFTER_MOUNT);
    }
  }, [expandedTool]);

  const fetchVersionInfo = async () => {
    try {
      const info = await client.getVersion();
      setVersionInfo(info);
    } catch (err) {
      console.error('Failed to fetch version info:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await client.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      toast.error('Failed to load some settings. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoSyncStatus = async () => {
    try {
      const status = await client.getAutoSyncStatus();
      setAutoSyncStatus(status);
    } catch (err) {
      console.error('Failed to fetch auto-sync status:', err);
    }
  };

  const handleEnableAutoSync = async (intervalMinutes: number, passphrase: string) => {
    if (isDemo) return;
    const result = await api.enableAutoSync(intervalMinutes, passphrase, true);
    if (!result.success) {
      throw new Error(result.error || 'Failed to enable auto-sync');
    }
  };

  const handleDisableAutoSync = async () => {
    if (isDemo) return;
    const result = await api.disableAutoSync();
    if (!result.success) {
      throw new Error(result.error || 'Failed to disable auto-sync');
    }
  };

  const handleChangeBookmarkSource = async () => {
    try {
      // First: Unlink - clear unconverted bookmarks and reset browser sync settings
      await clearUnconvertedBookmarks.mutateAsync();
      await updateWishlistConfig.mutateAsync({
        isConfigured: false,
        selectedBrowser: null,
        selectedFolderIds: [],
        selectedFolderNames: [],
      });
      // Second: Open the browser bookmark selection modal
      setShowBookmarkSetupModal(true);
    } catch {
      toast.error('Failed to reset bookmark source');
    }
  };

  const handleUnlinkBookmarks = async () => {
    try {
      // Clear all unconverted bookmarks and reset browser sync settings
      await clearUnconvertedBookmarks.mutateAsync();
      await updateWishlistConfig.mutateAsync({
        isConfigured: false,
        selectedBrowser: null,
        selectedFolderIds: [],
        selectedFolderNames: [],
      });
      toast.success('Bookmark sync unlinked');
    } catch {
      toast.error('Failed to unlink bookmark sync');
    }
  };

  const handleSetupBookmarkSync = () => {
    setShowBookmarkSetupModal(true);
  };

  // Calculate totals for the reset modal
  const dedicatedItems =
    dashboardData?.items.filter(
      (item) => item.is_enabled && !item.is_in_rollup && item.category_id
    ) || [];
  const rollupItems = dashboardData?.rollup?.items || [];
  const totalCategories = dedicatedItems.length + (dashboardData?.rollup?.category_id ? 1 : 0);
  const totalItems = dedicatedItems.length + rollupItems.length;

  return (
    <div className="settings-page" data-testid="settings-content">
      {/* Main settings content */}
      <div className="settings-content tab-content-enter">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="p-2.5 rounded-xl"
              style={{ backgroundColor: 'var(--monarch-orange-light)' }}
            >
              <Settings size={22} style={{ color: 'var(--monarch-orange)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
                Settings
              </h1>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Configure your Eclosion preferences
              </p>
            </div>
          </div>
        </div>

        {isDemo && (
          <div id="demo">
            <DemoModeSection />
          </div>
        )}

        {/* User-facing settings */}
        <div id="appearance">
          <AppearanceSettings />
        </div>

        <section id="tool-settings" className="mb-8">
          <h2
            className="text-xs font-semibold uppercase tracking-wider mb-3 px-1"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Tool Settings
          </h2>
          <div className="flex flex-col gap-4">
            <RecurringToolSettings
              ref={recurringSettingsRef}
              dashboardData={dashboardData}
              loading={loading}
              onRefreshDashboard={fetchDashboardData}
              onShowResetModal={() => setShowRecurringResetModal(true)}
              defaultExpanded={expandedTool === 'recurring'}
            />
            <NotesToolCard
              ref={notesSettingsRef}
              defaultExpanded={expandedTool === 'notes'}
            />
            <WishlistToolSettings
              ref={wishlistSettingsRef}
              defaultExpanded={expandedTool === 'wishlist'}
              onSetupBookmarkSync={isDesktop ? handleSetupBookmarkSync : undefined}
              onChangeBookmarkSource={isDesktop ? handleChangeBookmarkSource : undefined}
              onUnlinkBookmarks={isDesktop ? handleUnlinkBookmarks : undefined}
            />
          </div>
        </section>

        {isDesktop && (
          <div id="desktop">
            <DesktopSection />
          </div>
        )}

        <div id="account">
          <AccountSection />
        </div>

        <div id="updates">
          <UpdatesSection
            versionInfo={versionInfo}
            onShowUpdateModal={() => setShowUpdateModal(true)}
          />
        </div>

        <div id="credits">
          <CreditsSection />
        </div>

        {/* Technical settings */}
        <div id="syncing">
          <SyncingSection
            status={autoSyncStatus}
            onEnable={handleEnableAutoSync}
            onDisable={handleDisableAutoSync}
            onRefresh={fetchAutoSyncStatus}
          />
        </div>

        {/* Hide security events on desktop - only relevant for web deployments */}
        {!isDesktop && (
          <div id="security">
            <SecuritySection />
          </div>
        )}

        <div id="data">
          <DataManagementSection onShowImportModal={() => setShowImportModal(true)} />
        </div>

        {isDesktop && (
          <div id="logs">
            <LogViewerSection />
          </div>
        )}

        {isDesktop && (
          <div id="developer">
            <DeveloperSection />
          </div>
        )}

        <div id="danger">
          <DangerZoneSection
            onShowResetModal={() => setShowResetModal(true)}
            onShowUninstallModal={() => setShowUninstallModal(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <ResetAppModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={() => {
          setShowResetModal(false);
          logout();
        }}
      />
      <UninstallModal isOpen={showUninstallModal} onClose={() => setShowUninstallModal(false)} />
      <UpdateModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
      <ImportSettingsModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
      <RecurringResetModal
        isOpen={showRecurringResetModal}
        onClose={() => setShowRecurringResetModal(false)}
        totalCategories={totalCategories}
        totalItems={totalItems}
      />

      {/* Bookmark Setup Modal */}
      {showBookmarkSetupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        >
          <BrowserBookmarksSetupWizard
            onComplete={() => setShowBookmarkSetupModal(false)}
            onCancel={() => setShowBookmarkSetupModal(false)}
          />
        </div>
      )}
    </div>
  );
}
