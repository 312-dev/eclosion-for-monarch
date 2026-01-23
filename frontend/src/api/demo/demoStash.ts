/**
 * Demo Stash API
 *
 * LocalStorage-based implementation of stash API for demo mode.
 * Re-exports from specialized modules and provides layout/sync operations.
 */

import { getDemoState, updateDemoState, simulateDelay } from './demoState';
import type {
  StashData,
  StashItem,
  StashLayoutUpdate,
  StashSyncResult,
  AvailableToStashData,
} from '../../types';
import { calculateProgressPercent, calculateShortfall } from '../../utils/savingsCalculations';
import { recomputeItem, recomputeTotals } from './demoStashUtils';

// Re-export CRUD operations
export {
  createStashItem,
  updateStashItem,
  archiveStashItem,
  unarchiveStashItem,
  deleteStashItem,
  completeStashItem,
  uncompleteStashItem,
} from './demoStashCrud';

// Re-export pending bookmarks operations
export {
  getPendingBookmarks,
  getPendingCount,
  getSkippedBookmarks,
  skipPendingBookmark,
  convertPendingBookmark,
  importBookmarks,
  clearUnconvertedBookmarks,
} from './demoStashPending';

// Re-export config operations
export {
  getStashCategoryGroups,
  getStashConfig,
  updateStashConfig,
  fetchOgImage,
} from './demoStashConfig';

/**
 * Get all stash data.
 */
export async function getStash(): Promise<StashData> {
  await simulateDelay();
  const state = getDemoState();
  return recomputeTotals(state.stash);
}

/**
 * Calculate status based on balance, budget, target amount, and monthly target.
 */
function calculateBudgetStatus(
  balance: number,
  budget: number,
  targetAmount: number,
  monthlyTarget: number
): StashItem['status'] {
  if (balance >= targetAmount) return 'funded';
  if (budget > monthlyTarget) return 'ahead';
  if (budget >= monthlyTarget) return 'on_track';
  return 'behind';
}

/**
 * Allocate funds to a stash item (update budget).
 * Also updates dashboard.ready_to_assign to reflect the budget change.
 */
export async function allocateStashFunds(
  id: string,
  amount: number
): Promise<{ success: boolean; id: string; new_budget: number }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const item = state.stash.items[itemIndex]!;
    // Calculate delta: how much new money is being allocated
    const delta = amount - item.planned_budget;
    const newBalance = item.current_balance + delta;
    const updatedItem: StashItem = {
      ...item,
      planned_budget: amount,
      current_balance: newBalance,
      status: calculateBudgetStatus(newBalance, amount, item.amount, item.monthly_target),
      progress_percent: calculateProgressPercent(newBalance, item.amount),
      shortfall: calculateShortfall(newBalance, item.amount),
    };

    const newItems = [...state.stash.items];
    newItems[itemIndex] = updatedItem;

    return {
      ...state,
      stash: {
        ...state.stash,
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
 * Set monthly budget amounts for multiple stash items at once.
 * Used by the Distribute feature to update all stash budgets in one request.
 *
 * Note: This only updates the planned_budget field (monthly allocation plan).
 * It does NOT transfer funds to balances - that's what allocateStashFunds does.
 */
export async function allocateStashFundsBatch(
  allocations: Array<{ id: string; budget: number }>
): Promise<{ success: boolean; updated: number; errors?: string[] }> {
  await simulateDelay();

  let updated = 0;
  const errors: string[] = [];

  for (const allocation of allocations) {
    try {
      updateDemoState((state) => {
        const itemIndex = state.stash.items.findIndex((item) => item.id === allocation.id);
        if (itemIndex === -1) {
          throw new Error(`Stash not found: ${allocation.id}`);
        }

        const item = state.stash.items[itemIndex]!;
        // Only update the planned budget, not the balance
        // Setting a monthly budget plans future allocations but doesn't immediately transfer funds
        const updatedItem: StashItem = {
          ...item,
          planned_budget: allocation.budget,
          // Recalculate status based on the new budget plan
          status: calculateBudgetStatus(
            item.current_balance,
            allocation.budget,
            item.amount,
            item.monthly_target
          ),
        };

        const newItems = [...state.stash.items];
        newItems[itemIndex] = updatedItem;

        return {
          ...state,
          stash: {
            ...state.stash,
            items: newItems,
          },
        };
      });
      updated++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (errors.length > 0) {
    return { success: updated > 0, updated, errors };
  }

  return { success: true, updated };
}

/**
 * Add funds to a category's rollover starting balance.
 *
 * In demo mode, this adds the amount to the stash item's rollover_amount
 * and current_balance fields. This simulates adding savings to a category
 * that persists month-to-month.
 *
 * @param categoryId - The Monarch category ID to update
 * @param amount - Amount to add to the rollover starting balance
 */
export async function updateCategoryRolloverBalance(
  categoryId: string,
  amount: number
): Promise<{ success: boolean; category?: unknown }> {
  await simulateDelay();

  updateDemoState((state) => {
    // Find the stash item with this category_id
    const itemIndex = state.stash.items.findIndex((item) => item.category_id === categoryId);

    if (itemIndex === -1) {
      // Category not found in stash items - silently succeed
      // (might be a goal or non-stash category)
      return state;
    }

    const item = state.stash.items[itemIndex]!;
    const newRollover = (item.rollover_amount ?? 0) + amount;
    const newBalance = item.current_balance + amount;

    const updatedItem: StashItem = {
      ...item,
      rollover_amount: newRollover,
      current_balance: newBalance,
      progress_percent: calculateProgressPercent(newBalance, item.amount),
      shortfall: calculateShortfall(newBalance, item.amount),
      status: calculateBudgetStatus(newBalance, item.planned_budget, item.amount, item.monthly_target),
    };

    const newItems = [...state.stash.items];
    newItems[itemIndex] = updatedItem;

    return {
      ...state,
      stash: {
        ...state.stash,
        items: newItems,
        total_saved: newItems.reduce((sum, i) => sum + i.current_balance, 0),
      },
    };
  });

  return { success: true };
}

/**
 * Change category group for a stash item.
 */
export async function changeStashGroup(
  id: string,
  groupId: string,
  groupName: string
): Promise<{ success: boolean; id: string }> {
  await simulateDelay();

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const newItems = [...state.stash.items];
    newItems[itemIndex] = {
      ...newItems[itemIndex]!,
      category_group_id: groupId,
      category_group_name: groupName,
    };

    return { ...state, stash: { ...state.stash, items: newItems } };
  });

  return { success: true, id };
}

/**
 * Link a category to an existing stash item.
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
  await simulateDelay();

  let categoryId = '';
  let categoryName = '';
  let categoryGroupId = '';
  let categoryGroupName = '';

  updateDemoState((state) => {
    const itemIndex = state.stash.items.findIndex((item) => item.id === id);
    if (itemIndex === -1) throw new Error(`Stash not found: ${id}`);

    const item = state.stash.items[itemIndex]!;

    if (params.flexibleGroupId) {
      // Linking to a flexible category group (group-level rollover)
      const flexGroup = state.categoryGroupsDetailed?.find((g) => g.id === params.flexibleGroupId);
      categoryId = `group-${params.flexibleGroupId}`; // Use group ID as pseudo-category
      categoryName = flexGroup?.name || 'Flexible Group';
      categoryGroupId = params.flexibleGroupId;
      categoryGroupName = flexGroup?.name || 'Flexible Group';
    } else {
      categoryId = params.existingCategoryId || `demo-cat-${Date.now()}`;
      categoryName = params.existingCategoryId ? 'Existing Category' : item.name;
      categoryGroupId = params.categoryGroupId || 'demo-group';
      categoryGroupName = params.categoryGroupId ? 'Savings Goals' : 'Demo Group';
    }

    const newItems = [...state.stash.items];
    newItems[itemIndex] = {
      ...item,
      category_id: categoryId,
      category_name: categoryName,
      category_group_id: categoryGroupId,
      category_group_name: categoryGroupName,
    };

    return { ...state, stash: { ...state.stash, items: newItems } };
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
 * Reorder stash items.
 * @deprecated Use updateStashLayouts for grid-based positioning
 */
export async function reorderStashItems(itemIds: string[]): Promise<{ success: boolean }> {
  await simulateDelay();

  updateDemoState((state) => {
    const getSortOrder = (id: string) => {
      const index = itemIds.indexOf(id);
      return index === -1 ? itemIds.length : index;
    };

    const items = state.stash.items
      .map((item) => ({ ...item, sort_order: getSortOrder(item.id) }))
      .sort((a, b) => a.sort_order - b.sort_order);

    return { ...state, stash: { ...state.stash, items } };
  });

  return { success: true };
}

/**
 * Apply layout updates to a list of items.
 */
function applyLayoutUpdates(
  items: StashItem[],
  layouts: StashLayoutUpdate[]
): { items: StashItem[]; count: number } {
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
 * Update grid layout positions for stash items.
 */
export async function updateStashLayouts(
  layouts: StashLayoutUpdate[]
): Promise<{ success: boolean; updated: number }> {
  await simulateDelay();

  let updated = 0;

  updateDemoState((state) => {
    const activeResult = applyLayoutUpdates(state.stash.items, layouts);
    const archivedResult = applyLayoutUpdates(state.stash.archived_items, layouts);
    updated = activeResult.count + archivedResult.count;

    return {
      ...state,
      stash: {
        ...state.stash,
        items: activeResult.items,
        archived_items: archivedResult.items,
      },
    };
  });

  return { success: true, updated };
}

/**
 * Sync stash data (simulate pulling from Monarch).
 */
export async function syncStash(): Promise<StashSyncResult> {
  await simulateDelay(500);

  const state = getDemoState();
  const newlyFunded: string[] = [];

  const updatedItems = state.stash.items.map((item) => {
    const recomputed = recomputeItem(item);
    if (recomputed.status === 'funded' && item.status !== 'funded') {
      newlyFunded.push(item.id);
    }
    return recomputed;
  });

  updateDemoState((s) => ({
    ...s,
    stash: recomputeTotals({ ...s.stash, items: updatedItems }),
  }));

  return { success: true, items_updated: updatedItems.length, newly_funded: newlyFunded };
}

/**
 * Get data needed for Available Funds calculation.
 *
 * Demo mode returns realistic simulated data:
 * - Cash accounts: Checking ($5,200) + Savings ($8,500)
 * - Credit card: Chase Sapphire ($1,850)
 * - Category budgets derived from dashboard ready_to_assign
 * - Goals: Emergency Fund ($3,000), Vacation Fund ($1,200)
 * - Stash balances from current stash state
 */
export async function getAvailableToStashData(): Promise<AvailableToStashData> {
  await simulateDelay();

  const state = getDemoState();
  const selectedIds = state.stashConfig.selectedCashAccountIds;
  const readyToAssign = state.dashboard.ready_to_assign;

  // Calculate total stash balances
  const stashBalances = state.stash.items.reduce((sum, item) => sum + item.current_balance, 0);

  // Define all accounts
  const allAccounts = [
    // Cash accounts
    {
      id: 'demo-checking',
      name: 'Chase Checking',
      balance: 5200,
      accountType: 'checking',
      isEnabled: true,
    },
    {
      id: 'demo-savings',
      name: 'Ally Savings',
      balance: 8500,
      accountType: 'savings',
      isEnabled: true,
    },
    // Credit card (positive balance = debt owed)
    {
      id: 'demo-credit',
      name: 'Chase Sapphire',
      balance: 1850,
      accountType: 'credit_card',
      isEnabled: true,
    },
  ];

  // Apply filtering if specific accounts selected
  let accounts = allAccounts;
  if (selectedIds !== null) {
    accounts = allAccounts.filter((acc) => {
      // Always include credit cards
      if (acc.accountType === 'credit_card') return true;
      // For cash accounts, check if in selection
      return selectedIds.includes(acc.id);
    });
  }

  return {
    accounts,
    categoryBudgets: [
      // Expense categories (derived from demo dashboard data)
      // remaining = budgeted - spent (unspent portion)
      {
        id: 'cat-groceries',
        name: 'Groceries',
        budgeted: 600,
        spent: 423,
        remaining: 177,
        isExpense: true,
      },
      {
        id: 'cat-dining',
        name: 'Dining Out',
        budgeted: 200,
        spent: 156,
        remaining: 44,
        isExpense: true,
      },
      {
        id: 'cat-transport',
        name: 'Transportation',
        budgeted: 300,
        spent: 187,
        remaining: 113,
        isExpense: true,
      },
      {
        id: 'cat-utilities',
        name: 'Utilities',
        budgeted: 250,
        spent: 198,
        remaining: 52,
        isExpense: true,
      },
      {
        id: 'cat-entertainment',
        name: 'Entertainment',
        budgeted: 150,
        spent: 89,
        remaining: 61,
        isExpense: true,
      },
      {
        id: 'cat-shopping',
        name: 'Shopping',
        budgeted: 200,
        spent: 134,
        remaining: 66,
        isExpense: true,
      },
      {
        id: 'cat-personal',
        name: 'Personal Care',
        budgeted: 100,
        spent: 67,
        remaining: 33,
        isExpense: true,
      },
      // Income category (should be filtered out)
      {
        id: 'cat-income',
        name: 'Salary',
        budgeted: 5000,
        spent: 4876,
        remaining: 124,
        isExpense: false,
      },
    ],
    goals: [
      { id: 'goal-emergency', name: 'Emergency Fund', balance: 3000 },
      { id: 'goal-vacation', name: 'Vacation Fund', balance: 1200 },
    ],
    plannedIncome: readyToAssign.planned_income,
    actualIncome: readyToAssign.actual_income,
    stashBalances,
  };
}
