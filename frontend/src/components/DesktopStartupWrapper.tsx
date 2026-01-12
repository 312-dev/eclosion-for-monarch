/**
 * DesktopStartupWrapper
 *
 * Handles the desktop app startup flow:
 * 1. Shows loading screen while backend starts
 * 2. Listens for backend ready events
 * 3. Initializes API once backend is ready
 * 4. Renders the main app
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { StartupLoadingScreen } from './ui/StartupLoadingScreen';
import { initializeApi } from '../api/core/fetchApi';
import { initializeDesktopBetaDetection } from '../utils/environment';
import { isDesktopMode } from '../utils/apiBase';

interface DesktopStartupWrapperProps {
  children: ReactNode;
}

type StartupPhase = 'initializing' | 'spawning' | 'waiting_for_health' | 'ready' | 'failed';

interface StartupStatus {
  phase: StartupPhase;
  message: string;
  progress: number;
  error?: string;
}

// Check if we're in desktop mode (outside component to avoid re-renders)
const isDesktopEnvironment = isDesktopMode();

export function DesktopStartupWrapper({ children }: DesktopStartupWrapperProps) {
  // For non-desktop mode, start as ready immediately
  const [isReady, setIsReady] = useState(!isDesktopEnvironment);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isInitializing, setIsInitializing] = useState(isDesktopEnvironment);

  // Initialize API and render app once backend is ready
  const handleBackendReady = useCallback(async () => {
    try {
      // Initialize the API (fetches port and secret from Electron)
      await initializeApi();

      // Detect if running beta build
      await initializeDesktopBetaDetection();

      // Small delay for smooth transition
      await new Promise((resolve) => setTimeout(resolve, 300));

      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize API after backend ready:', error);
      setHasTimedOut(true);
    }
  }, []);

  // Handle timeout from loading screen
  const handleTimeout = useCallback(() => {
    setHasTimedOut(true);
  }, []);

  useEffect(() => {
    // Skip for non-desktop mode (already initialized above)
    if (!isDesktopEnvironment) {
      return;
    }

    // Check if backend is already ready (in case we loaded after startup completed)
    const checkIfAlreadyReady = async () => {
      try {
        const isComplete = await window.electron!.isBackendStartupComplete();
        if (isComplete) {
          await handleBackendReady();
          return true;
        }
      } catch {
        // IPC might not be ready yet, continue with listener
      }
      return false;
    };

    // Listen for backend startup status updates
    const unsubscribe = window.electron!.onBackendStartupStatus((status: StartupStatus) => {
      if (status.phase === 'ready') {
        handleBackendReady();
      } else if (status.phase === 'failed') {
        setHasTimedOut(true);
      }
    });

    // Check if already ready, otherwise wait for events
    checkIfAlreadyReady().then((alreadyReady) => {
      if (!alreadyReady) {
        setIsInitializing(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [handleBackendReady]);

  // Show loading screen while waiting for backend
  if (!isReady) {
    // Don't show loading screen during initial check (prevents flash)
    if (isInitializing) {
      return null;
    }

    return (
      <StartupLoadingScreen
        onTimeout={handleTimeout}
        isConnected={false}
      />
    );
  }

  // Show timed out state
  if (hasTimedOut && !isReady) {
    return (
      <StartupLoadingScreen
        onTimeout={handleTimeout}
        isConnected={false}
      />
    );
  }

  // Backend is ready, render the app
  return <>{children}</>;
}
