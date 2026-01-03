/**
 * RecurringList - Main list container for recurring items
 *
 * Displays a table of recurring transactions with sorting, filtering,
 * and inline editing capabilities.
 */

import { useState, useCallback, useMemo, Fragment } from 'react';
import type { RecurringItem } from '../types';
import * as api from '../api/client';
import * as demoApi from '../api/demoClient';
import { LinkCategoryModal } from './LinkCategoryModal';
import { Tooltip } from './ui/Tooltip';
import { useToast } from '../context/ToastContext';
import { useDemo } from '../context/DemoContext';
import { formatCurrency, formatFrequency, formatErrorMessage, FREQUENCY_ORDER } from '../utils';
import { Filter, Inbox, Eye, EyeOff } from 'lucide-react';
import { RecurringRow, RecurringListHeader } from './recurring';
import type { SortField, SortDirection } from './recurring';
import { UI } from '../constants';

interface RecurringListProps {
  readonly items: RecurringItem[];
  readonly onRefresh: () => void;
}

export function RecurringList({ items, onRefresh }: RecurringListProps) {
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [linkModalItem, setLinkModalItem] = useState<RecurringItem | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [hideDisabled, setHideDisabled] = useState(false);
  const toast = useToast();
  const isDemo = useDemo();
  const client = isDemo ? demoApi : api;

  const enabledCount = items.filter(item => item.is_enabled).length;
  const disabledCount = items.length - enabledCount;
  const filteredItems = hideDisabled ? items.filter(item => item.is_enabled) : items;

  const handleToggleItem = useCallback(async (id: string, enabled: boolean) => {
    try {
      await client.toggleItemTracking(id, enabled);
      setHighlightId(id);
      onRefresh();
      toast.success(enabled ? 'Tracking enabled' : 'Tracking disabled');
      setTimeout(() => setHighlightId(null), UI.HIGHLIGHT.ROW);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to toggle tracking'));
    }
  }, [client, onRefresh, toast]);

  const handleAllocateItem = useCallback(async (id: string, amount: number) => {
    try {
      await client.allocateFunds(id, amount);
      onRefresh();
      toast.success(amount > 0 ? `${formatCurrency(amount, { maximumFractionDigits: 0 })} allocated` : `${formatCurrency(Math.abs(amount), { maximumFractionDigits: 0 })} removed`);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to allocate funds'));
    }
  }, [client, onRefresh, toast]);

  const handleRecreateItem = useCallback(async (id: string) => {
    try {
      await client.recreateCategory(id);
      onRefresh();
      toast.success('Category recreated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to recreate category'));
    }
  }, [client, onRefresh, toast]);

  const handleChangeGroupItem = useCallback(async (id: string, groupId: string, groupName: string) => {
    try {
      await client.changeCategoryGroup(id, groupId, groupName);
      onRefresh();
      toast.success(`Moved to ${groupName}`);
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to change group'));
    }
  }, [client, onRefresh, toast]);

  const handleAddToRollupItem = useCallback(async (id: string) => {
    try {
      await client.addToRollup(id);
      onRefresh();
      toast.success('Added to rollup');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to add to rollup'));
    }
  }, [client, onRefresh, toast]);

  const handleEmojiChangeItem = useCallback(async (id: string, emoji: string) => {
    try {
      await client.updateCategoryEmoji(id, emoji);
      onRefresh();
      toast.success('Emoji updated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to update emoji'));
    }
  }, [client, onRefresh, toast]);

  const handleRefreshItem = useCallback(async (id: string) => {
    try {
      await client.refreshItem(id);
      onRefresh();
      toast.success('Target recalculated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to recalculate target'));
    }
  }, [client, onRefresh, toast]);

  const handleNameChangeItem = useCallback(async (id: string, name: string) => {
    try {
      await client.updateCategoryName(id, name);
      onRefresh();
      toast.success('Name updated');
    } catch (err) {
      toast.error(formatErrorMessage(err, 'Failed to update name'));
    }
  }, [client, onRefresh, toast]);

  const handleLinkCategory = useCallback((item: RecurringItem) => {
    setLinkModalItem(item);
  }, []);

  const handleLinkSuccess = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

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
        <SectionHeader
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
        <SectionHeader
          enabledCount={enabledCount}
          disabledCount={disabledCount}
          hideDisabled={hideDisabled}
          onToggleHide={() => setHideDisabled(!hideDisabled)}
        />

        <table className="w-full animate-fade-in">
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
          onClose={() => setLinkModalItem(null)}
          onSuccess={handleLinkSuccess}
        />
      )}
    </div>
  );
}

// Section header component
interface SectionHeaderProps {
  enabledCount: number;
  disabledCount: number;
  hideDisabled: boolean;
  onToggleHide: () => void;
}

function SectionHeader({ enabledCount, disabledCount, hideDisabled, onToggleHide }: Readonly<SectionHeaderProps>) {
  return (
    <div className="px-5 py-4 flex items-center justify-between bg-monarch-bg-card border-b border-monarch-border">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-monarch-text-dark">
            Dedicated Categories
          </span>
          <span className="text-xs text-monarch-text-muted">
            ({enabledCount})
          </span>
        </div>
        <span className="text-sm text-monarch-text-light">
          Larger recurring transactions that get their own budget category for better tracking
        </span>
      </div>
      <div className="flex items-center gap-4">
        {disabledCount > 0 && (
          <Tooltip content={hideDisabled ? `Show ${disabledCount} untracked` : `Hide ${disabledCount} untracked`}>
            <button
              onClick={onToggleHide}
              className="p-1.5 rounded-md transition-colors text-monarch-text-muted hover:bg-monarch-bg-elevated"
            >
              {hideDisabled ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
