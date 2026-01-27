/**
 * Query Hooks Index
 *
 * Re-exports all TanStack Query hooks for API data fetching and caching.
 */

// Keys
export { queryKeys, getQueryKey } from './keys';

// Dependencies (query configuration and invalidation registry)
export {
  queryConfig,
  mutationEffects,
  pageQueryMap,
  pollingConfig,
  getInvalidationTargets,
  getStaleTargets,
  getPagePrimaryQueries,
  getPageAllQueries,
  getPageSyncScope,
  isQueryPollable,
  type QueryKeyName,
  type PageName,
  type MutationType,
  type QueryConfig,
  type MutationEffect,
  type PageQueryRequirements,
} from './dependencies';

// Dashboard queries
export {
  useDashboardQuery,
  useCategoryGroupsQuery,
  useUnmappedCategoriesQuery,
  useDeletableCategoriesQuery,
  useDeploymentInfoQuery,
  useSyncMutation,
  useInvalidateDashboard,
} from './dashboardQueries';

// Security queries
export {
  useSecurityStatusQuery,
  useSecurityEventsQuery,
  useSecuritySummaryQuery,
  useSecurityAlertsQuery,
  useDismissSecurityAlertsMutation,
  useExportSecurityEventsMutation,
} from './securityQueries';

// Item mutations
export {
  useToggleItemMutation,
  useAllocateFundsMutation,
  useRecreateCategoryMutation,
  useRefreshItemMutation,
  useChangeCategoryGroupMutation,
} from './itemMutations';

// Rollup mutations
export {
  useAddToRollupMutation,
  useRemoveFromRollupMutation,
  useSetRollupBudgetMutation,
  useUpdateRollupEmojiMutation,
  useUpdateRollupNameMutation,
} from './rollupMutations';

// Category mutations
export {
  useUpdateCategoryEmojiMutation,
  useUpdateCategoryNameMutation,
  useLinkToCategoryMutation,
} from './categoryMutations';

// Settings mutations and queries
export {
  useUpdateSettingsMutation,
  useSetConfigMutation,
  useExportSettingsMutation,
  useImportSettingsMutation,
  usePreviewImportMutation,
  useAutoSyncStatusQuery,
} from './settingsMutations';

// Uninstall mutations
export {
  useDeleteAllCategoriesMutation,
  useCancelSubscriptionMutation,
} from './uninstallMutations';

// Version queries
export {
  useVersionQuery,
  useChangelogQuery,
  useVersionCheckQuery,
  useChangelogStatusQuery,
  useMarkChangelogReadMutation,
} from './versionQueries';

// Notes queries
export {
  useAllNotesQuery,
  useMonthNotesQuery,
  useArchivedNotesQuery,
  useNoteHistoryQuery,
  useSaveCategoryNoteMutation,
  useDeleteCategoryNoteMutation,
  useSaveGeneralNoteMutation,
  useDeleteGeneralNoteMutation,
  useDeleteArchivedNoteMutation,
  useSyncNotesCategoriesMutation,
  useInvalidateNotes,
  useCheckboxStatesQuery,
  useGeneralCheckboxStatesQuery,
  useMonthCheckboxStatesQuery,
  useUpdateCheckboxStateMutation,
} from './notesQueries';

// Category store (normalized cache for cross-feature category data)
export {
  useCategoryStore,
  useCategoriesByGroup,
  useCategory,
  useCategoryName,
  useGroup,
  useAllCategories,
  useUpdateCategoryInCache,
  useUpdateGroupInCache,
  useGetCategoryFromCache,
  useGetGroupFromCache,
  useRefreshCategoryStore,
  useInvalidateCategoryStore,
} from './categoryStoreQueries';

// Category group store (normalized cache for category groups and unmapped categories)
export {
  useCategoryGroupsStore,
  useUnmappedCategoriesStore,
  useCategoryGroupsList,
  useCategoryGroup,
  useUnmappedCategoriesList,
  useUnmappedCategoriesByGroup,
  useUnmappedCategory,
  useRefreshCategoryGroups,
  useRefreshUnmappedCategories,
  useRemoveFromUnmappedCache,
  // Detailed category groups (with rollover/flexible settings)
  useCategoryGroupsDetailed,
  useFlexibleCategoryGroups,
  useRefreshFlexibleCategoryGroups,
  useUpdateCategoryGroupSettings,
} from './categoryGroupStoreQueries';

// Config store (selectors for config data, derived from dashboard)
export {
  useConfig,
  useIsConfigured,
  useTargetGroup,
  useAutoSyncSettings,
  useDisplayPreferences,
  useUserInfo,
  useGetConfigFromCache,
  useUpdateConfigInCache,
} from './configStoreQueries';

// Stash queries
export {
  useStashQuery,
  useStashConfigQuery,
  useStashCategoryGroupsQuery,
  useUpdateStashConfigMutation,
  useIsStashConfigured,
  useCreateStashMutation,
  useUpdateStashMutation,
  useArchiveStashMutation,
  useUnarchiveStashMutation,
  useCompleteStashMutation,
  useUncompleteStashMutation,
  useDeleteStashMutation,
  useAllocateStashMutation,
  useAllocateStashBatchMutation,
  useChangeStashGroupMutation,
  useLinkStashCategoryMutation,
  useStashSyncMutation,
  useUpdateStashLayoutMutation,
  useInvalidateStash,
  // Category rollover balance
  useUpdateCategoryRolloverMutation,
  // Group rollover balance (for flexible groups)
  useUpdateGroupRolloverMutation,
  // Pending bookmarks
  usePendingBookmarksQuery,
  usePendingCountQuery,
  useSkippedBookmarksQuery,
  useSkipPendingMutation,
  useConvertPendingMutation,
  useImportBookmarksMutation,
  useClearUnconvertedBookmarksMutation,
  useInvalidatePendingBookmarks,
  // Hypotheses
  useHypothesesQuery,
  useSaveHypothesisMutation,
  useDeleteHypothesisMutation,
} from './stashQueries';

// Available to Stash queries
export {
  useAvailableToStashDataQuery,
  useAvailableToStash,
  useAvailableAmount,
} from './availableToStashQueries';

// Stash History (Reports) queries
export { useStashHistoryQuery, useInvalidateStashHistory } from './stashHistoryQueries';

// Monarch Goals queries
export { useMonarchGoalsQuery, useUpdateMonarchGoalLayoutsMutation } from './monarchGoalQueries';

// Openverse (image search) queries
export { useOpenverseSearch, generateOpenverseAttribution } from './openverseQueries';
