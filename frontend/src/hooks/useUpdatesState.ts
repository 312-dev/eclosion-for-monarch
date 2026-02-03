/**
 * Updates State Hook
 *
 * Manages read/unread state for Reddit updates using localStorage.
 * Tracks install date to filter relevant updates and provides
 * reactive state via useSyncExternalStore.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useUpdatesQuery, type UpdateEntry } from '../api/queries/updatesQueries';

const STORAGE_KEY = 'eclosion-updates-state';

interface UpdatesState {
  /** When app was first used */
  installDate: string;
  /** IDs of updates marked as read */
  readIds: string[];
  /** Last time user viewed updates */
  lastViewedAt: string | null;
}

function loadFromStorage(): UpdatesState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as UpdatesState;
    }
  } catch {
    // Ignore parse errors
  }
  // First time: set install date to now
  const initial: UpdatesState = {
    installDate: new Date().toISOString(),
    readIds: [],
    lastViewedAt: null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

// Cache the snapshot to avoid creating new objects on every call.
// useSyncExternalStore compares by reference, so we need stable references.
let cachedState: UpdatesState = loadFromStorage();

function refreshCache(): void {
  cachedState = loadFromStorage();
}

function saveState(state: UpdatesState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  // Update cache when saving
  cachedState = state;
}

// For useSyncExternalStore - subscribe to storage changes
function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      refreshCache();
      callback();
    }
  };
  const handleCustom = () => callback();

  globalThis.addEventListener('storage', handleStorage);
  globalThis.addEventListener('updates-state-changed', handleCustom);

  return () => {
    globalThis.removeEventListener('storage', handleStorage);
    globalThis.removeEventListener('updates-state-changed', handleCustom);
  };
}

// Snapshot for useSyncExternalStore - returns cached state for stable reference
function getSnapshot(): UpdatesState {
  return cachedState;
}

export interface UseUpdatesStateReturn {
  /** All updates relevant to this user (since install or latest) */
  allUpdates: UpdateEntry[];
  /** All fetched updates regardless of install date (for browsing) */
  allFetchedUpdates: UpdateEntry[];
  /** Updates not yet marked as read */
  unreadUpdates: UpdateEntry[];
  /** Count of unread updates */
  unreadCount: number;
  /** Current update to display (first unread) */
  currentUpdate: UpdateEntry | null;
  /** Loading state from query */
  isLoading: boolean;
  /** Error from query */
  error: Error | null;
  /** Mark a specific update as read */
  markAsRead: (id: string) => void;
  /** Mark all updates as read */
  markAllAsRead: () => void;
}

export function useUpdatesState(): UseUpdatesStateReturn {
  const { data: allUpdates = [], isLoading, error } = useUpdatesQuery();
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Filter updates to only those since install date
  // OR if no updates since install, show just the latest one
  const relevantUpdates = useMemo((): UpdateEntry[] => {
    const installDate = new Date(state.installDate);
    const sinceInstall = allUpdates.filter((u) => new Date(u.date) >= installDate);

    if (sinceInstall.length === 0 && allUpdates.length > 0) {
      // No updates since install - show just the latest
      const latest = allUpdates[0];
      return latest ? [latest] : [];
    }

    return sinceInstall;
  }, [allUpdates, state.installDate]);

  // Unread = relevant updates not in readIds
  const unreadUpdates = useMemo(() => {
    return relevantUpdates.filter((u) => !state.readIds.includes(u.id));
  }, [relevantUpdates, state.readIds]);

  const unreadCount = unreadUpdates.length;
  const currentUpdate = unreadUpdates[0] || null;

  const markAsRead = useCallback((id: string) => {
    const current = loadFromStorage();
    if (!current.readIds.includes(id)) {
      current.readIds.push(id);
      current.lastViewedAt = new Date().toISOString();
      saveState(current);
      // Trigger re-render
      globalThis.dispatchEvent(new Event('updates-state-changed'));
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    const current = loadFromStorage();
    const allIds = relevantUpdates.map((u) => u.id);
    current.readIds = [...new Set([...current.readIds, ...allIds])];
    current.lastViewedAt = new Date().toISOString();
    saveState(current);
    globalThis.dispatchEvent(new Event('updates-state-changed'));
  }, [relevantUpdates]);

  return {
    allUpdates: relevantUpdates,
    allFetchedUpdates: allUpdates,
    unreadUpdates,
    unreadCount,
    currentUpdate,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  };
}
