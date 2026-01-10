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
import { isBetaEnvironment } from '../../utils/environment';
import { fetchBetaReleasesAsChangelog } from '../../utils/githubRelease';
import type { ChangelogEntry, ChangelogResponse } from '../../types';

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
 * Fetches changelog with beta releases merged in (for beta environments).
 */
async function getChangelogWithBetaReleases(limit?: number): Promise<ChangelogResponse> {
  const baseResponse = getChangelogResponse(limit);

  // Only fetch beta releases on beta environments
  if (!isBetaEnvironment()) {
    return baseResponse;
  }

  try {
    const betaReleases = await fetchBetaReleasesAsChangelog();

    if (betaReleases.length === 0) {
      return baseResponse;
    }

    // Convert beta releases to ChangelogEntry format
    const betaEntries: ChangelogEntry[] = betaReleases.map((release) => ({
      version: release.version,
      date: release.date,
      summary: release.summary,
      sections: release.sections,
    }));

    // Merge and sort all entries by date (descending)
    const allEntries = [...baseResponse.entries, ...betaEntries].sort((a, b) => {
      // Parse dates for comparison (handles various formats)
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply limit if specified
    const entries = limit ? allEntries.slice(0, limit) : allEntries;

    return {
      current_version: baseResponse.current_version,
      entries,
      total_entries: allEntries.length,
    };
  } catch (error) {
    // If fetching beta releases fails, return base changelog
    console.error('Failed to fetch beta releases for changelog:', error);
    return baseResponse;
  }
}

/**
 * Get changelog entries
 *
 * Changelog is baked into the build from CHANGELOG.md.
 * In beta environments, also fetches beta releases from GitHub and merges them.
 */
export function useChangelogQuery(limit?: number) {
  const isBeta = isBetaEnvironment();

  return useQuery({
    queryKey: [...queryKeys.changelog, limit, isBeta],
    queryFn: () => getChangelogWithBetaReleases(limit),
    staleTime: isBeta ? 5 * 60 * 1000 : Infinity, // Beta fetches from GitHub, stable is baked-in
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
