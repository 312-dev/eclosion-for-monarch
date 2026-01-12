import { describe, it, expect } from 'vitest';
import {
  formatMonth,
  formatMonthShort,
  getMonthKey,
  getMonthRange,
  getEffectiveNote,
  getEffectiveGeneralNote,
} from './notesExport';
import type { Note, GeneralMonthNote } from '../types/notes';

describe('formatMonth', () => {
  it('formats month key to full month and year', () => {
    expect(formatMonth('2025-01')).toBe('January 2025');
    expect(formatMonth('2025-12')).toBe('December 2025');
    expect(formatMonth('2024-06')).toBe('June 2024');
  });

  it('handles single digit months', () => {
    expect(formatMonth('2025-1')).toBe('January 2025');
    expect(formatMonth('2025-6')).toBe('June 2025');
  });
});

describe('formatMonthShort', () => {
  it('formats month key to short month and year', () => {
    expect(formatMonthShort('2025-01')).toBe('Jan 2025');
    expect(formatMonthShort('2025-12')).toBe('Dec 2025');
    expect(formatMonthShort('2024-06')).toBe('Jun 2024');
  });
});

describe('getMonthKey', () => {
  it('converts date to month key string', () => {
    expect(getMonthKey(new Date(2025, 0, 15))).toBe('2025-01');
    expect(getMonthKey(new Date(2025, 11, 1))).toBe('2025-12');
    expect(getMonthKey(new Date(2024, 5, 30))).toBe('2024-06');
  });

  it('pads single digit months with zero', () => {
    expect(getMonthKey(new Date(2025, 0, 1))).toBe('2025-01');
    expect(getMonthKey(new Date(2025, 8, 1))).toBe('2025-09');
  });
});

describe('getMonthRange', () => {
  it('returns single month when start equals end', () => {
    const range = getMonthRange('2025-01', '2025-01');
    expect(range).toEqual(['2025-01']);
  });

  it('returns consecutive months within same year', () => {
    const range = getMonthRange('2025-01', '2025-03');
    expect(range).toEqual(['2025-01', '2025-02', '2025-03']);
  });

  it('spans across year boundary', () => {
    const range = getMonthRange('2024-11', '2025-02');
    expect(range).toEqual(['2024-11', '2024-12', '2025-01', '2025-02']);
  });

  it('handles full year range', () => {
    const range = getMonthRange('2025-01', '2025-12');
    expect(range).toHaveLength(12);
    expect(range[0]).toBe('2025-01');
    expect(range[11]).toBe('2025-12');
  });

  it('handles multi-year range', () => {
    const range = getMonthRange('2024-06', '2025-06');
    expect(range).toHaveLength(13);
    expect(range[0]).toBe('2024-06');
    expect(range[12]).toBe('2025-06');
  });
});

describe('getEffectiveNote', () => {
  const createNote = (
    id: string,
    categoryId: string,
    categoryType: 'group' | 'category',
    monthKey: string,
    content: string
  ): Note => ({
    id,
    categoryRef: {
      type: categoryType,
      id: categoryId,
      name: 'Test Category',
    },
    monthKey,
    content,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  });

  it('returns null when no notes exist', () => {
    const result = getEffectiveNote('category', 'cat-1', '2025-03', []);
    expect(result).toBe(null);
  });

  it('returns exact match when note exists for target month', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-1', 'category', '2025-03', 'March note'),
    ];
    const result = getEffectiveNote('category', 'cat-1', '2025-03', notes);

    expect(result).not.toBe(null);
    expect(result?.note.content).toBe('March note');
    expect(result?.sourceMonth).toBe('2025-03');
    expect(result?.isInherited).toBe(false);
  });

  it('returns inherited note from earlier month', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-1', 'category', '2025-01', 'January note'),
    ];
    const result = getEffectiveNote('category', 'cat-1', '2025-03', notes);

    expect(result).not.toBe(null);
    expect(result?.note.content).toBe('January note');
    expect(result?.sourceMonth).toBe('2025-01');
    expect(result?.isInherited).toBe(true);
  });

  it('returns most recent note before target month', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-1', 'category', '2025-01', 'January note'),
      createNote('n2', 'cat-1', 'category', '2025-02', 'February note'),
    ];
    const result = getEffectiveNote('category', 'cat-1', '2025-03', notes);

    expect(result?.note.content).toBe('February note');
    expect(result?.sourceMonth).toBe('2025-02');
    expect(result?.isInherited).toBe(true);
  });

  it('ignores notes from future months', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-1', 'category', '2025-01', 'January note'),
      createNote('n2', 'cat-1', 'category', '2025-05', 'May note'),
    ];
    const result = getEffectiveNote('category', 'cat-1', '2025-03', notes);

    expect(result?.note.content).toBe('January note');
  });

  it('filters by category type', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-1', 'group', '2025-03', 'Group note'),
      createNote('n2', 'cat-1', 'category', '2025-03', 'Category note'),
    ];

    const groupResult = getEffectiveNote('group', 'cat-1', '2025-03', notes);
    expect(groupResult?.note.content).toBe('Group note');

    const catResult = getEffectiveNote('category', 'cat-1', '2025-03', notes);
    expect(catResult?.note.content).toBe('Category note');
  });

  it('filters by category id', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-1', 'category', '2025-03', 'Cat 1 note'),
      createNote('n2', 'cat-2', 'category', '2025-03', 'Cat 2 note'),
    ];

    const result = getEffectiveNote('category', 'cat-1', '2025-03', notes);
    expect(result?.note.content).toBe('Cat 1 note');
  });

  it('returns null when no matching notes for category', () => {
    const notes: Note[] = [
      createNote('n1', 'cat-2', 'category', '2025-03', 'Other category note'),
    ];
    const result = getEffectiveNote('category', 'cat-1', '2025-03', notes);
    expect(result).toBe(null);
  });
});

describe('getEffectiveGeneralNote', () => {
  const createGeneralNote = (
    id: string,
    monthKey: string,
    content: string
  ): GeneralMonthNote => ({
    id,
    monthKey,
    content,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  });

  it('returns null when no general notes exist', () => {
    const result = getEffectiveGeneralNote('2025-03', {});
    expect(result).toBe(null);
  });

  it('returns exact match when note exists for target month', () => {
    const generalNotes = {
      '2025-03': createGeneralNote('g1', '2025-03', 'March general'),
    };
    const result = getEffectiveGeneralNote('2025-03', generalNotes);

    expect(result).not.toBe(null);
    expect(result?.note.content).toBe('March general');
    expect(result?.sourceMonth).toBe('2025-03');
    expect(result?.isInherited).toBe(false);
  });

  it('returns inherited note from earlier month', () => {
    const generalNotes = {
      '2025-01': createGeneralNote('g1', '2025-01', 'January general'),
    };
    const result = getEffectiveGeneralNote('2025-03', generalNotes);

    expect(result?.note.content).toBe('January general');
    expect(result?.sourceMonth).toBe('2025-01');
    expect(result?.isInherited).toBe(true);
  });

  it('returns most recent note before target month', () => {
    const generalNotes = {
      '2025-01': createGeneralNote('g1', '2025-01', 'January general'),
      '2025-02': createGeneralNote('g2', '2025-02', 'February general'),
    };
    const result = getEffectiveGeneralNote('2025-03', generalNotes);

    expect(result?.note.content).toBe('February general');
    expect(result?.sourceMonth).toBe('2025-02');
  });

  it('ignores notes from future months', () => {
    const generalNotes = {
      '2025-01': createGeneralNote('g1', '2025-01', 'January general'),
      '2025-05': createGeneralNote('g2', '2025-05', 'May general'),
    };
    const result = getEffectiveGeneralNote('2025-03', generalNotes);

    expect(result?.note.content).toBe('January general');
  });
});
