/**
 * LoadingSpinner Component
 *
 * A consistent, accessible loading spinner using SpinnerDotted.
 * Features:
 * - Size variants
 * - Color customization
 * - Screen reader support
 * - Replaces inline SVG spinners throughout the app
 */

import { SpinnerDotted } from 'spinners-react';

export interface LoadingSpinnerProps {
  /** Size of the spinner in pixels */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Color of the spinner */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Screen reader label (defaults to "Loading") */
  label?: string;
}

const SIZE_MAP = {
  sm: 24,
  md: 40,
  lg: 64,
};

/**
 * A consistent, accessible loading spinner component.
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="md" />
 * <LoadingSpinner size="lg" color="var(--monarch-orange)" />
 * <LoadingSpinner size={50} />
 * ```
 */
export function LoadingSpinner({
  size = 'md',
  color = 'var(--monarch-orange)',
  className = '',
  label = 'Loading',
}: Readonly<LoadingSpinnerProps>) {
  const sizeValue = typeof size === 'number' ? size : SIZE_MAP[size];

  return (
    <output
      aria-label={label}
      aria-live="polite"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <SpinnerDotted
        size={sizeValue}
        thickness={100}
        speed={100}
        color={color}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </output>
  );
}

/**
 * A centered page-level loading spinner.
 * Use this for full-page or section loading states.
 */
export function PageLoadingSpinner({
  message,
  size = 90,
  className = '',
}: Readonly<{
  message?: string;
  size?: number;
  className?: string;
}>) {
  return (
    <output
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      aria-live="polite"
    >
      <SpinnerDotted
        size={size}
        thickness={100}
        speed={100}
        color="var(--monarch-orange)"
        aria-hidden="true"
      />
      {message && <span style={{ color: 'var(--monarch-text-muted)' }}>{message}</span>}
      <span className="sr-only">{message || 'Loading'}</span>
    </output>
  );
}

/**
 * A muted, centered loading spinner for content areas.
 * Use this for section/feature loading states (e.g., Notes tab, settings panels).
 * Styled consistently with EmptyState for visual harmony.
 *
 * @param fullHeight - When true, fills the content pane with a larger centered spinner
 */
export function ContentLoadingSpinner({
  message,
  size = 'md',
  fullHeight = false,
  className = '',
}: Readonly<{
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  className?: string;
}>) {
  const sizeConfig = {
    sm: { spinner: 32, container: 'py-6', text: 'text-xs' },
    md: { spinner: 48, container: 'py-10', text: 'text-sm' },
    lg: { spinner: 64, container: 'py-16', text: 'text-base' },
  };

  const config = sizeConfig[size];

  // Full height mode: larger spinner, fills content pane
  if (fullHeight) {
    return (
      <output
        className={`flex flex-col items-center justify-center gap-4 min-h-[60vh] ${className}`}
        aria-live="polite"
        aria-label={message ?? 'Loading'}
      >
        <SpinnerDotted
          size={80}
          thickness={100}
          speed={100}
          color="var(--monarch-text-muted)"
          aria-hidden="true"
        />
        {message && (
          <span className="text-base" style={{ color: 'var(--monarch-text-muted)' }}>
            {message}
          </span>
        )}
        <span className="sr-only">{message ?? 'Loading'}</span>
      </output>
    );
  }

  return (
    <output
      className={`flex flex-col items-center justify-center gap-3 ${config.container} ${className}`}
      aria-live="polite"
      aria-label={message ?? 'Loading'}
    >
      <SpinnerDotted
        size={config.spinner}
        thickness={100}
        speed={100}
        color="var(--monarch-text-muted)"
        aria-hidden="true"
      />
      {message && (
        <span className={config.text} style={{ color: 'var(--monarch-text-muted)' }}>
          {message}
        </span>
      )}
      <span className="sr-only">{message ?? 'Loading'}</span>
    </output>
  );
}

/**
 * A full-screen loading overlay.
 */
export function LoadingOverlay({
  message = 'Loading...',
}: Readonly<{
  message?: string;
}>) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-modal">
      <div
        className="flex flex-col items-center gap-4 p-6 rounded-lg"
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        <SpinnerDotted
          size={64}
          thickness={100}
          speed={100}
          color="var(--monarch-orange)"
          aria-hidden="true"
        />
        <span style={{ color: 'var(--monarch-text-dark)' }}>{message}</span>
      </div>
    </div>
  );
}
