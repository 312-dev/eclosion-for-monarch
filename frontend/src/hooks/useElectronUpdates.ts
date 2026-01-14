/**
 * useElectronUpdates Hook
 *
 * Listens for auto-update events from the Electron main process.
 * Only active when running in desktop mode.
 */

import { useState, useEffect, useCallback } from 'react';
import type { UpdateInfo, UpdateProgress } from '../types/electron';

interface ElectronUpdateState {
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Whether the update has been downloaded and is ready to install */
  updateDownloaded: boolean;
  /** Whether the update is currently being downloaded */
  isDownloading: boolean;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Information about the available update */
  updateInfo: UpdateInfo | null;
  /** Current app version */
  currentVersion: string;
  /** Current update channel */
  channel: 'stable' | 'beta';
  /** Whether running in desktop mode */
  isDesktop: boolean;
  /** Error message if update failed */
  error: string | null;
  /** Whether auto-update (auto-download) is enabled */
  autoUpdateEnabled: boolean;
}

export interface UseElectronUpdatesReturn extends ElectronUpdateState {
  /** Quit the app and install the downloaded update */
  quitAndInstall: () => void;
  /** Manually check for updates */
  checkForUpdates: () => Promise<void>;
  /** Manually start downloading the available update (when auto-download is off) */
  downloadUpdate: () => Promise<void>;
  /** Dismiss the update notification for this session */
  dismiss: () => void;
  /** Whether the notification has been dismissed */
  dismissed: boolean;
}

const DISMISS_KEY = 'eclosion_desktop_update_dismissed';

export function useElectronUpdates(): UseElectronUpdatesReturn {
  // Check for electron at initialization time (SSR-safe)
  const isDesktop = globalThis.window !== undefined && !!globalThis.electron;

  const [state, setState] = useState<ElectronUpdateState>(() => ({
    updateAvailable: false,
    updateDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    updateInfo: null,
    currentVersion: '',
    channel: 'stable',
    isDesktop,
    error: null,
    autoUpdateEnabled: false,
  }));

  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  });

  // Initialize and listen for update events
  useEffect(() => {
    if (!globalThis.electron) return;

    // Get initial status (async - allowed in effect)
    globalThis.electron.getUpdateStatus().then(status => {
      setState(prev => ({
        ...prev,
        updateAvailable: status.updateAvailable,
        updateDownloaded: status.updateDownloaded,
        updateInfo: status.updateInfo,
        currentVersion: status.currentVersion,
        channel: status.channel,
      }));
    });

    // Get auto-update setting
    globalThis.electron.getAutoUpdateEnabled().then(enabled => {
      setState(prev => ({ ...prev, autoUpdateEnabled: enabled }));
    });

    // Listen for update events (callbacks are async - allowed)
    const unsubAvailable = globalThis.electron.onUpdateAvailable((info: UpdateInfo) => {
      setState(prev => ({
        ...prev,
        updateAvailable: true,
        updateInfo: info,
        error: null,
      }));
      // Clear dismissal when new update is available
      sessionStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    });

    const unsubDownloaded = globalThis.electron.onUpdateDownloaded((info: UpdateInfo) => {
      setState(prev => ({
        ...prev,
        updateDownloaded: true,
        isDownloading: false,
        updateInfo: info,
        downloadProgress: 100,
      }));
    });

    const unsubProgress = globalThis.electron.onUpdateProgress((progress: UpdateProgress) => {
      setState(prev => ({
        ...prev,
        isDownloading: true,
        downloadProgress: progress.percent,
      }));
    });

    const unsubError = globalThis.electron.onUpdateError((error: { message: string }) => {
      setState(prev => ({
        ...prev,
        error: error.message,
      }));
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
      unsubProgress();
      unsubError();
    };
  }, []);

  const quitAndInstall = useCallback(() => {
    if (globalThis.electron && state.updateDownloaded) {
      globalThis.electron.quitAndInstall();
    }
  }, [state.updateDownloaded]);

  const checkForUpdates = useCallback(async () => {
    if (!globalThis.electron) return;
    await globalThis.electron.checkForUpdates();
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!globalThis.electron || !state.updateAvailable) return;
    // Mark as downloading before calling - progress events will confirm
    setState(prev => ({ ...prev, isDownloading: true }));
    const result = await globalThis.electron.downloadUpdate();
    if (!result.success && result.error) {
      setState(prev => ({ ...prev, isDownloading: false, error: result.error ?? null }));
    }
  }, [state.updateAvailable]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  return {
    ...state,
    quitAndInstall,
    checkForUpdates,
    downloadUpdate,
    dismiss,
    dismissed,
  };
}
