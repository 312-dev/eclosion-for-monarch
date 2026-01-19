/**
 * StartupLoadingScreen Component
 *
 * Displays a loading screen while waiting for the backend to start.
 */

import { useState, useEffect, useMemo } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { StartupUpdateStatus } from './StartupUpdateStatus';
import { AppIcon } from '../wizards/SetupWizardIcons';
import {
  STARTUP_THRESHOLDS,
  MESSAGE_INTERVAL,
  ESTIMATED_STARTUP_TIME,
  TIMEOUT_ERROR_MESSAGE,
  getMessagePool,
  getStatusText,
} from './startupMessages';
import type { UpdateInfo, UpdateProgress } from '../../types/electron';

interface StartupLoadingScreenProps {
  /** Callback when timeout (3 minutes) is reached */
  onTimeout?: () => void;
  /** Whether the backend is connected (triggers transition) */
  isConnected?: boolean;
  /** Custom status message from backend (e.g., during migration) */
  customStatus?: { message: string; progress: number } | null;
}

export function StartupLoadingScreen({
  onTimeout,
  isConnected = false,
  customStatus = null,
}: StartupLoadingScreenProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageRotationCount, setMessageRotationCount] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Update status
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloading' | 'ready'>(
    'none'
  );
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean | null>(null);

  // Derive fading state and final progress from isConnected
  const isFadingOut = isConnected;
  // Use custom progress during migration, otherwise use animated progress
  const getProgress = (): number => {
    if (isConnected) return 100;
    if (customStatus) return customStatus.progress;
    return animatedProgress;
  };
  const progress = getProgress();

  // Set a smaller compact window size for the loading screen (desktop only)
  useEffect(() => {
    if (!globalThis.electron?.windowMode?.setCompactSize) return;
    // Loading screen is simple - doesn't need much height
    globalThis.electron.windowMode.setCompactSize(550).catch(() => {
      // Ignore errors - window sizing is a UX enhancement
    });
  }, []);

  // Signal to main process that loading screen is visible and rendered.
  // This allows heavy backend work to start only after the user sees the loading UI.
  useEffect(() => {
    if (globalThis.electron?.signalLoadingReady) {
      globalThis.electron.signalLoadingReady();
    }
  }, []);

  // Derive current message from rotation count and elapsed time
  const currentMessage = useMemo(() => {
    const pool = getMessagePool(elapsedSeconds);
    return pool[messageRotationCount % pool.length];
  }, [elapsedSeconds, messageRotationCount]);

  // Timer for elapsed time
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (next >= STARTUP_THRESHOLDS.TIMEOUT) {
          onTimeout?.();
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  // Message rotation every 10 seconds
  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageRotationCount((prev) => prev + 1);
    }, MESSAGE_INTERVAL);

    return () => clearInterval(messageTimer);
  }, []);

  // Check auto-update setting on mount
  useEffect(() => {
    if (!globalThis.electron) return;
    globalThis.electron
      .getAutoUpdateEnabled()
      .then(setAutoUpdateEnabled)
      .catch(() => {
        // Default to showing updates if we can't check the setting
        setAutoUpdateEnabled(true);
      });
  }, []);

  // Listen for update events from Electron (only if auto-update is enabled)
  useEffect(() => {
    if (!globalThis.electron || autoUpdateEnabled === null || !autoUpdateEnabled) return;

    const unsubAvailable = globalThis.electron.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateStatus('downloading');
      setUpdateVersion(info.version);
    });

    const unsubProgress = globalThis.electron.onUpdateProgress((progress: UpdateProgress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(Math.round(progress.percent));
    });

    const unsubDownloaded = globalThis.electron.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateStatus('ready');
      setUpdateVersion(info.version);
      setDownloadProgress(100);
    });

    // Check initial status
    globalThis.electron.getUpdateStatus().then((status) => {
      if (status.updateDownloaded && status.updateInfo) {
        setUpdateStatus('ready');
        setUpdateVersion(status.updateInfo.version);
        setDownloadProgress(100);
      } else if (status.updateAvailable && status.updateInfo) {
        setUpdateStatus('downloading');
        setUpdateVersion(status.updateInfo.version);
      }
    });

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
    };
  }, [autoUpdateEnabled]);

  // Animate progress bar (only when not connected)
  useEffect(() => {
    if (isConnected) return;

    const progressTimer = setInterval(() => {
      setAnimatedProgress((prev) => {
        // Asymptotic progress - never quite reaches 100% until connected
        // Uses logarithmic slowdown to create realistic "almost there" feel
        const elapsed = elapsedSeconds * 1000;
        const baseProgress = Math.min(95, (elapsed / ESTIMATED_STARTUP_TIME) * 80);

        // Add some randomness to feel more natural
        const jitter = Math.random() * 2 - 1;

        // Slow down as we approach 95%
        const slowdown = 1 - (prev / 100) * 0.8;
        const increment = slowdown * 0.5 + jitter * 0.1;

        return Math.min(95, Math.max(prev, baseProgress + increment));
      });
    }, 100);

    return () => clearInterval(progressTimer);
  }, [elapsedSeconds, isConnected]);

  // Timeout state
  const isTimedOut = elapsedSeconds >= STARTUP_THRESHOLDS.TIMEOUT;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
        {/* Logo/Brand - draggable region for window */}
        <div
          className="flex items-center gap-3 mb-4 cursor-default"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <AppIcon size={48} />
          <span
            className="text-2xl font-semibold"
            style={{
              color: 'var(--monarch-text-dark)',
              fontFamily: 'var(--font-logo)',
            }}
          >
            Eclosion
          </span>
        </div>

        {/* Spinner or error icon */}
        {isTimedOut ? (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--monarch-error-bg)' }}
          >
            <svg
              className="w-8 h-8"
              style={{ color: 'var(--monarch-error)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        ) : (
          <LoadingSpinner size="lg" color="var(--monarch-orange)" label="Starting application" />
        )}

        {/* Status text */}
        <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-muted)' }}>
          {customStatus ? customStatus.message : getStatusText(elapsedSeconds, isTimedOut)}
        </p>

        {/* Progress bar */}
        <div className="w-full">
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--monarch-border)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: isTimedOut ? 'var(--monarch-error)' : 'var(--monarch-orange)',
              }}
            />
          </div>
          {!isTimedOut && (
            <p className="mt-2 text-xs" style={{ color: 'var(--monarch-text-light)' }}>
              {Math.round(progress)}%
            </p>
          )}
        </div>

        {/* Rotating message - only show when not in custom status mode */}
        {!customStatus && (
          <div className="min-h-12 flex items-center justify-center" key={currentMessage}>
            <p className="text-sm animate-fade-in" style={{ color: 'var(--monarch-text-muted)' }}>
              {isTimedOut ? TIMEOUT_ERROR_MESSAGE : currentMessage}
            </p>
          </div>
        )}

        {/* Elapsed time (shown after 30 seconds) */}
        {elapsedSeconds >= STARTUP_THRESHOLDS.ACKNOWLEDGE_DELAY && (
          <p className="text-xs animate-fade-in" style={{ color: 'var(--monarch-text-light)' }}>
            Waiting for {elapsedSeconds} seconds...
          </p>
        )}

        <StartupUpdateStatus
          status={updateStatus}
          version={updateVersion}
          progress={downloadProgress}
        />

        {/* Timeout action */}
        {isTimedOut && (
          <button
            onClick={() => globalThis.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg font-medium transition-colors btn-press"
            style={{
              backgroundColor: 'var(--monarch-orange)',
              color: 'white',
            }}
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
