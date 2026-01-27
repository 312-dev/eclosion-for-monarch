/**
 * Core API Module
 *
 * Re-exports all API functions for convenient importing.
 */

// Fetch utilities and errors
export { fetchApi, fetchBlob, AuthRequiredError, RateLimitError } from './fetchApi';

// Auth
export {
  checkAuthStatus,
  validateAuth,
  login,
  setPassphrase,
  unlockCredentials,
  updateCredentials,
  resetApp,
  lockCredentials,
  logout,
  reauthenticate,
  desktopLogin,
  type ReauthResult,
  type DesktopLoginResult,
} from './auth';

// Security
export {
  getSecurityStatus,
  getSecurityEvents,
  getSecuritySummary,
  exportSecurityEvents,
  getSecurityAlerts,
  dismissSecurityAlerts,
} from './security';

// Dashboard
export { getDashboard, triggerSync, triggerScopedSync, type SyncScope } from './dashboard';

// Categories
export {
  getCategoryGroups,
  getCategoryGroupsDetailed,
  getFlexibleCategoryGroups,
  updateCategoryGroupSettings,
  setConfig,
  getUnmappedCategories,
  linkToCategory,
  updateCategoryEmoji,
  updateCategoryName,
  clearCategoryCache,
} from './categories';

// Items
export {
  toggleItemTracking,
  allocateFunds,
  recreateCategory,
  refreshItem,
  changeCategoryGroup,
} from './items';

// Rollup
export {
  getRollupData,
  addToRollup,
  removeFromRollup,
  setRollupBudget,
  linkRollupToCategory,
  createRollupCategory,
  updateRollupEmoji,
  updateRollupCategoryName,
} from './rollup';

// Settings
export {
  getSettings,
  updateSettings,
  exportSettings,
  importSettings,
  previewImport,
} from './settings';

// Version
export {
  getVersion,
  checkVersion,
  getChangelogStatus,
  markChangelogRead,
  getAvailableReleases,
  getUpdateInfo,
  type Release,
  type ReleasesResponse,
  type UpdateInfo,
} from './version';

// Notes
export {
  getMonthNotes,
  getAllNotes,
  saveCategoryNote,
  deleteCategoryNote,
  getGeneralNote,
  saveGeneralNote,
  deleteGeneralNote,
  getArchivedNotes,
  deleteArchivedNote,
  syncNotesCategories,
  getNoteHistory,
  getNotesCategories,
  getCheckboxStates,
  getGeneralCheckboxStates,
  updateCheckboxState,
  getMonthCheckboxStates,
  getInheritanceImpact,
  type AllNotesResponse,
} from './notes';

// Misc (auto-sync, deployment, notices, uninstall, migration)
export {
  getAutoSyncStatus,
  enableAutoSync,
  disableAutoSync,
  setAutoSyncVisibility,
  dismissNotice,
  getDeploymentInfo,
  cancelSubscription,
  getDeletableCategories,
  deleteAllCategories,
  resetDedicatedCategories,
  resetRollup,
  resetRecurringTool,
  getMigrationStatus,
  executeMigration,
  listBackups,
  createBackup,
  restoreBackup,
  type DeploymentInfo,
  type CancelSubscriptionResult,
  type ResetRecurringToolResult,
  type MigrationStatus,
  type Backup,
  type ExecuteMigrationResult,
  type BackupsResponse,
  type SetVisibilityResult,
} from './misc';

// Available to Stash
export { getAvailableToStashData } from './availableToStash';

// Stash
export {
  getStash,
  createStashItem,
  updateStashItem,
  archiveStashItem,
  unarchiveStashItem,
  completeStashItem,
  uncompleteStashItem,
  deleteStashItem,
  allocateStashFunds,
  allocateStashFundsBatch,
  changeStashGroup,
  linkStashCategory,
  syncStash,
  reorderStashItems,
  updateStashLayouts,
  getStashCategoryGroups,
  getStashConfig,
  updateStashConfig,
  // Pending bookmarks
  getPendingBookmarks,
  getPendingCount,
  getSkippedBookmarks,
  skipPendingBookmark,
  convertPendingBookmark,
  importBookmarks,
  clearUnconvertedBookmarks,
  // Favicon fetching
  fetchFavicon,
  // Stash history (reports)
  getStashHistory,
  // Category rollover balance
  updateCategoryRolloverBalance,
  // Group rollover balance (for flexible groups)
  updateGroupRolloverBalance,
  // Hypotheses
  getHypotheses,
  saveHypothesis,
  deleteHypothesis,
} from './stash';

// Openverse (external image search API)
export {
  searchImages as searchOpenverseImages,
  generateAttribution as generateOpenverseAttribution,
} from './openverse';
