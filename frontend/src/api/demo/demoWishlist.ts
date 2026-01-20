/**
 * Demo Wishlist API
 *
 * LocalStorage-based implementation of wishlist API for demo mode.
 * Re-exports from specialized modules and provides layout/sync operations.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type {
  WishlistData,
  WishlistItem,
  WishlistLayoutUpdate,
  WishlistSyncResult,
} from '../../types';
import { calculateProgressPercent, calculateShortfall } from '../../utils/savingsCalculations';
import { recomputeItem, recomputeTotals } from './demoWishlistUtils';

// Re-export CRUD operations
export {
  createWishlistItem,
  updateWishlistItem,
  archiveWishlistItem,
  unarchiveWishlistItem,
  deleteWishlistItem,
} from './demoWishlistCrud';

// Re-export pending bookmarks operations
export {
  getPendingBookmarks,
  getPendingCount,
  getSkippedBookmarks,
  skipPendingBookmark,
  convertPendingBookmark,
  importBookmarks,
  clearUnconvertedBookmarks,
} from './demoWishlistPending';

// Re-export config operations
export {
  getWishlistCategoryGroups,
  getWishlistConfig,
  updateWishlistConfig,
  fetchOgImage,
} from './demoWishlistConfig';

/**
 * Get all wishlist data.
 */
export async function getWishlist(): Promise<WishlistData> {
  await simulateDelay();
  const state = getDemoState();
  return recomputeTotals(state.wishlist);
}

/**
 * Calculate status based on balance, budget, target amount, and monthly target.
 */
function calculateBudgetStatus(
  balance: number,
  budget: number,
  targetAmount: number,
  monthlyTarget: number
): WishlistItem['status'] {
  if (balance >= targetAmount) return 'funded';
  if (budget > monthlyTarget) return 'ahead';
  if (budget >= monthlyTarget) return 'on_track';
  return 'behind';
}

/**
 * Allocate funds to a wishlist item (update budget).
 * Also updates dashboard.ready_to_assign to reflect the budget change.
 */
export async function allocateWishlistFunds(
  id: string,
  amount: number
): Promise<{ success: boolean; id: string; new_budget: number }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.wishlist.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Wishlist item not found: ${id}`);

    const item = state.wishlist.items[itemIndex]!;
    // Calculate delta: how much new money is being allocated
    const delta = amount - item.planned_budget;
    const newBalance = item.current_balance + delta;
    const updatedItem: WishlistItem = {
      ...item,
      planned_budget: amount,
      current_balance: newBalance,
      status: calculateBudgetStatus(newBalance, amount, item.amount, item.monthly_target),
      progress_percent: calculateProgressPercent(newBalance, item.amount),
      shortfall: calculateShortfall(newBalance, item.amount),
    };

    const newItems = [...state.wishlist.items];
    newItems[itemIndex] = updatedItem;

    return {
      ...state,
      wishlist: {
        ...state.wishlist,
        items: newItems,
        total_saved: newItems.reduce((sum, i) => sum + i.current_balance, 0),
      },
      // Update ready_to_assign to reflect the budget change (same as recurring allocation)
      dashboard: {
        ...state.dashboard,
        ready_to_assign: {
          ...state.dashboard.ready_to_assign,
          ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign - delta,
        },
      },
    };
  });

  return { success: true, id, new_budget: amount };
}

/**
 * Change category group for a wishlist item.
 */
export async function changeWishlistGroup(
  id: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.wishlist.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Wishlist item not found: ${id}`);

    const newItems = [...state.wishlist.items];
    newItems[itemIndex] = {
      ...newItems[itemIndex]!,
      category_group_id: groupId,
      category_group_name: groupName,
    };

    return { ...state, wishlist: { ...state.wishlist, items: newItems } };
  });

  return { success: true, id };
}

/**
 * Link a category to an existing wishlist item.
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
  await simulateDelay();

  let categoryId = '';
  let categoryName = '';
  let categoryGroupId = '';
  let categoryGroupName = '';

  updateDemoState((state) => {
    const itemIndex = state.wishlist.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Wishlist item not found: ${id}`);

    const item = state.wishlist.items[itemIndex]!;
    categoryId = params.existingCategoryId || `demo-cat-${Date.now()}`;
    categoryName = params.existingCategoryId ? 'Existing Category' : item.name;
    categoryGroupId = params.categoryGroupId || 'demo-group';
    categoryGroupName = params.categoryGroupId ? 'Savings Goals' : 'Demo Group';

    const newItems = [...state.wishlist.items];
    newItems[itemIndex] = {
      ...item,
      category_id: categoryId,
      category_name: categoryName,
      category_group_id: categoryGroupId,
      category_group_name: categoryGroupName,
    };

    return { ...state, wishlist: { ...state.wishlist, items: newItems } };
  });

  return {
    success: true,
    id,
    category_id: categoryId,
    category_name: categoryName,
    category_group_id: categoryGroupId,
    category_group_name: categoryGroupName,
  };
}

/**
 * Reorder wishlist items.
 * @deprecated Use updateWishlistLayouts for grid-based positioning
 */
export async function reorderWishlistItems(itemIds: string[]): Promise<{ success: boolean }> {
  await simulateDelay();

  updateDemoState((state) => {
    const getSortOrder = (id: string) => {
      const index = itemIds.indexOf(id);
      return index === -1 ? itemIds.length : index;
    };

    const items = state.wishlist.items
      .map((item) => ({ ...item, sort_order: getSortOrder(item.id) }))
      .sort((a, b) => a.sort_order - b.sort_order);

    return { ...state, wishlist: { ...state.wishlist, items } };
  });

  return { success: true };
}

/**
 * Apply layout updates to a list of items.
 */
function applyLayoutUpdates(
  items: WishlistItem[],
  layouts: WishlistLayoutUpdate[]
): { items: WishlistItem[]; count: number } {
  let count = 0;
  const updatedItems = items.map((item) => {
    const layout = layouts.find((l) => l.id === item.id);
    if (!layout) return item;
    count++;
    return {
      ...item,
      grid_x: layout.grid_x,
      grid_y: layout.grid_y,
      col_span: layout.col_span,
      row_span: layout.row_span,
    };
  });
  return { items: updatedItems, count };
}

/**
 * Update grid layout positions for wishlist items.
 */
export async function updateWishlistLayouts(
  layouts: WishlistLayoutUpdate[]
): Promise<{ success: boolean; updated: number }> {
  await simulateDelay();

  let updated = 0;

  updateDemoState((state) => {
    const activeResult = applyLayoutUpdates(state.wishlist.items, layouts);
    const archivedResult = applyLayoutUpdates(state.wishlist.archived_items, layouts);
    updated = activeResult.count + archivedResult.count;

    return {
      ...state,
      wishlist: {
        ...state.wishlist,
        items: activeResult.items,
        archived_items: archivedResult.items,
      },
    };
  });

  return { success: true, updated };
}

/**
 * Sync wishlist data (simulate pulling from Monarch).
 */
export async function syncWishlist(): Promise<WishlistSyncResult> {
  await simulateDelay(500);

  const state = getDemoState();
  const newlyFunded: string[] = [];

  const updatedItems = state.wishlist.items.map((item) => {
    const recomputed = recomputeItem(item);
    if (recomputed.status === 'funded' && item.status !== 'funded') {
      newlyFunded.push(item.id);
    }
    return recomputed;
  });

  updateDemoState((s) => ({
    ...s,
    wishlist: recomputeTotals({ ...s.wishlist, items: updatedItems }),
  }));

  return { success: true, items_updated: updatedItems.length, newly_funded: newlyFunded };
}
