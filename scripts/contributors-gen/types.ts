/**
 * Type definitions for the contributor generator
 */

export interface Contributor {
  /** GitHub username */
  username: string;
  /** GitHub avatar URL */
  avatarUrl: string;
  /** GitHub profile URL */
  profileUrl: string;
  /** Number of commits to this feature (0 for ideators) */
  commits: number;
}

export interface FeatureContributors {
  /** Feature ID matching FeatureDefinition.id */
  featureId: string;
  /** Person who originated the feature idea (from GitHub issue author) */
  ideator: Contributor | null;
  /** Code contributors (from git history), sorted by commit count */
  contributors: Contributor[];
  /** Last updated timestamp */
  lastUpdated: string;
}

export interface ContributorsData {
  /** When this data was generated */
  generatedAt: string;
  /** Per-feature contributor data */
  features: Record<string, FeatureContributors>;
}

export interface CacheEntry {
  /** Git commit email */
  email: string;
  /** GitHub username */
  username: string;
  /** GitHub avatar URL */
  avatarUrl: string;
  /** GitHub profile URL */
  profileUrl: string;
  /** When this entry was fetched */
  fetchedAt: string;
}

export interface Cache {
  /** Email to GitHub user mapping */
  users: Record<string, CacheEntry>;
}

export interface GitContributor {
  /** Git commit email */
  email: string;
  /** Git commit author name */
  name: string;
  /** Number of commits */
  commits: number;
}
