/**
 * RecurringList - Main list container for recurring items
 *
 * Displays a table of recurring transactions with sorting, filtering,
 * and inline editing capabilities.
 */

import { useState, useCallback, useMemo, Fragment } from 'react';
import type { RecurringItem } from '../types';
import { LinkCategoryModal } from './LinkCategoryModal';
import { formatFrequency, FREQUENCY_ORDER } from '../utils';
import { Filter, Inbox } from 'lucide-react';
import {
  RecurringRow,
  RecurringListHeader,
  RecurringCard,
  RecurringListSectionHeader,
} from './recurring';
import type { SortField, SortDirection } from './recurring';
import { useRecurringItemActions, useMediaQuery } from '../hooks';

interface RecurringListProps {
  readonly items: RecurringItem[];
  readonly onRefresh: () => void;
  readonly showCategoryGroup?: boolean;
}

export function RecurringList({ items, onRefresh, showCategoryGroup = true }: RecurringListProps) {
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [hideDisabled, setHideDisabled] = useState(false);

  // Detect which layout is visible (cards below 1280px, table at 1280px+)
  // Tour data attributes should only be on the visible layout to avoid selector conflicts
  const isCardLayout = useMediaQuery('(max-width: 1279px)');

  const {
    highlightId,
    linkModalItem,
    handleToggleItem,
    handleAllocateItem,
    handleRecreateItem,
    handleChangeGroupItem,
    handleAddToRollupItem,
    handleEmojiChangeItem,
    handleRefreshItem,
    handleNameChangeItem,
    handleLinkCategory,
    handleLinkSuccess,
    closeLinkModal,
  } = useRecurringItemActions(onRefresh);

  const enabledCount = items.filter(item => item.is_enabled).length;
  const disabledCount = items.length - enabledCount;
  const filteredItems = hideDisabled ? items.filter(item => item.is_enabled) : items;

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const sortItems = useCallback((itemsToSort: RecurringItem[]) => {
    return [...itemsToSort].sort((a, b) => {
      if (a.is_enabled !== b.is_enabled) {
        return a.is_enabled ? -1 : 1;
      }

      let comparison = 0;
      switch (sortField) {
        case 'due_date':
          comparison = new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'monthly': {
          comparison = a.frozen_monthly_target - b.frozen_monthly_target;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortField, sortDirection]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const freq = item.frequency;
      if (!acc[freq]) acc[freq] = [];
      acc[freq].push(item);
      return acc;
    }, {} as Record<string, RecurringItem[]>);
  }, [filteredItems]);

  const sortedFrequencies = useMemo(() => {
    return Object.keys(groupedItems).sort(
      (a, b) => (FREQUENCY_ORDER[a] || 99) - (FREQUENCY_ORDER[b] || 99)
    );
  }, [groupedItems]);

  // Compute tour target IDs for specific items (first of each type)
  const tourTargetIds = useMemo(() => {
    // Flatten all items in render order
    const allItems = sortedFrequencies.flatMap(
      (freq) => sortItems(groupedItems[freq] ?? [])
    );

    // Find first item matching each condition
    const firstIndividual = allItems.find((i) => i.is_enabled && !i.is_in_rollup);
    const firstBehind = allItems.find((i) => i.is_enabled && i.status === 'behind');
    const firstDisabled = allItems.find((i) => !i.is_enabled);

    const targets: Record<string, string> = {};
    if (firstIndividual) targets[firstIndividual.id] = 'individual-item';
    if (firstBehind && !targets[firstBehind.id]) targets[firstBehind.id] = 'item-status';
    if (firstDisabled && !targets[firstDisabled.id]) targets[firstDisabled.id] = 'disabled-section';

    return targets;
  }, [sortedFrequencies, groupedItems, sortItems]);

  // True empty state - no categories at all
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-monarch-text-muted">
        <Inbox size={48} strokeWidth={1.5} className="mb-4 opacity-50" />
        <p className="text-lg font-medium mb-1 text-monarch-text-light">
          No recurring items found
        </p>
        <p className="text-sm">
          Click "Sync Now" to fetch your recurring transactions from Monarch.
        </p>
      </div>
    );
  }

  // Filtered empty state - items exist but are hidden by filters
  if (filteredItems.length === 0) {
    return (
      <div className="rounded-xl shadow-sm overflow-hidden bg-monarch-bg-card border border-monarch-border">
        <RecurringListSectionHeader
          enabledCount={enabledCount}
          disabledCount={disabledCount}
          hideDisabled={hideDisabled}
          onToggleHide={() => setHideDisabled(!hideDisabled)}
        />
        <div className="flex flex-col items-center justify-center py-16 text-monarch-text-muted">
          <Filter size={40} strokeWidth={1.5} className="mb-4 opacity-50" />
          <p className="text-base font-medium mb-1 text-monarch-text-light">
            All items hidden by filters
          </p>
          <p className="text-sm">
            {disabledCount} disabled item{disabledCount !== 1 ? 's are' : ' is'} currently hidden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl shadow-sm overflow-hidden bg-monarch-bg-card border border-monarch-border">
        <RecurringListSectionHeader
          enabledCount={enabledCount}
          disabledCount={disabledCount}
          hideDisabled={hideDisabled}
          onToggleHide={() => setHideDisabled(!hideDisabled)}
        />

        {/* Mobile: Card Layout */}
        <div className="recurring-cards">
          {sortedFrequencies.map((frequency, index) => (
            <Fragment key={frequency}>
              <div className={`recurring-cards-group-header ${index === 0 ? 'mt-0!' : ''}`}>
                {formatFrequency(frequency)}
              </div>
              {sortItems(groupedItems[frequency] ?? []).map((item) => (
                <RecurringCard
                  key={item.id}
                  item={item}
                  onToggle={handleToggleItem}
                  onAllocate={handleAllocateItem}
                  onRecreate={handleRecreateItem}
                  onChangeGroup={handleChangeGroupItem}
                  onAddToRollup={handleAddToRollupItem}
                  onEmojiChange={handleEmojiChangeItem}
                  onRefreshItem={handleRefreshItem}
                  onNameChange={handleNameChangeItem}
                  onLinkCategory={handleLinkCategory}
                  highlightId={highlightId}
                  showCategoryGroup={showCategoryGroup}
                  {...(isCardLayout && tourTargetIds[item.id] && { dataTourId: tourTargetIds[item.id] })}
                />
              ))}
            </Fragment>
          ))}
        </div>

        {/* Desktop: Table Layout */}
        <table className="recurring-table animate-fade-in">
          <RecurringListHeader
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          <tbody>
            {sortedFrequencies.map((frequency, index) => (
              <Fragment key={frequency}>
                <tr>
                  <td
                    colSpan={6}
                    className={`py-2 px-5 text-xs font-medium uppercase tracking-wide bg-monarch-bg-page text-monarch-text-muted border-b border-monarch-border ${index > 0 ? 'border-t' : ''}`}
                  >
                    {formatFrequency(frequency)}
                  </td>
                </tr>
                {sortItems(groupedItems[frequency] ?? []).map((item) => (
                  <RecurringRow
                    key={item.id}
                    item={item}
                    onToggle={handleToggleItem}
                    onAllocate={handleAllocateItem}
                    onRecreate={handleRecreateItem}
                    onChangeGroup={handleChangeGroupItem}
                    onAddToRollup={handleAddToRollupItem}
                    onEmojiChange={handleEmojiChangeItem}
                    onRefreshItem={handleRefreshItem}
                    onNameChange={handleNameChangeItem}
                    onLinkCategory={handleLinkCategory}
                    highlightId={highlightId}
                    showCategoryGroup={showCategoryGroup}
                    {...(!isCardLayout && tourTargetIds[item.id] && { dataTourId: tourTargetIds[item.id] })}
                  />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Link Category Modal */}
      {linkModalItem && (
        <LinkCategoryModal
          item={linkModalItem}
          isOpen={true}
          onClose={closeLinkModal}
          onSuccess={handleLinkSuccess}
        />
      )}
    </div>
  );
}
