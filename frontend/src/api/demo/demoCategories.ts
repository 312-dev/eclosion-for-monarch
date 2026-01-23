/**
 * Demo Category Functions
 *
 * Category operations including groups, linking, and customization.
 */

import type {
  CategoryGroup,
  CategoryGroupDetailed,
  UpdateCategoryGroupSettingsRequest,
  UnmappedCategory,
  LinkCategoryResult,
} from '../../types';
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
 * Get categories not yet linked to recurring or stash items.
 */
export async function getUnmappedCategories(): Promise<UnmappedCategory[]> {
  await simulateDelay(50);
  const state = getDemoState();

  // Get category IDs used by stash items
  const stashCategoryIds = new Set(
    state.stash.items.filter((item) => item.category_id).map((item) => item.category_id)
  );

  // Filter out categories used by stash items
  // (recurring items are already excluded when linking happens)
  return state.unmappedCategories.filter((cat) => !stashCategoryIds.has(cat.id));
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

/**
 * Get all category groups with full metadata including rollover/flexible settings.
 */
export async function getCategoryGroupsDetailed(): Promise<CategoryGroupDetailed[]> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.categoryGroupsDetailed;
}

/**
 * Get category groups that have flexible budgeting with rollover enabled.
 */
export async function getFlexibleCategoryGroups(): Promise<CategoryGroupDetailed[]> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.categoryGroupsDetailed.filter(
    (g) => g.group_level_budgeting_enabled && g.rollover_enabled
  );
}

/**
 * Update a category group's settings.
 */
export async function updateCategoryGroupSettings(
  request: UpdateCategoryGroupSettingsRequest
): Promise<CategoryGroupDetailed> {
  await simulateDelay(150);

  const { group_id, ...settings } = request;
  let updatedGroup: CategoryGroupDetailed | undefined;

  updateDemoState((state) => {
    const groupIndex = state.categoryGroupsDetailed.findIndex((g) => g.id === group_id);
    if (groupIndex === -1) {
      throw new Error(`Category group not found: ${group_id}`);
    }

    const existingGroup = state.categoryGroupsDetailed[groupIndex];
    if (!existingGroup) {
      throw new Error(`Category group not found: ${group_id}`);
    }

    // Build updated rollover period
    let rolloverPeriod = existingGroup.rollover_period;
    if (settings.rollover_enabled === false) {
      rolloverPeriod = null;
    } else if (settings.rollover_enabled === true || settings.rollover_start_month) {
      rolloverPeriod = {
        id: rolloverPeriod?.id ?? `rollover-${group_id}`,
        start_month: settings.rollover_start_month ?? rolloverPeriod?.start_month ?? new Date().toISOString().slice(0, 10),
        end_month: rolloverPeriod?.end_month ?? null,
        starting_balance: settings.rollover_starting_balance ?? rolloverPeriod?.starting_balance ?? 0,
        type: settings.rollover_type ?? rolloverPeriod?.type ?? 'monthly',
        frequency: rolloverPeriod?.frequency ?? 'monthly',
        target_amount: rolloverPeriod?.target_amount ?? null,
      };
    }

    updatedGroup = {
      ...existingGroup,
      ...(settings.name !== undefined && { name: settings.name }),
      ...(settings.budget_variability !== undefined && { budget_variability: settings.budget_variability }),
      ...(settings.group_level_budgeting_enabled !== undefined && { group_level_budgeting_enabled: settings.group_level_budgeting_enabled }),
      rollover_enabled: rolloverPeriod !== null,
      rollover_period: rolloverPeriod,
    };

    const newGroups = [...state.categoryGroupsDetailed];
    newGroups[groupIndex] = updatedGroup;

    return {
      ...state,
      categoryGroupsDetailed: newGroups,
    };
  });

  if (!updatedGroup) {
    throw new Error(`Failed to update category group: ${group_id}`);
  }

  return updatedGroup;
}
