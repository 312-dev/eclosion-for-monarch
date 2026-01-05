/**
 * ItemSelectionStep - Item selection step for the setup wizard
 */

import type { RecurringItem } from '../../../types';
import type { PendingLink } from '../../LinkCategoryModal';
import { formatCurrency } from '../../../utils';
import { EmptyInboxIcon } from '../SetupWizardIcons';
import { FolderIcon } from '../../icons';
import { FrequencyGroup } from './FrequencyGroup';

interface ItemSelectionStepProps {
  readonly items: RecurringItem[];
  readonly selectedIds: Set<string>;
  readonly pendingLinks: Map<string, PendingLink>;
  readonly onToggleItem: (id: string) => void;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly onRefresh: () => void;
  readonly loading: boolean;
  readonly error: string | null;
  readonly onToggleGroup: (ids: string[], select: boolean) => void;
  readonly onLinkClick: (item: RecurringItem) => void;
  readonly onUnlink: (itemId: string) => void;
  readonly categoryGroupName: string;
  readonly onChangeGroup: () => void;
}

function LoadingState() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Loading Recurring Items...
      </h2>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div
              className="h-10 rounded-lg animate-pulse mb-2"
              style={{ backgroundColor: 'var(--monarch-bg-page)' }}
            />
            <div className="space-y-2 pl-2">
              {[1, 2].map((j) => (
                <div
                  key={j}
                  className="h-16 rounded-lg animate-pulse"
                  style={{ backgroundColor: 'var(--monarch-bg-page)', opacity: 0.6 }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  readonly error: string;
  readonly onRefresh: () => void;
}

function ErrorState({ error, onRefresh }: ErrorStateProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Create Dedicated Categories
      </h2>
      <div
        className="p-4 rounded-lg text-sm"
        style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}
      >
        {error}
      </div>
      <button
        onClick={onRefresh}
        className="mt-4 text-sm px-4 py-2 rounded-lg transition-colors"
        style={{
          color: 'var(--monarch-orange)',
          border: '1px solid var(--monarch-orange)',
          backgroundColor: 'transparent',
        }}
      >
        Try Again
      </button>
    </div>
  );
}

interface EmptyStateProps {
  readonly onRefresh: () => void;
  readonly loading: boolean;
}

function EmptyState({ onRefresh, loading }: EmptyStateProps) {
  return (
    <div className="animate-fade-in text-center py-8">
      <div className="mb-4 flex justify-center">
        <EmptyInboxIcon size={48} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        No Recurring Items Found
      </h2>
      <p style={{ color: 'var(--monarch-text-muted)' }}>
        You don't have any recurring transactions in Monarch Money yet, or they're all already being tracked.
      </p>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="mt-4 text-sm px-4 py-2 rounded-lg hover-bg-transparent-to-orange-light"
        style={{
          color: 'var(--monarch-orange)',
          border: '1px solid var(--monarch-orange)',
        }}
      >
        {loading ? 'Refreshing...' : 'Refresh from Monarch'}
      </button>
    </div>
  );
}

function groupItemsByFrequency(items: RecurringItem[]): Record<string, RecurringItem[]> {
  const groups = items.reduce((acc, item) => {
    const freq = item.frequency || 'monthly';
    acc[freq] ??= [];
    acc[freq].push(item);
    return acc;
  }, {} as Record<string, RecurringItem[]>);

  // Sort each group by amount descending
  Object.keys(groups).forEach(freq => {
    const group = groups[freq];
    if (group) {
      group.sort((a, b) => b.amount - a.amount);
    }
  });

  return groups;
}

export function ItemSelectionStep({
  items,
  selectedIds,
  pendingLinks,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onRefresh,
  loading,
  error,
  onToggleGroup,
  onLinkClick,
  onUnlink,
  categoryGroupName,
  onChangeGroup,
}: ItemSelectionStepProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRefresh={onRefresh} />;
  }

  if (items.length === 0) {
    return <EmptyState onRefresh={onRefresh} loading={loading} />;
  }

  const groupedItems = groupItemsByFrequency(items);
  const sortedFrequencies = Object.keys(groupedItems).filter((f: string) => {
    const group = groupedItems[f];
    return group && group.length > 0;
  });

  const totalMonthly = items.reduce((sum, i) => sum + i.monthly_contribution, 0);
  const selectedMonthly = items
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, i) => sum + i.monthly_contribution, 0);

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Create Dedicated Categories
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-text-muted)' }}>
        Each selected item will get its own budget category.
      </p>

      {/* Summary bar */}
      <div
        className="flex items-center justify-between p-3 rounded-lg mb-4"
        style={{ backgroundColor: 'rgba(255, 105, 45, 0.08)', border: '1px solid var(--monarch-border)' }}
      >
        <div>
          <span className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            {selectedIds.size} of {items.length}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--monarch-text-muted)' }}>
            items selected
          </span>
        </div>
        <div className="text-right">
          <span className="font-semibold" style={{ color: 'var(--monarch-orange)' }}>
            {formatCurrency(selectedMonthly)}
          </span>
          <span className="text-sm ml-1" style={{ color: 'var(--monarch-text-muted)' }}>
            / {formatCurrency(totalMonthly)} monthly
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={onSelectAll}
          className="text-xs px-3 py-1.5 rounded-full hover-bg-transparent-to-orange-light"
          style={{
            color: 'var(--monarch-orange)',
            border: '1px solid var(--monarch-orange)',
          }}
        >
          Select All
        </button>
        <button
          onClick={onDeselectAll}
          className="text-xs px-3 py-1.5 rounded-full hover-bg-transparent-to-hover"
          style={{
            color: 'var(--monarch-text-muted)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          Deselect All
        </button>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-full transition-colors ml-auto"
          style={{
            color: 'var(--monarch-text-muted)',
            border: '1px solid var(--monarch-border)',
            backgroundColor: 'transparent',
          }}
        >
          Refresh
        </button>
      </div>

      {/* Category group info */}
      <div
        className="flex items-center gap-2 mb-4 text-sm"
        style={{ color: 'var(--monarch-text-muted)' }}
      >
        <FolderIcon size={16} color="var(--monarch-orange)" />
        <span>Creating in:</span>
        <button
          onClick={onChangeGroup}
          className="font-medium hover:underline"
          style={{ color: 'var(--monarch-orange)' }}
        >
          {categoryGroupName || 'Select a group'}
        </button>
      </div>

      {/* Grouped items */}
      <div
        className="max-h-64 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {sortedFrequencies.map((frequency: string) => (
          <FrequencyGroup
            key={frequency}
            frequency={frequency}
            items={groupedItems[frequency] ?? []}
            selectedIds={selectedIds}
            pendingLinks={pendingLinks}
            onToggleItem={onToggleItem}
            onToggleGroup={onToggleGroup}
            onLinkClick={onLinkClick}
            onUnlink={onUnlink}
          />
        ))}
      </div>
    </div>
  );
}
