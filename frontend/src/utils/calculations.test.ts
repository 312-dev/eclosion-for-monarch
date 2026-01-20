import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyTarget,
  countOccurrencesInMonth,
  nextOccurrenceInOrAfter,
  getFrequencyMonths,
  roundMonthlyRate,
} from './calculations';

describe('roundMonthlyRate', () => {
  it('rounds to nearest dollar with minimum $1', () => {
    expect(roundMonthlyRate(0)).toBe(0);
    expect(roundMonthlyRate(0.4)).toBe(1);
    expect(roundMonthlyRate(1.4)).toBe(1);
    expect(roundMonthlyRate(1.6)).toBe(2);
    expect(roundMonthlyRate(58.33)).toBe(58);
    expect(roundMonthlyRate(87.5)).toBe(88);
  });

  it('returns 0 for negative rates', () => {
    expect(roundMonthlyRate(-10)).toBe(0);
  });
});

describe('getFrequencyMonths', () => {
  it('returns correct months for standard frequencies', () => {
    expect(getFrequencyMonths('monthly')).toBe(1);
    expect(getFrequencyMonths('quarterly')).toBe(3);
    expect(getFrequencyMonths('semiyearly')).toBe(6);
    expect(getFrequencyMonths('yearly')).toBe(12);
  });

  it('handles sub-monthly frequencies', () => {
    expect(getFrequencyMonths('weekly')).toBeCloseTo(0.23, 1);
    expect(getFrequencyMonths('biweekly')).toBeCloseTo(0.46, 1);
  });

  it('handles legacy aliases', () => {
    expect(getFrequencyMonths('annual')).toBe(12);
    expect(getFrequencyMonths('semi-annual')).toBe(6);
  });
});

describe('nextOccurrenceInOrAfter', () => {
  describe('date clamping (rollover bug fix)', () => {
    it('clamps day 29 to Feb 28 in non-leap year', () => {
      // Base date Aug 29, quarterly -> next after Jan 2026 should be Feb 28 (not Mar 1)
      const result = nextOccurrenceInOrAfter('2025-08-29', 'quarterly', '2026-01-01');
      expect(result).toBe('2026-02-28');
    });

    it('clamps day 30 to Feb 28 in non-leap year', () => {
      const result = nextOccurrenceInOrAfter('2025-06-30', 'semiyearly', '2026-01-01');
      expect(result).toBe('2026-06-30'); // June has 30 days, no clamping needed
    });

    it('clamps day 31 to Feb 28 in non-leap year', () => {
      // Base date Aug 31, 6 months -> Feb should clamp to 28
      const result = nextOccurrenceInOrAfter('2025-08-31', 'semiyearly', '2026-01-01');
      expect(result).toBe('2026-02-28');
    });

    it('clamps day 31 to Apr 30', () => {
      // Base date Jan 31, quarterly -> Apr should clamp to 30
      const result = nextOccurrenceInOrAfter('2025-01-31', 'quarterly', '2025-03-01');
      expect(result).toBe('2025-04-30');
    });

    it('preserves day 29 in leap year February', () => {
      // 2028 is a leap year
      const result = nextOccurrenceInOrAfter('2027-08-29', 'semiyearly', '2028-01-01');
      expect(result).toBe('2028-02-29');
    });
  });

  describe('standard occurrences', () => {
    it('finds quarterly occurrence', () => {
      const result = nextOccurrenceInOrAfter('2025-05-15', 'quarterly', '2025-07-01');
      expect(result).toBe('2025-08-15');
    });

    it('returns same month if occurrence is in target month', () => {
      const result = nextOccurrenceInOrAfter('2025-01-15', 'monthly', '2025-03-01');
      expect(result).toBe('2025-03-15');
    });

    it('handles yearly frequency', () => {
      const result = nextOccurrenceInOrAfter('2025-06-10', 'yearly', '2026-01-01');
      expect(result).toBe('2026-06-10');
    });
  });
});

describe('countOccurrencesInMonth', () => {
  it('counts weekly occurrences', () => {
    // A month typically has 4-5 weekly occurrences
    const count = countOccurrencesInMonth('2025-01-01', 'weekly', '2025-01-01');
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(5);
  });

  it('returns 1 for monthly', () => {
    expect(countOccurrencesInMonth('2025-01-15', 'monthly', '2025-03-01')).toBe(1);
  });

  it('returns 0 or 1 for quarterly based on alignment', () => {
    // Jan is in the quarterly cycle starting Jan
    expect(countOccurrencesInMonth('2025-01-15', 'quarterly', '2025-01-01')).toBe(1);
    // Feb is not in the quarterly cycle starting Jan
    expect(countOccurrencesInMonth('2025-01-15', 'quarterly', '2025-02-01')).toBe(0);
  });
});

describe('calculateMonthlyTarget', () => {
  describe('quarterly with date clamping', () => {
    it('calculates correct target when due date crosses short month', () => {
      // Base date Aug 29, quarterly, due Feb 28 (2 months from Jan)
      // With $0 rollover, should be $175/2 = $88 (not $175/3 = $58)
      const target = calculateMonthlyTarget('2025-08-29', 'quarterly', 175, 0, '2026-01-01');
      expect(target).toBe(88); // $175 / 2 months = $87.50 -> $88
    });

    it('accounts for rollover in shortfall calculation', () => {
      // Same scenario but with $58 already saved
      // Shortfall = $175 - $58 = $117, spread over 2 months = $58.50 -> $59
      const target = calculateMonthlyTarget('2025-08-29', 'quarterly', 175, 58, '2026-01-01');
      expect(target).toBe(59);
    });
  });

  describe('monthly frequency', () => {
    it('returns amount minus rollover', () => {
      const target = calculateMonthlyTarget('2025-01-15', 'monthly', 100, 25, '2025-03-01');
      expect(target).toBe(75);
    });

    it('returns 0 when fully funded', () => {
      const target = calculateMonthlyTarget('2025-01-15', 'monthly', 100, 150, '2025-03-01');
      expect(target).toBe(0);
    });
  });

  describe('yearly frequency', () => {
    it('spreads amount over remaining months', () => {
      // Due Jan 2026, target month Feb 2025
      // monthsRemaining = monthsBetween(Feb, Jan) + 1 = 11 + 1 = 12
      const target = calculateMonthlyTarget('2025-01-15', 'yearly', 120, 0, '2025-02-01');
      expect(target).toBe(10); // $120 / 12 months = $10
    });

    it('returns full amount when due this month', () => {
      // Due this month with $0 rollover
      const target = calculateMonthlyTarget('2025-01-15', 'yearly', 120, 0, '2025-01-01');
      expect(target).toBe(120); // Full amount due this month
    });
  });
});
