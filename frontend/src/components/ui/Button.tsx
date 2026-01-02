/**
 * Button Component
 *
 * A consistent, accessible button component with multiple variants.
 * Replaces inconsistent inline button styling throughout the app.
 *
 * Accessibility features:
 * - Proper disabled state with aria-disabled
 * - Loading state announced to screen readers
 * - Focus indicators
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { SpinnerIcon } from '../icons';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button shows loading state */
  loading?: boolean;
  /** Whether button takes full width */
  fullWidth?: boolean;
  /** Button content */
  children: ReactNode;
  /** Loading text for screen readers (defaults to "Loading") */
  loadingText?: string;
}

const VARIANT_STYLES = {
  primary: {
    color: 'white',
    border: 'transparent',
    hoverClass: 'btn-primary-hover',
  },
  secondary: {
    color: 'var(--monarch-text)',
    border: 'var(--monarch-border)',
    hoverClass: 'btn-secondary-hover',
  },
  ghost: {
    color: 'var(--monarch-text-muted)',
    border: 'transparent',
    hoverClass: 'btn-ghost-hover',
  },
  danger: {
    color: 'white',
    border: 'transparent',
    hoverClass: 'btn-danger-hover',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

/**
 * A consistent button component.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = '',
  style,
  loadingText = 'Loading',
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeClass = SIZE_CLASSES[size];
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={ariaLabel}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-md font-medium
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyle.hoverClass}
        ${sizeClass}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      style={{
        color: variantStyle.color,
        border: `1px solid ${variantStyle.border}`,
        ...style,
      }}
      {...props}
    >
      {loading && (
        <>
          <SpinnerIcon size={16} aria-hidden="true" />
          <span className="sr-only">{loadingText}</span>
        </>
      )}
      {children}
    </button>
  );
}
