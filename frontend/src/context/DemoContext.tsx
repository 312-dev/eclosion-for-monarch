/**
 * Demo Context
 *
 * Provides demo mode detection. Demo mode is enabled when:
 * 1. VITE_DEMO_MODE=true env var is set at build time (global demo mode)
 * 2. URL path starts with /demo/* (route-based demo mode)
 *
 * Global demo mode (VITE_DEMO_MODE) is used for:
 * - The official demo site on Railway
 * - GitHub Pages documentation site
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// Injected by Vite at build time
declare const __DEMO_MODE__: boolean;

/** Check if app was built with global demo mode enabled */
export const isGlobalDemoMode = typeof __DEMO_MODE__ !== 'undefined' && __DEMO_MODE__;

interface DemoContextValue {
  isDemo: boolean;
  /** True if demo mode was set via env var (entire app is demo) */
  isGlobalDemo: boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false, isGlobalDemo: false });

export function DemoProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const isDemo = useMemo(
    () => isGlobalDemoMode || location.pathname.startsWith('/demo'),
    [location.pathname]
  );

  const value = useMemo(
    () => ({ isDemo, isGlobalDemo: isGlobalDemoMode }),
    [isDemo]
  );

  return (
    <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
  );
}

/**
 * Check if the app is in demo mode.
 * Demo mode uses localStorage instead of backend API.
 */
export function useDemo(): boolean {
  return useContext(DemoContext).isDemo;
}

/**
 * Get the demo context value directly.
 */
export function useDemoContext(): DemoContextValue {
  return useContext(DemoContext);
}
