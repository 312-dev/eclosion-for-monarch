/**
 * Wishlist Tool Settings
 *
 * Settings card for the wishlist/savings goals feature.
 * Includes category group selection, auto-archive settings, and browser info.
 */

import { useState, useCallback, forwardRef } from 'react';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { useSavingStates } from '../../hooks';
import {
  useWishlistConfigQuery,
  useWishlistCategoryGroupsQuery,
  useUpdateWishlistConfigMutation,
} from '../../api/queries';
import { WishlistIcon } from '../wizards/SetupWizardIcons';
import { ToolSettingsHeader } from './ToolSettingsHeader';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';

const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  brave: 'Brave',
  safari: 'Safari',
};

interface WishlistToolSettingsProps {
  defaultExpanded?: boolean;
  onSetupBookmarkSync?: (() => void) | undefined;
  onChangeBookmarkSource?: (() => void) | undefined;
  onUnlinkBookmarks?: (() => void) | undefined;
}

export const WishlistToolSettings = forwardRef<HTMLDivElement, WishlistToolSettingsProps>(
  function WishlistToolSettings({ defaultExpanded = false, onSetupBookmarkSync, onChangeBookmarkSource, onUnlinkBookmarks }, ref) {
  const toast = useToast();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Queries
  const { data: config, isLoading: configLoading } = useWishlistConfigQuery();
  const { data: categoryGroups = [], isLoading: groupsLoading } = useWishlistCategoryGroupsQuery();
  const updateConfig = useUpdateWishlistConfigMutation();

  type SettingKey = 'group' | 'autoArchiveBookmark' | 'autoArchiveGoal';
  const { isSaving, withSaving } = useSavingStates<SettingKey>();

  const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

  // Browser sync is configured
  const isBrowserSyncConfigured = config?.isConfigured ?? false;
  // Has any wishlist configuration (category group selected)
  const hasAnyConfig = Boolean(config?.defaultCategoryGroupId) || isBrowserSyncConfigured;

  const handleGroupChange = async (groupId: string) => {
    const group = categoryGroups.find((g) => g.id === groupId);
    if (!group) return;

    await withSaving('group', async () => {
      try {
        await updateConfig.mutateAsync({
          defaultCategoryGroupId: group.id,
          defaultCategoryGroupName: group.name,
        });
        toast.success(`Default group set to ${group.name}`);
      } catch {
        toast.error('Failed to update default group');
      }
    });
  };

  const handleAutoArchiveBookmarkChange = async () => {
    const newValue = !(config?.autoArchiveOnBookmarkDelete ?? true);
    await withSaving('autoArchiveBookmark', async () => {
      try {
        await updateConfig.mutateAsync({
          autoArchiveOnBookmarkDelete: newValue,
        });
        toast.success(newValue ? 'Auto-archive on bookmark delete enabled' : 'Auto-archive on bookmark delete disabled');
      } catch {
        toast.error('Failed to update setting');
      }
    });
  };

  const handleAutoArchiveGoalChange = async () => {
    const newValue = !(config?.autoArchiveOnGoalMet ?? true);
    await withSaving('autoArchiveGoal', async () => {
      try {
        await updateConfig.mutateAsync({
          autoArchiveOnGoalMet: newValue,
        });
        toast.success(newValue ? 'Auto-archive for completed goals enabled' : 'Auto-archive for completed goals disabled');
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
    if (config?.defaultCategoryGroupName) {
      return [
        {
          value: config.defaultCategoryGroupId || '',
          label: config.defaultCategoryGroupName,
        },
      ];
    }
    return [];
  };

  const browserLabel = config?.selectedBrowser
    ? BROWSER_LABELS[config.selectedBrowser] || config.selectedBrowser
    : 'Not configured';

  // Description for header - show browser info if sync is configured
  const description = isBrowserSyncConfigured
    ? `Synced with ${browserLabel}`
    : 'Track savings goals for purchases';

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
      {configLoading ? (
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
          <ToolSettingsHeader
            icon={<WishlistIcon size={20} />}
            title="Wishlist"
            description={description}
            isActive={hasAnyConfig}
            isExpanded={isExpanded}
            onToggle={toggleExpanded}
          />

          {/* Settings - Always show when expanded */}
          {isExpanded && (
            <div style={{ borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}>
              {/* Default Category Group - General setting, always shown */}
              <SettingsRow label="Default Category Group">
                <SearchableSelect
                  value={config?.defaultCategoryGroupId || ''}
                  onChange={handleGroupChange}
                  options={getCategoryGroupOptions()}
                  placeholder="Select a group..."
                  searchPlaceholder="Search groups..."
                  disabled={isSaving('group')}
                  loading={groupsLoading}
                  className="min-w-45"
                />
              </SettingsRow>

              {/* Auto-archive when goal met - General setting, always shown */}
              <SettingsRow
                label="Auto-archive completed"
                description="Archive items at the start of the month after being fully funded"
                isLast={!isBrowserSyncConfigured && !onSetupBookmarkSync}
              >
                <ToggleSwitch
                  checked={config?.autoArchiveOnGoalMet ?? true}
                  onChange={handleAutoArchiveGoalChange}
                  disabled={isSaving('autoArchiveGoal')}
                  ariaLabel={
                    config?.autoArchiveOnGoalMet
                      ? 'Disable auto-archive for completed goals'
                      : 'Enable auto-archive for completed goals'
                  }
                />
              </SettingsRow>

              {/* Bookmark sync setup - Show when not configured */}
              {!isBrowserSyncConfigured && onSetupBookmarkSync && (
                <SettingsRow
                  label="Bookmark sync"
                  description="Import wishlist items from browser bookmarks"
                  isLast
                >
                  <button
                    type="button"
                    onClick={onSetupBookmarkSync}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--monarch-orange)',
                      color: 'white',
                    }}
                    aria-label="Set up bookmark sync"
                  >
                    Setup
                  </button>
                </SettingsRow>
              )}

              {/* Bookmark-specific settings - Only show when browser sync is configured */}
              {isBrowserSyncConfigured && (
                <>
                  {/* Bookmark source with Change/Unlink buttons */}
                  <SettingsRow
                    label="Bookmark source"
                    description={`Synced with ${browserLabel}`}
                  >
                    <div className="flex items-center gap-2">
                      {onChangeBookmarkSource && (
                        <button
                          type="button"
                          onClick={onChangeBookmarkSource}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                          style={{
                            backgroundColor: 'var(--monarch-bg-hover)',
                            color: 'var(--monarch-text)',
                            border: '1px solid var(--monarch-border)',
                          }}
                          aria-label="Change bookmark source"
                        >
                          Change
                        </button>
                      )}
                      {onUnlinkBookmarks && (
                        <button
                          type="button"
                          onClick={onUnlinkBookmarks}
                          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                          style={{
                            backgroundColor: 'var(--monarch-error-bg)',
                            color: 'var(--monarch-error)',
                            border: '1px solid var(--monarch-error)',
                          }}
                          aria-label="Unlink bookmark sync"
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                  </SettingsRow>

                  {/* Auto-archive when bookmark deleted - nested under bookmark source */}
                  <SettingsRow
                    label="Archive when bookmark deleted"
                    description="Automatically archive items when source bookmark is removed"
                    isLast
                  >
                    <ToggleSwitch
                      checked={config?.autoArchiveOnBookmarkDelete ?? true}
                      onChange={handleAutoArchiveBookmarkChange}
                      disabled={isSaving('autoArchiveBookmark')}
                      ariaLabel={
                        config?.autoArchiveOnBookmarkDelete
                          ? 'Disable auto-archive on bookmark delete'
                          : 'Enable auto-archive on bookmark delete'
                      }
                    />
                  </SettingsRow>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});
