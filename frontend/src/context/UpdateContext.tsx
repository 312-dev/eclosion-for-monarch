/**
 * UpdateContext
 *
 * Unified update state management for desktop app updates.
 * Consolidates all update-related state into a single source of truth.
 *
 * Behavior:
 * - Startup: Force update if available (handled by StartupLoadingScreen)
 * - Runtime: Silent download, then show non-dismissible banner with "Quit & Relaunch"
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UpdateInfo, UpdateProgress } from '../types/electron';

interface UpdateState {
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
  /** Error message if update check/download failed */
  error: string | null;
  /** Current app version */
  currentVersion: string;
  /** Current update channel */
  channel: 'stable' | 'beta';
  /** Whether running in desktop mode */
  isDesktop: boolean;
}

interface UpdateContextValue extends UpdateState {
  /** Manually check for updates */
  checkForUpdates: () => Promise<void>;
  /** Quit the app and install the downloaded update */
  quitAndInstall: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

interface UpdateProviderProps {
  readonly children: ReactNode;
}

export function UpdateProvider({ children }: UpdateProviderProps) {
  // Check for electron at initialization time (SSR-safe)
  const isDesktop = globalThis.window !== undefined && !!globalThis.electron;

  const [state, setState] = useState<UpdateState>(() => ({
    updateAvailable: false,
    updateDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    updateInfo: null,
    error: null,
    currentVersion: '',
    channel: 'stable',
    isDesktop,
  }));

  // Initialize and listen for update events
  useEffect(() => {
    if (!globalThis.electron) return;

    // Get initial status
    globalThis.electron.getUpdateStatus().then((status) => {
      setState((prev) => ({
        ...prev,
        updateAvailable: status.updateAvailable,
        updateDownloaded: status.updateDownloaded,
        updateInfo: status.updateInfo,
        currentVersion: status.currentVersion,
        channel: status.channel,
      }));
    });

    // Listen for update events
    const unsubAvailable = globalThis.electron.onUpdateAvailable((info: UpdateInfo) => {
      setState((prev) => ({
        ...prev,
        updateAvailable: true,
        updateInfo: info,
        error: null,
      }));
    });

    const unsubDownloaded = globalThis.electron.onUpdateDownloaded((info: UpdateInfo) => {
      setState((prev) => ({
        ...prev,
        updateDownloaded: true,
        isDownloading: false,
        updateInfo: info,
        downloadProgress: 100,
      }));
    });

    const unsubProgress = globalThis.electron.onUpdateProgress((progress: UpdateProgress) => {
      setState((prev) => ({
        ...prev,
        isDownloading: true,
        downloadProgress: progress.percent,
      }));
    });

    const unsubError = globalThis.electron.onUpdateError((error: { message: string }) => {
      // Silently record error - don't show to user at runtime
      // Errors are logged but the app continues with current version
      setState((prev) => ({
        ...prev,
        error: error.message,
        isDownloading: false,
      }));
    });

    return () => {
      unsubAvailable();
      unsubDownloaded();
      unsubProgress();
      unsubError();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!globalThis.electron) return;
    // Clear any previous error
    setState((prev) => ({ ...prev, error: null }));
    await globalThis.electron.checkForUpdates();
  }, []);

  const quitAndInstall = useCallback(() => {
    if (globalThis.electron && state.updateDownloaded) {
      globalThis.electron.quitAndInstall();
    }
  }, [state.updateDownloaded]);

  const value: UpdateContextValue = {
    ...state,
    checkForUpdates,
    quitAndInstall,
  };

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

/**
 * Hook to access update state and actions.
 * Must be used within an UpdateProvider.
 */
export function useUpdate(): UpdateContextValue {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
}

/**
 * Hook to check if an update is ready to install.
 * Safe to use outside of UpdateProvider (returns false).
 */
export function useUpdateReady(): boolean {
  const context = useContext(UpdateContext);
  return context?.updateDownloaded ?? false;
}
