/**
 * ProductBoard idea scraped from the public portal
 */
export interface ProductBoardIdea {
  /** Unique identifier extracted from the portal (e.g., card ID or URL slug) */
  id: string;
  /** Feature/idea title */
  title: string;
  /** Description text */
  description: string;
  /** Number of votes/upvotes */
  votes: number;
  /** Category grouping (e.g., "Dashboard & System Wide", "Transactions") */
  category: string;
  /** Current status in ProductBoard */
  status: IdeaStatus;
  /** Direct link to the idea on ProductBoard */
  url: string;
}

export type IdeaStatus = 'idea' | 'in_progress' | 'up_next' | 'released';

/**
 * Mapping of ProductBoard tab names to our status enum
 */
export const TAB_STATUS_MAP: Record<string, IdeaStatus> = {
  'Ideas': 'idea',
  'In Progress': 'in_progress',
  'Up Next': 'up_next',
  'Released': 'released',
  'Recently Released': 'released',
};

/**
 * State tracking for synced ideas
 */
export interface SyncState {
  /** ISO timestamp of last sync */
  lastSync: string;
  /** Map of ProductBoard idea ID to tracking info */
  trackedIdeas: Record<string, TrackedIdea>;
}

/** Reason why a discussion was closed */
export type ClosedReason = 'monarch-committed' | 'eclosion-shipped';

/** Where the idea originated from */
export type IdeaSource = 'productboard' | 'github';

export interface TrackedIdea {
  /** GitHub Discussion node ID */
  discussionId: string;
  /** GitHub Discussion number */
  discussionNumber: number;
  /** Current status of the discussion */
  status: 'open' | 'closed';
  /** Last known ProductBoard vote count (0 for GitHub-only ideas) */
  lastVoteCount: number;
  /** Last known ProductBoard status (undefined for GitHub-only ideas) */
  lastProductBoardStatus?: IdeaStatus;
  /** Thumbs-up reactions on GitHub Discussion */
  githubVotes: number;
  /** ISO timestamp when discussion was closed */
  closedAt?: string;
  /** Reason why discussion was closed */
  closedReason?: ClosedReason;
  /** Where the idea originated from */
  source: IdeaSource;
  /** Title (for GitHub-only ideas that aren't in scraped data) */
  title?: string;
  /** Description (for GitHub-only ideas) */
  description?: string;
  /** Category (for GitHub-only ideas) */
  category?: string;
}

/**
 * Configuration constants
 */
export const CONFIG = {
  /** Minimum votes to track an idea */
  VOTE_THRESHOLD: 500,
  /** ProductBoard portal URL */
  PORTAL_URL: 'https://portal.productboard.com/3qsdvcsy5aq69hhkycf4dtpi',
  /** Tabs to scrape */
  TABS: ['Ideas', 'In Progress', 'Up Next'] as const,
  /** GitHub Discussions category name */
  DISCUSSIONS_CATEGORY: 'Ideas',
} as const;
