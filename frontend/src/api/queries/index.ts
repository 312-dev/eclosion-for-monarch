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
