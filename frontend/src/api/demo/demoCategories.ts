/**
 * Demo Category Functions
 *
 * Category operations including groups, linking, and customization.
 */

import type { CategoryGroup, UnmappedCategory, LinkCategoryResult } from '../../types';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/**
 * Get all category groups.
 */
export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.categoryGroups;
}

/**
 * Set the target category group for recurring items.
 */
export async function setConfig(groupId: string, groupName: string): Promise<void> {
  await simulateDelay(100);
  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      config: {
        ...state.dashboard.config,
        target_group_id: groupId,
        target_group_name: groupName,
        is_configured: true,
      },
    },
  }));
}

/**
 * Get categories not yet linked to recurring or wishlist items.
 */
export async function getUnmappedCategories(): Promise<UnmappedCategory[]> {
  await simulateDelay(50);
  const state = getDemoState();

  // Get category IDs used by wishlist items
  const wishlistCategoryIds = new Set(
    state.wishlist.items.filter((item) => item.category_id).map((item) => item.category_id)
  );

  // Filter out categories used by wishlist items
  // (recurring items are already excluded when linking happens)
  return state.unmappedCategories.filter((cat) => !wishlistCategoryIds.has(cat.id));
}

/**
 * Update a category's emoji.
 */
export async function updateCategoryEmoji(
  recurringId: string,
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId ? { ...item, emoji } : item
      ),
    },
  }));

  return { success: true, emoji };
}

/**
 * Update a category's name.
 */
export async function updateCategoryName(
  recurringId: string,
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      items: state.dashboard.items.map((item) =>
        item.id === recurringId ? { ...item, category_name: name } : item
      ),
    },
  }));

  return { success: true, category_name: name };
}

/**
 * Link a recurring item to an existing category.
 */
export async function linkToCategory(
  recurringId: string,
  categoryId: string,
  syncName: boolean
): Promise<LinkCategoryResult> {
  await simulateDelay(150);

  const state = getDemoState();
  const category = state.unmappedCategories.find((c) => c.id === categoryId);

  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      items: s.dashboard.items.map((item) =>
        item.id === recurringId
          ? {
              ...item,
              category_id: categoryId,
              category_name: syncName && category ? category.name : item.category_name,
            }
          : item
      ),
    },
    unmappedCategories: s.unmappedCategories.filter((c) => c.id !== categoryId),
  }));

  return {
    success: true,
    category_id: categoryId,
    category_name: category?.name ?? 'Linked Category',
    sync_name: syncName,
    enabled: true,
  };
}

/**
 * Link rollup to an existing category.
 */
export async function linkRollupToCategory(
  categoryId: string,
  syncName: boolean = true
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  planned_budget?: number;
  is_linked?: boolean;
  error?: string;
}> {
  await simulateDelay(150);

  const state = getDemoState();
  const category = state.unmappedCategories.find((c) => c.id === categoryId);

  updateDemoState((s) => ({
    ...s,
    dashboard: {
      ...s.dashboard,
      rollup: {
        ...s.dashboard.rollup,
        category_id: categoryId,
        ...(syncName && category ? { category_name: category.name } : {}),
      },
    },
    unmappedCategories: s.unmappedCategories.filter((c) => c.id !== categoryId),
  }));

  return {
    success: true,
    category_id: categoryId,
    category_name: category?.name ?? 'Small Subscriptions',
    planned_budget: state.dashboard.rollup.budgeted,
    is_linked: true,
  };
}
