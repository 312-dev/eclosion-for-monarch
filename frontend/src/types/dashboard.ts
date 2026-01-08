/**
 * Dashboard Types
 *
 * Types for the main dashboard and summary data.
 */

import type { RecurringItem, RollupData } from './recurring';

export interface DashboardSummary {
  total_monthly_contribution: number;
  total_saved: number;
  total_target: number;
  overall_progress: number;
  active_count: number;
  inactive_count: number;
}

export interface DashboardConfig {
  target_group_id: string | null;
  target_group_name: string | null;
  is_configured: boolean;
  auto_sync_new?: boolean;
  auto_track_threshold?: number | null;
  auto_update_targets?: boolean;
  auto_categorize_enabled?: boolean;
  show_category_group?: boolean;
  user_first_name?: string | null;
}

export interface ReadyToAssign {
  ready_to_assign: number;
  planned_income: number;
  actual_income: number;
  planned_expenses: number;
  actual_expenses: number;
  planned_savings: number;
  remaining_income: number;
}

export interface RemovedItemNotice {
  id: string;
  recurring_id: string;
  name: string;
  category_name: string;
  was_rollup: boolean;
  removed_at: string;
}

export interface DashboardData {
  items: RecurringItem[];
  summary: DashboardSummary;
  config: DashboardConfig;
  last_sync: string | null;
  ready_to_assign: ReadyToAssign;
  rollup: RollupData;
  notices: RemovedItemNotice[];
}
