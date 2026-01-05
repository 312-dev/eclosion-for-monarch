/**
 * Query Keys
 *
 * Centralized query key definitions and helper for demo mode suffix.
 */

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  categoryGroups: ['categoryGroups'] as const,
  unmappedCategories: ['unmappedCategories'] as const,
  deletableCategories: ['deletableCategories'] as const,
  securityStatus: ['securityStatus'] as const,
  securityEvents: ['securityEvents'] as const,
  securitySummary: ['securitySummary'] as const,
  securityAlerts: ['securityAlerts'] as const,
  deploymentInfo: ['deploymentInfo'] as const,
  version: ['version'] as const,
  changelog: ['changelog'] as const,
  versionCheck: ['versionCheck'] as const,
  changelogStatus: ['changelogStatus'] as const,
};

/**
 * Helper to get query key with demo mode suffix
 */
export function getQueryKey(baseKey: readonly string[], isDemo: boolean): readonly string[] {
  return [...baseKey, isDemo ? 'demo' : 'prod'] as const;
}
