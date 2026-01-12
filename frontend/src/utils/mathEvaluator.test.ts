import { describe, it, expect } from 'vitest';
import { evaluateMathExpression } from './mathEvaluator';

describe('evaluateMathExpression', () => {
  describe('basic operations', () => {
    it('evaluates addition', () => {
      expect(evaluateMathExpression('2+3')).toBe(5);
      expect(evaluateMathExpression('100 + 50')).toBe(150);
    });

    it('evaluates subtraction', () => {
      expect(evaluateMathExpression('10-3')).toBe(7);
      expect(evaluateMathExpression('100 - 50')).toBe(50);
    });

    it('evaluates multiplication', () => {
      expect(evaluateMathExpression('4*5')).toBe(20);
      expect(evaluateMathExpression('12 * 3')).toBe(36);
    });

    it('evaluates multiplication with x (markdown-friendly)', () => {
      expect(evaluateMathExpression('4x5')).toBe(20);
      expect(evaluateMathExpression('85x2')).toBe(170);
      expect(evaluateMathExpression('12 x 3')).toBe(36);
      expect(evaluateMathExpression('10X5')).toBe(50); // uppercase X
    });

    it('evaluates division', () => {
      expect(evaluateMathExpression('20/4')).toBe(5);
      expect(evaluateMathExpression('100 / 5')).toBe(20);
    });
  });

  describe('order of operations', () => {
    it('respects multiplication over addition', () => {
      expect(evaluateMathExpression('2+3*4')).toBe(14);
      expect(evaluateMathExpression('10+2*5')).toBe(20);
    });

    it('respects division over subtraction', () => {
      expect(evaluateMathExpression('10-6/2')).toBe(7);
    });

    it('evaluates left to right for same precedence', () => {
      expect(evaluateMathExpression('10-5-2')).toBe(3);
      expect(evaluateMathExpression('20/4/2')).toBe(2.5);
    });
  });

  describe('parentheses', () => {
    it('respects parentheses for grouping', () => {
      expect(evaluateMathExpression('(2+3)*4')).toBe(20);
      expect(evaluateMathExpression('(10+2)*5')).toBe(60);
    });

    it('handles nested parentheses', () => {
      expect(evaluateMathExpression('((2+3)*4)+1')).toBe(21);
      expect(evaluateMathExpression('(2*(3+4))')).toBe(14);
    });

    it('handles multiple parenthetical groups', () => {
      expect(evaluateMathExpression('(2+3)*(4+1)')).toBe(25);
    });
  });

  describe('decimal numbers', () => {
    it('evaluates decimal numbers', () => {
      expect(evaluateMathExpression('1.5+2.5')).toBe(4);
      expect(evaluateMathExpression('10.5*2')).toBe(21);
    });

    it('handles decimal results', () => {
      expect(evaluateMathExpression('5/2')).toBe(2.5);
      expect(evaluateMathExpression('1/3')).toBeCloseTo(0.333333, 5);
    });
  });

  describe('negative numbers', () => {
    it('handles negative numbers at the start', () => {
      expect(evaluateMathExpression('-5+10')).toBe(5);
      expect(evaluateMathExpression('-3*4')).toBe(-12);
    });

    it('handles negative numbers in parentheses', () => {
      expect(evaluateMathExpression('(-5)+10')).toBe(5);
      expect(evaluateMathExpression('10*(-2)')).toBe(-20);
    });

    it('handles double negatives', () => {
      expect(evaluateMathExpression('--5')).toBe(5);
    });
  });

  describe('whitespace handling', () => {
    it('ignores whitespace', () => {
      expect(evaluateMathExpression('  2 + 3  ')).toBe(5);
      expect(evaluateMathExpression('10   *   5')).toBe(50);
    });
  });

  describe('invalid input', () => {
    it('returns null for empty string', () => {
      expect(evaluateMathExpression('')).toBe(null);
    });

    it('returns null for whitespace only', () => {
      expect(evaluateMathExpression('   ')).toBe(null);
    });

    it('returns null for invalid characters', () => {
      expect(evaluateMathExpression('abc')).toBe(null);
      expect(evaluateMathExpression('2+a')).toBe(null);
      expect(evaluateMathExpression('sin(45)')).toBe(null);
    });

    it('returns null for unmatched parentheses', () => {
      expect(evaluateMathExpression('(2+3')).toBe(null);
      expect(evaluateMathExpression('2+3)')).toBe(null);
      expect(evaluateMathExpression('((2+3)')).toBe(null);
    });

    it('returns null for division by zero', () => {
      expect(evaluateMathExpression('5/0')).toBe(null);
      expect(evaluateMathExpression('10/(5-5)')).toBe(null);
    });

    it('returns null for multiple decimals in a number', () => {
      expect(evaluateMathExpression('1.2.3')).toBe(null);
    });

    it('returns null for incomplete expressions', () => {
      expect(evaluateMathExpression('2+')).toBe(null);
      expect(evaluateMathExpression('*5')).toBe(null);
      expect(evaluateMathExpression('2+*3')).toBe(null);
    });

    it('returns null for just operators', () => {
      expect(evaluateMathExpression('+')).toBe(null);
      expect(evaluateMathExpression('+-*/')).toBe(null);
    });
  });

  describe('complex expressions', () => {
    it('evaluates complex expressions correctly', () => {
      expect(evaluateMathExpression('(12*3)/2')).toBe(18);
      expect(evaluateMathExpression('100+50*2-25')).toBe(175);
      expect(evaluateMathExpression('(100+50)*(2-1)')).toBe(150);
    });

    it('handles the examples from the docstring', () => {
      expect(evaluateMathExpression('100+50')).toBe(150);
      expect(evaluateMathExpression('(12*3)/2')).toBe(18);
    });
  });
});
