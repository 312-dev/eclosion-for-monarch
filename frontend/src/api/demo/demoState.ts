/**
 * Demo State Management
 *
 * Core utilities for managing demo state in localStorage.
 */

import { createInitialDemoState, type DemoState } from '../demoData';
import { TOUR_STATE_KEY } from '../../hooks/useRecurringTour';

// Version injected at build time
declare const __APP_VERSION__: string;
export const DEMO_VERSION = __APP_VERSION__ ?? '0.0.0';

// Storage key for demo data
export const DEMO_STORAGE_KEY = 'eclosion-demo-data';

/**
 * Get current demo state from localStorage.
 * Initializes with fresh data if not present or invalid.
 */
export function getDemoState(): DemoState {
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, reset
    }
  }
  const initial = createInitialDemoState();
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Save demo state to localStorage.
 */
export function setDemoState(state: DemoState): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Update demo state using an updater function.
 */
export function updateDemoState(updater: (state: DemoState) => DemoState): void {
  const state = getDemoState();
  const updated = updater(state);
  setDemoState(updated);
}

/**
 * Simulate network delay for realistic demo behavior.
 */
export async function simulateDelay(ms: number = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset demo data to initial state.
 * Also clears the tour state so the guided tour replays.
 */
export function resetDemoData(): void {
  const initial = createInitialDemoState();
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
  localStorage.removeItem(TOUR_STATE_KEY);
}
