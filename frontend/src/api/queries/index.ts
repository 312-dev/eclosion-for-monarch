/**
 * Query Hooks Index
 *
 * Re-exports all TanStack Query hooks for API data fetching and caching.
 */

// Keys
export { queryKeys, getQueryKey } from './keys';

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

// Settings mutations
export {
  useUpdateSettingsMutation,
  useSetConfigMutation,
  useExportSettingsMutation,
  useImportSettingsMutation,
  usePreviewImportMutation,
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
