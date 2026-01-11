/**
 * Offline Indicator
 *
 * Shows a banner when the desktop app's backend is unreachable.
 * Only shown in desktop mode.
 */

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { isDesktopMode } from '../utils/apiBase';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const isDesktop = isDesktopMode();

  useEffect(() => {
    if (!isDesktop || !window.electron) return;

    // Get initial status
    window.electron.getHealthStatus().then((status) => {
      setIsOffline(!status.running);
    }).catch(() => {
      // Assume online if we can't get status
      setIsOffline(false);
    });

    // Listen for status changes
    const unsubscribe = window.electron.onBackendStatusChanged((status) => {
      setIsOffline(!status.running);
    });

    return () => {
      unsubscribe();
    };
  }, [isDesktop]);

  // Don't render if not desktop or if online
  if (!isDesktop || !isOffline) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 py-2 px-4 text-sm"
      style={{
        backgroundColor: 'var(--monarch-red)',
        color: 'white',
        flexShrink: 0,
      }}
      role="alert"
      aria-live="polite"
    >
      <WifiOff size={16} aria-hidden="true" />
      <span>
        Backend unavailable — Sync is paused. The app will reconnect automatically.
      </span>
    </div>
  );
}
