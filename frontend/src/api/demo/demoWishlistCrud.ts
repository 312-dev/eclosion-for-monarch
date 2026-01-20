/**
 * Demo Wishlist CRUD Operations
 *
 * LocalStorage-based implementation of wishlist CRUD for demo mode.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type {
  WishlistItem,
  CreateWishlistItemRequest,
  UpdateWishlistItemRequest,
} from '../../types';
import { recomputeItem, recomputeTotals } from './demoWishlistUtils';

// Re-export utility functions for use by other modules
export { recomputeItem, recomputeTotals } from './demoWishlistUtils';

/**
 * Create a new wishlist item.
 */
export async function createWishlistItem(request: CreateWishlistItemRequest): Promise<{
  success: boolean;
  id: string;
  category_id: string;
  monthly_target: number;
  linked_existing?: boolean;
}> {
  await simulateDelay();

  const state = getDemoState();
  const itemId = `wishlist-${Date.now()}`;

  let categoryId: string;
  let categoryGroupId: string | null = null;
  let categoryGroupName: string | null = null;

  if (request.existing_category_id) {
    const existingCat = state.unmappedCategories.find((c) => c.id === request.existing_category_id);
    if (!existingCat) throw new Error('Category not found');

    const alreadyUsed = state.wishlist.items.find(
      (item) => item.category_id === request.existing_category_id
    );
    if (alreadyUsed) {
      throw new Error(`Category already used by wishlist item '${alreadyUsed.name}'`);
    }

    categoryId = request.existing_category_id;
    categoryGroupId = existingCat.group_id;
    categoryGroupName = existingCat.group_name;
  } else if (request.category_group_id) {
    categoryId = `cat-wishlist-${Date.now()}`;
    categoryGroupId = request.category_group_id;
    const group = state.categoryGroups.find((g) => g.id === request.category_group_id);
    if (group) categoryGroupName = group.name;
  } else {
    throw new Error('Must provide either category_group_id or existing_category_id');
  }

  const maxSortOrder = state.wishlist.items.reduce(
    (max, item) => Math.max(max, item.sort_order ?? 0),
    -1
  );
  const maxGridY = state.wishlist.items.reduce(
    (max, item) => Math.max(max, (item.grid_y ?? 0) + (item.row_span ?? 1)),
    0
  );

  const newItem: WishlistItem = {
    type: 'wishlist',
    id: itemId,
    name: request.name,
    amount: request.amount,
    current_balance: 0,
    planned_budget: 0,
    category_id: categoryId,
    category_name: request.name,
    category_group_id: categoryGroupId,
    category_group_name: categoryGroupName ?? 'Wishlist',
    is_enabled: true,
    status: 'behind',
    progress_percent: 0,
    ...(request.emoji !== undefined && { emoji: request.emoji }),
    target_date: request.target_date,
    months_remaining: 0,
    ...(request.source_url !== undefined && { source_url: request.source_url }),
    ...(request.source_bookmark_id !== undefined && {
      source_bookmark_id: request.source_bookmark_id,
    }),
    ...(request.custom_image_path !== undefined && {
      custom_image_path: request.custom_image_path,
    }),
    monthly_target: 0,
    shortfall: request.amount,
    is_archived: false,
    sort_order: maxSortOrder + 1,
    grid_x: 0,
    grid_y: maxGridY,
    col_span: 1,
    row_span: 1,
  };

  const computedItem = recomputeItem(newItem);

  updateDemoState((s) => {
    const newState = {
      ...s,
      wishlist: { ...s.wishlist, items: [...s.wishlist.items, computedItem] },
    };
    if (request.existing_category_id) {
      newState.unmappedCategories = s.unmappedCategories.filter(
        (c) => c.id !== request.existing_category_id
      );
    }
    return newState;
  });

  return {
    success: true,
    id: itemId,
    category_id: categoryId,
    monthly_target: computedItem.monthly_target,
    linked_existing: Boolean(request.existing_category_id),
  };
}

/**
 * Update a wishlist item.
 */
export async function updateWishlistItem(
  id: string,
  updates: UpdateWishlistItemRequest
): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.wishlist.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Wishlist item not found: ${id}`);

    const item = state.wishlist.items[itemIndex]!;
    const merged = { ...item };

    if (updates.name !== undefined) merged.name = updates.name;
    if (updates.amount !== undefined) merged.amount = updates.amount;
    if (updates.target_date !== undefined) merged.target_date = updates.target_date;
    if (updates.emoji !== undefined) merged.emoji = updates.emoji;
    if (updates.is_enabled !== undefined) merged.is_enabled = updates.is_enabled;

    if (updates.source_url !== undefined) {
      if (updates.source_url === null) delete merged.source_url;
      else merged.source_url = updates.source_url;
    }
    if (updates.custom_image_path !== undefined) {
      if (updates.custom_image_path === null) delete merged.custom_image_path;
      else merged.custom_image_path = updates.custom_image_path;
    }

    const newItems = [...state.wishlist.items];
    newItems[itemIndex] = recomputeItem(merged);

    return { ...state, wishlist: recomputeTotals({ ...state.wishlist, items: newItems }) };
  });

  return { success: true, id };
}

/**
 * Archive a wishlist item (moves to archived).
 */
export async function archiveWishlistItem(id: string): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const activeIndex = state.wishlist.items.findIndex((item) => item.id === id);
    if (activeIndex !== -1) {
      const item = state.wishlist.items[activeIndex]!;
      const archivedItem: WishlistItem = {
        ...item,
        is_archived: true,
        archived_at: new Date().toISOString(),
      };
      const newItems = state.wishlist.items.filter((_, i) => i !== activeIndex);
      const newArchived = [...state.wishlist.archived_items, archivedItem];
      return {
        ...state,
        wishlist: recomputeTotals({
          ...state.wishlist,
          items: newItems,
          archived_items: newArchived,
        }),
      };
    }

    const archivedIndex = state.wishlist.archived_items.findIndex((item) => item.id === id);
    if (archivedIndex !== -1) {
      const item = state.wishlist.archived_items[archivedIndex]!;
      const { archived_at: _, ...itemWithoutArchived } = item;
      const restoredItem: WishlistItem = { ...itemWithoutArchived, is_archived: false };
      const newArchived = state.wishlist.archived_items.filter((_, i) => i !== archivedIndex);
      const newItems = [...state.wishlist.items, restoredItem];
      return {
        ...state,
        wishlist: recomputeTotals({
          ...state.wishlist,
          items: newItems,
          archived_items: newArchived,
        }),
      };
    }

    throw new Error(`Wishlist item not found: ${id}`);
  });

  return { success: true, id };
}

/**
 * Unarchive (restore) a wishlist item.
 */
export async function unarchiveWishlistItem(
  id: string
): Promise<{ success: boolean; id: string; category_missing: boolean }> {
  const result = await archiveWishlistItem(id);
  return { ...result, category_missing: false };
}

/**
 * Delete a wishlist item.
 */
export async function deleteWishlistItem(
  id: string,
  deleteCategory = false
): Promise<{ success: boolean; id: string; category_deleted?: boolean }> {
  await simulateDelay();

  updateDemoState((state) => {
    const newItems = state.wishlist.items.filter((item) => item.id !== id);
    const newArchived = state.wishlist.archived_items.filter((item) => item.id !== id);
    return {
      ...state,
      wishlist: recomputeTotals({
        ...state.wishlist,
        items: newItems,
        archived_items: newArchived,
      }),
    };
  });

  return { success: true, id, category_deleted: deleteCategory };
}
