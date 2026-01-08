/**
 * Recurring Item Types
 *
 * Types for recurring transactions and rollup functionality.
 */

import type { ItemStatus } from './common';

export interface RecurringItem {
  id: string;
  merchant_id: string | null;
  logo_url: string | null;
  is_stale: boolean;
  name: string;
  merchant_name?: string;
  category_name: string;
  frequency_label?: string;
  category_id: string | null;
  category_group_name: string | null;
  category_missing: boolean;
  amount: number;
  frequency: string;
  frequency_months: number;
  next_due_date: string;
  months_until_due: number;
  current_balance: number;
  planned_budget: number;
  monthly_contribution: number;
  over_contribution: number;
  progress_percent: number;
  status: ItemStatus;
  is_enabled: boolean;
  ideal_monthly_rate: number;
  amount_needed_now: number;
  is_in_rollup?: boolean;
  emoji?: string;
  frozen_monthly_target: number;
  contributed_this_month: number;
  monthly_progress_percent: number;
}

export interface RollupItem {
  id: string;
  name: string;
  merchant_id: string | null;
  logo_url: string | null;
  amount: number;
  frequency: string;
  frequency_months: number;
  next_due_date: string;
  months_until_due: number;
  ideal_monthly_rate: number;
  frozen_monthly_target: number;
  status: ItemStatus;
}

export interface RollupData {
  enabled: boolean;
  items: RollupItem[];
  total_ideal_rate: number;
  total_frozen_monthly: number;
  total_target: number;
  total_saved: number;
  budgeted: number;
  current_balance: number;
  progress_percent: number;
  category_id: string | null;
  emoji?: string;
  category_name?: string;
}
