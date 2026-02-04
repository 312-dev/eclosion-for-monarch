/* eslint-disable max-lines */
/**
 * Query Dependency Registry
 *
 * Central registry defining:
 * - What queries exist and their refresh behavior
 * - What mutations affect which queries
 * - What each page needs for accurate display
 * - Background polling configuration
 *
 * This ensures consistent cache invalidation and enables smart,
 * page-aware sync behavior.
 */

import { queryKeys } from './keys';

// ============================================================================
// Types
// ============================================================================

/** Query key names from the registry */
export type QueryKeyName = keyof typeof queryKeys;

/** Page identifiers for page-specific sync */
export type PageName = 'recurring' | 'stash' | 'notes' | 'settings';

/** Mutation types that affect query caches */
export type MutationType =
  // Recurring mutations
  | 'sync'
  | 'toggleItem'
  | 'allocateFunds'
  | 'setRollupBudget'
  | 'addToRollup'
  | 'removeFromRollup'
  | 'updateRollupEmoji'
  | 'updateRollupName'
  | 'recreateCategory'
  | 'refreshItem'
  | 'linkCategory'
  | 'updateCategoryGroup'
  | 'updateCategoryEmoji'
  | 'updateCategoryName'
  | 'updateCategoryGroupSettings'
  // Stash mutations
  | 'stashSync'
  | 'createStash'
  | 'updateStash'
  | 'deleteStash'
  | 'archiveStash'
  | 'unarchiveStash'
  | 'completeStash'
  | 'uncompleteStash'
  | 'allocateStash'
  | 'allocateStashBatch'
  | 'changeStashGroup'
  | 'linkStashCategory'
  | 'updateCategoryRollover'
  | 'updateGroupRollover'
  | 'skipPending'
  | 'convertPending'
  | 'importBookmarks'
  | 'clearUnconvertedBookmarks'
  | 'saveHypothesis'
  | 'deleteHypothesis'
  // Notes mutations
  | 'saveNote'
  | 'deleteNote'
  | 'saveGeneralNote'
  | 'deleteGeneralNote'
  // Config mutations
  | 'updateStashConfig'
  | 'updateSettings'
  | 'importSettings';

/** Configuration for a query's refresh behavior */
export interface QueryConfig {
  /** Other queries this depends on (for documentation) */
  dependsOn: readonly QueryKeyName[];
  /** Stale time in milliseconds */
  staleTime: number;
  /** Garbage collection time in milliseconds (optional) */
  gcTime?: number;
  /** Whether this query should be polled in the background */
  pollable: boolean;
}

/** Effect of a mutation on query caches */
export interface MutationEffect {
  /** Queries to invalidate immediately (triggers refetch) */
  invalidate: readonly QueryKeyName[];
  /** Queries to mark stale (refetch on next access) */
  markStale: readonly QueryKeyName[];
}

/** What queries a page needs for accurate display */
export interface PageQueryRequirements {
  /** Primary queries that must be fresh for accurate display */
  primary: readonly QueryKeyName[];
  /** Supporting queries that can be slightly stale */
  supporting: readonly QueryKeyName[];
  /** Backend sync scope to use for this page */
  syncScope: 'recurring' | 'stash' | 'notes' | 'full';
}

// ============================================================================
// Query Configuration
// ============================================================================

/**
 * Configuration for each query's refresh behavior.
 * Stale times and dependencies documented here.
 */
export const queryConfig: Record<QueryKeyName, QueryConfig> = {
  // Core data
  dashboard: {
    dependsOn: [],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    pollable: true,
  },
  autoSyncStatus: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },

  // Category data
  categoryGroups: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  categoryGroupsDetailed: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  flexibleCategoryGroups: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  unmappedCategories: {
    dependsOn: [],
    staleTime: 1 * 60 * 1000, // 1 minute
    pollable: false,
  },
  deletableCategories: {
    dependsOn: ['dashboard'],
    staleTime: 30 * 1000, // 30 seconds
    pollable: false,
  },
  categoryStore: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    pollable: false,
  },

  // Security
  securityStatus: {
    dependsOn: [],
    staleTime: 1 * 60 * 1000, // 1 minute
    pollable: false,
  },
  securityEvents: {
    dependsOn: [],
    staleTime: 30 * 1000, // 30 seconds
    pollable: false,
  },
  securitySummary: {
    dependsOn: [],
    staleTime: 1 * 60 * 1000, // 1 minute
    pollable: false,
  },
  securityAlerts: {
    dependsOn: [],
    staleTime: 30 * 1000, // 30 seconds
    pollable: false,
  },

  // Version/deployment
  deploymentInfo: {
    dependsOn: [],
    staleTime: 10 * 60 * 1000, // 10 minutes
    pollable: false,
  },
  version: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  changelog: {
    dependsOn: [],
    staleTime: 60 * 60 * 1000, // 1 hour
    pollable: false,
  },
  versionCheck: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  changelogStatus: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },

  // Notes
  monthNotes: {
    dependsOn: ['categoryStore'],
    staleTime: 1 * 60 * 1000, // 1 minute
    pollable: false,
  },
  archivedNotes: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  noteHistory: {
    dependsOn: [],
    staleTime: 1 * 60 * 1000, // 1 minute
    pollable: false,
  },
  checkboxStates: {
    dependsOn: [],
    staleTime: 1 * 60 * 1000, // 1 minute
    pollable: false,
  },

  // Stash
  stash: {
    dependsOn: ['dashboard'], // For ready-to-assign calculation
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    pollable: true,
  },
  stashConfig: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    pollable: false,
  },
  stashCategoryGroups: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  monarchGoals: {
    dependsOn: [],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    pollable: true,
  },
  pendingBookmarks: {
    dependsOn: [],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  pendingBookmarksCount: {
    dependsOn: ['pendingBookmarks'],
    staleTime: 30 * 1000, // 30 seconds
    pollable: false,
  },
  skippedBookmarks: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  availableToStash: {
    dependsOn: ['dashboard', 'stash', 'monarchGoals'],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    pollable: true,
  },
  stashHistory: {
    dependsOn: ['stash'],
    staleTime: 60 * 60 * 1000, // 1 hour (historical data)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    pollable: false,
  },
  stashHypotheses: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes
    pollable: false,
  },
  categoryBalance: {
    dependsOn: [],
    staleTime: 30 * 1000, // 30 seconds (needs to be fresh for form usage)
    pollable: false,
  },

  // External APIs
  openverseSearch: {
    dependsOn: [],
    staleTime: 60 * 60 * 1000, // 1 hour
    pollable: false,
  },
  updates: {
    dependsOn: [],
    staleTime: 5 * 60 * 1000, // 5 minutes (match Cloudflare Worker cache)
    pollable: false,
  },
};

// ============================================================================
// Mutation Effects
// ============================================================================

/**
 * Defines what queries each mutation type affects.
 * - invalidate: Triggers immediate refetch
 * - markStale: Marks as stale, refetches on next access (lazy)
 */
export const mutationEffects: Record<MutationType, MutationEffect> = {
  // Recurring mutations
  sync: {
    invalidate: ['dashboard', 'categoryStore', 'stash', 'availableToStash'],
    markStale: ['monarchGoals', 'stashHistory', 'categoryGroups'],
  },
  toggleItem: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  allocateFunds: {
    invalidate: ['dashboard'],
    markStale: ['availableToStash'], // Affects stash page
  },
  setRollupBudget: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  addToRollup: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  removeFromRollup: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  updateRollupEmoji: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  updateRollupName: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  recreateCategory: {
    invalidate: ['dashboard'],
    markStale: ['categoryStore', 'categoryGroups'],
  },
  refreshItem: {
    invalidate: ['dashboard'],
    markStale: [],
  },
  linkCategory: {
    invalidate: ['dashboard'],
    markStale: ['unmappedCategories'],
  },
  updateCategoryGroup: {
    invalidate: ['dashboard'],
    markStale: ['categoryGroups'],
  },
  updateCategoryEmoji: {
    invalidate: ['dashboard', 'categoryStore'],
    markStale: [],
  },
  updateCategoryName: {
    invalidate: ['dashboard', 'categoryStore'],
    markStale: [],
  },
  updateCategoryGroupSettings: {
    invalidate: ['categoryGroupsDetailed', 'flexibleCategoryGroups'],
    markStale: ['categoryGroups', 'stash', 'availableToStash'],
  },

  // Stash mutations
  stashSync: {
    invalidate: ['stash', 'availableToStash', 'monarchGoals'],
    markStale: ['dashboard', 'stashHistory'],
  },
  createStash: {
    invalidate: ['stash', 'availableToStash'],
    markStale: ['dashboard', 'categoryGroups', 'stashCategoryGroups'],
  },
  updateStash: {
    invalidate: ['stash'],
    markStale: ['availableToStash'],
  },
  deleteStash: {
    invalidate: ['stash', 'availableToStash'],
    markStale: ['dashboard', 'categoryGroups', 'stashCategoryGroups'],
  },
  archiveStash: {
    invalidate: ['stash'],
    markStale: ['availableToStash'],
  },
  unarchiveStash: {
    invalidate: ['stash'],
    markStale: ['availableToStash'],
  },
  completeStash: {
    invalidate: ['stash'],
    markStale: ['availableToStash', 'dashboard'],
  },
  uncompleteStash: {
    invalidate: ['stash'],
    markStale: ['availableToStash'],
  },
  allocateStash: {
    invalidate: ['stash', 'availableToStash', 'dashboard'],
    markStale: [],
  },
  allocateStashBatch: {
    invalidate: ['stash', 'availableToStash', 'dashboard'],
    markStale: [],
  },
  changeStashGroup: {
    invalidate: ['stash'],
    markStale: ['categoryGroups', 'stashCategoryGroups'],
  },
  linkStashCategory: {
    invalidate: ['stash'],
    markStale: ['categoryGroups', 'stashCategoryGroups', 'availableToStash'],
  },
  updateCategoryRollover: {
    invalidate: ['stash', 'availableToStash'],
    markStale: ['dashboard'],
  },
  updateGroupRollover: {
    invalidate: ['stash', 'availableToStash'],
    markStale: ['dashboard'],
  },
  skipPending: {
    invalidate: ['pendingBookmarks', 'pendingBookmarksCount', 'skippedBookmarks'],
    markStale: [],
  },
  convertPending: {
    invalidate: ['pendingBookmarks', 'pendingBookmarksCount', 'stash', 'availableToStash'],
    markStale: ['dashboard'],
  },
  importBookmarks: {
    invalidate: ['pendingBookmarks', 'pendingBookmarksCount'],
    markStale: [],
  },
  clearUnconvertedBookmarks: {
    invalidate: ['pendingBookmarks', 'pendingBookmarksCount'],
    markStale: [],
  },
  saveHypothesis: {
    invalidate: ['stashHypotheses'],
    markStale: [],
  },
  deleteHypothesis: {
    invalidate: ['stashHypotheses'],
    markStale: [],
  },

  // Notes mutations
  saveNote: {
    invalidate: ['monthNotes'],
    markStale: ['archivedNotes'],
  },
  deleteNote: {
    invalidate: ['monthNotes', 'archivedNotes'],
    markStale: [],
  },
  saveGeneralNote: {
    invalidate: ['monthNotes'],
    markStale: [],
  },
  deleteGeneralNote: {
    invalidate: ['monthNotes'],
    markStale: [],
  },

  // Config mutations
  updateStashConfig: {
    invalidate: ['stashConfig', 'availableToStash'],
    markStale: [],
  },
  updateSettings: {
    invalidate: ['dashboard'],
    markStale: ['stashConfig'],
  },
  importSettings: {
    invalidate: ['dashboard', 'stash', 'stashConfig', 'categoryStore'],
    markStale: ['availableToStash', 'categoryGroups'],
  },
};

// ============================================================================
// Page Query Requirements
// ============================================================================

/**
 * Defines what queries each page needs for accurate display.
 * Used by page-specific sync to refresh only relevant data.
 */
export const pageQueryMap: Record<PageName, PageQueryRequirements> = {
  recurring: {
    primary: ['dashboard'],
    supporting: ['categoryStore', 'categoryGroups'],
    syncScope: 'recurring',
  },
  stash: {
    primary: ['dashboard', 'stash', 'availableToStash', 'stashConfig'],
    supporting: ['monarchGoals', 'pendingBookmarks'],
    syncScope: 'stash',
  },
  notes: {
    primary: ['monthNotes'],
    supporting: ['categoryStore', 'archivedNotes'],
    syncScope: 'notes', // Notes don't need Monarch sync
  },
  settings: {
    primary: ['stashConfig'],
    supporting: ['dashboard', 'categoryGroups', 'autoSyncStatus'],
    syncScope: 'full', // Settings may affect everything
  },
};

// ============================================================================
// Background Polling Configuration
// ============================================================================

/**
 * Configuration for background polling while app is visible.
 */
export const pollingConfig = {
  /** How often to check for stale data (when app is visible) */
  pollInterval: 5 * 60 * 1000, // 5 minutes

  /** Which queries should be polled (must have pollable: true in queryConfig) */
  pollableQueries: Object.entries(queryConfig)
    .filter(([, config]) => config.pollable)
    .map(([key]) => key as QueryKeyName),

  /** Pause polling when rate limited */
  respectRateLimit: true,

  /** Only poll when app is in foreground */
  visibilityAware: true,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all queries that should be invalidated for a mutation.
 */
export function getInvalidationTargets(mutationType: MutationType): readonly QueryKeyName[] {
  return mutationEffects[mutationType]?.invalidate ?? [];
}

/**
 * Get all queries that should be marked stale for a mutation.
 */
export function getStaleTargets(mutationType: MutationType): readonly QueryKeyName[] {
  return mutationEffects[mutationType]?.markStale ?? [];
}

/**
 * Get primary queries for a page.
 */
export function getPagePrimaryQueries(page: PageName): readonly QueryKeyName[] {
  return pageQueryMap[page]?.primary ?? [];
}

/**
 * Get all queries (primary + supporting) for a page.
 */
export function getPageAllQueries(page: PageName): readonly QueryKeyName[] {
  const requirements = pageQueryMap[page];
  if (!requirements) return [];
  return [...requirements.primary, ...requirements.supporting];
}

/**
 * Get the sync scope for a page.
 */
export function getPageSyncScope(page: PageName): 'recurring' | 'stash' | 'notes' | 'full' {
  return pageQueryMap[page]?.syncScope ?? 'full';
}

/**
 * Check if a query is pollable.
 */
export function isQueryPollable(queryKey: QueryKeyName): boolean {
  return queryConfig[queryKey]?.pollable ?? false;
}
