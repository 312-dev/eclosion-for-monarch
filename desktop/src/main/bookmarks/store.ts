/**
 * Bookmark Store
 *
 * Persistent storage for bookmark sync configuration and Safari discovery dates.
 */

import Store from 'electron-store';
import type { BookmarkSyncConfig } from './types';

// Store keys
const CONFIGS_KEY = 'bookmarks.configs';
const SAFARI_DATES_KEY = 'bookmarks.safariDates';
const BOOKMARK_HASHES_KEY = 'bookmarks.hashes';

// Lazy store initialization
let store: Store | null = null;

export function getStore(): Store {
  store ??= new Store();
  return store;
}

// ============================================================================
// Sync Configurations
// ============================================================================

/**
 * Get all bookmark sync configurations.
 */
export function getConfigs(): BookmarkSyncConfig[] {
  return getStore().get(CONFIGS_KEY, []) as BookmarkSyncConfig[];
}

/**
 * Get configuration for a specific browser.
 */
export function getConfig(browserType: string): BookmarkSyncConfig | undefined {
  const configs = getConfigs();
  return configs.find((c) => c.browserType === browserType);
}

/**
 * Save or update a sync configuration.
 */
export function saveConfig(config: BookmarkSyncConfig): void {
  const configs = getConfigs();
  const existingIndex = configs.findIndex((c) => c.browserType === config.browserType);

  if (existingIndex >= 0) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }

  getStore().set(CONFIGS_KEY, configs);
}

/**
 * Update the last sync time for a browser.
 */
export function updateLastSyncTime(browserType: string): void {
  const config = getConfig(browserType);
  if (config) {
    config.lastSyncAt = new Date().toISOString();
    saveConfig(config);
  }
}

// ============================================================================
// Safari Discovery Dates
// ============================================================================

/**
 * Safari doesn't store bookmark creation dates.
 * We track when we first discover each bookmark and use that as the dateAdded.
 */

interface SafariDateMap {
  [bookmarkId: string]: string; // ISO date string
}

/**
 * Get all stored Safari discovery dates.
 */
export function getSafariDates(): SafariDateMap {
  return getStore().get(SAFARI_DATES_KEY, {}) as SafariDateMap;
}

/**
 * Get discovery date for a Safari bookmark.
 * Returns undefined if not yet discovered.
 */
export function getSafariDate(bookmarkId: string): string | undefined {
  const dates = getSafariDates();
  return dates[bookmarkId];
}

/**
 * Set discovery date for a Safari bookmark.
 * Only sets if not already present (first discovery wins).
 */
export function setSafariDate(bookmarkId: string, date?: string): void {
  const dates = getSafariDates();
  if (!dates[bookmarkId]) {
    dates[bookmarkId] = date || new Date().toISOString();
    getStore().set(SAFARI_DATES_KEY, dates);
  }
}

/**
 * Set discovery dates for multiple Safari bookmarks.
 * More efficient than individual calls.
 */
export function setSafariDates(bookmarkIds: string[], date?: string): void {
  const dates = getSafariDates();
  const dateStr = date || new Date().toISOString();
  let changed = false;

  for (const id of bookmarkIds) {
    if (!dates[id]) {
      dates[id] = dateStr;
      changed = true;
    }
  }

  if (changed) {
    getStore().set(SAFARI_DATES_KEY, dates);
  }
}

// ============================================================================
// Bookmark Hashes (for change detection)
// ============================================================================

interface BookmarkHashMap {
  [browserType: string]: {
    [bookmarkId: string]: string; // MD5 hash of name+url
  };
}

/**
 * Get stored bookmark hashes for a browser.
 */
export function getBookmarkHashes(browserType: string): Record<string, string> {
  const allHashes = getStore().get(BOOKMARK_HASHES_KEY, {}) as BookmarkHashMap;
  return allHashes[browserType] || {};
}

/**
 * Store bookmark hashes for a browser.
 */
export function setBookmarkHashes(browserType: string, hashes: Record<string, string>): void {
  const allHashes = getStore().get(BOOKMARK_HASHES_KEY, {}) as BookmarkHashMap;
  allHashes[browserType] = hashes;
  getStore().set(BOOKMARK_HASHES_KEY, allHashes);
}

/**
 * Clear all stored data (for testing/reset).
 */
export function clearAll(): void {
  getStore().delete(CONFIGS_KEY);
  getStore().delete(SAFARI_DATES_KEY);
  getStore().delete(BOOKMARK_HASHES_KEY);
}
