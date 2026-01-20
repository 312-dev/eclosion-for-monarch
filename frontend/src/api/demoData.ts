/* eslint-disable max-lines */
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
  Note,
  GeneralMonthNote,
  ArchivedNote,
  WishlistItem,
  WishlistData,
  WishlistConfig,
  PendingBookmark,
} from '../types';
import type { NotesCategoryGroup } from '../types/notes';
import { calculateMonthlyTarget, type Frequency } from '../utils/calculations';

// ============================================================================
// Demo State Interface
// ============================================================================

export interface DemoNotesState {
  /** Category/group notes: note_id -> Note */
  notes: Record<string, Note>;
  /** General month notes: month_key -> GeneralMonthNote */
  generalNotes: Record<string, GeneralMonthNote>;
  /** Archived notes from deleted categories */
  archivedNotes: ArchivedNote[];
  /** Known category IDs for deletion detection */
  knownCategoryIds: Record<string, string>;
  /** Last updated timestamps per month */
  monthLastUpdated: Record<string, string>;
  /** Checkbox states: key format is "{noteId}:{viewingMonth}" or "general:{sourceMonth}:{viewingMonth}" */
  checkboxStates?: Record<string, boolean[]>;
}

export interface DemoState {
  dashboard: DashboardData;
  categoryGroups: CategoryGroup[];
  unmappedCategories: UnmappedCategory[];
  settings: {
    auto_sync_new: boolean;
    auto_track_threshold: number | null;
    auto_update_targets: boolean;
    auto_categorize_enabled: boolean;
    show_category_group: boolean;
  };
  notes: DemoNotesState;
  wishlist: WishlistData;
  wishlistConfig: WishlistConfig;
  pendingBookmarks: PendingBookmark[];
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

/**
 * Calculate baseDate from next_due_date by working backwards.
 * baseDate is when the recurring pattern started - it's stable across renewals.
 * For demo purposes, we pick a date in the past that aligns with the frequency.
 */
function getBaseDate(frequency: Frequency, monthsFromNow: number): string {
  const date = new Date();
  // Set to first day of month for consistency
  date.setDate(1);

  // For demo, baseDate is set to match a cycle that ends at next_due_date
  // We want baseDate in the past, so we subtract one full cycle from due date
  switch (frequency) {
    case 'weekly':
    case 'biweekly':
    case 'semimonthly_start_mid':
      // Sub-monthly: set baseDate to same relative day in current month
      date.setDate(15); // Pick a fixed day for consistency
      break;
    case 'monthly':
      // Monthly: baseDate is current month's occurrence
      date.setDate(15);
      break;
    case 'quarterly':
      // Quarterly: baseDate is 3 months before next due
      date.setMonth(date.getMonth() + monthsFromNow - 3);
      date.setDate(15);
      break;
    case 'semiyearly':
      // Semi-annual: baseDate is 6 months before next due
      date.setMonth(date.getMonth() + monthsFromNow - 6);
      date.setDate(15);
      break;
    case 'yearly':
      // Annual: baseDate is 12 months before next due
      date.setMonth(date.getMonth() + monthsFromNow - 12);
      date.setDate(15);
      break;
    default:
      date.setDate(15);
  }

  const isoDate = date.toISOString().split('T')[0];
  return isoDate ?? date.toISOString().substring(0, 10);
}

function calculateProgress(saved: number, target: number): number {
  if (target === 0) return 100;
  return Math.min(100, Math.round((saved / target) * 100));
}

/**
 * Get the current month as an ISO string (first day of month).
 */
function getCurrentMonth(): string {
  const now = new Date();
  const isoDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  return isoDate ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Calculate the frozen monthly target for a recurring item using baseDate.
 * This mirrors the logic from services/occurrence_calculator.py
 *
 * Uses stateless calculation from stable inputs (baseDate, frequency, amount, rollover).
 */
function calculateDemoFrozenTarget(
  baseDate: string,
  frequency: Frequency,
  amount: number,
  rollover: number
): number {
  const targetMonth = getCurrentMonth();
  return calculateMonthlyTarget(baseDate, frequency, amount, rollover, targetMonth);
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
  // ============================================================================
  // ENABLED - Big items (individual tracking, not in rollup)
  // Some show catch-up scenarios where frozen_monthly_target > ideal_monthly_rate
  // ============================================================================

  // CATCH-UP EXAMPLE 1: Semi-annual expense, moderately behind
  // rollover_amount = $160 (start of month balance from previous months)
  // planned_budget = $160 (committed budget for this month)
  // contributed_this_month = $160 (matches budget - fully allocated)
  // current_balance = rollover + budgeted = $320, needs $720
  // Tooltip: "$160 rolled over, $160 budgeted this month"
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
    amount: 720,
    frequency: 'semiyearly',
    frequency_months: 6,
    next_due_date: getNextDueDate(3),
    base_date: getBaseDate('semiyearly', 3),
    months_until_due: 3,
    current_balance: 320,
    planned_budget: 160,
    rollover_amount: 160,
    monthly_contribution: 160,
    over_contribution: 0,
    progress_percent: 44,
    status: 'behind',
    is_enabled: true,
    ideal_monthly_rate: 120,
    amount_needed_now: 120,
    is_in_rollup: false,
    emoji: '🚗',
    frozen_monthly_target: 160,
    contributed_this_month: 160,
    monthly_progress_percent: 100,
  },

  // CATCH-UP EXAMPLE 2: Annual expense, significantly behind
  // rollover_amount = $75 (start of month balance from previous months)
  // planned_budget = $250 (committed budget for this month)
  // contributed_this_month = $250 (matches budget - fully allocated)
  // current_balance = rollover + budgeted = $325, needs $1200
  // Tooltip: "$75 rolled over, $250 budgeted this month"
  {
    id: 'item-home-insurance',
    merchant_id: 'merchant-statefarm',
    logo_url: null,
    is_stale: false,
    name: 'Home Insurance',
    merchant_name: 'State Farm',
    category_name: 'Home Insurance',
    frequency_label: 'Yearly',
    category_id: 'cat-home-insurance',
    category_group_name: 'Insurance',
    category_missing: false,
    amount: 1200,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(4),
    base_date: getBaseDate('yearly', 4),
    months_until_due: 4,
    current_balance: 325,
    planned_budget: 250,
    rollover_amount: 75,
    monthly_contribution: 250,
    over_contribution: 0,
    progress_percent: 27,
    status: 'behind',
    is_enabled: true,
    ideal_monthly_rate: 100,
    amount_needed_now: 600,
    is_in_rollup: false,
    emoji: '🏠',
    frozen_monthly_target: 250,
    contributed_this_month: 250,
    monthly_progress_percent: 100,
  },
  // MONTHLY - No rollover (bill was paid last month)
  // current_balance = $0, contributed_this_month = $95, total = $95
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
    amount: 95,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 95,
    monthly_contribution: 95,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 95,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '📱',
    frozen_monthly_target: 95,
    contributed_this_month: 95,
    monthly_progress_percent: 100,
  },
  // MONTHLY - No rollover (bill was paid last month)
  // current_balance = $0, contributed_this_month = $79.99, total = $79.99
  {
    id: 'item-internet',
    merchant_id: 'merchant-xfinity',
    logo_url: null,
    is_stale: false,
    name: 'Internet',
    merchant_name: 'Xfinity',
    category_name: 'Internet',
    frequency_label: 'Monthly',
    category_id: 'cat-internet',
    category_group_name: 'Utilities',
    category_missing: false,
    amount: 79.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 79.99,
    monthly_contribution: 79.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 79.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '📶',
    frozen_monthly_target: 79.99,
    contributed_this_month: 79.99,
    monthly_progress_percent: 100,
  },
  // AHEAD EXAMPLE: Monthly expense with rollover (user is ahead)
  // rollover_amount = $40 (start of month balance)
  // planned_budget = $50 (budgeting the full monthly amount)
  // current_balance = rollover + budgeted = $90, more than one month funded
  // This user is "ahead" because they have $40 extra in the buffer
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
    amount: 50,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 90,
    planned_budget: 50,
    rollover_amount: 40,
    monthly_contribution: 50,
    over_contribution: 0,
    progress_percent: 100,
    status: 'ahead',
    is_enabled: true,
    ideal_monthly_rate: 50,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '💪',
    frozen_monthly_target: 50,
    contributed_this_month: 50,
    monthly_progress_percent: 100,
  },

  // ============================================================================
  // ENABLED - Rollup items (5 small subscriptions)
  // All monthly, no rollover (bills paid via rollup category)
  // ============================================================================
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
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
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
    amount: 11.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 11.99,
    monthly_contribution: 11.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 11.99,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '🎵',
    frozen_monthly_target: 11.99,
    contributed_this_month: 11.99,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-disney',
    merchant_id: 'merchant-disney',
    logo_url: null,
    is_stale: false,
    name: 'Disney+',
    merchant_name: 'Disney',
    category_name: 'Disney+',
    frequency_label: 'Monthly',
    category_id: 'cat-disney',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 13.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 13.99,
    monthly_contribution: 13.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 13.99,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '✨',
    frozen_monthly_target: 13.99,
    contributed_this_month: 13.99,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-icloud',
    merchant_id: 'merchant-apple',
    logo_url: null,
    is_stale: false,
    name: 'iCloud Storage',
    merchant_name: 'Apple',
    category_name: 'iCloud',
    frequency_label: 'Monthly',
    category_id: 'cat-icloud',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 2.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 2.99,
    monthly_contribution: 2.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 2.99,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '☁️',
    frozen_monthly_target: 2.99,
    contributed_this_month: 2.99,
    monthly_progress_percent: 100,
  },
  {
    id: 'item-hulu',
    merchant_id: 'merchant-hulu',
    logo_url: null,
    is_stale: false,
    name: 'Hulu',
    merchant_name: 'Hulu',
    category_name: 'Hulu',
    frequency_label: 'Monthly',
    category_id: 'cat-hulu',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 17.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 17.99,
    monthly_contribution: 17.99,
    over_contribution: 0,
    progress_percent: 100,
    status: 'funded',
    is_enabled: true,
    ideal_monthly_rate: 17.99,
    amount_needed_now: 0,
    is_in_rollup: true,
    emoji: '📺',
    frozen_monthly_target: 17.99,
    contributed_this_month: 17.99,
    monthly_progress_percent: 100,
  },

  // ============================================================================
  // ENABLED - Catch-up example (annual expense)
  // ============================================================================

  // CATCH-UP EXAMPLE 3: Annual expense, mildly behind
  // User has $30 saved for $139 annual expense with 5 months to go
  // Needs $109 in 5 months = ~$22/mo vs ~$12/mo ideal
  // rollover_amount = $8 (start of month balance)
  // current_balance = rollover + budgeted = $30, contributed_this_month = $22
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
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(5),
    base_date: getBaseDate('yearly', 5),
    months_until_due: 5,
    current_balance: 30,
    planned_budget: 22,
    rollover_amount: 8,
    monthly_contribution: 22,
    over_contribution: 0,
    progress_percent: 22,
    status: 'on_track',
    is_enabled: true,
    ideal_monthly_rate: 12,
    amount_needed_now: 51,
    is_in_rollup: false,
    emoji: '📦',
    frozen_monthly_target: 22,
    contributed_this_month: 22,
    monthly_progress_percent: 100,
  },

  // ============================================================================
  // DISABLED - The rest (not tracking yet)
  // ============================================================================
  {
    id: 'item-hbo',
    merchant_id: 'merchant-hbo',
    logo_url: null,
    is_stale: false,
    name: 'Max (HBO)',
    merchant_name: 'Max',
    category_name: 'Max',
    frequency_label: 'Monthly',
    category_id: 'cat-hbo',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 15.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 15.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🎭',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-youtube-premium',
    merchant_id: 'merchant-google',
    logo_url: null,
    is_stale: false,
    name: 'YouTube Premium',
    merchant_name: 'Google',
    category_name: 'YouTube Premium',
    frequency_label: 'Monthly',
    category_id: 'cat-youtube',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 13.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 13.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '▶️',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-costco',
    merchant_id: 'merchant-costco',
    logo_url: null,
    is_stale: false,
    name: 'Costco Membership',
    merchant_name: 'Costco',
    category_name: 'Costco',
    frequency_label: 'Yearly',
    category_id: 'cat-costco',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 65,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(8),
    base_date: getBaseDate('yearly', 8),
    months_until_due: 8,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 5.42,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🛒',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
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
    amount: 144,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(7),
    base_date: getBaseDate('yearly', 7),
    months_until_due: 7,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 12,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🏠',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-aaa',
    merchant_id: 'merchant-aaa',
    logo_url: null,
    is_stale: false,
    name: 'AAA Membership',
    merchant_name: 'AAA',
    category_name: 'AAA',
    frequency_label: 'Yearly',
    category_id: 'cat-aaa',
    category_group_name: 'Insurance',
    category_missing: false,
    amount: 79,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(4),
    base_date: getBaseDate('yearly', 4),
    months_until_due: 4,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 6.58,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🚙',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-playstation',
    merchant_id: 'merchant-sony',
    logo_url: null,
    is_stale: false,
    name: 'PlayStation Plus',
    merchant_name: 'Sony',
    category_name: 'PlayStation Plus',
    frequency_label: 'Yearly',
    category_id: 'cat-playstation',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 59.99,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(9),
    base_date: getBaseDate('yearly', 9),
    months_until_due: 9,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 5,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🎮',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-apple-tv',
    merchant_id: 'merchant-apple',
    logo_url: null,
    is_stale: false,
    name: 'Apple TV+',
    merchant_name: 'Apple',
    category_name: 'Apple TV+',
    frequency_label: 'Monthly',
    category_id: 'cat-appletv',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 9.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 9.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🍎',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-peacock',
    merchant_id: 'merchant-nbc',
    logo_url: null,
    is_stale: false,
    name: 'Peacock',
    merchant_name: 'NBCUniversal',
    category_name: 'Peacock',
    frequency_label: 'Monthly',
    category_id: 'cat-peacock',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 7.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 7.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🦚',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-paramount',
    merchant_id: 'merchant-paramount',
    logo_url: null,
    is_stale: false,
    name: 'Paramount+',
    merchant_name: 'Paramount',
    category_name: 'Paramount+',
    frequency_label: 'Monthly',
    category_id: 'cat-paramount',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 11.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 11.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '⛰️',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-nyt',
    merchant_id: 'merchant-nyt',
    logo_url: null,
    is_stale: false,
    name: 'NY Times Digital',
    merchant_name: 'New York Times',
    category_name: 'NY Times',
    frequency_label: 'Yearly',
    category_id: 'cat-nyt',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 100,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: getNextDueDate(6),
    base_date: getBaseDate('yearly', 6),
    months_until_due: 6,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 8.33,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '📰',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-electric',
    merchant_id: 'merchant-electric',
    logo_url: null,
    is_stale: false,
    name: 'Electric Bill',
    merchant_name: 'Local Electric',
    category_name: 'Electric',
    frequency_label: 'Monthly',
    category_id: 'cat-electric',
    category_group_name: 'Utilities',
    category_missing: false,
    amount: 120,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 120,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '⚡',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-water',
    merchant_id: 'merchant-water',
    logo_url: null,
    is_stale: false,
    name: 'Water Bill',
    merchant_name: 'City Water',
    category_name: 'Water',
    frequency_label: 'Monthly',
    category_id: 'cat-water',
    category_group_name: 'Utilities',
    category_missing: false,
    amount: 45,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 45,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '💧',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-trash',
    merchant_id: 'merchant-waste',
    logo_url: null,
    is_stale: false,
    name: 'Trash & Recycling',
    merchant_name: 'Waste Management',
    category_name: 'Trash',
    frequency_label: 'Quarterly',
    category_id: 'cat-trash',
    category_group_name: 'Utilities',
    category_missing: false,
    amount: 90,
    frequency: 'quarterly',
    frequency_months: 3,
    next_due_date: getNextDueDate(2),
    base_date: getBaseDate('quarterly', 2),
    months_until_due: 2,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 30,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🗑️',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-pet-insurance',
    merchant_id: 'merchant-pet',
    logo_url: null,
    is_stale: false,
    name: 'Pet Insurance',
    merchant_name: 'Healthy Paws',
    category_name: 'Pet Insurance',
    frequency_label: 'Monthly',
    category_id: 'cat-pet',
    category_group_name: 'Insurance',
    category_missing: false,
    amount: 45,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 45,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🐕',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-apple-music',
    merchant_id: 'merchant-apple',
    logo_url: null,
    is_stale: false,
    name: 'Apple Music',
    merchant_name: 'Apple',
    category_name: 'Apple Music',
    frequency_label: 'Monthly',
    category_id: 'cat-applemusic',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 10.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 10.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🎧',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-xbox',
    merchant_id: 'merchant-microsoft',
    logo_url: null,
    is_stale: false,
    name: 'Xbox Game Pass',
    merchant_name: 'Microsoft',
    category_name: 'Xbox Game Pass',
    frequency_label: 'Monthly',
    category_id: 'cat-xbox',
    category_group_name: 'Subscriptions',
    category_missing: false,
    amount: 16.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 16.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🎮',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
  {
    id: 'item-car-wash',
    merchant_id: 'merchant-carwash',
    logo_url: null,
    is_stale: false,
    name: 'Car Wash Membership',
    merchant_name: 'Mister Car Wash',
    category_name: 'Car Wash',
    frequency_label: 'Monthly',
    category_id: 'cat-carwash',
    category_group_name: 'Recurring Expenses',
    category_missing: false,
    amount: 29.99,
    frequency: 'monthly',
    frequency_months: 1,
    next_due_date: getNextDueDate(0),
    base_date: getBaseDate('monthly', 0),
    months_until_due: 0,
    current_balance: 0,
    planned_budget: 0,
    monthly_contribution: 0,
    over_contribution: 0,
    progress_percent: 0,
    status: 'disabled',
    is_enabled: false,
    ideal_monthly_rate: 29.99,
    amount_needed_now: 0,
    is_in_rollup: false,
    emoji: '🚿',
    frozen_monthly_target: 0,
    contributed_this_month: 0,
    monthly_progress_percent: 0,
  },
];

// ============================================================================
// Rollup Data
// ============================================================================

function createRollupData(items: RecurringItem[]): RollupData {
  const rollupItems = items.filter((item) => item.is_in_rollup);

  const rollupItemsData: RollupItem[] = rollupItems.map((item) => {
    const rollupItem: RollupItem = {
      id: item.id,
      name: item.name,
      merchant_id: item.merchant_id,
      logo_url: item.logo_url,
      amount: item.amount,
      frequency: item.frequency,
      frequency_months: item.frequency_months,
      next_due_date: item.next_due_date,
      months_until_due: item.months_until_due,
      ideal_monthly_rate: item.ideal_monthly_rate,
      frozen_monthly_target: item.frozen_monthly_target,
      status: item.status,
    };
    if (item.base_date) {
      rollupItem.base_date = item.base_date;
    }
    return rollupItem;
  });

  const totalIdealRate = rollupItemsData.reduce((sum, item) => sum + item.ideal_monthly_rate, 0);
  const totalFrozenMonthly = rollupItemsData.reduce(
    (sum, item) => sum + item.frozen_monthly_target,
    0
  );
  const totalTarget = rollupItemsData.reduce((sum, item) => sum + item.amount, 0);
  // Total saved = current_balance (rollover) + contributed_this_month
  const totalSaved = rollupItems.reduce(
    (sum, item) => sum + item.current_balance + item.contributed_this_month,
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
  },
  {
    id: 'uncat-software',
    name: 'Software Subscriptions',
    group_id: 'group-subscriptions',
    group_name: 'Subscriptions',
    icon: '💻',
    group_order: 1,
    category_order: 2,
  },
];

// ============================================================================
// All Notes Categories (simulates full Monarch category list)
// ============================================================================

/**
 * Complete list of Monarch categories for the Notes feature.
 * This simulates what a typical user would have in their budget.
 */
export const DEMO_NOTES_CATEGORIES: NotesCategoryGroup[] = [
  {
    id: 'group-income',
    name: 'Income',
    categories: [
      { id: 'cat-income-salary', name: 'Salary', icon: '💰' },
      { id: 'cat-income-bonus', name: 'Bonus', icon: '🎁' },
      { id: 'cat-income-freelance', name: 'Freelance', icon: '💼' },
      { id: 'cat-income-dividends', name: 'Dividends', icon: '📈' },
      { id: 'cat-income-other', name: 'Other Income', icon: '💵' },
    ],
  },
  {
    id: 'group-housing',
    name: 'Housing',
    categories: [
      { id: 'cat-housing-rent', name: 'Rent/Mortgage', icon: '🏠' },
      { id: 'cat-housing-hoa', name: 'HOA Fees', icon: '🏢' },
      { id: 'cat-housing-maintenance', name: 'Home Maintenance', icon: '🔧' },
      { id: 'cat-housing-furniture', name: 'Furniture', icon: '🛋️' },
      { id: 'cat-housing-supplies', name: 'Household Supplies', icon: '🧹' },
    ],
  },
  {
    id: 'group-food',
    name: 'Food & Dining',
    categories: [
      { id: 'cat-food-groceries', name: 'Groceries', icon: '🛒' },
      { id: 'cat-food-restaurants', name: 'Restaurants', icon: '🍽️' },
      { id: 'cat-food-coffee', name: 'Coffee Shops', icon: '☕' },
      { id: 'cat-food-delivery', name: 'Food Delivery', icon: '🚗' },
      { id: 'cat-food-alcohol', name: 'Alcohol & Bars', icon: '🍺' },
    ],
  },
  {
    id: 'group-transportation',
    name: 'Transportation',
    categories: [
      { id: 'cat-transport-gas', name: 'Gas', icon: '⛽' },
      { id: 'cat-transport-parking', name: 'Parking', icon: '🅿️' },
      { id: 'cat-transport-car-payment', name: 'Car Payment', icon: '🚗' },
      { id: 'cat-transport-public', name: 'Public Transit', icon: '🚇' },
      { id: 'cat-transport-rideshare', name: 'Uber/Lyft', icon: '🚕' },
      { id: 'cat-transport-maintenance', name: 'Car Maintenance', icon: '🔧' },
    ],
  },
  {
    id: 'group-shopping',
    name: 'Shopping',
    categories: [
      { id: 'cat-shop-amazon', name: 'Amazon', icon: '📦' },
      { id: 'cat-shop-clothing', name: 'Clothing', icon: '👕' },
      { id: 'cat-shop-electronics', name: 'Electronics', icon: '📱' },
      { id: 'cat-shop-gifts', name: 'Gifts', icon: '🎁' },
      { id: 'cat-shop-books', name: 'Books', icon: '📚' },
      { id: 'cat-shop-hobbies', name: 'Hobbies', icon: '🎨' },
    ],
  },
  {
    id: 'group-health',
    name: 'Health & Fitness',
    categories: [
      { id: 'cat-health-medical', name: 'Medical', icon: '🏥' },
      { id: 'cat-health-dental', name: 'Dental', icon: '🦷' },
      { id: 'cat-health-pharmacy', name: 'Pharmacy', icon: '💊' },
      { id: 'cat-health-gym', name: 'Gym', icon: '💪' },
      { id: 'cat-health-vision', name: 'Vision', icon: '👓' },
    ],
  },
  {
    id: 'group-personal',
    name: 'Personal Care',
    categories: [
      { id: 'cat-personal-haircut', name: 'Haircut', icon: '💇' },
      { id: 'cat-personal-beauty', name: 'Beauty & Spa', icon: '💅' },
      { id: 'cat-personal-laundry', name: 'Laundry', icon: '👔' },
    ],
  },
  {
    id: 'group-entertainment',
    name: 'Entertainment',
    categories: [
      { id: 'cat-ent-movies', name: 'Movies & Shows', icon: '🎬' },
      { id: 'cat-ent-games', name: 'Games', icon: '🎮' },
      { id: 'cat-ent-concerts', name: 'Concerts & Events', icon: '🎵' },
      { id: 'cat-ent-sports', name: 'Sports', icon: '⚽' },
    ],
  },
  {
    id: 'group-travel',
    name: 'Travel',
    categories: [
      { id: 'cat-travel-flights', name: 'Flights', icon: '✈️' },
      { id: 'cat-travel-hotels', name: 'Hotels', icon: '🏨' },
      { id: 'cat-travel-vacation', name: 'Vacation', icon: '🏖️' },
      { id: 'cat-travel-rental', name: 'Car Rental', icon: '🚙' },
    ],
  },
  {
    id: 'group-pets',
    name: 'Pets',
    categories: [
      { id: 'cat-pets-food', name: 'Pet Food', icon: '🐕' },
      { id: 'cat-pets-vet', name: 'Vet', icon: '🏥' },
      { id: 'cat-pets-supplies', name: 'Pet Supplies', icon: '🦴' },
      { id: 'cat-pets-grooming', name: 'Grooming', icon: '🛁' },
    ],
  },
  {
    id: 'group-education',
    name: 'Education',
    categories: [
      { id: 'cat-edu-tuition', name: 'Tuition', icon: '🎓' },
      { id: 'cat-edu-courses', name: 'Online Courses', icon: '💻' },
      { id: 'cat-edu-supplies', name: 'School Supplies', icon: '📝' },
      { id: 'cat-edu-loans', name: 'Student Loans', icon: '📋' },
    ],
  },
  {
    id: 'group-savings',
    name: 'Savings Goals',
    categories: [
      { id: 'cat-save-emergency', name: 'Emergency Fund', icon: '🚨' },
      { id: 'cat-save-vacation', name: 'Vacation Fund', icon: '🌴' },
      { id: 'cat-save-house', name: 'House Down Payment', icon: '🏡' },
      { id: 'cat-save-retirement', name: 'Retirement', icon: '👴' },
    ],
  },
  // Include the existing recurring-related groups
  {
    id: 'group-recurring',
    name: 'Recurring Expenses',
    categories: [
      { id: 'cat-gym', name: 'Gym', icon: '💪' },
      { id: 'cat-carwash', name: 'Car Wash', icon: '🚿' },
    ],
  },
  {
    id: 'group-subscriptions',
    name: 'Subscriptions',
    categories: [
      { id: 'cat-netflix', name: 'Netflix', icon: '🎬' },
      { id: 'cat-spotify', name: 'Spotify', icon: '🎵' },
      { id: 'cat-disney', name: 'Disney+', icon: '✨' },
      { id: 'cat-icloud', name: 'iCloud', icon: '☁️' },
      { id: 'cat-hulu', name: 'Hulu', icon: '📺' },
      { id: 'cat-amazon-prime', name: 'Amazon Prime', icon: '📦' },
      { id: 'cat-hbo', name: 'Max', icon: '🎭' },
      { id: 'cat-youtube', name: 'YouTube Premium', icon: '▶️' },
      { id: 'cat-costco', name: 'Costco', icon: '🛒' },
      { id: 'cat-playstation', name: 'PlayStation Plus', icon: '🎮' },
      { id: 'cat-appletv', name: 'Apple TV+', icon: '🍎' },
      { id: 'cat-peacock', name: 'Peacock', icon: '🦚' },
      { id: 'cat-paramount', name: 'Paramount+', icon: '⛰️' },
      { id: 'cat-nyt', name: 'NY Times', icon: '📰' },
      { id: 'cat-applemusic', name: 'Apple Music', icon: '🎧' },
      { id: 'cat-xbox', name: 'Xbox Game Pass', icon: '🎮' },
      { id: 'uncat-streaming', name: 'Streaming Services', icon: '📺' },
      { id: 'uncat-software', name: 'Software Subscriptions', icon: '💻' },
    ],
  },
  {
    id: 'group-insurance',
    name: 'Insurance',
    categories: [
      { id: 'cat-car-insurance', name: 'Car Insurance', icon: '🚗' },
      { id: 'cat-home-insurance', name: 'Home Insurance', icon: '🏠' },
      { id: 'cat-renters', name: 'Renters Insurance', icon: '🏠' },
      { id: 'cat-aaa', name: 'AAA', icon: '🚙' },
      { id: 'cat-pet', name: 'Pet Insurance', icon: '🐕' },
      { id: 'cat-health-insurance', name: 'Health Insurance', icon: '🏥' },
      { id: 'cat-life-insurance', name: 'Life Insurance', icon: '❤️' },
    ],
  },
  {
    id: 'group-utilities',
    name: 'Utilities',
    categories: [
      { id: 'cat-phone', name: 'Phone', icon: '📱' },
      { id: 'cat-internet', name: 'Internet', icon: '📶' },
      { id: 'cat-electric', name: 'Electric', icon: '⚡' },
      { id: 'cat-water', name: 'Water', icon: '💧' },
      { id: 'cat-trash', name: 'Trash', icon: '🗑️' },
      { id: 'cat-gas-utility', name: 'Gas (Utility)', icon: '🔥' },
    ],
  },
];

// ============================================================================
// Initial Demo State
// ============================================================================

function createDashboardData(items: RecurringItem[]): DashboardData {
  // Calculate frozen_monthly_target for items that don't have one yet (disabled items)
  // This ensures the target is ready when items are enabled
  // Uses baseDate-based calculation for consistency with backend
  const processedItems = items.map((item) => ({
    ...item,
    frozen_monthly_target:
      item.frozen_monthly_target ||
      (item.base_date
        ? calculateDemoFrozenTarget(
            item.base_date,
            item.frequency as Frequency,
            item.amount,
            item.rollover_amount ?? 0 // Use explicit rollover, not current_balance
          )
        : 0),
  }));

  const activeItems = processedItems.filter((item) => item.is_enabled);
  const inactiveItems = processedItems.filter((item) => !item.is_enabled);

  const totalMonthlyContribution = activeItems.reduce(
    (sum, item) => sum + item.monthly_contribution,
    0
  );
  // Total saved = current_balance (rollover) + contributed_this_month
  const totalSaved = activeItems.reduce(
    (sum, item) => sum + item.current_balance + item.contributed_this_month,
    0
  );
  const totalTarget = activeItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    items: processedItems,
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
      auto_categorize_enabled: false,
      show_category_group: true,
      user_first_name: 'Demo User',
    },
    last_sync: new Date().toISOString(),
    data_month: new Date().toISOString().slice(0, 7),
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

/**
 * Get current month key in YYYY-MM format
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get previous month key
 */
function getPreviousMonthKey(offset: number = 1): string {
  const date = new Date();
  date.setMonth(date.getMonth() - offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Create initial demo notes with example data
 */
function createInitialDemoNotes(): DemoNotesState {
  const currentMonth = getCurrentMonthKey();
  const prevMonth = getPreviousMonthKey(1);
  const twoMonthsAgo = getPreviousMonthKey(2);
  const now = new Date().toISOString();

  return {
    notes: {
      'demo-note-1': {
        id: 'demo-note-1',
        categoryRef: {
          type: 'group',
          id: 'group-subscriptions',
          name: 'Subscriptions',
        },
        monthKey: twoMonthsAgo,
        content:
          '**Review all streaming services** this quarter.\n\n- Check for price increases\n- Consider bundling options\n- Cancel unused services',
        createdAt: now,
        updatedAt: now,
      },
      'demo-note-2': {
        id: 'demo-note-2',
        categoryRef: {
          type: 'category',
          id: 'cat-amazon-prime',
          name: 'Amazon Prime',
          groupId: 'group-subscriptions',
          groupName: 'Subscriptions',
        },
        monthKey: prevMonth,
        content:
          'Consider switching to annual plan - saves $20/year.\n\nCurrent: $14.99/mo = $179.88/yr\nAnnual: $139/yr\n\n**Savings: $40.88/yr**',
        createdAt: now,
        updatedAt: now,
      },
      'demo-note-3': {
        id: 'demo-note-3',
        categoryRef: {
          type: 'group',
          id: 'group-insurance',
          name: 'Insurance',
        },
        monthKey: currentMonth,
        content:
          '## Annual Review\n\nCompare rates from:\n1. Progressive\n2. Geico\n3. State Farm\n\nCurrent policy expires in 3 months.',
        createdAt: now,
        updatedAt: now,
      },
    },
    generalNotes: {
      [currentMonth]: {
        id: 'demo-general-1',
        monthKey: currentMonth,
        content:
          '## Monthly Budget Check-in\n\n- [ ] Review all recurring expenses\n- [ ] Check subscription usage\n- [ ] Update insurance quotes\n\n*Total subscription cost this month: ~$85*',
        createdAt: now,
        updatedAt: now,
      },
    },
    archivedNotes: [],
    knownCategoryIds: {
      'group-subscriptions': 'Subscriptions',
      'group-insurance': 'Insurance',
      'cat-amazon-prime': 'Amazon Prime',
    },
    monthLastUpdated: {
      [currentMonth]: now,
      [prevMonth]: now,
      [twoMonthsAgo]: now,
    },
  };
}

// ============================================================================
// Wishlist Seed Data
// ============================================================================

function getTargetDate(monthsFromNow: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsFromNow);
  // Set to end of month
  date.setMonth(date.getMonth() + 1, 0);
  const isoDate = date.toISOString().split('T')[0];
  return isoDate ?? date.toISOString().substring(0, 10);
}

const DEMO_WISHLIST_ITEMS: WishlistItem[] = [
  // Funded item - ready to purchase
  {
    type: 'wishlist',
    id: 'wishlist-headphones',
    name: 'Sony WH-1000XM5',
    amount: 350,
    current_balance: 350,
    planned_budget: 0,
    category_id: 'cat-wishlist-headphones',
    category_name: 'Sony WH-1000XM5',
    category_group_id: 'group-wishlist',
    category_group_name: 'Wishlist',
    is_enabled: true,
    status: 'funded',
    progress_percent: 100,
    emoji: '🎧',
    target_date: getTargetDate(0),
    months_remaining: 0,
    source_url:
      'https://www.amazon.com/Sony-WH-1000XM5-Canceling-Headphones-Hands-Free/dp/B09XS7JWHH',
    monthly_target: 0,
    shortfall: 0,
    is_archived: false,
    sort_order: 0,
    grid_x: 0,
    grid_y: 0,
    col_span: 1,
    row_span: 1,
  },
  // On track - saving steadily
  {
    type: 'wishlist',
    id: 'wishlist-guitar',
    name: 'Fender Player Stratocaster',
    amount: 850,
    current_balance: 425,
    planned_budget: 142,
    category_id: 'cat-wishlist-guitar',
    category_name: 'Fender Guitar',
    category_group_id: 'group-wishlist',
    category_group_name: 'Wishlist',
    is_enabled: true,
    status: 'on_track',
    progress_percent: 50,
    emoji: '🎸',
    target_date: getTargetDate(3),
    months_remaining: 3,
    source_url: 'https://www.fender.com/en-US/electric-guitars/stratocaster/player-stratocaster/',
    monthly_target: 142,
    shortfall: 425,
    is_archived: false,
    sort_order: 1,
    grid_x: 1,
    grid_y: 0,
    col_span: 1,
    row_span: 1,
  },
  // Behind - needs to catch up
  {
    type: 'wishlist',
    id: 'wishlist-camera',
    name: 'Sony A7 IV',
    amount: 2500,
    current_balance: 800,
    planned_budget: 200,
    category_id: 'cat-wishlist-camera',
    category_name: 'Sony A7 IV',
    category_group_id: 'group-wishlist',
    category_group_name: 'Wishlist',
    is_enabled: true,
    status: 'behind',
    progress_percent: 32,
    emoji: '📷',
    target_date: getTargetDate(6),
    months_remaining: 6,
    source_url: 'https://www.sony.com/en/alpha-interchangeable-lens-cameras/alpha-7-iv/',
    monthly_target: 283,
    shortfall: 1700,
    is_archived: false,
    sort_order: 2,
    grid_x: 2,
    grid_y: 0,
    col_span: 1,
    row_span: 1,
  },
];

const DEMO_ARCHIVED_WISHLIST: WishlistItem[] = [
  {
    type: 'wishlist',
    id: 'wishlist-keyboard',
    name: 'Keychron Q1 Pro',
    amount: 200,
    current_balance: 200,
    planned_budget: 0,
    category_id: 'cat-wishlist-keyboard',
    category_name: 'Keychron Q1 Pro',
    category_group_id: 'group-wishlist',
    category_group_name: 'Wishlist',
    is_enabled: true,
    status: 'funded',
    progress_percent: 100,
    emoji: '⌨️',
    target_date: getTargetDate(-1),
    months_remaining: 0,
    source_url:
      'https://www.keychron.com/products/keychron-q1-pro-qmk-via-wireless-custom-mechanical-keyboard',
    monthly_target: 0,
    shortfall: 0,
    is_archived: true,
    archived_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    sort_order: 0,
    grid_x: 0,
    grid_y: 0,
    col_span: 1,
    row_span: 1,
  },
];

export function createInitialWishlistData(): WishlistData {
  const items = DEMO_WISHLIST_ITEMS;
  const archivedItems = DEMO_ARCHIVED_WISHLIST;

  return {
    items,
    archived_items: archivedItems,
    total_target: items.reduce((sum, item) => sum + item.amount, 0),
    total_saved: items.reduce((sum, item) => sum + item.current_balance, 0),
    total_monthly_target: items.reduce((sum, item) => sum + item.monthly_target, 0),
  };
}

export function createInitialWishlistConfig(): WishlistConfig {
  return {
    isConfigured: false,
    defaultCategoryGroupId: null,
    defaultCategoryGroupName: null,
    selectedBrowser: null,
    selectedFolderIds: [],
    selectedFolderNames: [],
    autoArchiveOnBookmarkDelete: true,
    autoArchiveOnGoalMet: true,
  };
}

/**
 * Create initial demo pending bookmarks.
 * These are sample bookmarks awaiting user review.
 */
export function createInitialPendingBookmarks(): PendingBookmark[] {
  return [
    {
      id: 'pending-1',
      url: 'https://www.apple.com/shop/buy-mac/macbook-pro',
      name: 'MacBook Pro - Apple',
      bookmark_id: 'bm-123',
      browser_type: 'chrome',
      logo_url: 'https://www.apple.com/favicon.ico',
      status: 'pending',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pending-2',
      url: 'https://www.amazon.com/dp/B0CXYZ123',
      name: 'Sony WH-1000XM5 Wireless Headphones',
      bookmark_id: 'bm-456',
      browser_type: 'chrome',
      logo_url: 'https://www.amazon.com/favicon.ico',
      status: 'pending',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pending-3',
      url: 'https://www.rei.com/product/camp-tent',
      name: 'REI Co-op Half Dome 2 Plus Tent',
      bookmark_id: 'bm-789',
      browser_type: 'chrome',
      logo_url: 'https://www.rei.com/favicon.ico',
      status: 'pending',
      created_at: new Date().toISOString(),
    },
  ];
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
      auto_categorize_enabled: false,
      show_category_group: true,
    },
    notes: createInitialDemoNotes(),
    wishlist: createInitialWishlistData(),
    wishlistConfig: createInitialWishlistConfig(),
    pendingBookmarks: createInitialPendingBookmarks(),
  };
}

export const DEMO_INITIAL_STATE = createInitialDemoState();
