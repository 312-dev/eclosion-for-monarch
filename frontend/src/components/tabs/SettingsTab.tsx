/**
 * Settings Tab
 *
 * General application settings including:
 * - Tool settings (reset entire tools)
 * - Danger zone (reset app, uninstall)
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Trash2, AlertTriangle, Repeat, Key, Database, ChevronRight, Clock, LogOut, Sun, Moon, Monitor, Home, Download, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ResetAppModal } from '../ResetAppModal';
import { UninstallModal } from '../UninstallModal';
import { AutoSyncSettings } from '../AutoSyncSettings';
import { SearchableSelect } from '../SearchableSelect';
import { UpdateModal } from '../UpdateModal';
import { VersionBadge } from '../VersionBadge';
import { useAuth } from '../../context/AuthContext';
import { useTheme, type Theme } from '../../context/ThemeContext';
import * as api from '../../api/client';
import * as demoApi from '../../api/demoClient';
import type { DashboardData, AutoSyncStatus, CategoryGroup, VersionInfo } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useDemo } from '../../context/DemoContext';
import { usePageTitle } from '../../hooks';
import { getLandingPage, setLandingPage } from '../../App';
import { RecurringIcon } from '../wizards/WizardComponents';
import { UI } from '../../constants';

type LandingPage = 'dashboard' | 'recurring';

export function SettingsTab() {
  const [showResetModal, setShowResetModal] = useState(false);
  const [showUninstallModal, setShowUninstallModal] = useState(false);
  const [showRecurringResetModal, setShowRecurringResetModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [resettingRecurring, setResettingRecurring] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDemo = useDemo();
  const queryClient = useQueryClient();

  // Landing page preference
  const [landingPage, setLandingPageState] = useState<LandingPage>(() => {
    const stored = getLandingPage();
    return stored === '/recurring' ? 'recurring' : 'dashboard';
  });

  const handleLandingPageChange = (page: LandingPage) => {
    setLandingPageState(page);
    setLandingPage(page);
  };

  // Theme options for the toggle
  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={16} /> },
    { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  // Landing page options for the toggle
  const landingPageOptions: { value: LandingPage; label: string; icon: React.ReactNode }[] = [
    { value: 'dashboard', label: 'Dashboard', icon: <Home size={16} /> },
    { value: 'recurring', label: 'Recurring', icon: <RecurringIcon size={16} /> },
  ];

  // Recurring tool configuration state
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingAutoTrack, setSavingAutoTrack] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [savingAutoUpdateTargets, setSavingAutoUpdateTargets] = useState(false);
  const recurringSettingsRef = useRef<HTMLElement>(null);

  // Set page title with user's first name
  usePageTitle('Settings', dashboardData?.config.user_first_name);

  useEffect(() => {
    fetchDashboardData();
    fetchAutoSyncStatus();
    fetchVersionInfo();

    // Check if we should scroll to recurring settings
    if (globalThis.location.hash === '#recurring') {
      setTimeout(() => {
        recurringSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, UI.SCROLL.AFTER_MOUNT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial mount only, functions are stable
  }, []);

  // Get the appropriate client based on demo mode
  const client = isDemo ? demoApi : api;

  const fetchVersionInfo = async () => {
    try {
      const info = await client.getVersion();
      setVersionInfo(info);
    } catch {
      // Non-critical if this fails
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await client.getDashboard();
      setDashboardData(data);
    } catch {
      // Non-critical if this fails
    } finally {
      setLoading(false);
    }
  };

  const fetchAutoSyncStatus = async () => {
    try {
      const status = await client.getAutoSyncStatus();
      setAutoSyncStatus(status);
    } catch {
      // Non-critical if this fails
    }
  };

  const handleEnableAutoSync = async (intervalMinutes: number, passphrase: string) => {
    if (isDemo) {
      // Auto-sync not available in demo mode
      return;
    }
    const result = await api.enableAutoSync(intervalMinutes, passphrase, true);
    if (!result.success) {
      throw new Error(result.error || 'Failed to enable auto-sync');
    }
  };

  const handleDisableAutoSync = async () => {
    if (isDemo) {
      // Auto-sync not available in demo mode
      return;
    }
    const result = await api.disableAutoSync();
    if (!result.success) {
      throw new Error(result.error || 'Failed to disable auto-sync');
    }
  };

  // Calculate recurring tool info
  const isConfigured = dashboardData?.config?.target_group_id != null;
  const dedicatedItems = dashboardData?.items.filter(
    item => item.is_enabled && !item.is_in_rollup && item.category_id
  ) || [];
  const rollupItems = dashboardData?.rollup?.items || [];
  const totalCategories = dedicatedItems.length + (dashboardData?.rollup?.category_id ? 1 : 0);
  const totalItems = dedicatedItems.length + rollupItems.length;
  const hasAnythingToReset = isConfigured || totalCategories > 0 || totalItems > 0;

  const handleRecurringReset = async () => {
    if (!resetConfirmed) return;

    setResettingRecurring(true);
    setResetError(null);
    try {
      if (isDemo) {
        // In demo mode, just reset demo data
        demoApi.resetDemoData();
        queryClient.invalidateQueries();
      } else {
        await api.resetRecurringTool();
      }
      // Reload page after reset
      globalThis.location.reload();
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to reset');
      setResettingRecurring(false);
    }
  };

  const handleCloseRecurringReset = () => {
    if (resettingRecurring) return;
    setShowRecurringResetModal(false);
    setResetConfirmed(false);
    setResetError(null);
  };

  // Fetch category groups for the dropdown
  const fetchCategoryGroups = async () => {
    setLoadingGroups(true);
    try {
      const groups = await client.getCategoryGroups();
      setCategoryGroups(groups);
    } catch {
      toast.error('Failed to load category groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  // Handle category group change
  const handleGroupChange = async (groupId: string) => {
    const group = categoryGroups.find(g => g.id === groupId);
    if (!group) return;

    setSavingGroup(true);
    try {
      await client.setConfig(group.id, group.name);
      await fetchDashboardData();
      toast.success(`Category group set to ${group.name}`);
    } catch {
      toast.error('Failed to update category group');
    } finally {
      setSavingGroup(false);
    }
  };

  // Handle auto-track toggle
  const handleAutoTrackChange = async () => {
    const newValue = !(dashboardData?.config.auto_sync_new ?? false);
    setSavingAutoTrack(true);
    try {
      await client.updateSettings({ auto_sync_new: newValue });
      await fetchDashboardData();
      toast.success(newValue ? 'Auto-track enabled' : 'Auto-track disabled');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingAutoTrack(false);
    }
  };

  // Handle threshold change
  const handleThresholdChange = async (value: number | null) => {
    setSavingThreshold(true);
    try {
      await client.updateSettings({ auto_track_threshold: value });
      await fetchDashboardData();
      toast.success('Threshold updated');
    } catch {
      toast.error('Failed to update threshold');
    } finally {
      setSavingThreshold(false);
    }
  };

  // Handle auto-update targets toggle
  const handleAutoUpdateTargetsChange = async () => {
    const newValue = !(dashboardData?.config.auto_update_targets ?? false);
    setSavingAutoUpdateTargets(true);
    try {
      await client.updateSettings({ auto_update_targets: newValue });
      await fetchDashboardData();
      toast.success(newValue ? 'Auto-update targets enabled' : 'Auto-update targets disabled');
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSavingAutoUpdateTargets(false);
    }
  };

  // Get category group options for the dropdown
  const getCategoryGroupOptions = () => {
    if (categoryGroups.length > 0) {
      return categoryGroups.map((group) => ({
        value: group.id,
        label: group.name,
      }));
    }
    if (dashboardData?.config.target_group_name) {
      return [{
        value: dashboardData.config.target_group_id || '',
        label: dashboardData.config.target_group_name,
      }];
    }
    return [];
  };

  return (
    <div className="max-w-2xl mx-auto">
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

      {/* Appearance Section */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--monarch-text-muted)' }}>
          Appearance
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Theme Setting */}
          <div className="p-4" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                  Theme
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  Choose your preferred color scheme
                </div>
              </div>

              {/* Segmented Control Toggle */}
              <div
                className="flex rounded-lg p-1"
                style={{ backgroundColor: 'var(--monarch-bg-page)' }}
              >
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                    style={{
                      backgroundColor: theme === option.value
                        ? 'var(--monarch-bg-card)'
                        : 'transparent',
                      color: theme === option.value
                        ? 'var(--monarch-orange)'
                        : 'var(--monarch-text-muted)',
                      boxShadow: theme === option.value
                        ? '0 1px 2px rgba(0, 0, 0, 0.05)'
                        : 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {option.icon}
                    <span className="hidden sm:inline">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Landing Page Setting */}
          <div className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                  Landing Page
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                  Choose where to go after login
                </div>
              </div>

              <SearchableSelect
                value={landingPage}
                onChange={(val) => handleLandingPageChange(val as LandingPage)}
                options={landingPageOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                searchable={false}
                className="min-w-32"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tool Settings Section */}
      <section ref={recurringSettingsRef} id="recurring" className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--monarch-text-muted)' }}>
          Tool Settings
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}
        >
          {loading ? (
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg skeleton" />
                <div className="flex-1">
                  <div className="h-4 w-24 rounded skeleton mb-2" />
                  <div className="h-3 w-32 rounded skeleton" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Recurring Tool Header */}
              <div className="p-4">
                {/* Top row with icon, content, and arrow */}
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className="p-2.5 rounded-lg shrink-0"
                    style={{ backgroundColor: hasAnythingToReset ? 'var(--monarch-orange-light)' : 'var(--monarch-bg-page)' }}
                  >
                    <Repeat size={20} style={{ color: hasAnythingToReset ? 'var(--monarch-orange)' : 'var(--monarch-text-muted)' }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2" style={{ color: 'var(--monarch-text-dark)' }}>
                      Recurring Tool
                      {hasAnythingToReset && (
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ backgroundColor: 'var(--monarch-success-bg)', color: 'var(--monarch-success)' }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                      {hasAnythingToReset ? (
                        <span className="flex items-center gap-3">
                          <span>{totalCategories} {totalCategories === 1 ? 'category' : 'categories'}</span>
                          <span style={{ color: 'var(--monarch-border)' }}>|</span>
                          <span>{totalItems} tracked {totalItems === 1 ? 'item' : 'items'}</span>
                        </span>
                      ) : (
                        'Not configured'
                      )}
                    </div>
                  </div>

                  {/* Arrow to navigate to tool */}
                  <button
                    type="button"
                    className="p-2 rounded-lg shrink-0 hover-bg-transparent-to-hover"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => navigate(isDemo ? '/demo/recurring' : '/recurring')}
                  >
                    <ChevronRight size={20} style={{ color: 'var(--monarch-text-muted)' }} />
                  </button>
                </div>

                {/* Bottom row with Reset link */}
                {hasAnythingToReset && (
                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      className="text-sm font-medium hover-opacity-80"
                      style={{ color: 'var(--monarch-orange)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setShowRecurringResetModal(true)}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Nested Settings - Only show when configured */}
              {isConfigured && (
                <div style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                  {/* Default Category Group */}
                  <div className="px-4 py-3 ml-14" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                        Default Category Group
                      </div>
                      <SearchableSelect
                        value={dashboardData?.config.target_group_id || ''}
                        onChange={handleGroupChange}
                        options={getCategoryGroupOptions()}
                        placeholder="Select a group..."
                        searchPlaceholder="Search groups..."
                        disabled={savingGroup}
                        loading={loadingGroups}
                        onOpen={() => {
                          if (categoryGroups.length === 0) {
                            fetchCategoryGroups();
                          }
                        }}
                        className="min-w-45"
                      />
                    </div>
                  </div>

                  {/* Auto-add new recurring */}
                  <div className="px-4 py-3 ml-14" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                        Auto-add new recurring
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoTrackChange}
                        disabled={savingAutoTrack}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                        style={{
                          backgroundColor: dashboardData?.config.auto_sync_new
                            ? 'var(--monarch-orange)'
                            : 'var(--monarch-border)',
                        }}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm"
                          style={{
                            transform: dashboardData?.config.auto_sync_new
                              ? 'translateX(1rem)'
                              : 'translateX(0.15rem)',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Rollup threshold - only show when auto-add is enabled */}
                  {dashboardData?.config.auto_sync_new && (
                    <div className="px-4 py-3 ml-14" style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                            Auto-add to rollup threshold
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                            Items at or below this amount go to rollup
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>$</span>
                          <input
                            type="number"
                            defaultValue={dashboardData?.config.auto_track_threshold ?? ''}
                            placeholder="any"
                            onBlur={(e) => {
                              const value = e.target.value ? Number.parseFloat(e.target.value) : null;
                              if (value !== dashboardData?.config.auto_track_threshold) {
                                handleThresholdChange(value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            disabled={savingThreshold}
                            className="w-16 px-2 py-1 text-right rounded text-sm"
                            style={{
                              border: '1px solid var(--monarch-border)',
                              backgroundColor: 'var(--monarch-bg-card)',
                              color: 'var(--monarch-text-dark)',
                            }}
                          />
                          <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>/mo</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auto-update targets */}
                  <div className="px-4 py-3 ml-14">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                          Auto-update category targets
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                          Update targets when recurring amounts change
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoUpdateTargetsChange}
                        disabled={savingAutoUpdateTargets}
                        className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                        style={{
                          backgroundColor: dashboardData?.config.auto_update_targets
                            ? 'var(--monarch-orange)'
                            : 'var(--monarch-border)',
                        }}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm"
                          style={{
                            transform: dashboardData?.config.auto_update_targets
                              ? 'translateX(1rem)'
                              : 'translateX(0.15rem)',
                          }}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Automation Section */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
          <Clock size={12} />
          Automation
        </h2>
        <AutoSyncSettings
          status={autoSyncStatus}
          onEnable={handleEnableAutoSync}
          onDisable={handleDisableAutoSync}
          onRefresh={fetchAutoSyncStatus}
        />
      </section>

      {/* Updates Section */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
          <Download size={12} />
          Updates
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2.5 rounded-lg"
                  style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                >
                  <Download size={20} style={{ color: 'var(--monarch-text-muted)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      v{versionInfo?.version || '...'}
                    </span>
                    {versionInfo && (
                      <VersionBadge
                        version={versionInfo.version}
                        channel={versionInfo.channel}
                      />
                    )}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                    {versionInfo?.build_time && versionInfo.build_time !== 'unknown'
                      ? `Built ${new Date(versionInfo.build_time).toLocaleDateString()}`
                      : 'Current version'
                    }
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium hover-bg-page-to-hover"
                style={{
                  color: 'var(--monarch-text-dark)',
                  border: '1px solid var(--monarch-border)',
                }}
              >
                Check for Updates
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-text-muted)' }}>
          <LogOut size={12} />
          Account
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}
        >
          <button
            type="button"
            className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-hover"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => logout()}
          >
            <div
              className="p-2.5 rounded-lg shrink-0"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            >
              <LogOut size={20} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Sign Out
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Sign out of your Monarch account
              </div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
          </button>
        </div>
      </section>

      {/* Demo Mode Section - only show in demo mode */}
      {isDemo && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-orange)' }}>
            <RotateCcw size={12} />
            Demo Mode
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-orange)',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--monarch-orange-light)' }}
                  >
                    <RotateCcw size={20} style={{ color: 'var(--monarch-orange)' }} />
                  </div>
                  <div>
                    <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                      Reset Demo Data
                    </div>
                    <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                      Restore demo to its original state
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    demoApi.resetDemoData();
                    queryClient.invalidateQueries();
                    toast.success('Demo data has been reset');
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--monarch-orange)',
                    color: 'white',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            <div
              className="px-4 py-3 text-xs"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text-muted)',
                borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))',
              }}
            >
              You are viewing the demo version. Changes are saved to your browser only.
            </div>
          </div>
        </section>
      )}

      {/* Danger Zone Section */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 px-1 flex items-center gap-1.5" style={{ color: 'var(--monarch-error)' }}>
          <AlertTriangle size={12} />
          Danger Zone
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-error)',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.08)'
          }}
        >
          {/* Reset App */}
          <button
            type="button"
            className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-hover"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setShowResetModal(true)}
          >
            <div
              className="p-2.5 rounded-lg shrink-0"
              style={{ backgroundColor: 'var(--monarch-orange-light)' }}
            >
              <Key size={20} style={{ color: 'var(--monarch-orange)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Reset Credentials
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Clear login but keep tracked subscriptions and settings
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <RefreshCw size={16} style={{ color: 'var(--monarch-orange)' }} />
              <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
          </button>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'var(--monarch-border)', margin: '0 1rem' }} />

          {/* Uninstall */}
          <button
            type="button"
            className="w-full p-4 flex items-center gap-4 text-left hover-bg-transparent-to-error-bg"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setShowUninstallModal(true)}
          >
            <div
              className="p-2.5 rounded-lg shrink-0"
              style={{ backgroundColor: 'var(--monarch-error-bg)' }}
            >
              <Database size={20} style={{ color: 'var(--monarch-error)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                Uninstall / Delete All Data
              </div>
              <div className="text-sm mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                Remove categories from Monarch and delete all local data
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Trash2 size={16} style={{ color: 'var(--monarch-error)' }} />
              <ChevronRight size={16} style={{ color: 'var(--monarch-text-muted)' }} />
            </div>
          </button>
        </div>
      </section>

      {/* Modals */}
      <ResetAppModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={() => {
          setShowResetModal(false);
          logout();
        }}
      />
      <UninstallModal
        isOpen={showUninstallModal}
        onClose={() => setShowUninstallModal(false)}
      />
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
      />

      {/* Recurring Tool Reset Modal */}
      {showRecurringResetModal && (
        <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 modal-backdrop"
            onClick={handleCloseRecurringReset}
          />
          <div
            className="relative w-full max-w-md mx-4 rounded-xl shadow-xl modal-content"
            style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
          >
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw size={20} style={{ color: 'var(--monarch-orange)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                    Reset Recurring Tool
                  </h2>
                </div>
                {!resettingRecurring && (
                  <button
                    onClick={handleCloseRecurringReset}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                    style={{ color: 'var(--monarch-text-muted)' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <p style={{ color: 'var(--monarch-text-muted)' }}>
                This will completely reset the Recurring tool to its initial state, as if you just installed it.
              </p>

              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  This will:
                </p>
                <ul className="text-sm space-y-1" style={{ color: 'var(--monarch-text-muted)' }}>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete {totalCategories} {totalCategories === 1 ? 'category' : 'categories'} from Monarch</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <span>Disable tracking for {totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Reset the setup wizard</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Keep your login credentials</span>
                  </li>
                </ul>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetConfirmed}
                  onChange={(e) => setResetConfirmed(e.target.checked)}
                  disabled={resettingRecurring}
                  className="mt-1"
                />
                <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                  I understand this will delete categories and reset my recurring configuration
                </span>
              </label>

              {resetError && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
                  {resetError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCloseRecurringReset}
                  disabled={resettingRecurring}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--monarch-bg-elevated)',
                    color: 'var(--monarch-text-dark)',
                    border: '1px solid var(--monarch-border)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecurringReset}
                  disabled={!resetConfirmed || resettingRecurring}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: resettingRecurring ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
                    opacity: !resetConfirmed && !resettingRecurring ? 0.5 : 1,
                  }}
                >
                  {resettingRecurring ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    'Reset Tool'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
