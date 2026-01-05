/**
 * Version Queries
 *
 * Queries and mutations for version info and changelog.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { getChangelogResponse } from '../../data/changelog';
import { queryKeys, getQueryKey } from './keys';

/**
 * Get server version info
 */
export function useVersionQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.version, isDemo),
    queryFn: isDemo ? demoApi.getVersion : api.getVersion,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get changelog entries
 *
 * Changelog is baked into the build from CHANGELOG.md, so no API call needed.
 */
export function useChangelogQuery(limit?: number) {
  return useQuery({
    queryKey: [...queryKeys.changelog, limit],
    queryFn: () => getChangelogResponse(limit),
    staleTime: Infinity, // Baked-in data never goes stale
  });
}

/**
 * Check for version updates
 */
export function useVersionCheckQuery(clientVersion: string, options?: { enabled?: boolean }) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [...getQueryKey(queryKeys.versionCheck, isDemo), clientVersion],
    queryFn: () => (isDemo ? demoApi.checkVersion(clientVersion) : api.checkVersion(clientVersion)),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000, // Check every 30 minutes
    ...options,
  });
}

/**
 * Get changelog read status (has unread entries)
 */
export function useChangelogStatusQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.changelogStatus, isDemo),
    queryFn: isDemo ? demoApi.getChangelogStatus : api.getChangelogStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mark changelog as read
 */
export function useMarkChangelogReadMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: isDemo ? demoApi.markChangelogRead : api.markChangelogRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(queryKeys.changelogStatus, isDemo) });
    },
  });
}
