/**
 * Wishlist API
 *
 * API functions for wishlist operations.
 */

import { fetchApi } from './fetchApi';
import type {
  WishlistData,
  WishlistConfig,
  CreateWishlistItemRequest,
  UpdateWishlistItemRequest,
  WishlistSyncResult,
  WishlistLayoutUpdate,
  PendingBookmarksResponse,
  PendingCountResponse,
  ImportBookmark,
  ImportBookmarksResponse,
  PendingBookmarkActionResponse,
} from '../../types';

/**
 * Get all wishlist data (dashboard).
 */
export async function getWishlist(): Promise<WishlistData> {
  return fetchApi<WishlistData>('/wishlist/dashboard');
}

/**
 * Create a new wishlist item.
 */
export async function createWishlistItem(
  request: CreateWishlistItemRequest
): Promise<{ success: boolean; id: string; category_id: string; monthly_target: number }> {
  return fetchApi('/wishlist', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Update a wishlist item.
 */
export async function updateWishlistItem(
  id: string,
  updates: UpdateWishlistItemRequest
): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/wishlist/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Archive a wishlist item.
 */
export async function archiveWishlistItem(id: string): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/wishlist/${id}/archive`, {
    method: 'POST',
  });
}

/**
 * Unarchive (restore) a wishlist item.
 * Returns category_missing: true if the linked Monarch category no longer exists.
 */
export async function unarchiveWishlistItem(
  id: string
): Promise<{ success: boolean; id: string; category_missing: boolean }> {
  return fetchApi(`/wishlist/${id}/unarchive`, {
    method: 'POST',
  });
}

/**
 * Delete a wishlist item.
 * @param id - The wishlist item ID
 * @param deleteCategory - If true, also delete the linked category from Monarch
 */
export async function deleteWishlistItem(
  id: string,
  deleteCategory = false
): Promise<{ success: boolean; id: string; category_deleted?: boolean }> {
  const params = deleteCategory ? '?delete_category=true' : '';
  return fetchApi(`/wishlist/${id}${params}`, {
    method: 'DELETE',
  });
}

/**
 * Allocate funds to a wishlist item (update budget).
 */
export async function allocateWishlistFunds(
  id: string,
  amount: number
): Promise<{ success: boolean; id: string; new_budget: number }> {
  return fetchApi(`/wishlist/${id}/allocate`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

/**
 * Change category group for a wishlist item.
 */
export async function changeWishlistGroup(
  id: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/wishlist/${id}/change-group`, {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, group_name: groupName }),
  });
}

/**
 * Link a category to an existing wishlist item.
 * Used when restoring an archived item whose category was deleted.
 */
export async function linkWishlistCategory(
  id: string,
  params: { categoryGroupId?: string; existingCategoryId?: string }
): Promise<{
  success: boolean;
  id: string;
  category_id: string;
  category_name: string;
  category_group_id: string;
  category_group_name: string;
  monthly_target?: number;
}> {
  return fetchApi(`/wishlist/${id}/link-category`, {
    method: 'POST',
    body: JSON.stringify({
      category_group_id: params.categoryGroupId,
      existing_category_id: params.existingCategoryId,
    }),
  });
}

/**
 * Sync wishlist data from Monarch.
 */
export async function syncWishlist(): Promise<WishlistSyncResult> {
  return fetchApi<WishlistSyncResult>('/wishlist/sync', {
    method: 'POST',
  });
}

/**
 * Fetch og:image from a URL and return as base64 data URL.
 * Returns null if not found or fetch fails (fails silently).
 * Times out after 10 seconds.
 */
export async function fetchOgImage(url: string): Promise<string | null> {
  const response = await fetchApi<{ image: string | null }>(
    `/wishlist/fetch-og-image?url=${encodeURIComponent(url)}`
  );
  return response.image;
}

/**
 * Reorder wishlist items.
 * @param itemIds - Array of item IDs in their new order
 * @deprecated Use updateWishlistLayouts for grid-based positioning
 */
export async function reorderWishlistItems(itemIds: string[]): Promise<{ success: boolean }> {
  return fetchApi('/wishlist/reorder', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds }),
  });
}

/**
 * Update grid layout positions for wishlist items.
 * Used for drag-drop reordering and widget resizing.
 * @param layouts - Array of layout updates with position and size
 */
export async function updateWishlistLayouts(
  layouts: WishlistLayoutUpdate[]
): Promise<{ success: boolean; updated: number }> {
  return fetchApi('/wishlist/layout', {
    method: 'PUT',
    body: JSON.stringify({ layouts }),
  });
}

/**
 * Get category groups for wishlist selections.
 */
export async function getWishlistCategoryGroups(): Promise<{ id: string; name: string }[]> {
  const response = await fetchApi<{ groups: { id: string; name: string }[] }>('/wishlist/groups');
  return response.groups;
}

/**
 * Get wishlist configuration.
 */
export async function getWishlistConfig(): Promise<WishlistConfig> {
  return fetchApi<WishlistConfig>('/wishlist/config');
}

/**
 * Update wishlist configuration.
 */
export async function updateWishlistConfig(
  updates: Partial<WishlistConfig>
): Promise<{ success: boolean }> {
  return fetchApi('/wishlist/config', {
    method: 'PUT',
    body: JSON.stringify({
      default_category_group_id: updates.defaultCategoryGroupId,
      default_category_group_name: updates.defaultCategoryGroupName,
      selected_browser: updates.selectedBrowser,
      selected_folder_ids: updates.selectedFolderIds,
      selected_folder_names: updates.selectedFolderNames,
      auto_archive_on_bookmark_delete: updates.autoArchiveOnBookmarkDelete,
      auto_archive_on_goal_met: updates.autoArchiveOnGoalMet,
      is_configured: updates.isConfigured,
    }),
  });
}

// === Pending Bookmarks ===

/**
 * Get all pending bookmarks awaiting review.
 */
export async function getPendingBookmarks(): Promise<PendingBookmarksResponse> {
  return fetchApi<PendingBookmarksResponse>('/wishlist/pending');
}

/**
 * Get count of pending bookmarks (for banner display).
 */
export async function getPendingCount(): Promise<PendingCountResponse> {
  return fetchApi<PendingCountResponse>('/wishlist/pending/count');
}

/**
 * Get all skipped/ignored bookmarks.
 */
export async function getSkippedBookmarks(): Promise<PendingBookmarksResponse> {
  return fetchApi<PendingBookmarksResponse>('/wishlist/pending/skipped');
}

/**
 * Skip a pending bookmark.
 * The URL is remembered and won't re-appear in pending review.
 */
export async function skipPendingBookmark(id: string): Promise<PendingBookmarkActionResponse> {
  return fetchApi<PendingBookmarkActionResponse>(`/wishlist/pending/${id}/skip`, {
    method: 'POST',
  });
}

/**
 * Convert a pending bookmark to a wishlist item.
 * Called after successfully creating a wishlist item from a pending bookmark.
 */
export async function convertPendingBookmark(id: string): Promise<PendingBookmarkActionResponse> {
  return fetchApi<PendingBookmarkActionResponse>(`/wishlist/pending/${id}/convert`, {
    method: 'POST',
  });
}

/**
 * Import bookmarks from browser sync.
 * URLs that already exist (pending, skipped, or converted) are skipped.
 */
export async function importBookmarks(
  bookmarks: ImportBookmark[]
): Promise<ImportBookmarksResponse> {
  return fetchApi<ImportBookmarksResponse>('/wishlist/pending/import', {
    method: 'POST',
    body: JSON.stringify({ bookmarks }),
  });
}

/**
 * Clear all non-converted pending bookmarks.
 * Used when re-running the wizard to change bookmark source.
 * Preserves converted bookmarks since they're linked to wishlist items.
 */
export async function clearUnconvertedBookmarks(): Promise<{
  success: boolean;
  deleted_count: number;
}> {
  return fetchApi<{ success: boolean; deleted_count: number }>(
    '/wishlist/pending/clear-unconverted',
    {
      method: 'POST',
    }
  );
}
