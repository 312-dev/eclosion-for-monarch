import { useState, useEffect, useCallback } from 'react';
import { useVersionCheckQuery } from '../api/queries';

// Injected by Vite at build time
declare const __APP_VERSION__: string;

interface UpdateState {
  updateAvailable: boolean;
  serverVersion: string | null;
  updateType: 'major' | 'minor' | 'patch' | null;
  dismissed: boolean;
  isChecking: boolean;
}

interface UseUpdateCheckReturn extends UpdateState {
  clientVersion: string;
  dismissUpdate: () => void;
  triggerUpdate: () => void;
  checkForUpdate: () => void;
}

const DISMISS_KEY = 'eclosion_update_dismissed';

export function useUpdateCheck(): UseUpdateCheckReturn {
  const [dismissed, setDismissed] = useState(() => {
    // Only dismissed for current session
    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  });

  const clientVersion = typeof __APP_VERSION__ === 'undefined' ? '0.0.0' : __APP_VERSION__;

  const { data, isLoading, refetch } = useVersionCheckQuery(clientVersion, {
    enabled: !dismissed,
  });

  // Re-check on window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !dismissed) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch, dismissed]);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  const triggerUpdate = useCallback(() => {
    // Clear all caches and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.update();
        });
      });
    }

    // Clear query cache and reload
    globalThis.location.reload();
  }, []);

  const checkForUpdate = useCallback(() => {
    setDismissed(false);
    sessionStorage.removeItem(DISMISS_KEY);
    refetch();
  }, [refetch]);

  return {
    updateAvailable: data?.update_available ?? false,
    serverVersion: data?.server_version ?? null,
    updateType: data?.update_type ?? null,
    dismissed,
    isChecking: isLoading,
    clientVersion,
    dismissUpdate,
    triggerUpdate,
    checkForUpdate,
  };
}
