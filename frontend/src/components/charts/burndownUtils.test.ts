/**
 * Burndown Chart Utility Tests
 *
 * Tests verify that the burndown chart correctly:
 * - Includes rollup items in calculations (even though is_enabled = false)
 * - Calculates stable monthly rate from all tracked items (dedicated + rollup)
 * - Shows beginning-of-month amounts (what you need to budget IN that month)
 * - Sheds catch-up amounts for the NEXT month after items complete
 * - Determines stabilization date as the first month at stable rate (month AFTER last catch-up)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateBurndownData } from './burndownUtils';
import type { RecurringItem } from '../../types';

// Helper to create a minimal RecurringItem
function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'item-1',
    merchant_id: null,
    logo_url: null,
    is_stale: false,
    name: 'Test Item',
    category_name: 'Test Category',
    category_id: null,
    category_group_name: null,
    category_missing: false,
    amount: 600,
    frequency: 'yearly',
    frequency_months: 12,
    next_due_date: '2026-06-01',
    months_until_due: 5,
    current_balance: 300,
    planned_budget: 50,
    monthly_contribution: 50,
    over_contribution: 0,
    progress_percent: 50,
    status: 'on_track',
    is_enabled: true,
    ideal_monthly_rate: 50,
    amount_needed_now: 300,
    frozen_monthly_target: 60, // Has $10 catch-up
    contributed_this_month: 0,
    monthly_progress_percent: 0,
    ...overrides,
  };
}

describe('calculateBurndownData', () => {
  beforeEach(() => {
    // Mock date to January 2026 for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rollup item inclusion', () => {
    it('includes rollup items in stable rate calculation', () => {
      const dedicatedItem = createItem({
        id: 'dedicated-1',
        name: 'Dedicated Item',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 100,
        ideal_monthly_rate: 80,
        next_due_date: '2026-03-01',
      });

      const rollupItem = createItem({
        id: 'rollup-1',
        name: 'Rollup Item',
        is_enabled: false, // Rollup items have is_enabled = false
        is_in_rollup: true,
        frozen_monthly_target: 50,
        ideal_monthly_rate: 40,
        next_due_date: '2026-04-01',
      });

      const result = calculateBurndownData([dedicatedItem, rollupItem], 150);

      // Stable rate should include both: 80 + 40 = 120
      expect(result.stabilization.stableMonthlyRate).toBe(120);
    });

    it('includes rollup items in catch-up detection', () => {
      const dedicatedItem = createItem({
        id: 'dedicated-1',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 80, // No catch-up (frozen = ideal)
        ideal_monthly_rate: 80,
        next_due_date: '2026-02-01', // First of month - tests timezone handling
      });

      const rollupItem = createItem({
        id: 'rollup-1',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 60, // Has catch-up (frozen > ideal)
        ideal_monthly_rate: 40,
        next_due_date: '2026-05-01', // First of month - tests timezone handling
      });

      const result = calculateBurndownData([dedicatedItem, rollupItem], 140);

      // Should detect catch-up from rollup item
      expect(result.stabilization.hasCatchUp).toBe(true);
      // Stabilization should be June 2026 (month AFTER rollup item completes in May)
      // This is when you first reach stable rate at the START of a month
      expect(result.stabilization.stabilizationDate).toBe("Jun '26");
      expect(result.stabilization.monthsUntilStable).toBe(5);
    });

    it('processes rollup items in burndown points', () => {
      const rollupItem = createItem({
        id: 'rollup-1',
        name: 'The Bays',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 50,
        ideal_monthly_rate: 40,
        next_due_date: '2026-03-01', // First of month - tests timezone handling
      });

      const result = calculateBurndownData([rollupItem], 50);

      // Should have points including the month The Bays completes
      const marchPoint = result.points.find((p) => p.month === 'Mar');
      expect(marchPoint).toBeDefined();
      expect(marchPoint?.completingItems).toContain('The Bays');
    });
  });

  describe('dedicated vs rollup separation', () => {
    it('separates rollup amounts in burndown points', () => {
      const dedicatedItem = createItem({
        id: 'dedicated-1',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 100,
        ideal_monthly_rate: 80,
        next_due_date: '2026-06-01',
      });

      const rollupItem = createItem({
        id: 'rollup-1',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 50,
        ideal_monthly_rate: 40,
        next_due_date: '2026-03-01',
      });

      const result = calculateBurndownData([dedicatedItem, rollupItem], 150);

      // First point (Jan) should have full rollup frozen target
      expect(result.points[0]?.rollupAmount).toBe(50);

      // March shows beginning-of-month (BEFORE the March bill hits), so still 50
      const marchPoint = result.points.find((p) => p.month === 'Mar');
      expect(marchPoint?.rollupAmount).toBe(50);

      // April shows beginning-of-month (AFTER March bill completed), now at ideal rate
      const aprilPoint = result.points.find((p) => p.month === 'Apr');
      expect(aprilPoint?.rollupAmount).toBe(40);
    });
  });

  describe('edge cases', () => {
    it('handles only rollup items (no dedicated)', () => {
      const rollupItem1 = createItem({
        id: 'rollup-1',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 50,
        ideal_monthly_rate: 40,
        next_due_date: '2026-03-01',
      });

      const rollupItem2 = createItem({
        id: 'rollup-2',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 30,
        ideal_monthly_rate: 25,
        next_due_date: '2026-04-01',
      });

      const result = calculateBurndownData([rollupItem1, rollupItem2], 80);

      // Should include both rollup items
      expect(result.stabilization.stableMonthlyRate).toBe(65); // 40 + 25
      expect(result.stabilization.hasCatchUp).toBe(true);
    });

    it('handles only dedicated items (no rollup)', () => {
      const dedicatedItem = createItem({
        id: 'dedicated-1',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 100,
        ideal_monthly_rate: 80,
        next_due_date: '2026-03-01',
      });

      const result = calculateBurndownData([dedicatedItem], 100);

      expect(result.stabilization.stableMonthlyRate).toBe(80);
      expect(result.stabilization.hasCatchUp).toBe(true);
    });

    it('returns no catch-up when all items are at ideal rate', () => {
      const item1 = createItem({
        id: 'item-1',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 80, // Equal to ideal
        ideal_monthly_rate: 80,
        next_due_date: '2026-03-01',
      });

      const item2 = createItem({
        id: 'item-2',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 40, // Equal to ideal
        ideal_monthly_rate: 40,
        next_due_date: '2026-04-01',
      });

      const result = calculateBurndownData([item1, item2], 120);

      expect(result.stabilization.hasCatchUp).toBe(false);
      expect(result.stabilization.monthsUntilStable).toBe(0);
      expect(result.points).toHaveLength(0);
    });

    it('excludes disabled items that are not in rollup', () => {
      const enabledItem = createItem({
        id: 'enabled-1',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 100,
        ideal_monthly_rate: 80,
        next_due_date: '2026-03-01', // First of month - tests timezone handling
      });

      const disabledItem = createItem({
        id: 'disabled-1',
        is_enabled: false,
        is_in_rollup: false, // Disabled AND not in rollup = untracked
        frozen_monthly_target: 50,
        ideal_monthly_rate: 40,
        next_due_date: '2026-04-01',
      });

      const result = calculateBurndownData([enabledItem, disabledItem], 150);

      // Stable rate should only include enabled item
      expect(result.stabilization.stableMonthlyRate).toBe(80);
      // Disabled item should not affect stabilization date
      // Stabilization is April (month AFTER March when enabled item completes)
      expect(result.stabilization.stabilizationDate).toBe("Apr '26");
    });

    it('handles empty items array', () => {
      const result = calculateBurndownData([], 0);

      expect(result.stabilization.stableMonthlyRate).toBe(0);
      expect(result.stabilization.hasCatchUp).toBe(false);
      expect(result.points).toHaveLength(0);
    });
  });

  describe('stabilization date calculation', () => {
    it('uses latest due date among all catch-up items', () => {
      const earlyItem = createItem({
        id: 'early',
        is_enabled: true,
        is_in_rollup: false,
        frozen_monthly_target: 100,
        ideal_monthly_rate: 80,
        next_due_date: '2026-02-01', // First of month - tests timezone handling
      });

      const lateRollupItem = createItem({
        id: 'late-rollup',
        is_enabled: false,
        is_in_rollup: true,
        frozen_monthly_target: 50,
        ideal_monthly_rate: 40,
        next_due_date: '2026-11-01', // First of month - tests timezone handling
      });

      const result = calculateBurndownData([earlyItem, lateRollupItem], 150);

      // Stabilization should be December (month AFTER November when last catch-up completes)
      // This is when you first reach stable rate at the START of a month
      expect(result.stabilization.stabilizationDate).toBe("Dec '26");
      expect(result.stabilization.monthsUntilStable).toBe(11);
    });
  });
});
