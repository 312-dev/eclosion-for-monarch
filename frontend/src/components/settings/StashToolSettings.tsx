/* eslint-disable max-lines */
/* eslint-disable sonarjs/cognitive-complexity */
/**
 * Stash Tool Settings
 *
 * Settings card for the stash/savings goals feature.
 * Includes category group selection, auto-archive settings, and browser info.
 */

import { useState, useCallback, useEffect, useRef, forwardRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { SearchableSelect } from '../SearchableSelect';
import { useToast } from '../../context/ToastContext';
import { useDemo } from '../../context/DemoContext';
import { useSavingStates } from '../../hooks';
import {
  useStashConfigQuery,
  useStashCategoryGroupsQuery,
  useUpdateStashConfigMutation,
} from '../../api/queries';
import { queryKeys, getQueryKey } from '../../api/queries/keys';
import { StashIcon } from '../wizards/SetupWizardIcons';
import { ToolSettingsHeader } from './ToolSettingsHeader';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { CashAccountSelectionModal } from './CashAccountSelectionModal';

const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  brave: 'Brave',
  safari: 'Safari',
};

interface StashToolSettingsProps {
  defaultExpanded?: boolean;
  onSetupBookmarkSync?: (() => void) | undefined;
  onChangeBookmarkSource?: (() => void) | undefined;
  onUnlinkBookmarks?: (() => void) | undefined;
  variant?: 'page' | 'modal';
}

export const StashToolSettings = forwardRef<HTMLDivElement, StashToolSettingsProps>(
  function StashToolSettings(
    {
      defaultExpanded = false,
      onSetupBookmarkSync,
      onChangeBookmarkSource,
      onUnlinkBookmarks,
      variant = 'page',
    },
    ref
  ) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const isDemo = useDemo();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [showAccountSelectionModal, setShowAccountSelectionModal] = useState(false);
    const [editingBuffer, setEditingBuffer] = useState<number | null>(null);
    const bufferDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Queries
    const { data: config, isLoading: configLoading } = useStashConfigQuery();
    const { data: categoryGroups = [], isLoading: groupsLoading } = useStashCategoryGroupsQuery();
    const updateConfig = useUpdateStashConfigMutation();

    type SettingKey =
      | 'group'
      | 'autoArchiveBookmark'
      | 'autoArchiveGoal'
      | 'includeExpectedIncome'
      | 'showMonarchGoals';
    const { isSaving, withSaving } = useSavingStates<SettingKey>();

    const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

    // Use editing value when actively editing, otherwise use config value
    const displayBuffer = editingBuffer ?? config?.bufferAmount ?? 0;

    // Cleanup debounce timer on unmount
    useEffect(() => {
      return () => {
        if (bufferDebounceRef.current) {
          clearTimeout(bufferDebounceRef.current);
        }
      };
    }, []);

    // Browser sync is configured
    const isBrowserSyncConfigured = config?.isConfigured ?? false;
    // Has any stash configuration (category group selected)
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
          toast.success(
            newValue
              ? 'Auto-archive on bookmark delete enabled'
              : 'Auto-archive on bookmark delete disabled'
          );
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
          toast.success(
            newValue
              ? 'Auto-archive for completed goals enabled'
              : 'Auto-archive for completed goals disabled'
          );
        } catch {
          toast.error('Failed to update setting');
        }
      });
    };

    const handleIncludeExpectedIncomeChange = async () => {
      const newValue = !(config?.includeExpectedIncome ?? true);
      await withSaving('includeExpectedIncome', async () => {
        try {
          await updateConfig.mutateAsync({
            includeExpectedIncome: newValue,
          });
          toast.success(
            newValue
              ? 'Expected income included in calculation'
              : 'Expected income excluded from calculation'
          );
        } catch {
          toast.error('Failed to update setting');
        }
      });
    };

    const handleShowMonarchGoalsChange = async () => {
      const newValue = !(config?.showMonarchGoals ?? true);
      await withSaving('showMonarchGoals', async () => {
        try {
          await updateConfig.mutateAsync({
            showMonarchGoals: newValue,
          });
          toast.success(
            newValue ? 'Monarch goals shown in Stash' : 'Monarch goals hidden from Stash'
          );
        } catch {
          toast.error('Failed to update setting');
        }
      });
    };

    const handleBufferChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replaceAll(/\D/g, '');
        const value = rawValue === '' ? 0 : Math.max(0, Number.parseInt(rawValue, 10));
        setEditingBuffer(value);

        // Debounce save to backend
        if (bufferDebounceRef.current) {
          clearTimeout(bufferDebounceRef.current);
        }
        bufferDebounceRef.current = setTimeout(async () => {
          try {
            await updateConfig.mutateAsync({ bufferAmount: value });
            // Invalidate available to stash data to trigger recalculation
            queryClient.invalidateQueries({
              queryKey: getQueryKey(queryKeys.availableToStash, isDemo),
            });
            // Clear editing state after successful save
            setEditingBuffer(null);
          } catch {
            toast.error('Failed to update buffer amount');
          }
        }, 500);
      },
      [updateConfig, queryClient, isDemo, toast]
    );

    const handleAccountSelectionSave = async (accountIds: string[] | null) => {
      try {
        await updateConfig.mutateAsync({ selectedCashAccountIds: accountIds });
        // Invalidate available to stash data to trigger recalculation
        queryClient.invalidateQueries({
          queryKey: getQueryKey(queryKeys.availableToStash, isDemo),
        });
        toast.success('Cash account selection updated');
      } catch {
        toast.error('Failed to update account selection');
      }
    };

    const getAccountSelectionLabel = () => {
      const selected = config?.selectedCashAccountIds;
      if (selected === null || selected === undefined) {
        return 'All accounts';
      }
      if (selected.length === 0) {
        return 'No accounts';
      }
      return `${selected.length} selected`;
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

    const containerClass = variant === 'modal' ? 'overflow-hidden' : 'rounded-xl overflow-hidden';
    const containerStyle =
      variant === 'modal'
        ? {}
        : {
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          };

    return (
      <div ref={ref} className={containerClass} style={containerStyle}>
        {configLoading ? (
          <div className="p-4">
            <div className="flex items-center gap-4">
              {/* Icon placeholder */}
              <div className="w-10 h-10 rounded-lg skeleton shrink-0" />
              {/* Title and description */}
              <div className="flex-1 min-w-0">
                <div className="h-4 w-20 rounded skeleton mb-1.5" />
                <div className="h-3 w-44 rounded skeleton" />
              </div>
              {/* Chevron placeholder */}
              <div className="w-5 h-5 rounded skeleton shrink-0" />
            </div>
          </div>
        ) : (
          <>
            {/* Only show header in page mode */}
            {variant === 'page' && (
              <ToolSettingsHeader
                icon={<StashIcon size={20} />}
                title="Stashes"
                description={description}
                isActive={hasAnyConfig}
                isExpanded={isExpanded}
                onToggle={toggleExpanded}
              />
            )}

            {/* Settings - Show when modal mode OR expanded in page mode */}
            {(variant === 'modal' || isExpanded) && (
              <div
                style={
                  variant === 'page'
                    ? { borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }
                    : {}
                }
              >
                {/* Default Category Group - General setting, always shown */}
                <SettingsRow label="Default Category Group" variant={variant}>
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

                {/* Include expected income in Available Funds calculation */}
                <SettingsRow
                  label="Include expected income"
                  description="Add planned income to Available Funds calculation"
                  variant={variant}
                >
                  <ToggleSwitch
                    checked={config?.includeExpectedIncome ?? true}
                    onChange={handleIncludeExpectedIncomeChange}
                    disabled={isSaving('includeExpectedIncome')}
                    ariaLabel={
                      config?.includeExpectedIncome
                        ? 'Exclude expected income from calculation'
                        : 'Include expected income in calculation'
                    }
                  />
                </SettingsRow>

                {/* Cash Account Selection */}
                <SettingsRow
                  label="Cash accounts"
                  description="Select which accounts to include in Available Funds (credit cards always included)"
                  variant={variant}
                >
                  <button
                    type="button"
                    onClick={() => setShowAccountSelectionModal(true)}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap hover:bg-(--monarch-bg-page)"
                    style={{
                      backgroundColor: 'var(--monarch-bg-hover)',
                      color: 'var(--monarch-text)',
                      border: '1px solid var(--monarch-border)',
                    }}
                    aria-label="Configure cash accounts"
                  >
                    {getAccountSelectionLabel()}
                    <ChevronRight size={16} className="text-monarch-text-muted" />
                  </button>
                </SettingsRow>

                {/* Reserved Buffer Amount */}
                <SettingsRow
                  label="Reserved buffer"
                  description="Reserve funds that won't count toward Available Funds"
                  variant={variant}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={displayBuffer === 0 ? '' : displayBuffer.toLocaleString()}
                      onChange={handleBufferChange}
                      placeholder="0"
                      className="w-20 px-2 py-1 text-right rounded text-sm tabular-nums"
                      style={{
                        border: '1px solid var(--monarch-border)',
                        backgroundColor: 'var(--monarch-bg-card)',
                        color: 'var(--monarch-text-dark)',
                      }}
                      aria-label="Reserved buffer amount"
                    />
                  </div>
                </SettingsRow>

                {/* Show Monarch goals in Stash */}
                <SettingsRow
                  label="Show Monarch savings goals"
                  description="Display your Monarch Money savings goals alongside Stash items"
                  variant={variant}
                >
                  <ToggleSwitch
                    checked={config?.showMonarchGoals ?? true}
                    onChange={handleShowMonarchGoalsChange}
                    disabled={isSaving('showMonarchGoals')}
                    ariaLabel={
                      config?.showMonarchGoals
                        ? 'Hide Monarch goals from Stash'
                        : 'Show Monarch goals in Stash'
                    }
                  />
                </SettingsRow>

                {/* Auto-archive when goal met - General setting, always shown */}
                <SettingsRow
                  label="Auto-archive completed"
                  description="Archive items at the start of the month after being fully funded"
                  isLast={!isBrowserSyncConfigured && !onSetupBookmarkSync}
                  variant={variant}
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
                    description="Convert browser bookmarks to stashes"
                    isLast
                    variant={variant}
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
                      variant={variant}
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
                      variant={variant}
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

        {/* Cash Account Selection Modal */}
        <CashAccountSelectionModal
          isOpen={showAccountSelectionModal}
          onClose={() => setShowAccountSelectionModal(false)}
          selectedAccountIds={config?.selectedCashAccountIds ?? null}
          onSave={handleAccountSelectionSave}
        />
      </div>
    );
  }
);
