/**
 * RecurringToolHeader - Header section for the Recurring Tool settings card
 */

import { RecurringIcon } from '../wizards/SetupWizardIcons';
import { ToolSettingsHeader } from './ToolSettingsHeader';

interface RecurringToolHeaderProps {
  readonly hasAnythingToReset: boolean;
  readonly totalCategories: number;
  readonly totalItems: number;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

export function RecurringToolHeader({
  hasAnythingToReset,
  totalCategories,
  totalItems,
  isExpanded,
  onToggle,
}: RecurringToolHeaderProps) {
  const description = hasAnythingToReset ? (
    <span className="flex items-center gap-3">
      <span>
        {totalCategories} {totalCategories === 1 ? 'category' : 'categories'}
      </span>
      <span style={{ color: 'var(--monarch-border)' }}>|</span>
      <span>
        {totalItems} tracked {totalItems === 1 ? 'item' : 'items'}
      </span>
    </span>
  ) : (
    'Not configured'
  );

  const statusBadge = hasAnythingToReset ? (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{
        backgroundColor: 'var(--monarch-success-bg)',
        color: 'var(--monarch-success)',
      }}
    >
      Active
    </span>
  ) : undefined;

  return (
    <ToolSettingsHeader
      icon={<RecurringIcon size={20} />}
      title="Recurring Tool"
      description={description}
      isActive={hasAnythingToReset}
      statusBadge={statusBadge}
      isExpanded={isExpanded}
      onToggle={onToggle}
    />
  );
}
