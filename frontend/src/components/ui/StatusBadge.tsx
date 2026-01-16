/**
 * StatusBadge Component
 *
 * Displays a styled badge indicating item status.
 * Replaces inline status rendering in RecurringRow and RollupItemRow.
 */

import { memo } from 'react';
import type { ItemStatus } from '../../types';
import { getStatusLabel, getStatusStyles } from '../../utils';

export interface StatusBadgeProps {
  /** The item status to display */
  status: ItemStatus;
  /** Whether the item is enabled (affects styling) */
  isEnabled?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Whether the badge should appear interactive */
  interactive?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A styled badge component for displaying item status.
 */
export const StatusBadge = memo(function StatusBadge({
  status,
  isEnabled = true,
  onClick,
  interactive = false,
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const styles = getStatusStyles(status, isEnabled);
  const label = getStatusLabel(status, isEnabled);

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const interactiveClasses = interactive || onClick ? 'cursor-pointer hover:opacity-80' : '';
  const baseClasses = `inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClasses} ${interactiveClasses} ${className}`;

  // Use native button element when interactive for better accessibility
  if (onClick) {
    return (
      <button
        type="button"
        className={baseClasses}
        style={{ backgroundColor: styles.bg, color: styles.color }}
        onClick={onClick}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={baseClasses} style={{ backgroundColor: styles.bg, color: styles.color }}>
      {label}
    </span>
  );
});
