/**
 * Overcommitted Banner
 *
 * Displays a red warning banner when the user's Available Funds is negative.
 */

import { Icons } from '../icons';

interface OvercommittedBannerProps {
  /** The negative available amount (formatted string like "-$3,969") */
  readonly formattedAmount: string;
}

/**
 * Warning banner shown when a user is overcommitted (Available Funds < 0).
 */
export function OvercommittedBanner({ formattedAmount }: OvercommittedBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4"
      style={{
        backgroundColor: 'var(--monarch-error-bg)',
        border: '1px solid var(--monarch-error)',
      }}
    >
      <Icons.Warning
        size={20}
        className="shrink-0"
        style={{ color: 'var(--monarch-error)' }}
        aria-hidden="true"
      />
      <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
        <span className="font-medium">You're overcommitted by {formattedAmount}.</span>{' '}
        <span style={{ color: 'var(--monarch-text-muted)' }}>
          Consider reducing budgets or stash targets.
        </span>
      </div>
    </div>
  );
}
