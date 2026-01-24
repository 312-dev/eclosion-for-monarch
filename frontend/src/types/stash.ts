/**
 * Stash Types
 *
 * Types for stash items - savings goals synced from browser bookmarks.
 *
 * Goal types:
 * - one_time: Save up to buy something. Progress = total ever budgeted (immune to spending).
 *             When completed, archived with completion timestamp.
 * - savings_buffer: Ongoing fund to dip into and refill. Progress = current balance.
 *                   Spending immediately reduces progress.
 */

import type { ItemStatus } from './common';
import type { StashEventsMap } from './stashEvent';

/**
 * Goal type for stash items.
 *
 * - one_time: Save up to buy something once. Progress = total budgeted.
 *             Spending doesn't reduce progress until marked complete.
 * - savings_buffer: Ongoing fund. Progress = current balance.
 *                   Spending immediately reduces progress.
 */
export type StashGoalType = 'one_time' | 'savings_buffer';

/**
 * A stash item represents a savings goal.
 * Items can be synced from browser bookmarks and linked to Monarch categories.
 */
export interface StashItem {
  type: 'stash';
  id: string;
  name: string;
  amount: number; // Target amount to save
  current_balance: number; // Total saved so far
  planned_budget: number; // Budget allocated this month
  last_month_planned_budget?: number; // Budget allocated last month (for Distribute wizard ratio fallback)
  category_id: string | null;
  category_name: string;
  category_group_id: string | null;
  category_group_name: string | null;
  is_enabled: boolean;
  status: ItemStatus;
  progress_percent: number; // current_balance / amount * 100
  emoji?: string;

  // Stash-specific fields
  target_date: string; // User-specified goal date (ISO format)
  months_remaining: number; // Computed from target_date
  source_url?: string; // Original bookmark URL
  source_bookmark_id?: string; // For tracking sync
  logo_url?: string; // Favicon from URL
  custom_image_path?: string; // User-uploaded image path or Openverse URL
  image_attribution?: string; // Attribution text for Openverse images

  // Computed values (frontend single source of truth)
  monthly_target: number; // What to save this month
  shortfall: number; // amount - current_balance

  // Archive state
  is_archived: boolean;
  archived_at?: string; // ISO timestamp

  // Sort order for drag/drop reordering (legacy)
  sort_order: number;

  // Grid layout for widget-style resizable cards
  grid_x: number; // Column position (0-based)
  grid_y: number; // Row position (0-based)
  col_span: number; // Width in grid units (1-3)
  row_span: number; // Height in grid units (1-2)

  /**
   * How progress is calculated for this goal.
   * @default 'one_time'
   */
  goal_type: StashGoalType;

  /**
   * When this item was marked as purchased (one_time goals only).
   * Null if not completed. ISO timestamp if completed.
   */
  completed_at?: string;

  /**
   * When this stash item was created.
   * Used as default start date for aggregate queries.
   */
  created_at?: string;

  /**
   * Custom start date for tracking progress (one_time goals only).
   * If set, aggregate queries use this instead of created_at.
   * Useful when linking a pre-existing category with old transactions.
   */
  tracking_start_date?: string;

  /**
   * Current spendable balance in the category (one_time goals only).
   * Shown as "available to spend" when different from progress.
   */
  available_to_spend?: number;

  /**
   * Amount rolled over from previous months (from Monarch).
   * Used for balance breakdown tooltip.
   */
  rollover_amount?: number;

  /**
   * Positive transactions (credits/inflows) in the current month.
   * Used for balance breakdown tooltip to distinguish from rollover.
   */
  credits_this_month?: number;

  /**
   * Whether this item is linked to a flexible category group with group-level rollover.
   * Used by Distribute wizard to determine whether to update category or group rollover.
   */
  is_flexible_group?: boolean;
}

/**
 * Data needed to create a new stash item.
 * Amount and target_date are required, others have defaults.
 *
 * Category selection (mutually exclusive):
 * - category_group_id: Creates a new category in this group
 * - existing_category_id: Links to an existing Monarch category
 * - flexible_group_id: Links to a flexible category group with group-level rollover
 */
export interface CreateStashItemRequest {
  name: string;
  amount: number;
  target_date: string;
  /** Creates a new category in this group (mutually exclusive with existing_category_id/flexible_group_id) */
  category_group_id?: string;
  /** Links to an existing category (mutually exclusive with category_group_id/flexible_group_id) */
  existing_category_id?: string;
  /** Links to a flexible category group with group-level rollover (mutually exclusive with others) */
  flexible_group_id?: string;
  source_url?: string;
  source_bookmark_id?: string;
  emoji?: string;
  custom_image_path?: string;
  /** Attribution text for Openverse images */
  image_attribution?: string;
  /** Goal type: 'one_time' (default) or 'savings_buffer' */
  goal_type?: StashGoalType;
  /** Custom start date for tracking (one_time goals only, YYYY-MM-DD) */
  tracking_start_date?: string;
}

/**
 * Data for updating an existing stash item.
 */
export interface UpdateStashItemRequest {
  name?: string;
  amount?: number;
  target_date?: string;
  emoji?: string;
  is_enabled?: boolean;
  custom_image_path?: string | null;
  /** Attribution text for Openverse images */
  image_attribution?: string | null;
  source_url?: string | null;
  /** Goal type: 'one_time' or 'savings_buffer' */
  goal_type?: StashGoalType;
  /** Custom start date for tracking (one_time goals only, YYYY-MM-DD) */
  tracking_start_date?: string | null;
}

/**
 * Layout update for a single stash item.
 * Used for batch layout updates from drag/resize operations.
 */
export interface StashLayoutUpdate {
  id: string;
  grid_x: number;
  grid_y: number;
  col_span: number;
  row_span: number;
  sort_order: number;
}

/**
 * Result of a stash sync operation.
 */
export interface StashSyncResult {
  success: boolean;
  items_updated: number;
  newly_funded: string[]; // IDs of items that became funded
  error?: string;
}

/**
 * Dashboard-style data for the stashes tab.
 */
export interface StashData {
  items: StashItem[];
  archived_items: StashItem[];
  total_target: number; // Sum of all item amounts
  total_saved: number; // Sum of all current_balance
  total_monthly_target: number; // Sum of all monthly_target
}

// ---- Hypothesis Types ----

/**
 * A saved hypothesis for the Distribute wizard's hypothesize mode.
 * Stores both savings and monthly allocations along with hypothetical events.
 */
export interface StashHypothesis {
  id: string;
  name: string;
  /** Screen 1: Savings allocations (stashId -> amount) */
  savingsAllocations: Record<string, number>;
  savingsTotal: number;
  /** Screen 2: Monthly allocations (stashId -> amount) */
  monthlyAllocations: Record<string, number>;
  monthlyTotal: number;
  /** Hypothetical events for projection */
  events: StashEventsMap;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request to save a hypothesis.
 */
export interface SaveHypothesisRequest {
  name: string;
  savingsAllocations: Record<string, number>;
  savingsTotal: number;
  monthlyAllocations: Record<string, number>;
  monthlyTotal: number;
  events: StashEventsMap;
}

/**
 * Response from save hypothesis endpoint.
 */
export interface SaveHypothesisResponse {
  success: boolean;
  id?: string;
  created?: boolean;
  message?: string;
  error?: string;
}

/**
 * Raw hypothesis from API (snake_case).
 * Used internally - transformed to StashHypothesis in queries.
 */
export interface StashHypothesisRaw {
  id: string;
  name: string;
  savings_allocations: Record<string, number>;
  savings_total: number;
  monthly_allocations: Record<string, number>;
  monthly_total: number;
  events: StashEventsMap;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Response from get hypotheses endpoint.
 */
export interface GetHypothesesResponse {
  success: boolean;
  hypotheses: StashHypothesisRaw[];
}

/**
 * Response from delete hypothesis endpoint.
 */
export interface DeleteHypothesisResponse {
  success: boolean;
  message?: string;
  error?: string;
}
