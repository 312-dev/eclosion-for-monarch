import { useState, useEffect } from 'react';
import { UI } from '../constants';
import { SpinnerIcon, SyncIcon } from './icons';
import { Tooltip } from './ui/Tooltip';
import { useIsRateLimited } from '../context/RateLimitContext';

interface SyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  lastSync?: string | null;
  compact?: boolean;
  /** Whether sync is blocked (e.g., due to auth issues) */
  syncBlocked?: boolean;
  /** Whether data is being fetched/refreshed from Monarch */
  isFetching?: boolean;
}

function formatLastSync(timestamp: string | null): string {
  if (!timestamp) return 'Never synced';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  // Handle negative values (clock skew or future timestamps) gracefully
  if (diffSecs < 5) return 'Just now';

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

// eslint-disable-next-line sonarjs/cognitive-complexity -- Sync button has multiple visual states (loading, blocked, rate-limited) that require conditional rendering
export function SyncButton({
  onSync,
  isSyncing,
  lastSync,
  compact = false,
  syncBlocked = false,
  isFetching = false,
}: SyncButtonProps) {
  // Normalize undefined to null for formatLastSync
  const normalizedLastSync = lastSync ?? null;
  const [formattedTime, setFormattedTime] = useState(() => formatLastSync(normalizedLastSync));
  const isRateLimited = useIsRateLimited();

  // Combined loading state: either syncing or fetching data
  const isLoading = isSyncing || isFetching;

  // Disable sync when rate limited
  const isDisabled = isLoading || isRateLimited;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync derived state with prop
    setFormattedTime(formatLastSync(normalizedLastSync));

    if (!normalizedLastSync) return;

    const interval = setInterval(() => {
      setFormattedTime(formatLastSync(normalizedLastSync));
    }, UI.INTERVAL.SYNC_STATUS);

    return () => clearInterval(interval);
  }, [normalizedLastSync]);

  // Determine the status text based on current state
  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (isFetching) return 'Refreshing...';
    if (lastSync) return formattedTime;
    return 'Never synced';
  };

  if (compact) {
    const syncStatus = lastSync ? `Synced ${formattedTime}` : 'Not yet synced';
    const statusText = getStatusText();
    const showSyncedPrefix = !isLoading && lastSync;

    const compactButton = (
      <button
        type="button"
        onClick={onSync}
        disabled={isDisabled}
        className={`flex items-center gap-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed transition-colors hover:opacity-70 ${
          isLoading ? 'cursor-wait' : ''
        }`}
        style={{ color: syncBlocked ? 'var(--monarch-warning)' : 'var(--monarch-text-muted)' }}
        aria-label={
          isLoading ? 'Syncing data with Monarch' : `Sync now. Last synced: ${syncStatus}`
        }
        aria-busy={isLoading}
      >
        {isLoading ? <SpinnerIcon size={14} /> : <SyncIcon size={14} />}
        <span aria-live="polite">
          {showSyncedPrefix && <span className="hidden sm:inline">Synced </span>}
          {statusText}
        </span>
      </button>
    );

    return (
      <div className="flex items-center gap-2">
        {isRateLimited ? (
          <Tooltip content="Rate limited — please wait a few minutes">
            <span className="inline-block">{compactButton}</span>
          </Tooltip>
        ) : (
          compactButton
        )}
        {syncBlocked && !isSyncing && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium rounded"
            style={{
              backgroundColor: 'var(--monarch-warning-bg)',
              color: 'var(--monarch-warning)',
            }}
            title="Sync is blocked - re-authentication required"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Stale
          </span>
        )}
      </div>
    );
  }

  const statusText = getStatusText();

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-sm"
        style={{ color: syncBlocked ? 'var(--monarch-warning)' : 'var(--monarch-text-muted)' }}
      >
        {statusText}
      </span>
      {syncBlocked && !isLoading && (
        <span
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded"
          style={{ backgroundColor: 'var(--monarch-warning-bg)', color: 'var(--monarch-warning)' }}
          title="Sync is blocked - re-authentication required"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Stale
        </span>
      )}
      {isRateLimited ? (
        <Tooltip content="Rate limited — please wait a few minutes">
          <span className="inline-block">
            <button
              type="button"
              onClick={onSync}
              disabled={isDisabled}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors btn-hover-lift hover-bg-orange-to-orange-hover ${
                isLoading ? 'cursor-wait' : ''
              }`}
              style={{ backgroundColor: 'var(--monarch-orange-disabled)' }}
              aria-label="Sync disabled - rate limited"
            >
              <SyncIcon size={16} />
              <span>Sync Now</span>
            </button>
          </span>
        </Tooltip>
      ) : (
        <button
          type="button"
          onClick={onSync}
          disabled={isDisabled}
          className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors btn-hover-lift hover-bg-orange-to-orange-hover ${
            isLoading ? 'cursor-wait' : ''
          }`}
          style={{
            backgroundColor: isLoading ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
          }}
          aria-label={isLoading ? 'Syncing data' : 'Sync now'}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <SpinnerIcon size={16} />
              <span>{isSyncing ? 'Syncing...' : 'Refreshing...'}</span>
            </>
          ) : (
            <>
              <SyncIcon size={16} />
              <span>Sync Now</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
