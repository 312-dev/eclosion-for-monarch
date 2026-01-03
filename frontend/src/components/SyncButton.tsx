import { useState, useEffect } from 'react';
import { UI } from '../constants';
import { SpinnerIcon, SyncIcon } from './icons';

interface SyncButtonProps {
  onSync: () => void;
  isSyncing: boolean;
  lastSync: string | null;
  compact?: boolean;
}

function formatLastSync(timestamp: string | null): string {
  if (!timestamp) return 'Never synced';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;

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

export function SyncButton({ onSync, isSyncing, lastSync, compact = false }: SyncButtonProps) {
  const [formattedTime, setFormattedTime] = useState(() => formatLastSync(lastSync));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync derived state with prop
    setFormattedTime(formatLastSync(lastSync));

    if (!lastSync) return;

    const interval = setInterval(() => {
      setFormattedTime(formatLastSync(lastSync));
    }, UI.INTERVAL.SYNC_STATUS);

    return () => clearInterval(interval);
  }, [lastSync]);

  if (compact) {
    const syncStatus = lastSync ? `Synced ${formattedTime}` : 'Not yet synced';
    return (
      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed transition-colors hover:opacity-70"
        style={{ color: 'var(--monarch-text-muted)' }}
        aria-label={isSyncing ? 'Syncing data with Monarch' : `Sync now. Last synced: ${syncStatus}`}
        aria-busy={isSyncing}
      >
        {isSyncing ? (
          <SpinnerIcon size={14} />
        ) : (
          <SyncIcon size={14} />
        )}
        <span aria-live="polite">{isSyncing ? 'Syncing...' : syncStatus}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
        {formattedTime}
      </span>
      <button
        type="button"
        onClick={onSync}
        disabled={isSyncing}
        className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors btn-hover-lift hover-bg-orange-to-orange-hover"
        style={{ backgroundColor: isSyncing ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)' }}
        aria-label={isSyncing ? 'Syncing data' : 'Sync now'}
        aria-busy={isSyncing}
      >
        {isSyncing ? (
          <>
            <SpinnerIcon size={16} />
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <SyncIcon size={16} />
            <span>Sync Now</span>
          </>
        )}
      </button>
    </div>
  );
}
