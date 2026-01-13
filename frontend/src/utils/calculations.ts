/**
 * Calculation Utilities
 *
 * Shared calculation functions that must match backend Python implementations.
 * These are used by both demo mode and potentially other frontend code.
 *
 * IMPORTANT: These functions mirror backend logic. If the Python implementation
 * changes, these must be updated to match. See parity tests in calculations.test.ts.
 */

/**
 * Calculate the frozen monthly target for a recurring item.
 *
 * This mirrors the logic from services/frozen_target_calculator.py `_calculate_target`.
 *
 * The frozen target is the amount a user needs to save each month to reach their
 * goal by the due date. It's "frozen" because it's calculated at the start of
 * each month and doesn't change mid-month.
 *
 * For monthly items (frequency <= 1 month):
 *   - Target is the shortfall: what's still needed to cover this month's expense
 *   - Example: $80 rent, $50 saved → target is $30
 *
 * For infrequent items (quarterly, yearly, etc.):
 *   - Target is the shortfall spread across remaining months
 *   - Example: $600 yearly insurance, $300 saved, 6 months left → $50/month
 *   - If already fully funded, target is $0
 *
 * @param amount - Total expense amount
 * @param frequencyMonths - How many months between charges (1 = monthly, 12 = yearly)
 * @param monthsUntilDue - Months remaining until next payment
 * @param currentBalance - Current saved balance
 * @returns The monthly target amount (always rounded up to nearest dollar)
 */
export function calculateFrozenTarget(
  amount: number,
  frequencyMonths: number,
  monthsUntilDue: number,
  currentBalance: number
): number {
  if (frequencyMonths <= 1) {
    // Monthly items: target is the shortfall (what's still needed)
    return Math.ceil(Math.max(0, amount - currentBalance));
  } else {
    // Infrequent subscriptions - calculate catch-up rate
    const shortfall = Math.max(0, amount - currentBalance);
    const monthsRemaining = Math.max(1, monthsUntilDue);
    if (shortfall > 0) {
      return Math.ceil(shortfall / monthsRemaining);
    }
    return 0;
  }
}
