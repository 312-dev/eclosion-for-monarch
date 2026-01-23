/**
 * Demo Stash CRUD Operations
 *
 * LocalStorage-based implementation of stash CRUD for demo mode.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type { StashItem, CreateStashItemRequest, UpdateStashItemRequest } from '../../types';
import { recomputeItem, recomputeTotals } from './demoStashUtils';

// Re-export utility functions for use by other modules
export { recomputeItem, recomputeTotals } from './demoStashUtils';

/**
 * Create a new stash item.
 */
export async function createStashItem(request: CreateStashItemRequest): Promise<{
  success: boolean;
  id: string;
  category_id: string;
  monthly_target: number;
  linked_existing?: boolean;
}> {
  await simulateDelay();

  const state = getDemoState();
  const itemId = `stash-${Date.now()}`;

  let categoryId: string;
  let categoryGroupId: string | null = null;
  let categoryGroupName: string | null = null;

  if (request.existing_category_id) {
    const existingCat = state.unmappedCategories.find((c) => c.id === request.existing_category_id);
    if (!existingCat) throw new Error('Category not found');

    const alreadyUsed = state.stash.items.find(
      (item) => item.category_id === request.existing_category_id
    );
    if (alreadyUsed) {
      throw new Error(`Category already used by stash '${alreadyUsed.name}'`);
    }

    categoryId = request.existing_category_id;
    categoryGroupId = existingCat.group_id;
    categoryGroupName = existingCat.group_name;
  } else if (request.flexible_group_id) {
    // Linking to a flexible category group with group-level rollover
    const flexGroup = state.categoryGroupsDetailed?.find((g) => g.id === request.flexible_group_id);
    categoryId = `group-${request.flexible_group_id}`; // Use group ID as pseudo-category
    categoryGroupId = request.flexible_group_id;
    categoryGroupName = flexGroup?.name || 'Flexible Group';
  } else if (request.category_group_id) {
    categoryId = `cat-stash-${Date.now()}`;
    categoryGroupId = request.category_group_id;
    const group = state.categoryGroups.find((g) => g.id === request.category_group_id);
    if (group) categoryGroupName = group.name;
  } else {
    throw new Error('Must provide either category_group_id, existing_category_id, or flexible_group_id');
  }

  const maxSortOrder = state.stash.items.reduce(
    (max, item) => Math.max(max, item.sort_order ?? 0),
    -1
  );
  const maxGridY = state.stash.items.reduce(
    (max, item) => Math.max(max, (item.grid_y ?? 0) + (item.row_span ?? 1)),
    0
  );

  const newItem: StashItem = {
    type: 'stash',
    id: itemId,
    name: request.name,
    amount: request.amount,
    current_balance: 0,
    planned_budget: 0,
    rollover_amount: 0,
    credits_this_month: 0,
    category_id: categoryId,
    category_name: request.name,
    category_group_id: categoryGroupId,
    category_group_name: categoryGroupName ?? 'Stash',
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
    goal_type: request.goal_type ?? 'one_time',
    ...(request.tracking_start_date !== undefined && {
      tracking_start_date: request.tracking_start_date,
    }),
    created_at: new Date().toISOString(),
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
      stash: { ...s.stash, items: [...s.stash.items, computedItem] },
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
 * Apply updates to a stash item, handling nullable fields correctly.
 */
function applyStashUpdates(item: StashItem, updates: UpdateStashItemRequest): StashItem {
  const merged = { ...item };

  // Simple field updates
  if (updates.name !== undefined) merged.name = updates.name;
  if (updates.amount !== undefined) merged.amount = updates.amount;
  if (updates.target_date !== undefined) merged.target_date = updates.target_date;
  if (updates.emoji !== undefined) merged.emoji = updates.emoji;
  if (updates.is_enabled !== undefined) merged.is_enabled = updates.is_enabled;
  if (updates.goal_type !== undefined) merged.goal_type = updates.goal_type;

  // Nullable fields (null means delete, undefined means unchanged)
  if (updates.source_url === null) delete merged.source_url;
  else if (updates.source_url !== undefined) merged.source_url = updates.source_url;

  if (updates.custom_image_path === null) delete merged.custom_image_path;
  else if (updates.custom_image_path !== undefined)
    merged.custom_image_path = updates.custom_image_path;

  if (updates.tracking_start_date === null) delete merged.tracking_start_date;
  else if (updates.tracking_start_date !== undefined)
    merged.tracking_start_date = updates.tracking_start_date;

  return merged;
}

/**
 * Update a stash item.
 */
export async function updateStashItem(
  id: string,
  updates: UpdateStashItemRequest
): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const item = state.stash.items[itemIndex]!;
    const merged = applyStashUpdates(item, updates);

    const newItems = [...state.stash.items];
    newItems[itemIndex] = recomputeItem(merged);

    return { ...state, stash: recomputeTotals({ ...state.stash, items: newItems }) };
  });

  return { success: true, id };
}

/**
 * Archive a stash item (moves to archived).
 */
export async function archiveStashItem(id: string): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const activeIndex = state.stash.items.findIndex((item) => item.id === id);
    if (activeIndex !== -1) {
      const item = state.stash.items[activeIndex]!;
      const archivedItem: StashItem = {
        ...item,
        is_archived: true,
        archived_at: new Date().toISOString(),
      };
      const newItems = state.stash.items.filter((_, i) => i !== activeIndex);
      const newArchived = [...state.stash.archived_items, archivedItem];
      return {
        ...state,
        stash: recomputeTotals({
          ...state.stash,
          items: newItems,
          archived_items: newArchived,
        }),
      };
    }

    const archivedIndex = state.stash.archived_items.findIndex((item) => item.id === id);
    if (archivedIndex !== -1) {
      const item = state.stash.archived_items[archivedIndex]!;
      const { archived_at: _, ...itemWithoutArchived } = item;
      const restoredItem: StashItem = { ...itemWithoutArchived, is_archived: false };
      const newArchived = state.stash.archived_items.filter((_, i) => i !== archivedIndex);
      const newItems = [...state.stash.items, restoredItem];
      return {
        ...state,
        stash: recomputeTotals({
          ...state.stash,
          items: newItems,
          archived_items: newArchived,
        }),
      };
    }

    throw new Error(`Stash not found: ${id}`);
  });

  return { success: true, id };
}

/**
 * Unarchive (restore) a stash item.
 */
export async function unarchiveStashItem(
  id: string
): Promise<{ success: boolean; id: string; category_missing: boolean }> {
  const result = await archiveStashItem(id);
  return { ...result, category_missing: false };
}

/**
 * Delete a stash item.
 * When deleteCategory is true, the budget is freed up and returned to "Left to Budget".
 */
export async function deleteStashItem(
  id: string,
  deleteCategory = false
): Promise<{ success: boolean; id: string; category_deleted?: boolean }> {
  await simulateDelay();

  updateDemoState((state) => {
    // Find the item to get its budget before deletion
    const itemToDelete =
      state.stash.items.find((item) => item.id === id) ||
      state.stash.archived_items.find((item) => item.id === id);

    const newItems = state.stash.items.filter((item) => item.id !== id);
    const newArchived = state.stash.archived_items.filter((item) => item.id !== id);

    // If deleting category, free up the budgeted amount
    const budgetToFree = deleteCategory && itemToDelete ? itemToDelete.planned_budget : 0;

    return {
      ...state,
      stash: recomputeTotals({
        ...state.stash,
        items: newItems,
        archived_items: newArchived,
      }),
      // Update ready_to_assign to reflect freed budget
      ...(budgetToFree > 0 && {
        dashboard: {
          ...state.dashboard,
          ready_to_assign: {
            ...state.dashboard.ready_to_assign,
            ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign + budgetToFree,
          },
        },
      }),
    };
  });

  return { success: true, id, category_deleted: deleteCategory };
}

/**
 * Mark a one-time purchase goal as completed (archived).
 * Only valid for goal_type='one_time'.
 */
export async function completeStashItem(
  id: string,
  releaseFunds = false
): Promise<{ success: boolean; id: string; funds_released: boolean }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const item = state.stash.items[itemIndex]!;
    if (item.goal_type !== 'one_time') {
      throw new Error('Only one_time goals can be marked as completed');
    }

    // Create completed/archived item
    const completedItem: StashItem = {
      ...item,
      completed_at: new Date().toISOString(),
      is_archived: true,
      archived_at: new Date().toISOString(),
      progress_percent: 100,
      status: 'funded',
    };

    // Move to archived
    const newItems = state.stash.items.filter((_, i) => i !== itemIndex);
    const newArchived = [...state.stash.archived_items, completedItem];

    // If releasing funds, add to ready_to_assign
    const fundsToRelease = releaseFunds ? item.current_balance : 0;

    return {
      ...state,
      stash: recomputeTotals({
        ...state.stash,
        items: newItems,
        archived_items: newArchived,
      }),
      ...(fundsToRelease > 0 && {
        dashboard: {
          ...state.dashboard,
          ready_to_assign: {
            ...state.dashboard.ready_to_assign,
            ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign + fundsToRelease,
          },
        },
      }),
    };
  });

  return { success: true, id, funds_released: releaseFunds };
}

/**
 * Unmark a completed one-time purchase goal.
 * Moves it back from archived to active.
 */
export async function uncompleteStashItem(id: string): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const archivedIndex = state.stash.archived_items.findIndex((item) => item.id === id);
    if (archivedIndex === -1) throw new Error(`Archived stash not found: ${id}`);

    const item = state.stash.archived_items[archivedIndex]!;

    // Create uncompleted item (remove completion/archive markers)
    const { completed_at: _, archived_at: __, ...itemWithoutCompletion } = item;
    const uncompletedItem: StashItem = {
      ...itemWithoutCompletion,
      is_archived: false,
    };

    // Recompute to get correct progress/status
    const recomputedItem = recomputeItem(uncompletedItem);

    // Move back to active
    const newArchived = state.stash.archived_items.filter((_, i) => i !== archivedIndex);
    const newItems = [...state.stash.items, recomputedItem];

    return {
      ...state,
      stash: recomputeTotals({
        ...state.stash,
        items: newItems,
        archived_items: newArchived,
      }),
    };
  });

  return { success: true, id };
}
