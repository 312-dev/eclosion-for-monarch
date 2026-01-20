/**
 * Demo State Management
 *
 * Core utilities for managing demo state in localStorage.
 */

import {
  createInitialDemoState,
  createInitialWishlistData,
  createInitialWishlistConfig,
  createInitialPendingBookmarks,
  type DemoState,
} from '../demoData';
import { TOUR_STATE_KEY } from '../../hooks/useRecurringTour';
import { NOTES_TOUR_STATE_KEY } from '../../hooks/useNotesTour';

// Version injected at build time
declare const __APP_VERSION__: string;
export const DEMO_VERSION = __APP_VERSION__ ?? '0.0.0';

// Storage key for demo data
export const DEMO_STORAGE_KEY = 'eclosion-demo-data';

/**
 * Legacy frequency value migrations.
 * Maps old values (that we incorrectly defined) to actual Monarch API values.
 */
const FREQUENCY_MIGRATIONS: Record<string, string> = {
  every_two_weeks: 'biweekly',
  twice_a_month: 'semimonthly_start_mid',
  'semi-annual': 'semiyearly',
  annual: 'yearly',
};

/** Migrate frequency values in an array of items, returns true if any migrated. */
function migrateItemFrequencies(items: { frequency?: string }[]): boolean {
  let migrated = false;
  for (const item of items) {
    const newFreq = item.frequency ? FREQUENCY_MIGRATIONS[item.frequency] : undefined;
    if (newFreq) {
      item.frequency = newFreq;
      migrated = true;
    }
  }
  return migrated;
}

/** Add missing state properties for new features. Returns true if any added. */
function addMissingProperties(state: DemoState): boolean {
  let added = false;
  if (!state.wishlist) {
    state.wishlist = createInitialWishlistData();
    added = true;
  }
  if (!state.wishlistConfig) {
    state.wishlistConfig = createInitialWishlistConfig();
    added = true;
  }
  if (!state.pendingBookmarks) {
    state.pendingBookmarks = createInitialPendingBookmarks();
    added = true;
  }
  return added;
}

/** Migrate legacy demo state to current format. */
function migrateDemoState(state: DemoState): DemoState {
  const propsAdded = addMissingProperties(state);
  const dashboardMigrated = state.dashboard?.items
    ? migrateItemFrequencies(state.dashboard.items)
    : false;
  const rollupMigrated = state.dashboard?.rollup?.items
    ? migrateItemFrequencies(state.dashboard.rollup.items)
    : false;

  if (propsAdded || dashboardMigrated || rollupMigrated) {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

/**
 * Get current demo state from localStorage.
 * Initializes with fresh data if not present or invalid.
 * Migrates legacy frequency values if found.
 */
export function getDemoState(): DemoState {
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (stored) {
    try {
      const state = JSON.parse(stored) as DemoState;
      return migrateDemoState(state);
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
 * Also clears tour states so guided tours replay.
 */
export function resetDemoData(): void {
  const initial = createInitialDemoState();
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initial));
  localStorage.removeItem(TOUR_STATE_KEY);
  localStorage.removeItem(NOTES_TOUR_STATE_KEY);
}
