/**
 * Available to Stash Calculation
 *
 * Calculates how much money a user can safely allocate to Stash items
 * without disrupting their existing budget or financial commitments.
 *
 * Formula:
 *   Available = Cash
 *             + Expected Income (optional)
 *             - Current CC Balances
 *             - Unspent Expense Budgets
 *             - Monarch Goal Balances
 *             - Stash Balances
 *
 * See .claude/rules/available-to-stash.md for full documentation.
 */

import type {
  AvailableToStashData,
  AvailableToStashOptions,
  AvailableToStashResult,
  AccountBalance,
  CategoryBudget,
  BreakdownLineItem,
  DetailedBreakdown,
} from '../types/availableToStash';
import { isCashAccount, isCreditCardAccount } from '../types/availableToStash';

/**
 * Decode HTML entities in a string.
 * Monarch API sometimes returns names with HTML-encoded characters.
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/**
 * Calculate the sum of cash account balances.
 * Includes: checking, savings, cash, PayPal/Venmo, prepaid, money market.
 * Excludes: HSA, brokerage, crypto, retirement accounts.
 */
export function sumCashAccounts(accounts: AccountBalance[]): number {
  return accounts
    .filter((account) => account.isEnabled && isCashAccount(account.accountType))
    .reduce((sum, account) => sum + account.balance, 0);
}

/**
 * Calculate the sum of credit card balances.
 * Positive values represent debt owed.
 */
export function sumCreditCardBalances(accounts: AccountBalance[]): number {
  return accounts
    .filter((account) => account.isEnabled && isCreditCardAccount(account.accountType))
    .reduce((sum, account) => {
      // CC balances are typically positive when you owe money
      // Some systems store them as negative (money owed to you)
      // We want the absolute debt amount
      return sum + Math.abs(account.balance);
    }, 0);
}

/**
 * Calculate unspent expense budgets.
 *
 * Uses the `remaining` field which includes rollover balances:
 *   remaining = previousMonthRollover + budgeted - spent
 *
 * For each expense category: max(0, remaining)
 *
 * This ensures:
 * - Positive remaining: commits the full amount (including rollover)
 * - Zero or negative: commits nothing (spent >= available)
 */
export function sumUnspentExpenseBudgets(categories: CategoryBudget[]): number {
  return categories
    .filter((category) => category.isExpense)
    .reduce((sum, category) => {
      // Use remaining which includes rollover balance
      const unspent = Math.max(0, category.remaining);
      return sum + unspent;
    }, 0);
}

/**
 * Calculate expected income not yet received.
 */
export function calculateExpectedIncome(plannedIncome: number, actualIncome: number): number {
  return Math.max(0, plannedIncome - actualIncome);
}

/**
 * Get cash accounts as line items for detailed breakdown.
 */
export function getCashAccountsDetail(accounts: AccountBalance[]): BreakdownLineItem[] {
  return (
    accounts
      .filter((account) => account.isEnabled && isCashAccount(account.accountType))
      .map((account) => ({
        id: account.id,
        name: decodeHtmlEntities(account.name),
        amount: account.balance,
      }))
      // Filter out amounts that would round to $0
      .filter((item) => Math.round(item.amount) !== 0)
      .sort((a, b) => b.amount - a.amount)
  );
}

/**
 * Get credit card accounts as line items for detailed breakdown.
 */
export function getCreditCardsDetail(accounts: AccountBalance[]): BreakdownLineItem[] {
  return (
    accounts
      .filter((account) => account.isEnabled && isCreditCardAccount(account.accountType))
      .map((account) => ({
        id: account.id,
        name: decodeHtmlEntities(account.name),
        amount: Math.abs(account.balance),
      }))
      // Filter out amounts that would round to $0
      .filter((item) => Math.round(item.amount) !== 0)
      .sort((a, b) => b.amount - a.amount)
  );
}

/**
 * Get unspent category budgets as line items for detailed breakdown.
 * Uses `remaining` which includes rollover balances.
 */
export function getUnspentCategoriesDetail(categories: CategoryBudget[]): BreakdownLineItem[] {
  return (
    categories
      .filter((category) => category.isExpense)
      .map((category) => ({
        id: category.id,
        name: decodeHtmlEntities(category.name),
        // Use remaining which includes rollover balance
        amount: Math.max(0, category.remaining),
      }))
      // Filter out amounts that would round to $0 (since we display whole dollars)
      .filter((item) => Math.round(item.amount) > 0)
      .sort((a, b) => b.amount - a.amount)
  );
}

/**
 * Calculate Available to Stash.
 *
 * This is the main calculation function that determines how much money
 * a user can safely allocate to Stash items.
 *
 * @param data - Raw data from Monarch/backend
 * @param options - Calculation options (e.g., include expected income)
 * @returns The available amount and a breakdown of components
 */
export function calculateAvailableToStash(
  data: AvailableToStashData,
  options: AvailableToStashOptions = { includeExpectedIncome: false }
): AvailableToStashResult {
  // Get detailed breakdowns
  const cashAccountsDetail = getCashAccountsDetail(data.accounts);
  const creditCardsDetail = getCreditCardsDetail(data.accounts);
  const unspentCategoriesDetail = getUnspentCategoriesDetail(data.categoryBudgets);
  const goalsDetail: BreakdownLineItem[] = data.goals
    .filter((goal) => goal.balance > 0)
    .map((goal) => ({
      id: goal.id,
      name: decodeHtmlEntities(goal.name),
      amount: goal.balance,
    }))
    .sort((a, b) => b.amount - a.amount);
  const stashItemsDetail: BreakdownLineItem[] = (data.stashItems ?? [])
    .filter((item) => item.balance > 0)
    .map((item) => ({
      id: item.id,
      name: decodeHtmlEntities(item.name),
      amount: item.balance,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate totals from detailed items
  const cashOnHand = cashAccountsDetail.reduce((sum, item) => sum + item.amount, 0);
  const expectedIncome = options.includeExpectedIncome
    ? calculateExpectedIncome(data.plannedIncome, data.actualIncome)
    : 0;
  const creditCardDebt = creditCardsDetail.reduce((sum, item) => sum + item.amount, 0);
  const unspentBudgets = unspentCategoriesDetail.reduce((sum, item) => sum + item.amount, 0);
  const goalBalances = goalsDetail.reduce((sum, item) => sum + item.amount, 0);
  const stashBalances = stashItemsDetail.reduce((sum, item) => sum + item.amount, 0);

  // Apply the formula
  const available =
    cashOnHand + expectedIncome - creditCardDebt - unspentBudgets - goalBalances - stashBalances;

  // Build detailed breakdown
  const detailedBreakdown: DetailedBreakdown = {
    cashAccounts: cashAccountsDetail,
    creditCards: creditCardsDetail,
    unspentCategories: unspentCategoriesDetail,
    goals: goalsDetail,
    stashItems: stashItemsDetail,
  };

  return {
    available,
    breakdown: {
      cashOnHand,
      expectedIncome,
      creditCardDebt,
      unspentBudgets,
      goalBalances,
      stashBalances,
    },
    detailedBreakdown,
    includesExpectedIncome: options.includeExpectedIncome,
  };
}

/**
 * Format the available amount for display.
 * Shows as currency with appropriate sign.
 */
export function formatAvailableAmount(amount: number): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (amount < 0) {
    // Show negative amounts clearly
    return `-${formatter.format(Math.abs(amount))}`;
  }
  return formatter.format(amount);
}

/**
 * Get a human-readable status based on the available amount.
 */
export function getAvailableStatus(amount: number): 'healthy' | 'low' | 'zero' | 'negative' {
  if (amount < 0) return 'negative';
  if (amount === 0) return 'zero';
  if (amount < 100) return 'low';
  return 'healthy';
}

/**
 * Get a color for the available amount status.
 */
export function getAvailableStatusColor(status: ReturnType<typeof getAvailableStatus>): string {
  switch (status) {
    case 'healthy':
      return 'var(--monarch-green)';
    case 'low':
      return 'var(--monarch-warning)';
    case 'zero':
      return 'var(--monarch-text-muted)';
    case 'negative':
      return 'var(--monarch-red)';
  }
}
