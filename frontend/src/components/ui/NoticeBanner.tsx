/**
 * NoticeBanner Component
 *
 * Displays a dismissable warning banner for removed recurring item notices.
 */

import { useState } from 'react';
import type { RemovedItemNotice } from '../../types';
import { dismissNotice } from '../../api/client';

export interface NoticeBannerProps {
  /** The notice to display */
  notice: RemovedItemNotice;
  /** Callback when notice is dismissed */
  onDismiss?: (noticeId: string) => void;
}

/**
 * A warning banner component for displaying removed item notices.
 */
export function NoticeBanner({ notice, onDismiss }: NoticeBannerProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await dismissNotice(notice.id);
      onDismiss?.(notice.id);
    } catch (error) {
      console.error('Failed to dismiss notice:', error);
      setIsDismissing(false);
    }
  };

  const rollupText = notice.was_rollup ? ' (was in rollup)' : '';

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-start gap-3 p-3 rounded-lg mb-2"
      style={{
        backgroundColor: 'var(--monarch-warning-bg)',
        border: '1px solid var(--monarch-warning)',
      }}
    >
      {/* Warning icon */}
      <svg
        className="w-5 h-5 shrink-0 mt-0.5"
        style={{ color: 'var(--monarch-warning)' }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>

      {/* Message */}
      <div className="flex-1 text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
        <strong>{notice.name}</strong> is no longer in Monarch{rollupText}. The link to{' '}
        <strong>{notice.category_name}</strong> has been removed. You'll need to set it up
        again if this transaction is re-added.
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isDismissing}
        className="shrink-0 p-1 rounded hover:bg-black/10 transition-colors disabled:opacity-50"
        aria-label={isDismissing ? 'Dismissing notice' : 'Dismiss notice'}
        aria-busy={isDismissing}
      >
        {isDismissing ? (
          <svg
            className="w-4 h-4 animate-spin"
            style={{ color: 'var(--monarch-text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            style={{ color: 'var(--monarch-text-muted)' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
