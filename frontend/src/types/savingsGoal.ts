/**
 * Savings Goal Types
 *
 * Shared base types for both Recurring items and Wishlist items.
 * These represent any "save towards a target" goal in the app.
 */

import type { ItemStatus } from './common';

/**
 * Base interface for any savings goal (recurring or wishlist).
 * Contains the minimal fields needed for shared calculations and display.
 */
export interface SavingsGoalBase {
  id: string;
  name: string;
  amount: number; // Target amount to save
  current_balance: number; // Total saved so far
  planned_budget: number; // Budget allocated this month
  category_id: string | null;
  category_name: string;
  is_enabled: boolean;
  status: ItemStatus;
  progress_percent: number; // current_balance / amount * 100
  emoji?: string;
}

/**
 * Extended fields for computed values that both types share.
 * These are calculated on the frontend (single source of truth).
 */
export interface SavingsGoalComputed {
  monthly_target: number; // What to save this month
  shortfall: number; // amount - current_balance
}
