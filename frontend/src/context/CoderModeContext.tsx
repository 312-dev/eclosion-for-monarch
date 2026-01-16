/**
 * Coder Mode Context
 *
 * Manages "coder mode" preference for the landing page.
 * When disabled (default), technical language is simplified for non-developers
 * and technical links (GitHub, Self-Hosting docs) are hidden.
 * State persists in localStorage.
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

const CODER_MODE_STORAGE_KEY = 'eclosion-coder-mode';

interface CoderModeContextValue {
  /** Whether coder mode is enabled */
  isCoderMode: boolean;
  /** Set coder mode on/off */
  setCoderMode: (enabled: boolean) => void;
  /** Toggle between modes */
  toggleCoderMode: () => void;
}

const CoderModeContext = createContext<CoderModeContextValue | null>(null);

function getStoredCoderMode(): boolean {
  if (typeof globalThis.window !== 'undefined') {
    const stored = localStorage.getItem(CODER_MODE_STORAGE_KEY);
    return stored === 'true';
  }
  return false; // Default: "Not a coder" mode
}

export function CoderModeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isCoderMode, setCoderModeState] = useState<boolean>(getStoredCoderMode);

  const setCoderMode = useCallback((enabled: boolean) => {
    setCoderModeState(enabled);
    localStorage.setItem(CODER_MODE_STORAGE_KEY, String(enabled));
  }, []);

  const toggleCoderMode = useCallback(() => {
    setCoderMode(!isCoderMode);
  }, [isCoderMode, setCoderMode]);

  const value = useMemo(
    () => ({
      isCoderMode,
      setCoderMode,
      toggleCoderMode,
    }),
    [isCoderMode, setCoderMode, toggleCoderMode]
  );

  return <CoderModeContext.Provider value={value}>{children}</CoderModeContext.Provider>;
}

export function useCoderMode(): CoderModeContextValue {
  const context = useContext(CoderModeContext);
  if (!context) {
    throw new Error('useCoderMode must be used within a CoderModeProvider');
  }
  return context;
}

/** Safe hook for components that may be outside the provider */
export function useCoderModeSafe(): CoderModeContextValue | null {
  return useContext(CoderModeContext);
}
