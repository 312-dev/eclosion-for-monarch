/**
 * Changelog Data
 *
 * Baked-in changelog data parsed from CHANGELOG.md at build time.
 * This eliminates the need for API calls to fetch changelog information.
 */

import type { ChangelogEntry, ChangelogResponse } from '../types';

// Changelog entries injected at build time from CHANGELOG.md
declare const __CHANGELOG__: ChangelogEntry[];
declare const __APP_VERSION__: string;

export const CHANGELOG_ENTRIES: ChangelogEntry[] = __CHANGELOG__;

export function getChangelogResponse(limit?: number): ChangelogResponse {
  const entries = limit ? CHANGELOG_ENTRIES.slice(0, limit) : CHANGELOG_ENTRIES;

  return {
    current_version: __APP_VERSION__,
    entries,
    total_entries: CHANGELOG_ENTRIES.length,
  };
}
