/* eslint-disable max-lines */
import { describe, it, expect } from 'vitest';
import { buildCategoryGroupsWithNotes, hasAnyNotes } from './notesTransform';
import type { NotesCategoryGroup, CategoryGroupWithNotes } from '../types/notes';

describe('buildCategoryGroupsWithNotes', () => {
  const mockNotesCategories: NotesCategoryGroup[] = [
    {
      id: 'group-1',
      name: 'Bills',
      categories: [
        { id: 'cat-1', name: 'Utilities', icon: '⚡' },
        { id: 'cat-2', name: 'Rent' },
      ],
    },
    {
      id: 'group-2',
      name: 'Subscriptions',
      categories: [
        { id: 'cat-3', name: 'Streaming', icon: '📺' },
      ],
    },
  ];

  it('returns empty array when no categories provided', () => {
    const result = buildCategoryGroupsWithNotes(null, []);
    expect(result).toEqual([]);
  });

  it('builds hierarchical structure from notes categories', () => {
    const result = buildCategoryGroupsWithNotes(null, mockNotesCategories);

    expect(result).toHaveLength(2);

    // Bills group should have 2 categories
    const billsGroup = result.find((g) => g.name === 'Bills');
    expect(billsGroup).toBeDefined();
    expect(billsGroup?.categories).toHaveLength(2);

    // Subscriptions group should have 1 category
    const subsGroup = result.find((g) => g.name === 'Subscriptions');
    expect(subsGroup).toBeDefined();
    expect(subsGroup?.categories).toHaveLength(1);
  });

  it('includes category icon when present', () => {
    const result = buildCategoryGroupsWithNotes(null, mockNotesCategories);

    const billsGroup = result.find((g) => g.name === 'Bills');
    const utilitiesCat = billsGroup?.categories.find((c) => c.name === 'Utilities');
    expect(utilitiesCat?.icon).toBe('⚡');

    const rentCat = billsGroup?.categories.find((c) => c.name === 'Rent');
    expect(rentCat?.icon).toBeUndefined();
  });

  it('sets isExpanded to false by default', () => {
    const result = buildCategoryGroupsWithNotes(null, mockNotesCategories);

    result.forEach((group) => {
      expect(group.isExpanded).toBe(false);
    });
  });

  it('includes effective notes when provided', () => {
    const monthNotesData = {
      month_key: '2025-01',
      last_updated: '2025-01-15T00:00:00Z',
      effective_notes: {
        'group:group-1': {
          note: {
            id: 'note-1',
            categoryRef: { type: 'group' as const, id: 'group-1', name: 'Bills' },
            monthKey: '2025-01',
            content: 'Bills note',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          source_month: '2025-01',
          is_inherited: false,
        },
        'category:cat-1': {
          note: {
            id: 'note-2',
            categoryRef: { type: 'category' as const, id: 'cat-1', name: 'Utilities' },
            monthKey: '2025-01',
            content: 'Utilities note',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          source_month: '2025-01',
          is_inherited: false,
        },
      },
      effective_general_note: null,
    };

    const result = buildCategoryGroupsWithNotes(monthNotesData, mockNotesCategories);

    const billsGroup = result.find((g) => g.name === 'Bills');
    expect(billsGroup?.effectiveNote.note?.content).toBe('Bills note');
    expect(billsGroup?.effectiveNote.isInherited).toBe(false);

    const utilitiesCat = billsGroup?.categories.find((c) => c.id === 'cat-1');
    expect(utilitiesCat?.effectiveNote.note?.content).toBe('Utilities note');
  });

  it('handles inherited notes', () => {
    const monthNotesData = {
      month_key: '2025-03',
      last_updated: '2025-03-01T00:00:00Z',
      effective_notes: {
        'group:group-1': {
          note: {
            id: 'note-1',
            categoryRef: { type: 'group' as const, id: 'group-1', name: 'Bills' },
            monthKey: '2025-01',
            content: 'January note',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          source_month: '2025-01',
          is_inherited: true,
        },
      },
      effective_general_note: null,
    };

    const result = buildCategoryGroupsWithNotes(monthNotesData, mockNotesCategories);

    const billsGroup = result.find((g) => g.name === 'Bills');
    expect(billsGroup?.effectiveNote.note?.content).toBe('January note');
    expect(billsGroup?.effectiveNote.isInherited).toBe(true);
    expect(billsGroup?.effectiveNote.sourceMonth).toBe('2025-01');
  });

  it('preserves category order from Monarch (budget sheet order)', () => {
    const categories: NotesCategoryGroup[] = [
      {
        id: 'group-1',
        name: 'Bills',
        categories: [
          { id: 'cat-z', name: 'Zebra' },
          { id: 'cat-a', name: 'Apple' },
          { id: 'cat-m', name: 'Mango' },
        ],
      },
    ];

    const result = buildCategoryGroupsWithNotes(null, categories);

    const billsGroup = result.find((g) => g.name === 'Bills');
    // Order should be preserved as provided (Monarch's budget sheet order)
    expect(billsGroup?.categories[0]?.name).toBe('Zebra');
    expect(billsGroup?.categories[1]?.name).toBe('Apple');
    expect(billsGroup?.categories[2]?.name).toBe('Mango');
  });

  it('creates empty effective note when no note data exists', () => {
    const result = buildCategoryGroupsWithNotes(null, mockNotesCategories);

    const billsGroup = result.find((g) => g.name === 'Bills');
    expect(billsGroup?.effectiveNote).toEqual({
      note: null,
      sourceMonth: null,
      isInherited: false,
    });
  });

  it('sets correct groupId on categories', () => {
    const result = buildCategoryGroupsWithNotes(null, mockNotesCategories);

    const billsGroup = result.find((g) => g.name === 'Bills');
    billsGroup?.categories.forEach((cat) => {
      expect(cat.groupId).toBe('group-1');
    });

    const subsGroup = result.find((g) => g.name === 'Subscriptions');
    subsGroup?.categories.forEach((cat) => {
      expect(cat.groupId).toBe('group-2');
    });
  });
});

describe('hasAnyNotes', () => {
  const createEmptyGroups = (): CategoryGroupWithNotes[] => [
    {
      id: 'group-1',
      name: 'Bills',
      effectiveNote: { note: null, sourceMonth: null, isInherited: false },
      categories: [
        {
          id: 'cat-1',
          name: 'Utilities',
          groupId: 'group-1',
          effectiveNote: { note: null, sourceMonth: null, isInherited: false },
        },
      ],
      isExpanded: false,
    },
  ];

  it('returns false when no notes exist', () => {
    const groups = createEmptyGroups();
    const result = hasAnyNotes(groups, null);
    expect(result).toBe(false);
  });

  it('returns false with empty groups array', () => {
    const result = hasAnyNotes([], null);
    expect(result).toBe(false);
  });

  it('returns true when general note exists', () => {
    const groups = createEmptyGroups();
    const generalNote = { note: { content: 'General note content' } };
    const result = hasAnyNotes(groups, generalNote);
    expect(result).toBe(true);
  });

  it('returns false when general note has no content', () => {
    const groups = createEmptyGroups();
    const generalNote = { note: { content: '' } };
    const result = hasAnyNotes(groups, generalNote);
    expect(result).toBe(false);
  });

  it('returns false when general note is null', () => {
    const groups = createEmptyGroups();
    const generalNote = { note: null };
    const result = hasAnyNotes(groups, generalNote);
    expect(result).toBe(false);
  });

  it('returns true when group has note', () => {
    const groups: CategoryGroupWithNotes[] = [
      {
        id: 'group-1',
        name: 'Bills',
        effectiveNote: {
          note: {
            id: 'note-1',
            categoryRef: { type: 'group', id: 'group-1', name: 'Bills' },
            monthKey: '2025-01',
            content: 'Group note',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          sourceMonth: '2025-01',
          isInherited: false,
        },
        categories: [],
        isExpanded: false,
      },
    ];
    const result = hasAnyNotes(groups, null);
    expect(result).toBe(true);
  });

  it('returns true when category has note', () => {
    const groups: CategoryGroupWithNotes[] = [
      {
        id: 'group-1',
        name: 'Bills',
        effectiveNote: { note: null, sourceMonth: null, isInherited: false },
        categories: [
          {
            id: 'cat-1',
            name: 'Utilities',
            groupId: 'group-1',
            effectiveNote: {
              note: {
                id: 'note-1',
                categoryRef: { type: 'category', id: 'cat-1', name: 'Utilities' },
                monthKey: '2025-01',
                content: 'Category note',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z',
              },
              sourceMonth: '2025-01',
              isInherited: false,
            },
          },
        ],
        isExpanded: false,
      },
    ];
    const result = hasAnyNotes(groups, null);
    expect(result).toBe(true);
  });

  it('returns true with undefined general note but group note exists', () => {
    const groups: CategoryGroupWithNotes[] = [
      {
        id: 'group-1',
        name: 'Bills',
        effectiveNote: {
          note: {
            id: 'note-1',
            categoryRef: { type: 'group', id: 'group-1', name: 'Bills' },
            monthKey: '2025-01',
            content: 'Group note',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
          sourceMonth: '2025-01',
          isInherited: false,
        },
        categories: [],
        isExpanded: false,
      },
    ];
    const result = hasAnyNotes(groups, undefined);
    expect(result).toBe(true);
  });

  it('checks nested categories in multiple groups', () => {
    const groups: CategoryGroupWithNotes[] = [
      {
        id: 'group-1',
        name: 'Bills',
        effectiveNote: { note: null, sourceMonth: null, isInherited: false },
        categories: [
          {
            id: 'cat-1',
            name: 'Utilities',
            groupId: 'group-1',
            effectiveNote: { note: null, sourceMonth: null, isInherited: false },
          },
        ],
        isExpanded: false,
      },
      {
        id: 'group-2',
        name: 'Subscriptions',
        effectiveNote: { note: null, sourceMonth: null, isInherited: false },
        categories: [
          {
            id: 'cat-2',
            name: 'Streaming',
            groupId: 'group-2',
            effectiveNote: {
              note: {
                id: 'note-1',
                categoryRef: { type: 'category', id: 'cat-2', name: 'Streaming' },
                monthKey: '2025-01',
                content: 'Streaming note',
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z',
              },
              sourceMonth: '2025-01',
              isInherited: false,
            },
          },
        ],
        isExpanded: false,
      },
    ];
    const result = hasAnyNotes(groups, null);
    expect(result).toBe(true);
  });
});
