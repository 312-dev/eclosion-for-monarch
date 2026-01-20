/**
 * Recurring Tool Settings
 *
 * Settings card for the recurring expense tracking tool.
 * Includes category group selection, auto-add, threshold, and display settings.
 */

import { useState, forwardRef, useCallback } from 'react';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { useApiClient, useSavingStates } from '../../hooks';
import { useInvalidateDashboard, useCategoryGroupsQuery } from '../../api/queries';
import { RecurringToolHeader } from './RecurringToolHeader';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { ThresholdInput } from './ThresholdInput';
import type { DashboardData } from '../../types';

interface RecurringToolSettingsProps {
  dashboardData: DashboardData | null;
  loading: boolean;
  onRefreshDashboard: () => Promise<void>;
  onShowResetModal: () => void;
  defaultExpanded?: boolean;
}

export const RecurringToolSettings = forwardRef<HTMLDivElement, RecurringToolSettingsProps>(
  function RecurringToolSettings(
    { dashboardData, loading, onRefreshDashboard, onShowResetModal, defaultExpanded = false },
    ref
  ) {
    const toast = useToast();
    const client = useApiClient();
    const invalidateDashboard = useInvalidateDashboard();

    // Use React Query for category groups (cached)
    const { data: categoryGroups = [], isLoading: loadingGroups } = useCategoryGroupsQuery();

    // Accordion state - can be pre-expanded via URL hash
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

    type SettingKey = 'group' | 'autoTrack' | 'threshold' | 'autoCategorize' | 'showCategoryGroup';
    const { isSaving, withSaving } = useSavingStates<SettingKey>();

    // Calculate recurring tool info
    const isConfigured = dashboardData?.config?.target_group_id != null;
    const dedicatedItems =
      dashboardData?.items.filter(
        (item) => item.is_enabled && !item.is_in_rollup && item.category_id
      ) || [];
    const rollupItems = dashboardData?.rollup?.items || [];
    const totalCategories = dedicatedItems.length + (dashboardData?.rollup?.category_id ? 1 : 0);
    const totalItems = dedicatedItems.length + rollupItems.length;
    const hasAnythingToReset = isConfigured || totalCategories > 0 || totalItems > 0;

    const handleGroupChange = async (groupId: string) => {
      const group = categoryGroups.find((g) => g.id === groupId);
      if (!group) return;

      await withSaving('group', async () => {
        try {
          await client.setConfig(group.id, group.name);
          await onRefreshDashboard();
          toast.success(`Category group set to ${group.name}`);
        } catch {
          toast.error('Failed to update category group');
        }
      });
    };

    const handleAutoTrackChange = async () => {
      const newValue = !(dashboardData?.config.auto_sync_new ?? false);
      await withSaving('autoTrack', async () => {
        try {
          await client.updateSettings({ auto_sync_new: newValue });
          await onRefreshDashboard();
          toast.success(newValue ? 'Auto-track enabled' : 'Auto-track disabled');
        } catch {
          toast.error('Failed to update setting');
        }
      });
    };

    const handleThresholdChange = async (value: number | null) => {
      await withSaving('threshold', async () => {
        try {
          await client.updateSettings({ auto_track_threshold: value });
          await onRefreshDashboard();
          toast.success('Threshold updated');
        } catch {
          toast.error('Failed to update threshold');
        }
      });
    };

    const handleAutoCategorizeChange = async () => {
      const newValue = !(dashboardData?.config.auto_categorize_enabled ?? false);
      await withSaving('autoCategorize', async () => {
        try {
          await client.updateSettings({ auto_categorize_enabled: newValue });
          await onRefreshDashboard();
          toast.success(newValue ? 'Auto-categorization enabled' : 'Auto-categorization disabled');
        } catch {
          toast.error('Failed to update setting');
        }
      });
    };

    const handleShowCategoryGroupChange = async () => {
      const newValue = !(dashboardData?.config.show_category_group ?? true);
      await withSaving('showCategoryGroup', async () => {
        try {
          await client.updateSettings({ show_category_group: newValue });
          invalidateDashboard(); // Invalidate React Query cache for other tabs
          await onRefreshDashboard();
          toast.success(newValue ? 'Category groups shown' : 'Category groups hidden');
        } catch {
          toast.error('Failed to update setting');
        }
      });
    };

    const getCategoryGroupOptions = () => {
      if (categoryGroups.length > 0) {
        return categoryGroups.map((group) => ({
          value: group.id,
          label: group.name,
        }));
      }
      if (dashboardData?.config.target_group_name) {
        return [
          {
            value: dashboardData.config.target_group_id || '',
            label: dashboardData.config.target_group_name,
          },
        ];
      }
      return [];
    };

    const autoSyncEnabled = dashboardData?.config.auto_sync_new ?? false;
    const autoCategorizeEnabled = dashboardData?.config.auto_categorize_enabled ?? false;
    const showCategoryGroupEnabled = dashboardData?.config.show_category_group ?? true;

    return (
      <div
        ref={ref}
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          border: '1px solid var(--monarch-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
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
              isExpanded={isExpanded}
              onToggle={toggleExpanded}
            />

            {/* Nested Settings - Only show when configured and expanded */}
            {isConfigured && isExpanded && (
              <div style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
                {/* Default Category Group */}
                <SettingsRow label="Default Category Group">
                  <SearchableSelect
                    value={dashboardData?.config.target_group_id || ''}
                    onChange={handleGroupChange}
                    options={getCategoryGroupOptions()}
                    placeholder="Select a group..."
                    searchPlaceholder="Search groups..."
                    disabled={isSaving('group')}
                    loading={loadingGroups}
                    className="min-w-45"
                  />
                </SettingsRow>

                {/* Auto-add new recurring */}
                <SettingsRow label="Auto-add new recurring">
                  <ToggleSwitch
                    checked={autoSyncEnabled}
                    onChange={handleAutoTrackChange}
                    disabled={isSaving('autoTrack')}
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
                      disabled={isSaving('threshold')}
                      onChange={handleThresholdChange}
                    />
                  </SettingsRow>
                )}

                {/* Auto-categorize transactions */}
                <SettingsRow
                  label="Auto-categorize transactions"
                  description="Categorize new recurring transactions to tracking categories"
                >
                  <ToggleSwitch
                    checked={autoCategorizeEnabled}
                    onChange={handleAutoCategorizeChange}
                    disabled={isSaving('autoCategorize')}
                    ariaLabel={
                      autoCategorizeEnabled ? 'Disable auto-categorize' : 'Enable auto-categorize'
                    }
                  />
                </SettingsRow>

                {/* Show category group */}
                <SettingsRow
                  label="Show category group"
                  description="Display category group name under each item"
                  isLast
                >
                  <ToggleSwitch
                    checked={showCategoryGroupEnabled}
                    onChange={handleShowCategoryGroupChange}
                    disabled={isSaving('showCategoryGroup')}
                    ariaLabel={
                      showCategoryGroupEnabled ? 'Hide category groups' : 'Show category groups'
                    }
                  />
                </SettingsRow>
              </div>
            )}

            {/* Reset link - only show when expanded */}
            {hasAnythingToReset && isExpanded && (
              <div
                className="px-4 py-2 text-right"
                style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
              >
                <button
                  type="button"
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{
                    color: 'var(--monarch-error)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={onShowResetModal}
                >
                  Reset
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
);
