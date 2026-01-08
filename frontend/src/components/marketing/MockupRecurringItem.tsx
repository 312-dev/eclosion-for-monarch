/**
 * MockupRecurringItem
 *
 * Static version of a recurring expense item for marketing mockups.
 * Non-interactive, renders with hardcoded demo data.
 */

import { Icons } from '../icons';
import type { MockupIndividualItem } from '../../data/mockupData';

interface MockupRecurringItemProps {
  item: MockupIndividualItem;
}

export function MockupRecurringItem({ item }: MockupRecurringItemProps) {
  const statusColors = {
    funded: 'bg-[var(--monarch-success)] text-white',
    on_track: 'bg-[var(--monarch-success-bg)] text-[var(--monarch-success)]',
    behind: 'bg-[var(--monarch-warning-bg)] text-[var(--monarch-warning)]',
  };

  const statusLabels = {
    funded: 'Funded',
    on_track: 'On Track',
    behind: 'Behind',
  };

  const IconComponent = Icons[item.icon];

  return (
    <div className="flex items-center gap-4 p-4 bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] rounded-xl">
      {/* Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-lg"
        style={{ backgroundColor: `${item.iconColor}15` }}
      >
        <IconComponent size={20} color={item.iconColor} aria-hidden="true" />
      </div>

      {/* Name and due date */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-[var(--monarch-text-dark)] truncate">
          {item.name}
        </div>
        <div className="text-sm text-[var(--monarch-text-muted)]">
          Due in {item.dueIn}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-24 hidden sm:block">
        <div className="h-2 bg-[var(--monarch-bg-page)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--monarch-orange)] rounded-full transition-all"
            style={{ width: `${item.progress}%` }}
          />
        </div>
        <div className="text-xs text-[var(--monarch-text-muted)] mt-1 text-center">
          {item.progress}%
        </div>
      </div>

      {/* Budget / Target input style */}
      <div className="flex flex-col items-end">
        <div className="flex items-center whitespace-nowrap rounded bg-[var(--monarch-bg-card)] border border-[var(--monarch-border)] px-2 py-1">
          <span className="font-medium text-[var(--monarch-text-dark)]">$</span>
          <span className="w-10 text-right font-medium text-[var(--monarch-text-dark)]">
            {item.budget}
          </span>
          <span className="text-[var(--monarch-text-muted)] ml-1">/ {item.target}</span>
        </div>
        <div className="text-xs text-[var(--monarch-text-light)] text-right mt-0.5">
          ${item.amount.toLocaleString()}/yr
        </div>
      </div>

      {/* Status badge */}
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}
      >
        {statusLabels[item.status]}
      </span>
    </div>
  );
}
