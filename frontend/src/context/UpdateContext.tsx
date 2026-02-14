/**
 * UpdateContext
 *
 * Unified update state management for desktop app updates.
 * Consolidates all update-related state into a single source of truth.
 *
 * Behavior:
 * - Startup: Force update if available (handled by StartupLoadingScreen)
 * - Runtime: Silent download, then show non-dismissible banner with "Quit & Relaunch"
 *
 * Supports two data sources:
 * - Electron IPC: when running inside the desktop app (globalThis.electron)
 * - HTTP polling: when accessing the desktop app via remote tunnel (isTunnelSite)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { UpdateInfo, UpdateProgress } from '../types/electron';
import { isTunnelSite } from '../utils/environment';

/** Polling interval for tunnel update status (10 seconds) */
const TUNNEL_POLL_INTERVAL_MS = 10_000;

interface RemoteUpdateStatus {
  current_version: string | null;
  channel: string | null;
  update_available: boolean;
  update_downloaded: boolean;
  update_info: { version: string } | null;
}

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
  /** Whether running in desktop mode (Electron or tunnel to desktop) */
  isDesktop: boolean;
  /** Whether the app is still in boot phase (loading screen showing) */
  isBootPhase: boolean;
}

interface UpdateContextValue extends UpdateState {
  /** Manually check for updates */
  checkForUpdates: () => Promise<void>;
  /** Quit the app and install the downloaded update */
  quitAndInstall: () => void;
  /** Signal that boot is complete (loading screen has finished) */
  setBootComplete: () => void;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

interface UpdateProviderProps {
  readonly children: ReactNode;
}

export function UpdateProvider({ children }: UpdateProviderProps) {
  // Check for electron at initialization time (SSR-safe)
  const isElectron = globalThis.window !== undefined && !!globalThis.electron;
  const isTunnel = !isElectron && isTunnelSite();

  const isTunnelRef = useRef(isTunnel);

  const [state, setState] = useState<UpdateState>(() => ({
    updateAvailable: false,
    updateDownloaded: false,
    isDownloading: false,
    downloadProgress: 0,
    updateInfo: null,
    error: null,
    currentVersion: '',
    channel: 'stable',
    isDesktop: isElectron || isTunnel,
    isBootPhase: isElectron, // Only Electron has a boot phase, not tunnel
  }));

  // Electron IPC: initialize and listen for update events
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

  // Tunnel HTTP polling: fetch update status from Flask backend
  useEffect(() => {
    if (!isTunnelRef.current) return;

    const poll = async (): Promise<void> => {
      try {
        const res = await fetch('/remote/updates/status');
        if (!res.ok) return;
        const data = (await res.json()) as RemoteUpdateStatus;
        setState((prev) => {
          let progress = 0;
          if (data.update_downloaded) {
            progress = 100;
          } else if (prev.updateAvailable && !prev.updateDownloaded) {
            progress = prev.downloadProgress;
          }
          return {
            ...prev,
            updateAvailable: data.update_available,
            updateDownloaded: data.update_downloaded,
            // Infer downloading state: update available but not yet downloaded
            isDownloading: data.update_available && !data.update_downloaded,
            downloadProgress: progress,
            updateInfo: data.update_info
              ? ({ version: data.update_info.version } as UpdateInfo)
              : null,
            currentVersion: data.current_version ?? '',
            channel: (data.channel as 'stable' | 'beta') ?? 'stable',
          };
        });
      } catch {
        // Ignore polling errors — server may be restarting
      }
    };

    poll();
    const interval = setInterval(poll, TUNNEL_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (isTunnelRef.current) {
      setState((prev) => ({ ...prev, error: null }));
      try {
        await fetch('/remote/updates/check', { method: 'POST' });
      } catch {
        // Ignore — status will be picked up by polling
      }
      return;
    }
    if (!globalThis.electron) return;
    // Clear any previous error
    setState((prev) => ({ ...prev, error: null }));
    await globalThis.electron.checkForUpdates();
  }, []);

  const quitAndInstall = useCallback(() => {
    if (isTunnelRef.current && state.updateDownloaded) {
      fetch('/remote/updates/install', { method: 'POST' }).catch(() => {});
      return;
    }
    if (globalThis.electron && state.updateDownloaded) {
      globalThis.electron.quitAndInstall();
    }
  }, [state.updateDownloaded]);

  const setBootComplete = useCallback(() => {
    setState((prev) => ({ ...prev, isBootPhase: false }));
  }, []);

  const value: UpdateContextValue = {
    ...state,
    checkForUpdates,
    quitAndInstall,
    setBootComplete,
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
