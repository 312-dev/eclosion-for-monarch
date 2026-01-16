/**
 * Month Transition Banner
 *
 * Info/warning banner shown when month has changed and sync is needed.
 * States:
 * - syncing: "Syncing data for January..."
 * - stale: "Data is from December. Waiting to sync January data." (rate limited)
 * - failed: "Failed to sync January data. [Retry]"
 */

import { RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { useMonthTransition, formatMonthName } from '../../context/MonthTransitionContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDemo } from '../../context/DemoContext';

export function MonthTransitionBanner() {
  const isDemo = useDemo();

  // Skip in demo mode - no month transition handling
  if (isDemo) {
    return null;
  }

  return <MonthTransitionBannerContent />;
}

function MonthTransitionBannerContent() {
  const {
    currentCalendarMonth,
    dataMonth,
    transitionState,
    syncError,
    triggerMonthSync,
    dismissError,
  } = useMonthTransition();
  const isRateLimited = useIsRateLimited();

  // Don't show if data is current or no data yet
  if (transitionState === 'current' || !dataMonth) {
    return null;
  }

  const currentMonthName = formatMonthName(currentCalendarMonth);
  const dataMonthName = formatMonthName(dataMonth);

  if (transitionState === 'syncing') {
    return (
      <output
        aria-live="polite"
        className="flex items-center gap-3 py-2 px-4 text-sm"
        style={{
          backgroundColor: 'var(--monarch-info-bg)',
          borderBottom: '1px solid var(--monarch-info)',
          color: 'var(--monarch-info)',
          flexShrink: 0,
        }}
      >
        <RefreshCw size={16} className="animate-spin shrink-0" aria-hidden="true" />
        <span>Syncing data for {currentMonthName}...</span>
      </output>
    );
  }

  if (transitionState === 'failed') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="flex items-center justify-between gap-3 py-2 px-4 text-sm"
        style={{
          backgroundColor: 'var(--monarch-error-bg)',
          borderBottom: '1px solid var(--monarch-error)',
          color: 'var(--monarch-error)',
          flexShrink: 0,
        }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span>
            Failed to sync {currentMonthName} data.
            {syncError && <span className="opacity-75"> ({syncError})</span>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={dismissError}
            className="px-2 py-1 text-xs opacity-75 hover:opacity-100 transition-opacity"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => void triggerMonthSync()}
            disabled={isRateLimited}
            className="px-3 py-1 rounded text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--monarch-error)',
              color: 'white',
            }}
            aria-label="Retry sync"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // transitionState === 'stale' (rate limited, waiting)
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 py-2 px-4 text-sm"
      style={{
        backgroundColor: 'var(--monarch-warning-bg)',
        borderBottom: '1px solid var(--monarch-warning)',
        color: 'var(--monarch-warning)',
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-2">
        <Clock size={16} className="shrink-0" aria-hidden="true" />
        <span>
          Data is from {dataMonthName}. Waiting to sync {currentMonthName} data.
        </span>
      </div>
      {!isRateLimited && (
        <button
          type="button"
          onClick={() => void triggerMonthSync()}
          className="px-3 py-1 rounded text-xs font-medium transition-colors shrink-0"
          style={{
            backgroundColor: 'var(--monarch-warning)',
            color: 'white',
          }}
          aria-label="Sync now"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
