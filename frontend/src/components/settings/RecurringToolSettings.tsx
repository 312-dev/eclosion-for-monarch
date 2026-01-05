/**
 * Recurring Tool Settings
 *
 * Settings section for the recurring expense tracking tool.
 * Includes category group selection, auto-add, threshold, and auto-update settings.
 */

import { useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { useDemo } from '../../context/DemoContext';
import { useApiClient } from '../../hooks';
import { RecurringToolHeader } from './RecurringToolHeader';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { ThresholdInput } from './ThresholdInput';
import type { DashboardData, CategoryGroup } from '../../types';

interface RecurringToolSettingsProps {
  dashboardData: DashboardData | null;
  loading: boolean;
  onRefreshDashboard: () => Promise<void>;
  onShowResetModal: () => void;
}

export const RecurringToolSettings = forwardRef<HTMLElement, RecurringToolSettingsProps>(
  function RecurringToolSettings(
    { dashboardData, loading, onRefreshDashboard, onShowResetModal },
    ref
  ) {
    const navigate = useNavigate();
    const toast = useToast();
    const isDemo = useDemo();
    const client = useApiClient();

    const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [savingGroup, setSavingGroup] = useState(false);
    const [savingAutoTrack, setSavingAutoTrack] = useState(false);
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [savingAutoUpdateTargets, setSavingAutoUpdateTargets] = useState(false);

    // Calculate recurring tool info
    const isConfigured = dashboardData?.config?.target_group_id != null;
    const dedicatedItems = dashboardData?.items.filter(
      item => item.is_enabled && !item.is_in_rollup && item.category_id
    ) || [];
    const rollupItems = dashboardData?.rollup?.items || [];
    const totalCategories = dedicatedItems.length + (dashboardData?.rollup?.category_id ? 1 : 0);
    const totalItems = dedicatedItems.length + rollupItems.length;
    const hasAnythingToReset = isConfigured || totalCategories > 0 || totalItems > 0;

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

    const handleGroupChange = async (groupId: string) => {
      const group = categoryGroups.find(g => g.id === groupId);
      if (!group) return;

      setSavingGroup(true);
      try {
        await client.setConfig(group.id, group.name);
        await onRefreshDashboard();
        toast.success(`Category group set to ${group.name}`);
      } catch {
        toast.error('Failed to update category group');
      } finally {
        setSavingGroup(false);
      }
    };

    const handleAutoTrackChange = async () => {
      const newValue = !(dashboardData?.config.auto_sync_new ?? false);
      setSavingAutoTrack(true);
      try {
        await client.updateSettings({ auto_sync_new: newValue });
        await onRefreshDashboard();
        toast.success(newValue ? 'Auto-track enabled' : 'Auto-track disabled');
      } catch {
        toast.error('Failed to update setting');
      } finally {
        setSavingAutoTrack(false);
      }
    };

    const handleThresholdChange = async (value: number | null) => {
      setSavingThreshold(true);
      try {
        await client.updateSettings({ auto_track_threshold: value });
        await onRefreshDashboard();
        toast.success('Threshold updated');
      } catch {
        toast.error('Failed to update threshold');
      } finally {
        setSavingThreshold(false);
      }
    };

    const handleAutoUpdateTargetsChange = async () => {
      const newValue = !(dashboardData?.config.auto_update_targets ?? false);
      setSavingAutoUpdateTargets(true);
      try {
        await client.updateSettings({ auto_update_targets: newValue });
        await onRefreshDashboard();
        toast.success(newValue ? 'Auto-update targets enabled' : 'Auto-update targets disabled');
      } catch {
        toast.error('Failed to update setting');
      } finally {
        setSavingAutoUpdateTargets(false);
      }
    };

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

    const autoSyncEnabled = dashboardData?.config.auto_sync_new ?? false;
    const autoUpdateEnabled = dashboardData?.config.auto_update_targets ?? false;

    return (
      <section ref={ref} id="recurring" className="mb-8">
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
              <RecurringToolHeader
                hasAnythingToReset={hasAnythingToReset}
                totalCategories={totalCategories}
                totalItems={totalItems}
                onNavigate={() => navigate(isDemo ? '/demo/recurring' : '/recurring')}
              />

              {/* Nested Settings - Only show when configured */}
              {isConfigured && (
                <div style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                  {/* Default Category Group */}
                  <SettingsRow label="Default Category Group">
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
                  </SettingsRow>

                  {/* Auto-add new recurring */}
                  <SettingsRow label="Auto-add new recurring">
                    <ToggleSwitch
                      checked={autoSyncEnabled}
                      onChange={handleAutoTrackChange}
                      disabled={savingAutoTrack}
                      ariaLabel={autoSyncEnabled ? 'Disable auto-add' : 'Enable auto-add'}
                    />
                  </SettingsRow>

                  {/* Rollup threshold - only show when auto-add is enabled */}
                  {autoSyncEnabled && (
                    <SettingsRow
                      label="Auto-add to rollup threshold"
                      description="Items at or below this amount go to rollup"
                    >
                      <ThresholdInput
                        defaultValue={dashboardData?.config.auto_track_threshold}
                        disabled={savingThreshold}
                        onChange={handleThresholdChange}
                      />
                    </SettingsRow>
                  )}

                  {/* Auto-update targets */}
                  <SettingsRow
                    label="Auto-update category targets"
                    description="Update targets when recurring amounts change"
                    isLast
                  >
                    <ToggleSwitch
                      checked={autoUpdateEnabled}
                      onChange={handleAutoUpdateTargetsChange}
                      disabled={savingAutoUpdateTargets}
                      ariaLabel={autoUpdateEnabled ? 'Disable auto-update targets' : 'Enable auto-update targets'}
                    />
                  </SettingsRow>
                </div>
              )}

              {/* Reset link */}
              {hasAnythingToReset && (
                <div className="px-4 py-2 text-right" style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                  <button
                    type="button"
                    className="text-xs hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--monarch-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={onShowResetModal}
                  >
                    Reset
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  }
);
