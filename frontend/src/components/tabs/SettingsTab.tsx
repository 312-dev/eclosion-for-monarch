/**
 * Settings Tab
 *
 * General application settings including appearance, tool settings,
 * syncing, updates, account, security, data management, and danger zone.
 *
 * Section rendering is driven by SETTINGS_SECTIONS from settingsSections.tsx.
 * Each section has a renderer in SECTION_RENDERERS below.
 */

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { DashboardData, AutoSyncStatus, VersionInfo } from '../../types';
import { useDemo } from '../../context/DemoContext';
import { usePageTitle, useApiClient, useTunnelStatus } from '../../hooks';
import { isDesktopMode } from '../../utils/apiBase';
import { scrollToElement } from '../../utils';
import { UI } from '../../constants';
import * as api from '../../api/client';
import {
  AppearanceSettings,
  RecurringToolSettings,
  NotesToolCard,
  StashToolSettings,
  SyncingSection,
  UpdatesSection,
  DesktopSection,
  LogViewerSection,
  AccountSection,
  SecuritySection,
  DemoModeSection,
  DataManagementSection,
  DangerZoneSection,
  DeveloperSection,
  SettingsHeader,
  RemoteAccessSection,
  IftttSection,
  SettingsModals,
  SectionHeader,
  getVisibleSections,
  type SectionId,
} from '../settings';
import {
  useUpdateStashConfigMutation,
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
  const { status: tunnelStatus } = useTunnelStatus();
  const isRemoteActive = isDesktop && tunnelStatus?.active;
  const recurringSettingsRef = useRef<HTMLDivElement>(null);
  const notesSettingsRef = useRef<HTMLDivElement>(null);
  const stashSettingsRef = useRef<HTMLDivElement>(null);
  const remoteAccessRef = useRef<HTMLDivElement>(null);
  const client = useApiClient();
  const updateStashConfig = useUpdateStashConfigMutation();
  const clearUnconvertedBookmarks = useClearUnconvertedBookmarksMutation();
  const location = useLocation();

  const initialHash = useMemo(() => location.hash, [location.hash]);
  const expandedTool = useMemo(() => {
    if (initialHash === '#recurring') return 'recurring';
    if (initialHash === '#notes') return 'notes';
    if (initialHash === '#stash') return 'stash';
    return null;
  }, [initialHash]);
  const scrollToRemoteAccess = initialHash === '#remote-access';

  usePageTitle('Settings', dashboardData?.config.user_first_name);

  useEffect(() => {
    fetchDashboardData();
    fetchAutoSyncStatus();
    fetchVersionInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial mount only
  }, []);

  useEffect(() => {
    if (expandedTool) {
      setTimeout(() => {
        const refMap = {
          recurring: recurringSettingsRef,
          notes: notesSettingsRef,
          stash: stashSettingsRef,
        };
        scrollToElement(refMap[expandedTool].current, { behavior: 'smooth' });
      }, UI.SCROLL.AFTER_MOUNT);
    }
  }, [expandedTool]);

  // Handle scrolling to remote access section when navigating with #remote-access hash
  useEffect(() => {
    if (scrollToRemoteAccess && isDesktop) {
      setTimeout(() => {
        scrollToElement(remoteAccessRef.current, { behavior: 'smooth' });
      }, UI.SCROLL.AFTER_MOUNT);
    }
  }, [scrollToRemoteAccess, isDesktop]);

  const fetchVersionInfo = async () => {
    try {
      setVersionInfo(await client.getVersion());
    } catch (err) {
      console.error('Failed to fetch version info:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardData(await client.getDashboard());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      toast.error('Failed to load some settings. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoSyncStatus = async () => {
    try {
      setAutoSyncStatus(await client.getAutoSyncStatus());
    } catch (err) {
      console.error('Failed to fetch auto-sync status:', err);
    }
  };

  const handleEnableAutoSync = async (intervalMinutes: number, passphrase: string) => {
    if (isDemo) return;
    const result = await api.enableAutoSync(intervalMinutes, passphrase, true);
    if (!result.success) throw new Error(result.error || 'Failed to enable auto-sync');
  };

  const handleDisableAutoSync = async () => {
    if (isDemo) return;
    const result = await api.disableAutoSync();
    if (!result.success) throw new Error(result.error || 'Failed to disable auto-sync');
  };

  const resetStashConfig = {
    isConfigured: false,
    selectedBrowser: null,
    selectedFolderIds: [],
    selectedFolderNames: [],
  };

  const handleChangeBookmarkSource = async () => {
    try {
      await clearUnconvertedBookmarks.mutateAsync();
      await updateStashConfig.mutateAsync(resetStashConfig);
      setShowBookmarkSetupModal(true);
    } catch {
      toast.error('Failed to reset bookmark source');
    }
  };

  const handleUnlinkBookmarks = async () => {
    try {
      await clearUnconvertedBookmarks.mutateAsync();
      await updateStashConfig.mutateAsync(resetStashConfig);
      toast.success('Bookmark sync unlinked');
    } catch {
      toast.error('Failed to unlink bookmark sync');
    }
  };

  const dedicatedItems =
    dashboardData?.items.filter(
      (item) => item.is_enabled && !item.is_in_rollup && item.category_id
    ) || [];
  const rollupItems = dashboardData?.rollup?.items || [];
  const totalCategories = dedicatedItems.length + (dashboardData?.rollup?.category_id ? 1 : 0);
  const totalItems = dedicatedItems.length + rollupItems.length;

  // Get visible sections based on current context
  // This ensures sidebar navigation and settings page stay in sync
  const visibleSections = getVisibleSections(isDemo, isDesktop, isRemoteActive ?? false);

  /**
   * Renders a section by ID. The order and visibility are determined by SETTINGS_SECTIONS.
   * When adding a new section, add it to SETTINGS_SECTIONS in settingsSections.tsx
   * and add a case here.
   */
  function renderSection(sectionId: SectionId): ReactNode {
    switch (sectionId) {
      case 'demo':
        return <DemoModeSection />;

      case 'appearance':
        return <AppearanceSettings />;

      case 'connectivity':
        return (
          <section id="connectivity" className="mb-8" ref={remoteAccessRef}>
            <SectionHeader sectionId="connectivity" />
            <div className="flex flex-col gap-4">
              <div id="remote-access">
                <RemoteAccessSection />
              </div>
              <div id="ifttt">
                <IftttSection />
              </div>
            </div>
          </section>
        );

      case 'tool-settings':
        return (
          <section id="tool-settings" className="mb-8">
            <SectionHeader sectionId="tool-settings" />
            <div className="flex flex-col gap-4">
              <RecurringToolSettings
                ref={recurringSettingsRef}
                dashboardData={dashboardData}
                loading={loading}
                onRefreshDashboard={fetchDashboardData}
                onShowResetModal={() => setShowRecurringResetModal(true)}
                defaultExpanded={expandedTool === 'recurring'}
              />
              <NotesToolCard ref={notesSettingsRef} defaultExpanded={expandedTool === 'notes'} />
              <StashToolSettings
                ref={stashSettingsRef}
                defaultExpanded={expandedTool === 'stash'}
                onSetupBookmarkSync={isDesktop ? () => setShowBookmarkSetupModal(true) : undefined}
                onChangeBookmarkSource={isDesktop ? handleChangeBookmarkSource : undefined}
                onUnlinkBookmarks={isDesktop ? handleUnlinkBookmarks : undefined}
              />
            </div>
          </section>
        );

      case 'account':
        return <AccountSection />;

      case 'updates':
        return (
          <UpdatesSection
            versionInfo={versionInfo}
            onShowUpdateModal={() => setShowUpdateModal(true)}
          />
        );

      case 'syncing':
        return (
          <SyncingSection
            status={autoSyncStatus}
            onEnable={handleEnableAutoSync}
            onDisable={handleDisableAutoSync}
            onRefresh={fetchAutoSyncStatus}
          />
        );

      case 'desktop':
        return <DesktopSection />;

      case 'security':
        return <SecuritySection />;

      case 'data':
        return <DataManagementSection onShowImportModal={() => setShowImportModal(true)} />;

      case 'logs':
        return (
          <>
            <LogViewerSection />
            <DeveloperSection />
          </>
        );

      case 'danger':
        return (
          <DangerZoneSection
            onShowResetModal={() => setShowResetModal(true)}
            onShowUninstallModal={() => setShowUninstallModal(true)}
          />
        );

      default:
        return null;
    }
  }

  // Sections that render their own id wrapper (have nested sub-sections)
  const selfWrappedSections = new Set<SectionId>(['connectivity', 'tool-settings']);

  return (
    <div className="settings-page" data-testid="settings-content">
      <div className="settings-content tab-content-enter">
        <SettingsHeader />
        {visibleSections.map((section) => {
          const content = renderSection(section.id);
          if (!content) return null;

          // Self-wrapped sections handle their own id attribute
          if (selfWrappedSections.has(section.id)) {
            return <div key={section.id}>{content}</div>;
          }

          // Standard sections get an id wrapper for scroll navigation
          return (
            <div key={section.id} id={section.id}>
              {content}
            </div>
          );
        })}
      </div>
      <SettingsModals
        showResetModal={showResetModal}
        showUninstallModal={showUninstallModal}
        showImportModal={showImportModal}
        showUpdateModal={showUpdateModal}
        showRecurringResetModal={showRecurringResetModal}
        showBookmarkSetupModal={showBookmarkSetupModal}
        totalCategories={totalCategories}
        totalItems={totalItems}
        onCloseResetModal={() => setShowResetModal(false)}
        onCloseUninstallModal={() => setShowUninstallModal(false)}
        onCloseImportModal={() => setShowImportModal(false)}
        onCloseUpdateModal={() => setShowUpdateModal(false)}
        onCloseRecurringResetModal={() => setShowRecurringResetModal(false)}
        onCloseBookmarkSetupModal={() => setShowBookmarkSetupModal(false)}
        onReset={() => {
          setShowResetModal(false);
          logout();
        }}
      />
    </div>
  );
}
