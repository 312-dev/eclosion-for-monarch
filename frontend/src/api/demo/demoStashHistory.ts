/**
 * Demo Stash History API
 *
 * Generates mock historical data for the Reports tab in demo mode.
 * Simulates gradual progress toward stash goals over time.
 */

import { getDemoState, simulateDelay } from './demoState';
import type { StashHistoryResponse, StashHistoryItem, StashMonthData } from '../../types';

/**
 * Generate a list of month strings going back N months from today.
 */
function generateMonthList(months: number): string[] {
  const result: string[] = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    result.push(`${year}-${month}`);
  }

  return result;
}

/**
 * Generate realistic mock history for a stash item.
 *
 * Distributes the current balance across months since creation:
 * - Calculates average contribution per month
 * - Adds random variation for realism (±30%)
 * - Ensures final balance matches current_balance exactly
 */
function generateItemHistory(
  item: {
    id: string;
    name: string;
    amount: number;
    current_balance: number;
    monthly_target: number;
    created_at?: string | null | undefined;
  },
  months: string[]
): StashHistoryItem {
  const monthData: StashMonthData[] = [];

  // Determine when the item was created
  const createdDate = item.created_at ? new Date(item.created_at) : new Date();
  const createdMonth = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;

  const currentBalance = item.current_balance;

  // Find months where the item existed
  const activeMonths = months.filter((month) => month >= createdMonth);
  const numActiveMonths = activeMonths.length;

  // If no active months or no balance, return zeros
  if (numActiveMonths === 0 || currentBalance === 0) {
    for (const month of months) {
      monthData.push({ month, balance: 0, contribution: 0 });
    }
    return { id: item.id, name: item.name, target_amount: item.amount, months: monthData };
  }

  // Calculate average contribution per month to reach current balance
  const avgContribution = currentBalance / numActiveMonths;

  // Generate raw contributions with variance (±30%)
  const variation = 0.3;
  const rawContributions: number[] = [];
  for (let i = 0; i < numActiveMonths; i++) {
    const randomFactor = 1 + (Math.random() - 0.5) * variation * 2;
    rawContributions.push(Math.max(0, avgContribution * randomFactor));
  }

  // Normalize contributions to sum to currentBalance
  const rawSum = rawContributions.reduce((a, b) => a + b, 0);
  const contributions = rawContributions.map((c) => Math.round((c / rawSum) * currentBalance));

  // Adjust for rounding errors on the last contribution
  const actualSum = contributions.reduce((a, b) => a + b, 0);
  const lastIndex = contributions.length - 1;
  if (lastIndex >= 0 && contributions[lastIndex] !== undefined) {
    contributions[lastIndex] += currentBalance - actualSum;
  }

  // Build month data
  let balance = 0;
  let contributionIndex = 0;

  for (const month of months) {
    if (month < createdMonth) {
      // Before creation: zero
      monthData.push({ month, balance: 0, contribution: 0 });
    } else {
      // After creation: use calculated contribution
      const contribution = contributions[contributionIndex] ?? 0;
      balance += contribution;
      monthData.push({ month, balance, contribution });
      contributionIndex++;
    }
  }

  return {
    id: item.id,
    name: item.name,
    target_amount: item.amount,
    months: monthData,
  };
}

/**
 * Get stash history data for the Reports tab.
 *
 * @param months - Number of months of history (default: 12)
 */
export async function getStashHistory(months = 12): Promise<StashHistoryResponse> {
  await simulateDelay();

  const state = getDemoState();
  const monthList = generateMonthList(months);

  // Filter to active (non-archived) items only
  const activeItems = state.stash.items.filter((item) => !item.is_archived);

  const items: StashHistoryItem[] = activeItems.map((item) =>
    generateItemHistory(
      {
        id: item.id,
        name: item.name,
        amount: item.amount,
        current_balance: item.current_balance,
        monthly_target: item.monthly_target,
        created_at: item.created_at,
      },
      monthList
    )
  );

  return {
    items,
    months: monthList,
  };
}
