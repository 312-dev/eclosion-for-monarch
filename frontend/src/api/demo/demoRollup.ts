/**
 * Demo Rollup Functions
 *
 * Operations for the rollup category (combined small subscriptions).
 */

import type { RollupData } from '../../types';
import { getDemoState, updateDemoState, simulateDelay } from './demoState';

/**
 * Get rollup data.
 */
export async function getRollupData(): Promise<RollupData> {
  await simulateDelay(50);
  const state = getDemoState();
  return state.dashboard.rollup;
}

/**
 * Add a recurring item to the rollup.
 */
export async function addToRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  await simulateDelay(150);

  updateDemoState((state) => {
    const item = state.dashboard.items.find((i) => i.id === recurringId);
    if (!item) return state;

    const updatedItems = state.dashboard.items.map((i) =>
      i.id === recurringId ? { ...i, is_in_rollup: true } : i
    );

    const rollupItems = updatedItems.filter((i) => i.is_in_rollup);
    const totalRate = rollupItems.reduce((sum, i) => sum + i.ideal_monthly_rate, 0);
    // Total saved = current_balance (rollover) + contributed_this_month
    const totalSaved = rollupItems.reduce((sum, i) => sum + i.current_balance + i.contributed_this_month, 0);
    const totalTarget = rollupItems.reduce((sum, i) => sum + i.amount, 0);

    return {
      ...state,
      dashboard: {
        ...state.dashboard,
        items: updatedItems,
        rollup: {
          ...state.dashboard.rollup,
          items: rollupItems.map((i) => ({
            id: i.id,
            name: i.name,
            merchant_id: i.merchant_id,
            logo_url: i.logo_url,
            amount: i.amount,
            frequency: i.frequency,
            frequency_months: i.frequency_months,
            next_due_date: i.next_due_date,
            months_until_due: i.months_until_due,
            ideal_monthly_rate: i.ideal_monthly_rate,
            frozen_monthly_target: i.frozen_monthly_target,
            status: i.status,
          })),
          total_ideal_rate: totalRate,
          total_saved: totalSaved,
          total_target: totalTarget,
          current_balance: totalSaved,
        },
      },
    };
  });

  const state = getDemoState();
  const item = state.dashboard.items.find((i) => i.id === recurringId);

  return {
    success: true,
    item_id: recurringId,
    monthly_rate: item?.ideal_monthly_rate ?? 0,
    total_budgeted: state.dashboard.rollup.budgeted,
  };
}

/**
 * Remove a recurring item from the rollup.
 */
export async function removeFromRollup(
  recurringId: string
): Promise<{ success: boolean; item_id?: string; monthly_rate?: number; total_budgeted?: number; error?: string }> {
  await simulateDelay(150);

  updateDemoState((state) => {
    const item = state.dashboard.items.find((i) => i.id === recurringId);
    if (!item) return state;

    const updatedItems = state.dashboard.items.map((i) =>
      i.id === recurringId ? { ...i, is_in_rollup: false } : i
    );

    const rollupItems = updatedItems.filter((i) => i.is_in_rollup);
    const totalRate = rollupItems.reduce((sum, i) => sum + i.ideal_monthly_rate, 0);
    // Total saved = current_balance (rollover) + contributed_this_month
    const totalSaved = rollupItems.reduce((sum, i) => sum + i.current_balance + i.contributed_this_month, 0);
    const totalTarget = rollupItems.reduce((sum, i) => sum + i.amount, 0);

    return {
      ...state,
      dashboard: {
        ...state.dashboard,
        items: updatedItems,
        rollup: {
          ...state.dashboard.rollup,
          items: rollupItems.map((i) => ({
            id: i.id,
            name: i.name,
            merchant_id: i.merchant_id,
            logo_url: i.logo_url,
            amount: i.amount,
            frequency: i.frequency,
            frequency_months: i.frequency_months,
            next_due_date: i.next_due_date,
            months_until_due: i.months_until_due,
            ideal_monthly_rate: i.ideal_monthly_rate,
            frozen_monthly_target: i.frozen_monthly_target,
            status: i.status,
          })),
          total_ideal_rate: totalRate,
          total_saved: totalSaved,
          total_target: totalTarget,
          current_balance: totalSaved,
        },
      },
    };
  });

  const state = getDemoState();
  const item = state.dashboard.items.find((i) => i.id === recurringId);

  return {
    success: true,
    item_id: recurringId,
    monthly_rate: item?.ideal_monthly_rate ?? 0,
    total_budgeted: state.dashboard.rollup.budgeted,
  };
}

/**
 * Set the rollup budget amount.
 *
 * This only updates the user's planned budget for the rollup category.
 * It does NOT modify current_balance or total_saved - those are computed
 * from actual allocations to individual items.
 *
 * In the real backend, this updates the stored budget and syncs to Monarch,
 * but doesn't change category balances (those come from transactions).
 */
export async function setRollupBudget(
  amount: number
): Promise<{ success: boolean; total_budgeted?: number; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => {
    const oldBudgeted = state.dashboard.rollup.budgeted;
    const delta = amount - oldBudgeted;

    return {
      ...state,
      dashboard: {
        ...state.dashboard,
        ready_to_assign: {
          ...state.dashboard.ready_to_assign,
          // Budgeting more decreases "left to budget", budgeting less increases it
          ready_to_assign: state.dashboard.ready_to_assign.ready_to_assign - delta,
        },
        rollup: {
          ...state.dashboard.rollup,
          budgeted: amount,
          // Note: current_balance and total_saved are NOT modified here.
          // They are computed from individual items' actual allocations.
        },
      },
    };
  });

  return { success: true, total_budgeted: amount };
}

/**
 * Update the rollup category emoji.
 */
export async function updateRollupEmoji(
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        emoji,
      },
    },
  }));

  return { success: true, emoji };
}

/**
 * Update the rollup category name.
 */
export async function updateRollupCategoryName(
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  await simulateDelay(100);

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        category_name: name,
      },
    },
  }));

  return { success: true, category_name: name };
}

/**
 * Create a new rollup category in Monarch.
 */
export async function createRollupCategory(
  budget: number = 0
): Promise<{
  success: boolean;
  category_id?: string;
  category_name?: string;
  budget?: number;
  error?: string;
}> {
  await simulateDelay(200);

  const newCategoryId = `cat-rollup-${Date.now()}`;

  updateDemoState((state) => ({
    ...state,
    dashboard: {
      ...state.dashboard,
      rollup: {
        ...state.dashboard.rollup,
        category_id: newCategoryId,
        budgeted: budget,
      },
    },
  }));

  return {
    success: true,
    category_id: newCategoryId,
    category_name: 'Small Subscriptions',
    budget,
  };
}
