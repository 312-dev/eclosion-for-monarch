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
 * Note: Left to Budget is NOT subtracted because it's a budgeting concept
 * (budgeted income - budgeted expenses), not actual cash. It's shown
 * separately in the UI as additional budget capacity.
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
 *
 * @param accounts - All account balances
 * @param selectedAccountIds - Specific account IDs to include, or null for all
 */
export function sumCashAccounts(
  accounts: AccountBalance[],
  selectedAccountIds: string[] | null = null
): number {
  return accounts
    .filter((account) => {
      if (!account.isEnabled || !isCashAccount(account.accountType)) {
        return false;
      }

      // If no specific selection (null), include all cash accounts
      if (selectedAccountIds === null) {
        return true;
      }

      // If specific accounts selected, check if this account is in the list
      return selectedAccountIds.includes(account.id);
    })
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
 *
 * @param accounts - All account balances
 * @param selectedAccountIds - Specific account IDs to include, or null for all
 */
export function getCashAccountsDetail(
  accounts: AccountBalance[],
  selectedAccountIds: string[] | null = null
): BreakdownLineItem[] {
  return (
    accounts
      .filter((account) => {
        if (!account.isEnabled || !isCashAccount(account.accountType)) {
          return false;
        }

        // If no specific selection, include all
        if (selectedAccountIds === null) {
          return true;
        }

        // Check if account is in selected list
        return selectedAccountIds.includes(account.id);
      })
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
  // Get detailed breakdowns with account filtering
  const selectedAccountIds = options.selectedCashAccountIds ?? null;
  const cashAccountsDetail = getCashAccountsDetail(data.accounts, selectedAccountIds);
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
  const bufferAmount = options.bufferAmount ?? 0;
  const leftToBudget = data.leftToBudget ?? 0;

  // Apply the formula and round to whole dollars for consistency
  // Note: Left to Budget is NOT subtracted - it's a budgeting concept (budgeted income
  // minus budgeted expenses), not actual cash. It's shown separately in the UI.
  const available = Math.round(
    cashOnHand +
      expectedIncome -
      creditCardDebt -
      unspentBudgets -
      goalBalances -
      stashBalances -
      bufferAmount
  );

  // Calculate total budgeted for LTB breakdown
  // Monarch's actual formula: LTB = Budgeted Income - Budgeted Categories - Planned Savings
  const totalBudgeted = data.categoryBudgets.reduce((sum, cat) => sum + cat.budgeted, 0);

  // Calculate the "savings & other" amount that Monarch includes but we don't have directly
  // This is derived from: plannedIncome - budgetedCategories - leftToBudget = savingsAndOther
  const savingsAndOther = data.plannedIncome - totalBudgeted - leftToBudget;

  // Build LTB breakdown showing all components
  const leftToBudgetDetail: BreakdownLineItem[] = [
    { id: 'ltb-income', name: 'Budgeted income', amount: data.plannedIncome },
    { id: 'ltb-budgeted', name: 'Budgeted categories', amount: totalBudgeted },
  ];

  // Only add savings line if there's a meaningful amount (rounds to at least $1)
  if (Math.abs(Math.round(savingsAndOther)) >= 1) {
    leftToBudgetDetail.push({
      id: 'ltb-savings',
      name: 'Savings & other',
      amount: savingsAndOther,
    });
  }

  // Build detailed breakdown
  const detailedBreakdown: DetailedBreakdown = {
    cashAccounts: cashAccountsDetail,
    creditCards: creditCardsDetail,
    unspentCategories: unspentCategoriesDetail,
    goals: goalsDetail,
    stashItems: stashItemsDetail,
    leftToBudgetDetail,
  };

  return {
    available,
    breakdown: {
      cashOnHand: Math.round(cashOnHand),
      expectedIncome: Math.round(expectedIncome),
      creditCardDebt: Math.round(creditCardDebt),
      unspentBudgets: Math.round(unspentBudgets),
      goalBalances: Math.round(goalBalances),
      stashBalances: Math.round(stashBalances),
      bufferAmount: Math.round(bufferAmount),
      leftToBudget: Math.round(leftToBudget),
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
  // Round to whole dollars first to avoid floating-point display issues
  const rounded = Math.round(amount);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  if (rounded < 0) {
    // Show negative amounts clearly
    return `-${formatter.format(Math.abs(rounded))}`;
  }
  return formatter.format(rounded);
}

/**
 * Get a human-readable status based on the available amount.
 */
export function getAvailableStatus(amount: number): 'healthy' | 'low' | 'zero' | 'negative' {
  // Round to whole dollars for consistent threshold checks
  const rounded = Math.round(amount);
  if (rounded < 0) return 'negative';
  if (rounded === 0) return 'zero';
  if (rounded < 100) return 'low';
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
