/**
 * Electron Navigation Hook
 *
 * Listens for navigation events from the Electron main process (e.g., from
 * the Settings menu item) and navigates using React Router.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isDesktopMode } from '../utils/apiBase';

/**
 * Hook that listens for navigation events from Electron main process.
 * Should be called from a component inside the Router context.
 */
export function useElectronNavigation(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDesktopMode() || !globalThis.electron) {
      return;
    }

    // Listen for navigation events from main process
    const unsubscribe = globalThis.electron.onNavigate((path: string) => {
      navigate(path);
    });

    return () => {
      unsubscribe();
    };
  }, [navigate]);
}
