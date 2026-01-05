/**
 * Tests for useItemDisplayStatus hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useItemDisplayStatus, calculateItemDisplayStatus } from './useItemDisplayStatus';
import type { RecurringItem } from '../types';

// Helper to create a minimal recurring item with required fields
function createItem(overrides: Partial<RecurringItem> = {}): RecurringItem {
  return {
    id: 'test-id',
    name: 'Test Item',
    status: 'pending',
    is_enabled: true,
    frozen_monthly_target: 100,
    planned_budget: 100,
    current_balance: 0,
    amount: 100,
    amount_needed_now: 100,
    progress_percent: 0,
    next_due_date: '2024-01-15',
    category_id: 'cat-1',
    category_name: 'Test Category',
    group_id: 'group-1',
    group_name: 'Test Group',
    emoji: '💰',
    ...overrides,
  } as RecurringItem;
}

describe('calculateItemDisplayStatus', () => {
  describe('when item is enabled with frozen_monthly_target > 0', () => {
    it('returns "ahead" when budgeted more than target', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 150,
      });

      expect(calculateItemDisplayStatus(item)).toBe('ahead');
    });

    it('returns "funded" when budgeted equals target and balance covers amount', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: 100,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns "on_track" when budgeted equals target but balance does not cover amount', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: 50,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('on_track');
    });

    it('returns "behind" when budgeted less than target', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 50,
      });

      expect(calculateItemDisplayStatus(item)).toBe('behind');
    });

    it('uses ceiling for target and budget comparisons', () => {
      const item = createItem({
        frozen_monthly_target: 99.1, // ceil = 100
        planned_budget: 99.5, // ceil = 100
        current_balance: 100,
        amount: 100,
      });

      // budgetRounded (100) >= targetRounded (100) and balance >= amount
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });
  });

  describe('when item is enabled without frozen_monthly_target', () => {
    it('returns "funded" when balance covers amount', () => {
      const item = createItem({
        frozen_monthly_target: 0,
        current_balance: 100,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('returns original status when balance does not cover amount', () => {
      const item = createItem({
        frozen_monthly_target: 0,
        current_balance: 50,
        amount: 100,
        status: 'pending',
      });

      expect(calculateItemDisplayStatus(item)).toBe('pending');
    });
  });

  describe('when item is disabled', () => {
    it('returns original status regardless of budget', () => {
      const item = createItem({
        is_enabled: false,
        frozen_monthly_target: 100,
        planned_budget: 150,
        status: 'pending',
      });

      expect(calculateItemDisplayStatus(item)).toBe('pending');
    });
  });

  describe('edge cases', () => {
    it('handles zero amount', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: 0,
        amount: 0,
      });

      // balance (0) >= amount (0) so should be funded
      expect(calculateItemDisplayStatus(item)).toBe('funded');
    });

    it('handles negative balance', () => {
      const item = createItem({
        frozen_monthly_target: 100,
        planned_budget: 100,
        current_balance: -50,
        amount: 100,
      });

      expect(calculateItemDisplayStatus(item)).toBe('on_track');
    });
  });
});

describe('useItemDisplayStatus hook', () => {
  it('returns calculated status', () => {
    const item = createItem({
      frozen_monthly_target: 100,
      planned_budget: 150,
    });

    const { result } = renderHook(() => useItemDisplayStatus(item));

    expect(result.current).toBe('ahead');
  });

  it('updates when item changes', () => {
    const item1 = createItem({
      frozen_monthly_target: 100,
      planned_budget: 150,
    });

    const { result, rerender } = renderHook(({ item }) => useItemDisplayStatus(item), {
      initialProps: { item: item1 },
    });

    expect(result.current).toBe('ahead');

    const item2 = createItem({
      frozen_monthly_target: 100,
      planned_budget: 50,
    });

    rerender({ item: item2 });

    expect(result.current).toBe('behind');
  });

  it('memoizes result for same item values', () => {
    const item = createItem({
      frozen_monthly_target: 100,
      planned_budget: 100,
    });

    const { result, rerender } = renderHook(({ item }) => useItemDisplayStatus(item), {
      initialProps: { item },
    });

    const firstResult = result.current;

    // Rerender with same values (different object reference)
    const sameItem = createItem({
      frozen_monthly_target: 100,
      planned_budget: 100,
    });

    rerender({ item: sameItem });

    // Due to useMemo with value dependencies, result should be equivalent
    expect(result.current).toBe(firstResult);
  });
});
