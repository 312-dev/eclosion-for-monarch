/**
 * Demo Wishlist Pending Bookmarks API
 *
 * LocalStorage-based implementation of pending bookmarks for demo mode.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type {
  PendingBookmarksResponse,
  PendingCountResponse,
  PendingBookmarkActionResponse,
  ImportBookmark,
  ImportBookmarksResponse,
  PendingBookmark,
} from '../../types';

/**
 * Get all pending bookmarks awaiting review.
 */
export async function getPendingBookmarks(): Promise<PendingBookmarksResponse> {
  await simulateDelay();
  const state = getDemoState();
  const pending = (state.pendingBookmarks || []).filter(
    (bm: PendingBookmark) => bm.status === 'pending'
  );
  return { bookmarks: pending };
}

/**
 * Get count of pending bookmarks.
 */
export async function getPendingCount(): Promise<PendingCountResponse> {
  await simulateDelay();
  const state = getDemoState();
  const pending = (state.pendingBookmarks || []).filter(
    (bm: PendingBookmark) => bm.status === 'pending'
  );
  return { count: pending.length };
}

/**
 * Get all skipped/ignored bookmarks.
 */
export async function getSkippedBookmarks(): Promise<PendingBookmarksResponse> {
  await simulateDelay();
  const state = getDemoState();
  const skipped = (state.pendingBookmarks || []).filter(
    (bm: PendingBookmark) => bm.status === 'skipped'
  );
  return { bookmarks: skipped };
}

/**
 * Skip a pending bookmark.
 */
export async function skipPendingBookmark(id: string): Promise<PendingBookmarkActionResponse> {
  await simulateDelay();

  updateDemoState((state) => {
    const bookmarks = state.pendingBookmarks || [];
    const index = bookmarks.findIndex((bm: PendingBookmark) => bm.id === id);
    if (index === -1) {
      return state;
    }

    const updated = [...bookmarks];
    updated[index] = {
      ...updated[index]!,
      status: 'skipped' as const,
    };

    return {
      ...state,
      pendingBookmarks: updated,
    };
  });

  return { success: true, id };
}

/**
 * Convert a pending bookmark (mark as converted after wishlist item creation).
 */
export async function convertPendingBookmark(id: string): Promise<PendingBookmarkActionResponse> {
  await simulateDelay();

  updateDemoState((state) => {
    const bookmarks = state.pendingBookmarks || [];
    const index = bookmarks.findIndex((bm: PendingBookmark) => bm.id === id);
    if (index === -1) {
      return state;
    }

    const updated = [...bookmarks];
    updated[index] = {
      ...updated[index]!,
      status: 'converted' as const,
    };

    return {
      ...state,
      pendingBookmarks: updated,
    };
  });

  return { success: true, id };
}

/**
 * Import bookmarks from browser sync.
 */
export async function importBookmarks(
  bookmarks: ImportBookmark[]
): Promise<ImportBookmarksResponse> {
  await simulateDelay();

  let imported = 0;
  let skippedExisting = 0;

  updateDemoState((state) => {
    const existing = state.pendingBookmarks || [];
    const existingUrls = new Set(existing.map((bm: PendingBookmark) => bm.url));
    const newBookmarks: PendingBookmark[] = [];

    for (const bm of bookmarks) {
      if (existingUrls.has(bm.url)) {
        skippedExisting++;
        continue;
      }

      newBookmarks.push({
        id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        url: bm.url,
        name: bm.name,
        bookmark_id: bm.bookmark_id,
        browser_type: bm.browser_type,
        logo_url: bm.logo_url ?? null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      imported++;
    }

    return {
      ...state,
      pendingBookmarks: [...existing, ...newBookmarks],
    };
  });

  return { imported, skipped_existing: skippedExisting };
}

/**
 * Clear all non-converted pending bookmarks.
 * Used when re-running the wizard to change bookmark source.
 */
export async function clearUnconvertedBookmarks(): Promise<{
  success: boolean;
  deleted_count: number;
}> {
  await simulateDelay();

  let deletedCount = 0;

  updateDemoState((state) => {
    const existing = state.pendingBookmarks || [];
    const kept = existing.filter((bm: PendingBookmark) => bm.status === 'converted');
    deletedCount = existing.length - kept.length;

    return {
      ...state,
      pendingBookmarks: kept,
    };
  });

  return { success: true, deleted_count: deletedCount };
}
