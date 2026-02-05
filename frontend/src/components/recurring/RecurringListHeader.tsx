/**
 * RecurringListHeader - Header with sort buttons for the RecurringList
 */

import { useDataMonth, formatMonthShort } from '../../context/MonthTransitionContext';

type SortField = 'due_date' | 'amount' | 'name' | 'monthly';
type SortDirection = 'asc' | 'desc';

interface SortButtonProps {
  readonly field: SortField;
  readonly label: string;
  readonly currentField: SortField;
  readonly direction: SortDirection;
  readonly onClick: (field: SortField) => void;
  readonly align?: 'left' | 'right' | 'center';
}

export function SortButton({
  field,
  label,
  currentField,
  direction,
  onClick,
  align = 'left',
}: SortButtonProps) {
  const isActive = currentField === field;
  let alignClass = 'justify-start';
  if (align === 'right') {
    alignClass = 'justify-end';
  } else if (align === 'center') {
    alignClass = 'justify-center';
  }

  return (
    <button
      onClick={() => onClick(field)}
      className={`flex items-center gap-1 text-sm font-medium w-full ${alignClass} ${isActive ? 'text-monarch-text-dark' : 'text-monarch-text-light'}`}
    >
      {label}
      {isActive && (
        <span className="text-xs text-monarch-text-light">{direction === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

interface RecurringListHeaderProps {
  readonly sortField: SortField;
  readonly sortDirection: SortDirection;
  readonly onSort: (field: SortField) => void;
}

/**
 * Column width classes for the recurring table
 * These must match the widths used in RecurringRow.tsx
 */
export const COLUMN_WIDTHS = {
  name: 'w-[50%]', // Name, icon, category
  date: 'w-[12%]', // Due date
  budget: 'w-[22%]', // Budget input and target
  status: 'w-[16%]', // Status badge
} as const;

export function RecurringListHeader({
  sortField,
  sortDirection,
  onSort,
}: RecurringListHeaderProps) {
  const dataMonth = useDataMonth();
  const monthLabel = formatMonthShort(dataMonth);

  return (
    <thead>
      <tr className="bg-monarch-bg-page border-b border-monarch-border">
        <th className={`py-3 pl-4 pr-2 text-left ${COLUMN_WIDTHS.name}`}>
          <SortButton
            field="name"
            label="Recurring"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
          />
        </th>
        <th className={`py-3 px-3 text-left ${COLUMN_WIDTHS.date}`}>
          <SortButton
            field="due_date"
            label="Date"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
          />
        </th>
        <th className={`py-3 px-3 text-right ${COLUMN_WIDTHS.budget}`}>
          <SortButton
            field="monthly"
            label={`${monthLabel}. Budget`}
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
            align="right"
          />
        </th>
        <th
          className={`py-3 px-3 text-center text-sm font-medium text-monarch-text-light ${COLUMN_WIDTHS.status}`}
        >
          Status
        </th>
      </tr>
    </thead>
  );
}

export type { SortField, SortDirection };
