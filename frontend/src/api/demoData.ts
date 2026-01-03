/**
 * Demo Data
 *
 * Realistic seed data for demo mode.
 * This data is loaded into localStorage on first demo access.
 */

import type {
  DashboardData,
  RecurringItem,
  RollupItem,
  RollupData,
  CategoryGroup,
  UnmappedCategory,
} from '../types';

// ============================================================================
// Demo State Interface
// ============================================================================

export interface DemoState {
  dashboard: DashboardData;
  categoryGroups: CategoryGroup[];
  unmappedCategories: UnmappedCategory[];
  settings: {
    auto_sync_new: boolean;
    auto_track_threshold: number | null;
    auto_update_targets: boolean;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNextDueDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  const isoDate = date.toISOString().split('T')[0];
  return isoDate ?? date.toISOString().substring(0, 10);
}

function calculateProgress(saved: number, target: number): number {
  if (target === 0) return 100;
  return Math.min(100, Math.round((saved / target) * 100));
}

// ============================================================================
// Category Groups
// ============================================================================

const DEMO_CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'group-recurring', name: 'Recurring Expenses' },
  { id: 'group-subscriptions', name: 'Subscriptions' },
  { id: 'group-insurance', name: 'Insurance' },
  { id: 'group-utilities', name: 'Utilities' },
];

// ============================================================================
// Recurring Items
// ============================================================================

const DEMO_RECURRING_ITEMS: RecurringItem[] = [
  {
    id: 'item-netflix',
    merchant_id: 'merchant-netflix',
    logo_url: null,
    is_stale: false,
    name: 'Netflix',
    merchant_name: 'Netflix',
    category_name: 'Netflix',
    frequency_label: 'Monthly',
    category_id: 'cat-netflix',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 15.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    months_until_due: 0,
    current_balance: 15.99,
    planned_budget: 15.99,
    monthly_contribution: 15.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 15.99,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '🎬',
    frozen_monthly_target: 15.99,
    contributed_this_month: 15.99,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-spotify',
    merchant_id: 'merchant-spotify',
    logo_url: null,
    is_stale: false,
    name: 'Spotify',
    merchant_name: 'Spotify',
    category_name: 'Spotify',
    frequency_label: 'Monthly',
    category_id: 'cat-spotify',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 10.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    months_until_due: 0,
    current_balance: 10.99,
    planned_budget: 10.99,
    monthly_contribution: 10.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 10.99,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '🎵',
    frozen_monthly_target: 10.99,
    contributed_this_month: 10.99,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-car-insurance',
    merchant_id: 'merchant-geico',
    logo_url: null,
    is_stale: false,
    name: 'Car Insurance',
    merchant_name: 'GEICO',
    category_name: 'Car Insurance',
    frequency_label: 'Every 6 months',
    category_id: 'cat-car-insurance',
    category_group_name: 'Insurance',
    category_missing: false,
    amount: 600,
    frequency: 'semi-annual',
    frequency_months: 6,
    next_due_date: getNextDueDate(3),
    months_until_due: 3,
    current_balance: 250,
    planned_budget: 100,
    monthly_contribution: 100,
    over_contribution: 0,
    progress_percent: 42,
    status: 'behind',
    is_enabled: true,
    ideal_monthly_rate: 100,
    amount_needed_now: 50,
    is_in_rollup: false,
    emoji: '🚗',
    frozen_monthly_target: 100,
    contributed_this_month: 50,
    monthly_progress_percent: 50,
  },
  {
    id: 'item-amazon-prime',
    merchant_id: 'merchant-amazon',
    logo_url: null,
    is_stale: false,
    name: 'Amazon Prime',
    merchant_name: 'Amazon',
    category_name: 'Amazon Prime',
    frequency_label: 'Yearly',
    category_id: 'cat-amazon-prime',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 139,
    frequency: 'annual',
    frequency_months: 12,
    next_due_date: getNextDueDate(5),
    months_until_due: 5,
    current_balance: 35,
    planned_budget: 20.8,
    monthly_contribution: 20.8,
    over_contribution: 0,
    progress_percent: 25,
    status: 'behind',
    is_enabled: true,
    ideal_monthly_rate: 11.58,
    amount_needed_now: 9.22,
    is_in_rollup: false,
    emoji: '📦',
    frozen_monthly_target: 20.8,
    contributed_this_month: 10,
    monthly_progress_percent: 48,
  },
  {
    id: 'item-gym',
    merchant_id: 'merchant-planet-fitness',
    logo_url: null,
    is_stale: false,
    name: 'Gym Membership',
    merchant_name: 'Planet Fitness',
    category_name: 'Gym',
    frequency_label: 'Monthly',
    category_id: 'cat-gym',
    category_group_name: 'Recurring Expenses',
    category_missing: false,
    amount: 25,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    months_until_due: 0,
    current_balance: 20,
    planned_budget: 25,
    monthly_contribution: 25,
    over_contribution: 0,
    progress_percent: 80,
    status: 'on_track',
    is_enabled: true,
    ideal_monthly_rate: 25,
    amount_needed_now: 5,
    is_in_rollup: false,
    emoji: '💪',
    frozen_monthly_target: 25,
    contributed_this_month: 20,
    monthly_progress_percent: 80,
  },
  {
    id: 'item-domain',
    merchant_id: 'merchant-namecheap',
    logo_url: null,
    is_stale: false,
    name: 'Domain Renewal',
    merchant_name: 'Namecheap',
    category_name: 'Domain Renewal',
    frequency_label: 'Yearly',
    category_id: 'cat-domain',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 14,
    frequency: 'annual',
    frequency_months: 12,
    next_due_date: getNextDueDate(10),
    months_until_due: 10,
    current_balance: 3.5,
    planned_budget: 1.17,
    monthly_contribution: 1.17,
    over_contribution: 0,
    progress_percent: 25,
    status: 'on_track',
    is_enabled: true,
    ideal_monthly_rate: 1.17,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '🌐',
    frozen_monthly_target: 1.17,
    contributed_this_month: 1.17,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-adobe',
    merchant_id: 'merchant-adobe',
    logo_url: null,
    is_stale: false,
    name: 'Adobe Creative Cloud',
    merchant_name: 'Adobe',
    category_name: 'Adobe CC',
    frequency_label: 'Monthly',
    category_id: 'cat-adobe',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 54.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    months_until_due: 0,
    current_balance: 30,
    planned_budget: 54.99,
    monthly_contribution: 54.99,
    over_contribution: 0,
    progress_percent: 55,
    status: 'behind',
    is_enabled: true,
    ideal_monthly_rate: 54.99,
    amount_needed_now: 24.99,
    is_in_rollup: false,
    emoji: '🎨',
    frozen_monthly_target: 54.99,
    contributed_this_month: 30,
    monthly_progress_percent: 55,
  },
  {
    id: 'item-phone',
    merchant_id: 'merchant-verizon',
    logo_url: null,
    is_stale: false,
    name: 'Phone Bill',
    merchant_name: 'Verizon',
    category_name: 'Phone',
    frequency_label: 'Monthly',
    category_id: 'cat-phone',
    category_group_name: 'Utilities',
    category_missing: false,
    amount: 85,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    months_until_due: 0,
    current_balance: 85,
    planned_budget: 85,
    monthly_contribution: 85,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 85,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '📱',
    frozen_monthly_target: 85,
    contributed_this_month: 85,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-renters',
    merchant_id: 'merchant-lemonade',
    logo_url: null,
    is_stale: false,
    name: 'Renters Insurance',
    merchant_name: 'Lemonade',
    category_name: 'Renters Insurance',
    frequency_label: 'Yearly',
    category_id: 'cat-renters',
    category_group_name: 'Insurance',
    category_missing: false,
    amount: 120,
    frequency: 'annual',
    frequency_months: 12,
    next_due_date: getNextDueDate(5),
    months_until_due: 5,
    current_balance: 70,
    planned_budget: 10,
    monthly_contribution: 10,
    over_contribution: 0,
    progress_percent: 58,
    status: 'on_track',
    is_enabled: true,
    ideal_monthly_rate: 10,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🏠',
    frozen_monthly_target: 10,
    contributed_this_month: 10,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-cloud-storage',
    merchant_id: 'merchant-google',
    logo_url: null,
    is_stale: false,
    name: 'Cloud Storage',
    merchant_name: 'Google One',
    category_name: 'Cloud Storage',
    frequency_label: 'Yearly',
    category_id: 'cat-cloud',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 29.99,
    frequency: 'annual',
    frequency_months: 12,
    next_due_date: getNextDueDate(4),
    months_until_due: 4,
    current_balance: 5,
    planned_budget: 6.25,
    monthly_contribution: 6.25,
    over_contribution: 0,
    progress_percent: 17,
    status: 'behind',
    is_enabled: true,
    ideal_monthly_rate: 2.5,
    amount_needed_now: 3.75,
    is_in_rollup: true,
    emoji: '☁️',
    frozen_monthly_target: 6.25,
    contributed_this_month: 3,
    monthly_progress_percent: 48,
  },
];

// ============================================================================
// Rollup Data
// ============================================================================

function createRollupData(items: RecurringItem[]): RollupData {
  const rollupItems = items.filter((item) => item.is_in_rollup);

  const rollupItemsData: RollupItem[] = rollupItems.map((item) => ({
    id: item.id,
    name: item.name,
    merchant_id: item.merchant_id,
    logo_url: item.logo_url,
    amount: item.amount,
    frequency: item.frequency,
    frequency_months: item.frequency_months,
    next_due_date: item.next_due_date,
    months_until_due: item.months_until_due,
    current_balance: item.current_balance,
    ideal_monthly_rate: item.ideal_monthly_rate,
    frozen_monthly_target: item.frozen_monthly_target,
    contributed_this_month: item.contributed_this_month,
    monthly_progress_percent: item.monthly_progress_percent,
    progress_percent: item.progress_percent,
    status: item.status,
    amount_needed_now: item.amount_needed_now,
  }));

  const totalIdealRate = rollupItemsData.reduce(
    (sum, item) => sum + item.ideal_monthly_rate,
    0
  );
  const totalFrozenMonthly = rollupItemsData.reduce(
    (sum, item) => sum + item.frozen_monthly_target,
    0
  );
  const totalTarget = rollupItemsData.reduce((sum, item) => sum + item.amount, 0);
  const totalSaved = rollupItemsData.reduce(
    (sum, item) => sum + item.current_balance,
    0
  );

  return {
    enabled: true,
    items: rollupItemsData,
    total_ideal_rate: Math.round(totalIdealRate * 100) / 100,
    total_frozen_monthly: Math.round(totalFrozenMonthly * 100) / 100,
    total_target: Math.round(totalTarget * 100) / 100,
    total_saved: Math.round(totalSaved * 100) / 100,
    budgeted: Math.round(totalFrozenMonthly * 100) / 100,
    current_balance: Math.round(totalSaved * 100) / 100,
    progress_percent: calculateProgress(totalSaved, totalTarget),
    category_id: 'cat-rollup',
    emoji: '📦',
    category_name: 'Small Subscriptions' as string,
  };
}

// ============================================================================
// Unmapped Categories
// ============================================================================

const DEMO_UNMAPPED_CATEGORIES: UnmappedCategory[] = [
  {
    id: 'uncat-streaming',
    name: 'Streaming Services',
    group_id: 'group-subscriptions',
    group_name: 'Subscriptions',
    icon: '📺',
    group_order: 1,
    category_order: 1,
    planned_budget: 0,
  },
  {
    id: 'uncat-software',
    name: 'Software Subscriptions',
    group_id: 'group-subscriptions',
    group_name: 'Subscriptions',
    icon: '💻',
    group_order: 1,
    category_order: 2,
    planned_budget: 0,
  },
];

// ============================================================================
// Initial Demo State
// ============================================================================

function createDashboardData(items: RecurringItem[]): DashboardData {
  const activeItems = items.filter((item) => item.is_enabled);
  const inactiveItems = items.filter((item) => !item.is_enabled);

  const totalMonthlyContribution = activeItems.reduce(
    (sum, item) => sum + item.monthly_contribution,
    0
  );
  const totalSaved = activeItems.reduce(
    (sum, item) => sum + item.current_balance,
    0
  );
  const totalTarget = activeItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    items,
    summary: {
      total_monthly_contribution: Math.round(totalMonthlyContribution * 100) / 100,
      total_saved: Math.round(totalSaved * 100) / 100,
      total_target: Math.round(totalTarget * 100) / 100,
      overall_progress: calculateProgress(totalSaved, totalTarget),
      active_count: activeItems.length,
      inactive_count: inactiveItems.length,
    },
    config: {
      target_group_id: 'group-recurring',
      target_group_name: 'Recurring Expenses',
      is_configured: true,
      auto_sync_new: true,
      auto_track_threshold: 50,
      auto_update_targets: true,
      user_first_name: 'Demo User',
    },
    last_sync: new Date().toISOString(),
    ready_to_assign: {
      ready_to_assign: 523.47,
      planned_income: 5000,
      actual_income: 4876.53,
      planned_expenses: 3200,
      actual_expenses: 2845.32,
      planned_savings: 800,
      remaining_income: 1231.21,
    },
    rollup: createRollupData(items),
    notices: [],
  };
}

export function createInitialDemoState(): DemoState {
  return {
    dashboard: createDashboardData(DEMO_RECURRING_ITEMS),
    categoryGroups: DEMO_CATEGORY_GROUPS,
    unmappedCategories: DEMO_UNMAPPED_CATEGORIES,
    settings: {
      auto_sync_new: true,
      auto_track_threshold: 50,
      auto_update_targets: true,
    },
  };
}

export const DEMO_INITIAL_STATE = createInitialDemoState();
