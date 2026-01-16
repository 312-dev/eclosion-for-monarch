/**
 * Background Sync Hook
 *
 * Provides React state and methods for background sync
 * (system task scheduler sync when app is closed).
 *
 * This hook:
 * - Checks background sync status on mount
 * - Tracks installation status and interval
 * - Provides methods for enabling/disabling
 * - Only activates in desktop mode
 */

import { useState, useEffect, useCallback } from 'react';
import { isDesktopMode } from '../utils/apiBase';
import type { BackgroundSyncStatus, BackgroundSyncInterval } from '../types/electron';

export interface UseBackgroundSyncReturn {
  /** Current background sync status */
  status: BackgroundSyncStatus | null;
  /** Available interval options */
  intervals: BackgroundSyncInterval[];
  /** Whether the initial status check is still loading */
  loading: boolean;
  /** Whether an enable operation is in progress */
  enabling: boolean;
  /** Toggle background sync on/off */
  toggle: () => Promise<void>;
  /** Change the sync interval */
  setInterval: (intervalMinutes: number) => Promise<void>;
  /** Refresh the status */
  refresh: () => Promise<void>;
}

/**
 * Hook for background sync in desktop mode.
 *
 * @example
 * ```tsx
 * const { status, intervals, loading, toggle, setInterval } = useBackgroundSync();
 *
 * if (status?.installed) {
 *   // Background sync is enabled
 * }
 * ```
 */
export function useBackgroundSync(): UseBackgroundSyncReturn {
  const [status, setStatus] = useState<BackgroundSyncStatus | null>(null);
  const [intervals, setIntervals] = useState<BackgroundSyncInterval[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  // Fetch status on mount
  useEffect(() => {
    if (!isDesktopMode() || !globalThis.electron?.backgroundSync) {
      setLoading(false);
      return;
    }

    const fetchStatus = async (): Promise<void> => {
      try {
        const [bgStatus, bgIntervals] = await Promise.all([
          globalThis.electron!.backgroundSync.getStatus(),
          globalThis.electron!.backgroundSync.getIntervals(),
        ]);
        setStatus(bgStatus);
        setIntervals(bgIntervals);
      } catch (error) {
        console.error('Failed to fetch background sync status:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStatus();
  }, []);

  /**
   * Refresh the background sync status.
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!isDesktopMode() || !globalThis.electron?.backgroundSync) {
      return;
    }

    try {
      const bgStatus = await globalThis.electron.backgroundSync.getStatus();
      setStatus(bgStatus);
    } catch (error) {
      console.error('Failed to refresh background sync status:', error);
    }
  }, []);

  /**
   * Toggle background sync on/off.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity -- Multi-step user flow with platform dialogs and error handling
  const toggle = useCallback(async (): Promise<void> => {
    if (!isDesktopMode() || !globalThis.electron?.backgroundSync || !status) {
      return;
    }

    if (status.installed) {
      // Disable background sync
      try {
        const result = await globalThis.electron.backgroundSync.disable();
        if (result.success) {
          setStatus({
            installed: false,
            intervalMinutes: status.intervalMinutes,
          });
        } else {
          await globalThis.electron.showErrorDialog({
            title: 'Error',
            content: result.error || 'Failed to disable background sync',
          });
        }
      } catch {
        // Ignore errors
      }
    } else {
      // Enable background sync - need to get passphrase
      const confirmed = await globalThis.electron.showConfirmDialog({
        title: 'Enable Background Sync',
        message:
          'Background sync requires storing your passphrase securely in your system keychain.',
        detail:
          "This allows Eclosion to sync your recurring expenses even when the app is closed. Your passphrase is encrypted using your operating system's secure credential storage.",
        confirmText: 'Continue',
        cancelText: 'Cancel',
      });

      if (!confirmed) return;

      // Check if passphrase is already stored (from biometric enrollment)
      const passphraseStored = await globalThis.electron.biometric.isPassphraseStored();

      if (passphraseStored) {
        // Use the stored passphrase
        const storedPassphrase = await globalThis.electron.biometric.getStoredPassphrase();
        if (storedPassphrase) {
          setEnabling(true);
          try {
            const result = await globalThis.electron.backgroundSync.enable(60, storedPassphrase);
            if (result.success) {
              setStatus({ installed: true, intervalMinutes: 60 });
            } else {
              await globalThis.electron.showErrorDialog({
                title: 'Error',
                content: result.error || 'Failed to enable background sync',
              });
            }
          } finally {
            setEnabling(false);
          }
          return;
        }
      }

      // Need user to enter passphrase - prompt them to lock and unlock
      await globalThis.electron.showErrorDialog({
        title: 'Passphrase Required',
        content:
          'Please lock and unlock the app to enable background sync. The next time you unlock with your passphrase, background sync will be configured.',
      });
    }
  }, [status]);

  /**
   * Change the sync interval.
   */
  const setIntervalMinutes = useCallback(async (newInterval: number): Promise<void> => {
    if (!isDesktopMode() || !globalThis.electron?.backgroundSync) {
      return;
    }

    try {
      const result = await globalThis.electron.backgroundSync.setInterval(newInterval);
      if (result.success) {
        setStatus((prev) => (prev ? { ...prev, intervalMinutes: newInterval } : null));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    status,
    intervals,
    loading,
    enabling,
    toggle,
    setInterval: setIntervalMinutes,
    refresh,
  };
}
