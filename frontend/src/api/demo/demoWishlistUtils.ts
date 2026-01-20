/**
 * Demo Wishlist Utilities
 *
 * Shared helper functions for wishlist demo mode operations.
 */

import type { WishlistItem } from '../../types';
import {
  calculateWishlistMonthlyTarget,
  calculateMonthsRemaining,
  calculateProgressPercent,
  calculateShortfall,
} from '../../utils/savingsCalculations';

/**
 * Recompute derived values for a wishlist item.
 */
export function recomputeItem(item: WishlistItem): WishlistItem {
  const monthsRemaining = calculateMonthsRemaining(item.target_date);
  const monthlyTarget = calculateWishlistMonthlyTarget(
    item.amount,
    item.current_balance,
    item.target_date
  );
  const progressPercent = calculateProgressPercent(item.current_balance, item.amount);
  const shortfall = calculateShortfall(item.current_balance, item.amount);

  // Determine status
  let status: WishlistItem['status'];
  if (item.current_balance >= item.amount) {
    status = 'funded';
  } else if (item.planned_budget >= monthlyTarget) {
    status = item.planned_budget > monthlyTarget ? 'ahead' : 'on_track';
  } else {
    status = 'behind';
  }

  return {
    ...item,
    months_remaining: monthsRemaining,
    monthly_target: monthlyTarget,
    progress_percent: progressPercent,
    shortfall,
    status,
  };
}

/**
 * Recompute totals for wishlist data.
 */
export function recomputeTotals(data: {
  items: WishlistItem[];
  archived_items: WishlistItem[];
  total_target?: number;
  total_saved?: number;
  total_monthly_target?: number;
}): {
  items: WishlistItem[];
  archived_items: WishlistItem[];
  total_target: number;
  total_saved: number;
  total_monthly_target: number;
} {
  const items = data.items.map(recomputeItem);
  const archivedItems = data.archived_items.map(recomputeItem);

  return {
    items,
    archived_items: archivedItems,
    total_target: items.reduce((sum, item) => sum + item.amount, 0),
    total_saved: items.reduce((sum, item) => sum + item.current_balance, 0),
    total_monthly_target: items.reduce((sum, item) => sum + item.monthly_target, 0),
  };
}
