/**
 * useContributors Hook
 *
 * Provides access to feature contributor attribution data.
 * Data is statically generated at build time from GitHub.
 *
 * Usage:
 *   const { ideator, contributors } = useContributors('recurring');
 */

import contributorsData from '../data/contributors.json';

export interface Contributor {
  /** GitHub username */
  username: string;
  /** GitHub avatar URL */
  avatarUrl: string;
  /** GitHub profile URL */
  profileUrl: string;
  /** Number of commits to this feature */
  commits: number;
}

export interface FeatureContributors {
  /** Feature ID */
  featureId: string;
  /** Person who originated the feature idea */
  ideator: Contributor | null;
  /** Code contributors sorted by commit count */
  contributors: Contributor[];
  /** Last updated timestamp */
  lastUpdated: string;
}

interface ContributorsData {
  generatedAt: string;
  features: Record<string, FeatureContributors>;
}

/**
 * Get contributor data for a specific feature.
 *
 * @param featureId - The feature ID (e.g., 'recurring')
 * @returns The feature's contributor data, or null if not found
 */
export function useContributors(featureId: string): FeatureContributors | null {
  const data = contributorsData as ContributorsData;
  return data.features[featureId] ?? null;
}

/**
 * Get all contributor data.
 *
 * @returns The complete contributors data object
 */
export function useAllContributors(): ContributorsData {
  return contributorsData as ContributorsData;
}

/**
 * Get a list of all unique contributors across all features.
 *
 * @returns Array of unique contributors
 */
export function useUniqueContributors(): Contributor[] {
  const data = contributorsData as ContributorsData;
  const seen = new Set<string>();
  const contributors: Contributor[] = [];

  for (const feature of Object.values(data.features)) {
    // Add ideator if not seen
    if (feature.ideator && !seen.has(feature.ideator.username)) {
      seen.add(feature.ideator.username);
      contributors.push(feature.ideator);
    }

    // Add contributors if not seen
    for (const c of feature.contributors) {
      if (!seen.has(c.username)) {
        seen.add(c.username);
        contributors.push(c);
      }
    }
  }

  return contributors;
}
