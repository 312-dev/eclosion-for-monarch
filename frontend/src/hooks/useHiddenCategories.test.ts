import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHiddenCategories } from './useHiddenCategories';

const STORAGE_KEY = 'eclosion-hidden-categories';

describe('useHiddenCategories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initial state', () => {
    it('starts with empty hidden groups and categories', () => {
      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.hiddenGroups).toEqual([]);
      expect(result.current.hiddenCategories).toEqual([]);
      expect(result.current.hiddenCount).toBe(0);
    });

    it('loads from localStorage on mount', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: ['group-1', 'group-2'],
          categories: ['cat-1'],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.hiddenGroups).toEqual(['group-1', 'group-2']);
      expect(result.current.hiddenCategories).toEqual(['cat-1']);
      expect(result.current.hiddenCount).toBe(3);
    });

    it('handles malformed localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');

      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.hiddenGroups).toEqual([]);
      expect(result.current.hiddenCategories).toEqual([]);
    });

    it('handles missing arrays in localStorage data', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: 'data' }));

      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.hiddenGroups).toEqual([]);
      expect(result.current.hiddenCategories).toEqual([]);
    });
  });

  describe('toggleGroup', () => {
    it('adds group to hidden list when not hidden', () => {
      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.toggleGroup('group-1');
      });

      expect(result.current.hiddenGroups).toContain('group-1');
      expect(result.current.hiddenCount).toBe(1);
    });

    it('removes group from hidden list when already hidden', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: ['group-1'],
          categories: [],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.toggleGroup('group-1');
      });

      expect(result.current.hiddenGroups).not.toContain('group-1');
      expect(result.current.hiddenCount).toBe(0);
    });

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.toggleGroup('group-1');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.groups).toContain('group-1');
    });
  });

  describe('toggleCategory', () => {
    it('adds category to hidden list when not hidden', () => {
      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.toggleCategory('cat-1');
      });

      expect(result.current.hiddenCategories).toContain('cat-1');
      expect(result.current.hiddenCount).toBe(1);
    });

    it('removes category from hidden list when already hidden', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: [],
          categories: ['cat-1'],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.toggleCategory('cat-1');
      });

      expect(result.current.hiddenCategories).not.toContain('cat-1');
      expect(result.current.hiddenCount).toBe(0);
    });

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.toggleCategory('cat-1');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.categories).toContain('cat-1');
    });
  });

  describe('isGroupHidden', () => {
    it('returns true for hidden groups', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: ['group-1'],
          categories: [],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.isGroupHidden('group-1')).toBe(true);
    });

    it('returns false for visible groups', () => {
      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.isGroupHidden('group-1')).toBe(false);
    });
  });

  describe('isCategoryHidden', () => {
    it('returns true for hidden categories', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: [],
          categories: ['cat-1'],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.isCategoryHidden('cat-1')).toBe(true);
    });

    it('returns false for visible categories', () => {
      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.isCategoryHidden('cat-1')).toBe(false);
    });
  });

  describe('setHiddenGroups', () => {
    it('replaces all hidden groups', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: ['group-1'],
          categories: ['cat-1'],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.setHiddenGroups(['group-2', 'group-3']);
      });

      expect(result.current.hiddenGroups).toEqual(['group-2', 'group-3']);
      // Categories should remain unchanged
      expect(result.current.hiddenCategories).toEqual(['cat-1']);
    });

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.setHiddenGroups(['group-1', 'group-2']);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.groups).toEqual(['group-1', 'group-2']);
    });
  });

  describe('setHiddenCategories', () => {
    it('replaces all hidden categories', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: ['group-1'],
          categories: ['cat-1'],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.setHiddenCategories(['cat-2', 'cat-3']);
      });

      expect(result.current.hiddenCategories).toEqual(['cat-2', 'cat-3']);
      // Groups should remain unchanged
      expect(result.current.hiddenGroups).toEqual(['group-1']);
    });

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useHiddenCategories());

      act(() => {
        result.current.setHiddenCategories(['cat-1', 'cat-2']);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      expect(stored.categories).toEqual(['cat-1', 'cat-2']);
    });
  });

  describe('hiddenCount', () => {
    it('reflects total count of hidden groups and categories', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          groups: ['group-1', 'group-2'],
          categories: ['cat-1', 'cat-2', 'cat-3'],
        })
      );

      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.hiddenCount).toBe(5);
    });

    it('updates when items are toggled', () => {
      const { result } = renderHook(() => useHiddenCategories());

      expect(result.current.hiddenCount).toBe(0);

      act(() => {
        result.current.toggleGroup('group-1');
      });
      expect(result.current.hiddenCount).toBe(1);

      act(() => {
        result.current.toggleCategory('cat-1');
      });
      expect(result.current.hiddenCount).toBe(2);

      act(() => {
        result.current.toggleGroup('group-1');
      });
      expect(result.current.hiddenCount).toBe(1);
    });
  });
});
