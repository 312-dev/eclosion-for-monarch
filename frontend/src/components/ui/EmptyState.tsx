/**
 * EmptyState Component
 *
 * A consistent empty state display for when there is no content to show.
 * Features:
 * - Customizable icon, title, description
 * - Optional action button
 * - Multiple size variants
 * - Fully accessible
 */

import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Icon to display (React node, typically an SVG or icon component) */
  readonly icon?: ReactNode;
  /** Main title text */
  readonly title: string;
  /** Optional description text */
  readonly description?: string;
  /** Optional action element (typically a Button) */
  readonly action?: ReactNode;
  /** Size variant */
  readonly size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  readonly className?: string;
}

const SIZE_CONFIG = {
  sm: {
    container: 'py-6',
    iconContainer: 'mb-2',
    iconSize: 'h-8 w-8',
    title: 'text-sm font-medium',
    description: 'text-xs',
    actionSpacing: 'mt-3',
  },
  md: {
    container: 'py-10',
    iconContainer: 'mb-3',
    iconSize: 'h-12 w-12',
    title: 'text-base font-semibold',
    description: 'text-sm',
    actionSpacing: 'mt-4',
  },
  lg: {
    container: 'py-16',
    iconContainer: 'mb-4',
    iconSize: 'h-16 w-16',
    title: 'text-lg font-semibold',
    description: 'text-base',
    actionSpacing: 'mt-6',
  },
};

/**
 * A consistent empty state display component.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No items"
 *   description="Add an item to get started"
 *   action={<Button>Add Item</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const config = SIZE_CONFIG[size];

  return (
    <output
      className={`flex flex-col items-center justify-center text-center ${config.container} ${className}`}
      aria-label={title}
    >
      {icon && (
        <div
          className={`${config.iconContainer} ${config.iconSize} flex items-center justify-center`}
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <h3 className={config.title} style={{ color: 'var(--monarch-text)' }}>
        {title}
      </h3>

      {description && (
        <p
          className={`mt-1 max-w-sm ${config.description}`}
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          {description}
        </p>
      )}

      {action && <div className={config.actionSpacing}>{action}</div>}
    </output>
  );
}

/**
 * Default empty state icon - a simple inbox/empty box icon.
 */
export function EmptyStateIcon({ className = '' }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
