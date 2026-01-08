/**
 * Rollup Items Table
 *
 * Table displaying rollup items grouped by frequency.
 */

import React, { useMemo, useCallback } from 'react';
import type { RollupItem } from '../../types';
import { formatFrequency } from '../../utils';
import { PlusIcon } from '../icons';
import { RollupItemRow } from './RollupItemRow';

interface RollupItemsTableProps {
  readonly items: RollupItem[];
  readonly onRemoveItem: (id: string) => Promise<void>;
}

const FREQUENCY_ORDER: Record<string, number> = {
  yearly: 1,
  semiyearly: 2,
  quarterly: 3,
  monthly: 4,
  twice_a_month: 5,
  every_two_weeks: 6,
  weekly: 7,
};

export function RollupItemsTable({ items, onRemoveItem }: RollupItemsTableProps) {
  // Group items by frequency
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const freq = item.frequency;
      if (!acc[freq]) acc[freq] = [];
      acc[freq].push(item);
      return acc;
    }, {} as Record<string, RollupItem[]>);
  }, [items]);

  // Sort frequency keys
  const sortedFrequencies = useMemo(() => {
    return Object.keys(groupedItems).sort(
      (a, b) => (FREQUENCY_ORDER[a] || 99) - (FREQUENCY_ORDER[b] || 99)
    );
  }, [groupedItems]);

  // Sort items within each frequency group by due date
  const sortedGroupedItems = useMemo(() => {
    const result: Record<string, RollupItem[]> = {};
    for (const freq of sortedFrequencies) {
      const freqItems = groupedItems[freq];
      if (freqItems) {
        result[freq] = [...freqItems].sort((a, b) =>
          new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
        );
      }
    }
    return result;
  }, [groupedItems, sortedFrequencies]);

  // Compute the first item ID for tour targeting
  const firstItemId = useMemo(() => {
    for (const freq of sortedFrequencies) {
      const freqItems = sortedGroupedItems[freq];
      const firstItem = freqItems?.[0];
      if (firstItem) {
        return firstItem.id;
      }
    }
    return null;
  }, [sortedFrequencies, sortedGroupedItems]);

  // Memoize remove handler creator
  const handleRemoveItem = useCallback((itemId: string) => {
    return () => onRemoveItem(itemId);
  }, [onRemoveItem]);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-monarch-text-muted">
        <PlusIcon size={32} strokeWidth={1.5} className="mx-auto mb-2" />
        <p className="text-sm">Use the "Add to rollup" action on recurring items to add them here</p>
      </div>
    );
  }

  return (
    <table className="w-full animate-fade-in">
      <thead>
        <tr className="bg-monarch-bg-page border-b border-monarch-border">
          <th className="py-2 px-3 text-left text-xs font-medium text-monarch-text-muted">
            Recurring
          </th>
          <th className="py-2 px-3 text-left text-xs font-medium text-monarch-text-muted">
            Date
          </th>
          <th className="py-2 px-3 text-right text-xs font-medium text-monarch-text-muted">
            Total Cost
          </th>
          <th className="py-2 px-3 text-right text-xs font-medium text-monarch-text-muted">
            Monthly Set-aside
          </th>
          <th className="py-2 px-3 w-12"></th>
        </tr>
      </thead>
      <tbody>
        {sortedFrequencies.map((frequency) => {
          const frequencyItems = sortedGroupedItems[frequency];
          if (!frequencyItems) return null;
          return (
            <React.Fragment key={frequency}>
              <tr>
                <td
                  colSpan={5}
                  className="py-1 px-3 text-[10px] font-medium uppercase tracking-wide bg-monarch-bg-hover text-monarch-text-muted"
                >
                  {formatFrequency(frequency)}
                </td>
              </tr>
              {frequencyItems.map((item) => (
                <RollupItemRow
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveItem(item.id)}
                  {...(item.id === firstItemId && { dataTourId: 'rollup-item' })}
                />
              ))}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
