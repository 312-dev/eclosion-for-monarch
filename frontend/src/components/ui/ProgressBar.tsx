/**
 * ProgressBar Component
 *
 * Displays a horizontal progress bar with accessibility support.
 * Replaces inline progress bars in RecurringRow and RollupItemRow.
 *
 * Accessibility features:
 * - Uses progressbar role with aria attributes
 * - Announces progress to screen readers
 */

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  percent: number;
  /** Color of the progress fill */
  color?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Accessible label for the progress bar */
  'aria-label'?: string;
}

const SIZE_CLASSES = {
  sm: 'h-1',
  md: 'h-2',
};

/**
 * A horizontal progress bar component.
 */
export function ProgressBar({
  percent,
  color = 'var(--monarch-success)',
  size = 'sm',
  className = '',
  showLabel = false,
  'aria-label': ariaLabel = 'Progress',
}: ProgressBarProps) {
  // Clamp percent between 0 and 100
  const clampedPercent = Math.max(0, Math.min(100, percent));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clampedPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        className={`flex-1 ${SIZE_CLASSES[size]} rounded-full overflow-hidden`}
        style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      >
        <div
          className={`${SIZE_CLASSES[size]} rounded-full transition-all duration-300`}
          style={{
            width: `${clampedPercent}%`,
            backgroundColor: color,
          }}
          aria-hidden="true"
        />
      </div>
      {showLabel && (
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-hidden="true"
        >
          {Math.round(clampedPercent)}%
        </span>
      )}
    </div>
  );
}
