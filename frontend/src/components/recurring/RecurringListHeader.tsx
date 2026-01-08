/**
 * RecurringListHeader - Header with sort buttons for the RecurringList
 */

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

export function SortButton({ field, label, currentField, direction, onClick, align = 'left' }: SortButtonProps) {
  const isActive = currentField === field;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

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
  name: 'w-[42%]', // Name, icon, category, progress bar
  date: 'w-[12%]', // Due date
  budget: 'w-[23%]', // Budget input and target
  status: 'w-[14%]', // Status badge
  actions: 'w-[9%]', // Actions menu
} as const;

export function RecurringListHeader({ sortField, sortDirection, onSort }: RecurringListHeaderProps) {
  return (
    <thead>
      <tr className="bg-monarch-bg-page border-b border-monarch-border">
        <th className={`py-3 pl-5 pr-2 text-left ${COLUMN_WIDTHS.name}`}>
          <SortButton
            field="name"
            label="Recurring"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
          />
        </th>
        <th className={`py-3 px-4 text-left ${COLUMN_WIDTHS.date}`}>
          <SortButton
            field="due_date"
            label="Date"
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
          />
        </th>
        <th className={`py-3 px-4 text-right ${COLUMN_WIDTHS.budget}`}>
          <SortButton
            field="monthly"
            label={`${new Date().toLocaleDateString('en-US', { month: 'short' })}. Budget`}
            currentField={sortField}
            direction={sortDirection}
            onClick={onSort}
            align="right"
          />
        </th>
        <th className={`py-3 px-5 text-center text-sm font-medium text-monarch-text-light ${COLUMN_WIDTHS.status}`}>
          Status
        </th>
        <th className={`py-3 px-3 ${COLUMN_WIDTHS.actions}`}>
          <span className="sr-only">Actions</span>
        </th>
      </tr>
    </thead>
  );
}

export type { SortField, SortDirection };
