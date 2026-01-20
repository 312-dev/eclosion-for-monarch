/**
 * Recurring Tab
 *
 * Main tab for managing recurring expenses.
 * Shows setup wizard if not configured, otherwise shows RollupZone, RecurringList, and ReadyToAssign sidebar.
 */

import { useState, useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { RollupZone } from '../RollupZone';
import { RecurringList } from '../RecurringList';
import { ReadyToAssign, BurndownChart, calculateBurndownData } from '../ready-to-assign';
import { formatCurrency, handleApiError } from '../../utils';
import { RecurringSetupWizard } from '../wizards/RecurringSetupWizard';
import {
  useDashboardQuery,
  useSyncMutation,
  useRemoveFromRollupMutation,
  useSetRollupBudgetMutation,
  useUpdateRollupEmojiMutation,
  useUpdateRollupNameMutation,
} from '../../api/queries';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks';
import { PageLoadingSpinner } from '../ui/LoadingSpinner';
import type { SyncResult } from '../../types';

export function RecurringTab() {
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const toast = useToast();

  // All hooks must be called before any early returns
  const { data, refetch, isLoading } = useDashboardQuery();

  // Set page title with user's first name
  usePageTitle('Recurring', data?.config.user_first_name);
  const syncMutation = useSyncMutation();
  const removeFromRollupMutation = useRemoveFromRollupMutation();
  const rollupBudgetMutation = useSetRollupBudgetMutation();
  const rollupEmojiMutation = useUpdateRollupEmojiMutation();
  const rollupNameMutation = useUpdateRollupNameMutation();

  // Check if recurring is configured (has a target group set)
  const isConfigured = data?.config.target_group_id != null;

  // Calculate burndown data for the chart (must be before early returns)
  // Uses frozen_monthly_target - what you actually need to budget THIS month
  const currentMonthlyCost = useMemo(() => {
    if (!data) return 0;
    const enabledItems = data.items.filter((i) => i.is_enabled && !i.is_in_rollup);
    const itemsTotal = enabledItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    const rollupItems = data.items.filter((i) => i.is_in_rollup);
    const rollupTotal = rollupItems.reduce((sum, item) => sum + item.frozen_monthly_target, 0);
    return itemsTotal + rollupTotal;
  }, [data]);
  const { points: burndownPoints } = useMemo(
    () =>
      data
        ? calculateBurndownData(data.items, currentMonthlyCost)
        : { stabilization: null, points: [] },
    [data, currentMonthlyCost]
  );

  // Watch for sync mutation results
  if (syncMutation.data && !syncResult) {
    setSyncResult(syncMutation.data);
  }

  const handleRemoveFromRollup = async (itemId: string) => {
    try {
      await removeFromRollupMutation.mutateAsync(itemId);
      toast.success('Removed from rollup');
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to remove from rollup'));
    }
  };

  const handleRollupBudgetChange = async (amount: number) => {
    try {
      await rollupBudgetMutation.mutateAsync(amount);
      toast.success('Budget updated');
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to update rollup budget'));
    }
  };

  const handleRollupEmojiChange = async (emoji: string) => {
    try {
      await rollupEmojiMutation.mutateAsync(emoji);
      toast.success('Emoji updated');
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to update emoji'));
    }
  };

  const handleRollupNameChange = async (name: string) => {
    try {
      await rollupNameMutation.mutateAsync(name);
      toast.success('Name updated');
    } catch (err) {
      toast.error(handleApiError(err, 'Failed to update name'));
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  // Show loading state while checking configuration
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoadingSpinner />
      </div>
    );
  }

  // Show setup wizard if not configured
  if (!isConfigured) {
    return <RecurringSetupWizard onComplete={() => refetch()} />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="recurring-tab-layout tab-content-enter" data-testid="recurring-content">
      {/* Main content area */}
      <div className="recurring-tab-content">
        {/* Horizontal tabs */}
        <div
          className="flex items-center gap-1 mb-4 border-b"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <button
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              color: 'var(--monarch-orange)',
              borderColor: 'var(--monarch-orange)',
            }}
          >
            Recurring Categories
          </button>
          <a
            href="https://app.monarchmoney.com/recurring/all"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 hover-text-muted-to-dark"
            style={{ borderColor: 'transparent' }}
          >
            All Recurring
            <ExternalLink size={14} />
          </a>
          <a
            href="https://app.monarchmoney.com/settings/categories"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 hover-text-muted-to-dark"
            style={{ borderColor: 'transparent' }}
          >
            Category Groups
            <ExternalLink size={14} />
          </a>
        </div>

        {syncResult && (
          <div
            className="mb-4 p-3 rounded-lg"
            style={{
              backgroundColor: syncResult.success
                ? 'var(--monarch-success-bg)'
                : 'var(--monarch-warning-bg)',
              color: syncResult.success ? 'var(--monarch-success)' : 'var(--monarch-warning)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium">
                  {syncResult.success ? 'Sync completed!' : 'Sync completed with issues'}
                </div>
                <div className="text-sm mt-1">
                  {syncResult.categories_created > 0 && (
                    <span className="mr-3">Created: {syncResult.categories_created}</span>
                  )}
                  {syncResult.categories_updated > 0 && (
                    <span className="mr-3">Updated: {syncResult.categories_updated}</span>
                  )}
                  {syncResult.categories_deactivated > 0 && (
                    <span>Deactivated: {syncResult.categories_deactivated}</span>
                  )}
                </div>
                {syncResult.errors.length > 0 && (
                  <ul className="text-sm mt-2 list-disc list-inside">
                    {syncResult.errors.map((err, i) => (
                      <li key={`error-${i}`}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={() => setSyncResult(null)}
                className="text-sm underline opacity-70 hover:opacity-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Catch-up Burndown Chart */}
        {burndownPoints.length >= 2 && (
          <div
            className="rounded-xl shadow-sm mb-4"
            style={{
              backgroundColor: 'var(--monarch-bg-card)',
              border: '1px solid var(--monarch-border)',
            }}
            data-tour="burndown-decline"
          >
            <div className="px-5 py-4">
              <h3
                className="text-lg font-semibold mb-1"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                Monthly Savings Goal
              </h3>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Your monthly contribution will decrease as catch-up payments complete
              </p>
              <BurndownChart data={burndownPoints} formatCurrency={formatCurrency} />
            </div>
          </div>
        )}

        <div data-tour="rollup-zone">
          <RollupZone
            rollup={data.rollup}
            onRemoveItem={handleRemoveFromRollup}
            onBudgetChange={handleRollupBudgetChange}
            onEmojiChange={handleRollupEmojiChange}
            onNameChange={handleRollupNameChange}
          />
        </div>

        <div data-tour="recurring-list">
          <RecurringList
            items={data.items.filter((i) => !i.is_in_rollup)}
            onRefresh={handleRefresh}
            showCategoryGroup={data.config.show_category_group ?? true}
          />
        </div>
      </div>

      {/* Desktop: Sticky sidebar on right */}
      <aside className="stats-sidebar hidden lg:block" data-tour="ready-to-assign">
        {data.ready_to_assign && (
          <ReadyToAssign
            data={data.ready_to_assign}
            summary={data.summary}
            items={data.items}
            rollup={data.rollup}
            variant="sidebar"
          />
        )}
      </aside>
    </div>
  );
}
