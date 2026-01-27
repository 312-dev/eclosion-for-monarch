/**
 * Stash API
 *
 * API functions for stash operations.
 */

import { fetchApi } from './fetchApi';
import type {
  StashData,
  StashConfig,
  CreateStashItemRequest,
  UpdateStashItemRequest,
  StashSyncResult,
  StashLayoutUpdate,
  PendingBookmarksResponse,
  PendingCountResponse,
  ImportBookmark,
  ImportBookmarksResponse,
  PendingBookmarkActionResponse,
  StashHistoryResponse,
  SaveHypothesisRequest,
  SaveHypothesisResponse,
  GetHypothesesResponse,
  DeleteHypothesisResponse,
} from '../../types';

/**
 * Get all stash data (dashboard).
 */
export async function getStash(): Promise<StashData> {
  return fetchApi<StashData>('/stash/dashboard');
}

/**
 * Create a new stash item.
 */
export async function createStashItem(
  request: CreateStashItemRequest
): Promise<{ success: boolean; id: string; category_id: string; monthly_target: number }> {
  return fetchApi('/stash', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Update a stash item.
 */
export async function updateStashItem(
  id: string,
  updates: UpdateStashItemRequest
): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/stash/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

/**
 * Archive a stash item.
 */
export async function archiveStashItem(id: string): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/stash/${id}/archive`, {
    method: 'POST',
  });
}

/**
 * Unarchive (restore) a stash item.
 * Returns category_missing: true if the linked Monarch category no longer exists.
 */
export async function unarchiveStashItem(
  id: string
): Promise<{ success: boolean; id: string; category_missing: boolean }> {
  return fetchApi(`/stash/${id}/unarchive`, {
    method: 'POST',
  });
}

/**
 * Mark a one-time purchase goal as completed (archived).
 * @param id - The stash item ID
 * @param releaseFunds - If true, release remaining funds to Left to Budget
 */
export async function completeStashItem(
  id: string,
  releaseFunds = false
): Promise<{ success: boolean; id: string; funds_released: boolean }> {
  return fetchApi(`/stash/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ release_funds: releaseFunds }),
  });
}

/**
 * Unmark a completed one-time purchase, moving it back to active.
 */
export async function uncompleteStashItem(id: string): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/stash/${id}/complete`, {
    method: 'DELETE',
  });
}

/**
 * Delete a stash item.
 * @param id - The stash item ID
 * @param deleteCategory - If true, also delete the linked category from Monarch
 */
export async function deleteStashItem(
  id: string,
  deleteCategory = false
): Promise<{ success: boolean; id: string; category_deleted?: boolean }> {
  const params = deleteCategory ? '?delete_category=true' : '';
  return fetchApi(`/stash/${id}${params}`, {
    method: 'DELETE',
  });
}

/**
 * Allocate funds to a stash item (update budget).
 */
export async function allocateStashFunds(
  id: string,
  amount: number
): Promise<{ success: boolean; id: string; new_budget: number }> {
  return fetchApi(`/stash/${id}/allocate`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

/**
 * Batch allocation request type.
 */
export interface BatchAllocation {
  id: string;
  budget: number;
}

/**
 * Allocate funds to multiple stash items at once.
 * Used by the Distribute feature to update all stash budgets in one request.
 */
export async function allocateStashFundsBatch(
  allocations: BatchAllocation[]
): Promise<{ success: boolean; updated: number; errors?: string[] }> {
  return fetchApi('/stash/allocate-batch', {
    method: 'POST',
    body: JSON.stringify({ allocations }),
  });
}

/**
 * Change category group for a stash item.
 */
export async function changeStashGroup(
  id: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; id: string }> {
  return fetchApi(`/stash/${id}/change-group`, {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, group_name: groupName }),
  });
}

/**
 * Link a category to an existing stash item.
 * Used when restoring an archived item whose category was deleted.
 */
export async function linkStashCategory(
  id: string,
  params: { categoryGroupId?: string; existingCategoryId?: string; flexibleGroupId?: string }
): Promise<{
  success: boolean;
  id: string;
  category_id: string;
  category_name: string;
  category_group_id: string;
  category_group_name: string;
  monthly_target?: number;
}> {
  return fetchApi(`/stash/${id}/link-category`, {
    method: 'POST',
    body: JSON.stringify({
      category_group_id: params.categoryGroupId,
      existing_category_id: params.existingCategoryId,
      flexible_group_id: params.flexibleGroupId,
    }),
  });
}

/**
 * Sync stash data from Monarch.
 */
export async function syncStash(): Promise<StashSyncResult> {
  return fetchApi<StashSyncResult>('/stash/sync', {
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
    `/stash/fetch-og-image?url=${encodeURIComponent(url)}`
  );
  return response.image;
}

/**
 * Fetch favicon from a domain and return as base64 data URL.
 * Returns null if not found, too small (< 32x32), or fetch fails.
 * Times out after 5 seconds.
 */
export async function fetchFavicon(domain: string): Promise<string | null> {
  const response = await fetchApi<{ favicon: string | null }>(
    `/stash/fetch-favicon?domain=${encodeURIComponent(domain)}`
  );
  return response.favicon;
}

/**
 * Reorder stash items.
 * @param itemIds - Array of item IDs in their new order
 * @deprecated Use updateStashLayouts for grid-based positioning
 */
export async function reorderStashItems(itemIds: string[]): Promise<{ success: boolean }> {
  return fetchApi('/stash/reorder', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds }),
  });
}

/**
 * Update grid layout positions for stash items.
 * Used for drag-drop reordering and widget resizing.
 * @param layouts - Array of layout updates with position and size
 */
export async function updateStashLayouts(
  layouts: StashLayoutUpdate[]
): Promise<{ success: boolean; updated: number }> {
  return fetchApi('/stash/layout', {
    method: 'PUT',
    body: JSON.stringify({ layouts }),
  });
}

/**
 * Get category groups for stash selections.
 */
export async function getStashCategoryGroups(): Promise<{ id: string; name: string }[]> {
  const response = await fetchApi<{ groups: { id: string; name: string }[] }>('/stash/groups');
  return response.groups;
}

/**
 * Get stash configuration.
 */
export async function getStashConfig(): Promise<StashConfig> {
  return fetchApi<StashConfig>('/stash/config');
}

/**
 * Update stash configuration.
 */
export async function updateStashConfig(
  updates: Partial<StashConfig>
): Promise<{ success: boolean }> {
  return fetchApi('/stash/config', {
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
      include_expected_income: updates.includeExpectedIncome,
      show_monarch_goals: updates.showMonarchGoals,
      buffer_amount: updates.bufferAmount,
    }),
  });
}

// === Pending Bookmarks ===

/**
 * Get all pending bookmarks awaiting review.
 */
export async function getPendingBookmarks(): Promise<PendingBookmarksResponse> {
  return fetchApi<PendingBookmarksResponse>('/stash/pending');
}

/**
 * Get count of pending bookmarks (for banner display).
 */
export async function getPendingCount(): Promise<PendingCountResponse> {
  return fetchApi<PendingCountResponse>('/stash/pending/count');
}

/**
 * Get all skipped/ignored bookmarks.
 */
export async function getSkippedBookmarks(): Promise<PendingBookmarksResponse> {
  return fetchApi<PendingBookmarksResponse>('/stash/pending/skipped');
}

/**
 * Skip a pending bookmark.
 * The URL is remembered and won't re-appear in pending review.
 */
export async function skipPendingBookmark(id: string): Promise<PendingBookmarkActionResponse> {
  return fetchApi<PendingBookmarkActionResponse>(`/stash/pending/${id}/skip`, {
    method: 'POST',
  });
}

/**
 * Convert a pending bookmark to a stash item.
 * Called after successfully creating a stash item from a pending bookmark.
 */
export async function convertPendingBookmark(id: string): Promise<PendingBookmarkActionResponse> {
  return fetchApi<PendingBookmarkActionResponse>(`/stash/pending/${id}/convert`, {
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
  return fetchApi<ImportBookmarksResponse>('/stash/pending/import', {
    method: 'POST',
    body: JSON.stringify({ bookmarks }),
  });
}

/**
 * Clear all non-converted pending bookmarks.
 * Used when re-running the wizard to change bookmark source.
 * Preserves converted bookmarks since they're linked to stash items.
 */
export async function clearUnconvertedBookmarks(): Promise<{
  success: boolean;
  deleted_count: number;
}> {
  return fetchApi<{ success: boolean; deleted_count: number }>('/stash/pending/clear-unconverted', {
    method: 'POST',
  });
}

// === Stash History (Reports) ===

/**
 * Get monthly history for all stash items.
 * Used for the Reports tab to show progress charts over time.
 *
 * @param months - Number of months of history (default: 12, max: 36)
 * @returns Stash items with monthly balance/contribution history
 */
export async function getStashHistory(months = 12): Promise<StashHistoryResponse> {
  return fetchApi<StashHistoryResponse>(`/stash/history?months=${months}`);
}

// === Category Rollover Balance ===

/**
 * Add funds to a category's rollover starting balance.
 *
 * Used by the Distribute wizard to allocate the "rollover portion" of
 * available funds (Available to Stash - Left to Budget) to categories.
 * This effectively adds savings to a category that persists month-to-month.
 *
 * @param categoryId - The Monarch category ID to update
 * @param amount - Amount (integer) to add to the rollover starting balance
 */
export async function updateCategoryRolloverBalance(
  categoryId: string,
  amount: number
): Promise<{ success: boolean; category?: unknown }> {
  return fetchApi('/stash/update-rollover-balance', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId, amount }),
  });
}

/**
 * Add funds to a category group's rollover starting balance.
 *
 * Used by the Distribute wizard for stash items linked to flexible category
 * groups that have group-level rollover enabled.
 *
 * @param groupId - The Monarch category group ID
 * @param amount - Amount (integer) to add to the rollover starting balance
 */
export async function updateGroupRolloverBalance(
  groupId: string,
  amount: number
): Promise<{ success: boolean; group?: unknown }> {
  return fetchApi('/stash/update-group-rollover-balance', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, amount }),
  });
}

// === Hypotheses ===

/**
 * Get all saved hypotheses.
 * Used by the Distribute wizard's hypothesize mode.
 */
export async function getHypotheses(): Promise<GetHypothesesResponse> {
  return fetchApi<GetHypothesesResponse>('/stash/hypotheses');
}

/**
 * Save a hypothesis.
 * If a hypothesis with the same name exists (case-insensitive), it will be updated.
 * Otherwise creates a new one if under the max limit (10).
 */
export async function saveHypothesis(
  request: SaveHypothesisRequest
): Promise<SaveHypothesisResponse> {
  return fetchApi<SaveHypothesisResponse>('/stash/hypotheses', {
    method: 'POST',
    body: JSON.stringify({
      name: request.name,
      savings_allocations: request.savingsAllocations,
      savings_total: request.savingsTotal,
      monthly_allocations: request.monthlyAllocations,
      monthly_total: request.monthlyTotal,
      events: request.events,
      custom_available_funds: request.customAvailableFunds,
      custom_left_to_budget: request.customLeftToBudget,
      item_apys: request.itemApys ?? {},
    }),
  });
}

/**
 * Delete a hypothesis by ID.
 */
export async function deleteHypothesis(id: string): Promise<DeleteHypothesisResponse> {
  return fetchApi<DeleteHypothesisResponse>(`/stash/hypotheses/${id}`, {
    method: 'DELETE',
  });
}
