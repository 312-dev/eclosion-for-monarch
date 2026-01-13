/**
 * useCategoryGroups - Hook for category group selection in wizards
 *
 * Uses the shared category group store for consistent caching.
 */

import { useState, useCallback, useMemo } from 'react';
import type { CategoryGroup } from '../../types';
import { useCategoryGroupsList } from '../../api/queries/categoryGroupStoreQueries';

export interface UseCategoryGroupsResult {
  groups: CategoryGroup[];
  selectedGroupId: string;
  selectedGroupName: string;
  loadingGroups: boolean;
  groupError: string | null;
  groupsFetched: boolean;
  fetchGroups: () => Promise<void>;
  handleSelectGroup: (id: string, name: string) => void;
}

export function useCategoryGroups(): UseCategoryGroupsResult {
  const { groups, isLoading, error } = useCategoryGroupsList();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');

  // Derive groupsFetched from query state instead of setting in an effect
  const groupsFetched = useMemo(
    () => groups.length > 0 && !isLoading,
    [groups.length, isLoading]
  );

  // fetchGroups is now a no-op since React Query handles fetching
  // Kept for API compatibility with existing code
  const fetchGroups = useCallback(async () => {
    // React Query automatically fetches on mount
    // This function exists for API compatibility
  }, []);

  const handleSelectGroup = useCallback((id: string, name: string) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name);
  }, []);

  return {
    groups,
    selectedGroupId,
    selectedGroupName,
    loadingGroups: isLoading,
    groupError: error ? 'Failed to load category groups' : null,
    groupsFetched,
    fetchGroups,
    handleSelectGroup,
  };
}
