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
import {
  fetchBetaReleasesAsChangelog,
  fetchStableReleasesAsChangelog,
} from '../../utils/githubRelease';
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
 * Check if a version string is a prerelease (beta, alpha, rc, etc.)
 */
function isPrereleaseVersion(version: string): boolean {
  return /-(beta|alpha|rc|dev|canary)/i.test(version);
}

/**
 * Fetches changelog from GitHub releases.
 * Beta environments get beta releases, stable environments get stable releases.
 * Filters baked-in CHANGELOG.md entries by environment to prevent beta versions
 * from appearing in stable builds.
 */
async function getChangelogFromGitHub(limit?: number): Promise<ChangelogResponse> {
  const baseResponse = getChangelogResponse(limit);
  const isBeta = isBetaEnvironment();

  // Filter baked-in entries by environment (stable builds shouldn't show beta versions)
  const filteredBaseEntries = isBeta
    ? baseResponse.entries
    : baseResponse.entries.filter((entry) => !isPrereleaseVersion(entry.version));

  try {
    // Fetch appropriate releases based on environment
    const releases = isBeta
      ? await fetchBetaReleasesAsChangelog()
      : await fetchStableReleasesAsChangelog();

    if (releases.length === 0) {
      return {
        ...baseResponse,
        entries: filteredBaseEntries,
        total_entries: filteredBaseEntries.length,
      };
    }

    // Convert releases to ChangelogEntry format
    const releaseEntries: ChangelogEntry[] = releases.map((release) => ({
      version: release.version,
      date: release.date,
      summary: release.summary,
      sections: release.sections,
    }));

    // Merge with filtered baked-in entries and sort by date (descending)
    const allEntries = [...filteredBaseEntries, ...releaseEntries].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // Dedupe by version (prefer GitHub release if duplicate)
    const seen = new Set<string>();
    const dedupedEntries = allEntries.filter((entry) => {
      if (seen.has(entry.version)) return false;
      seen.add(entry.version);
      return true;
    });

    // Apply limit if specified
    const entries = limit ? dedupedEntries.slice(0, limit) : dedupedEntries;

    return {
      current_version: baseResponse.current_version,
      entries,
      total_entries: dedupedEntries.length,
    };
  } catch (error) {
    // If fetching releases fails, return base changelog
    console.error('Failed to fetch releases for changelog:', error);
    return baseResponse;
  }
}

/**
 * Get changelog entries
 *
 * Fetches release notes from GitHub and merges with any baked-in CHANGELOG.md entries.
 * Beta environments get beta releases, stable environments get stable releases.
 */
export function useChangelogQuery(limit?: number) {
  const isBeta = isBetaEnvironment();

  return useQuery({
    queryKey: [...queryKeys.changelog, limit, isBeta],
    queryFn: () => getChangelogFromGitHub(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes - both environments fetch from GitHub
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
