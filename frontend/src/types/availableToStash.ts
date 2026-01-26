/**
 * Available Funds Types
 *
 * Types for calculating how much money a user can safely allocate to Stash items.
 * See .claude/rules/available-to-stash.md for the full formula and rationale.
 */

/**
 * Account data needed for the calculation.
 * Accounts are categorized by type to determine which count as "cash".
 */
export interface AccountBalance {
  id: string;
  name: string;
  balance: number;
  /** Account type from Monarch (checking, savings, credit, etc.) */
  accountType: string;
  /** Whether the account is enabled/visible */
  isEnabled: boolean;
}

/**
 * Category budget data for the current month.
 * Used to calculate unspent budget commitments.
 */
export interface CategoryBudget {
  id: string;
  name: string;
  /** Amount budgeted for this month */
  budgeted: number;
  /** Amount spent this month (positive value) */
  spent: number;
  /**
   * Remaining amount including rollover balance.
   * Formula: previousMonthRollover + budgeted - spent
   * Use this for "unspent" calculation to properly account for accumulated funds.
   */
  remaining: number;
  /** Whether this is an expense category (vs income/savings) */
  isExpense: boolean;
}

/**
 * Monarch savings goal data (minimal, for calculation).
 */
export interface GoalBalance {
  id: string;
  name: string;
  /** Current balance saved toward this goal */
  balance: number;
}

/**
 * Stash item balance data for breakdown display.
 * Named differently from StashItem in stash.ts to avoid conflicts.
 */
export interface StashItemBalance {
  id: string;
  name: string;
  /** Current balance saved toward this stash item */
  balance: number;
}

/**
 * Raw data required for the Available Funds calculation.
 * This is fetched from the backend/Monarch.
 */
export interface AvailableToStashData {
  /** All account balances */
  accounts: AccountBalance[];
  /** Current month's category budgets */
  categoryBudgets: CategoryBudget[];
  /** Monarch savings goal balances */
  goals: GoalBalance[];
  /** Planned income for the month (for optional toggle) */
  plannedIncome: number;
  /** Actual income received so far this month */
  actualIncome: number;
  /** Total Stash balances (from Eclosion) */
  stashBalances: number;
  /** Individual stash items with balances (for detailed breakdown) */
  stashItems?: StashItemBalance[];
  /** Left to Budget (ready_to_assign from Monarch) - subtracted from Cash to Stash */
  leftToBudget: number;
}

/**
 * Calculation options.
 */
export interface AvailableToStashOptions {
  /** Include expected (not yet received) income in the calculation */
  includeExpectedIncome: boolean;
  /** Selected cash account IDs to include. null = all accounts (default). */
  selectedCashAccountIds?: string[] | null;
  /** Reserved buffer amount (subtracted from available). Default: 0. */
  bufferAmount?: number;
}

/**
 * A single line item in a detailed breakdown.
 */
export interface BreakdownLineItem {
  id: string;
  name: string;
  amount: number;
}

/**
 * Detailed breakdown showing individual items that make up each total.
 */
export interface DetailedBreakdown {
  /** Individual cash accounts */
  cashAccounts: BreakdownLineItem[];
  /** Individual credit card accounts */
  creditCards: BreakdownLineItem[];
  /** Individual category budgets with unspent amounts */
  unspentCategories: BreakdownLineItem[];
  /** Individual Monarch goals */
  goals: BreakdownLineItem[];
  /** Individual stash items */
  stashItems: BreakdownLineItem[];
}

/**
 * Breakdown of calculation components for Available Funds.
 */
export interface AvailableToStashBreakdown {
  /** Sum of cash accounts (checking, savings, PayPal/Venmo) */
  cashOnHand: number;
  /** Expected income not yet received (0 if toggle is off) */
  expectedIncome: number;
  /** Current credit card balances */
  creditCardDebt: number;
  /** Sum of max(0, budget - spent) for expense categories */
  unspentBudgets: number;
  /** Sum of Monarch goal balances */
  goalBalances: number;
  /** Sum of Stash item balances */
  stashBalances: number;
  /** Reserved buffer amount (0 if not set) */
  bufferAmount: number;
  /** Left to Budget (ready_to_assign from Monarch) */
  leftToBudget: number;
}

/**
 * Result of the Available Funds calculation.
 * Includes the final value and a breakdown for transparency.
 */
export interface AvailableToStashResult {
  /** The final available amount */
  available: number;
  /** Breakdown of the calculation components */
  breakdown: AvailableToStashBreakdown;
  /** Detailed breakdown showing individual items */
  detailedBreakdown: DetailedBreakdown;
  /** Whether expected income was included */
  includesExpectedIncome: boolean;
}

/**
 * Account types that count as "cash" for available calculation.
 * Based on Monarch's actual account type values from the API.
 */
export const CASH_ACCOUNT_TYPES = [
  'depository', // Monarch's type for checking/savings
  'checking',
  'savings',
  'cash',
  'paypal', // PayPal, Venmo, etc.
  'prepaid',
  'money_market',
] as const;

/**
 * Account types that are credit cards.
 * Monarch uses 'credit' for credit cards.
 */
export const CREDIT_CARD_ACCOUNT_TYPES = ['credit', 'credit_card'] as const;

/**
 * Account types that represent debts/liabilities.
 * Based on Monarch's accountTypeOptions with group: "liability".
 *
 * Main types: credit, loan, other_liability
 * Loan subtypes: auto, student, mortgage, home_equity, line_of_credit, etc.
 */
export const DEBT_ACCOUNT_TYPES = [
  // Credit cards
  'credit',
  'credit_card',
  // Loans (main type and subtypes)
  'loan',
  'auto',
  'business',
  'commercial',
  'construction',
  'consumer',
  'home',
  'home_equity',
  'mortgage',
  'overdraft',
  'line_of_credit',
  'student',
  // Other
  'other_liability',
] as const;

/**
 * Check if an account type is a cash account.
 */
export function isCashAccount(accountType: string): boolean {
  const normalized = accountType.toLowerCase().replaceAll(/[^a-z_]/g, '');
  return (CASH_ACCOUNT_TYPES as readonly string[]).includes(normalized);
}

/**
 * Check if an account type is a credit card.
 */
export function isCreditCardAccount(accountType: string): boolean {
  const normalized = accountType.toLowerCase().replaceAll(/[^a-z_]/g, '');
  return (CREDIT_CARD_ACCOUNT_TYPES as readonly string[]).includes(normalized);
}

/**
 * Check if an account type is a debt/liability account.
 */
export function isDebtAccount(accountType: string): boolean {
  const normalized = accountType.toLowerCase().replaceAll(/[^a-z_]/g, '');
  return (DEBT_ACCOUNT_TYPES as readonly string[]).includes(normalized);
}
