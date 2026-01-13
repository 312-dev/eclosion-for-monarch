/**
 * useRollupConfig - Hook for rollup category configuration in wizards
 */

import { useState, useCallback } from 'react';
import type { UnmappedCategory } from '../../types';
import { getUnmappedCategories } from '../../api/client';

export interface UseRollupConfigResult {
  rollupMode: 'new' | 'existing';
  rollupCategories: UnmappedCategory[];
  selectedRollupCategoryId: string;
  rollupSyncName: boolean;
  loadingRollupCategories: boolean;
  rollupCategoriesFetched: boolean;
  setRollupMode: (mode: 'new' | 'existing') => void;
  setSelectedRollupCategoryId: (id: string) => void;
  setRollupSyncName: (sync: boolean) => void;
  fetchRollupCategories: () => Promise<void>;
}

export function useRollupConfig(): UseRollupConfigResult {
  const [rollupMode, setRollupMode] = useState<'new' | 'existing'>('new');
  const [rollupCategories, setRollupCategories] = useState<UnmappedCategory[]>([]);
  const [selectedRollupCategoryId, setSelectedRollupCategoryId] = useState('');
  const [rollupSyncName, setRollupSyncName] = useState(false);
  const [loadingRollupCategories, setLoadingRollupCategories] = useState(false);
  const [rollupCategoriesFetched, setRollupCategoriesFetched] = useState(false);

  const fetchRollupCategories = useCallback(async () => {
    setLoadingRollupCategories(true);
    try {
      const categories = await getUnmappedCategories();
      setRollupCategories(categories);
    } catch {
      // Silently fail - the dropdown will show empty state
    } finally {
      setLoadingRollupCategories(false);
      setRollupCategoriesFetched(true);
    }
  }, []);

  return {
    rollupMode,
    rollupCategories,
    selectedRollupCategoryId,
    rollupSyncName,
    loadingRollupCategories,
    rollupCategoriesFetched,
    setRollupMode,
    setSelectedRollupCategoryId,
    setRollupSyncName,
    fetchRollupCategories,
  };
}
