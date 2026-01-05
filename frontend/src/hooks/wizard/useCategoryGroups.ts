/**
 * useCategoryGroups - Hook for category group selection in wizards
 */

import { useState, useCallback } from 'react';
import type { CategoryGroup } from '../../types';
import { getErrorMessage } from '../../utils';
import { getCategoryGroups } from '../../api/client';

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
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupsFetched, setGroupsFetched] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    setGroupError(null);
    try {
      const data = await getCategoryGroups();
      setGroups(data);
      setGroupsFetched(true);
    } catch (err) {
      setGroupError(getErrorMessage(err));
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  const handleSelectGroup = useCallback((id: string, name: string) => {
    setSelectedGroupId(id);
    setSelectedGroupName(name);
  }, []);

  return {
    groups,
    selectedGroupId,
    selectedGroupName,
    loadingGroups,
    groupError,
    groupsFetched,
    fetchGroups,
    handleSelectGroup,
  };
}
