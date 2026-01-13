import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatFrequency,
  formatPercent,
  spacifyEmoji,
  FREQUENCY_LABELS,
} from './formatters';

describe('formatCurrency', () => {
  it('formats positive amounts correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative amounts correctly', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('respects custom fraction digits', () => {
    expect(formatCurrency(1234.5, { maximumFractionDigits: 0 })).toBe('$1,235');
  });

  it('formats small amounts correctly', () => {
    expect(formatCurrency(0.99)).toBe('$0.99');
  });
});

describe('formatFrequency', () => {
  it('formats monthly frequency', () => {
    expect(formatFrequency('monthly')).toBe(FREQUENCY_LABELS['monthly']);
  });

  it('formats yearly frequency', () => {
    expect(formatFrequency('yearly')).toBe(FREQUENCY_LABELS['yearly']);
  });

  it('returns original value for unknown frequencies', () => {
    expect(formatFrequency('custom_freq')).toBe('custom_freq');
  });
});

describe('formatPercent', () => {
  it('formats percentage values', () => {
    expect(formatPercent(75)).toBe('75%');
  });

  it('formats decimal values when isDecimal is true', () => {
    expect(formatPercent(0.75, true)).toBe('75%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('handles 100%', () => {
    expect(formatPercent(100)).toBe('100%');
  });
});

describe('spacifyEmoji', () => {
  it('adds space after emoji when missing', () => {
    expect(spacifyEmoji('🙏Dining Out')).toBe('🙏 Dining Out');
  });

  it('preserves existing space after emoji', () => {
    expect(spacifyEmoji('🙏 Dining Out')).toBe('🙏 Dining Out');
  });

  it('returns string unchanged if no leading emoji', () => {
    expect(spacifyEmoji('Dining Out')).toBe('Dining Out');
  });

  it('handles emoji-only strings', () => {
    expect(spacifyEmoji('🙏')).toBe('🙏');
  });

  it('handles empty string', () => {
    expect(spacifyEmoji('')).toBe('');
  });

  it('handles compound emoji with ZWJ', () => {
    expect(spacifyEmoji('👨‍👩‍👧Family')).toBe('👨‍👩‍👧 Family');
  });

  it('handles emoji with variation selector', () => {
    expect(spacifyEmoji('❤️Love')).toBe('❤️ Love');
  });
});
