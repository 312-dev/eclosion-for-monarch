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
  remoteUnlock,
  type ReauthResult,
  type DesktopLoginResult,
  type RemoteUnlockResult,
} from './auth';

// OTP (tunnel access detection — verification handled by edge gate Worker)
export { isTunnelAccess } from './otp';

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
export { toggleItemTracking, allocateFunds, recreateCategory, changeCategoryGroup } from './items';

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

// Acknowledgements
export {
  getAcknowledgements,
  updateAcknowledgements,
  type AcknowledgementsData,
} from './acknowledgements';

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

// Misc (deployment, notices, uninstall, migration)
export {
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
  updateBookmarkFavicons,
  // Favicon fetching
  fetchFavicon,
  // Stash history (reports)
  getStashHistory,
  // Category balance lookup
  getCategoryBalance,
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

// Refundables
export {
  getRefundablesConfig,
  updateRefundablesConfig,
  getRefundablesTags,
  getRefundablesViews,
  createRefundablesView,
  updateRefundablesView,
  deleteRefundablesView,
  reorderRefundablesViews,
  getRefundablesTransactions,
  searchRefundablesTransactions,
  getRefundablesMatches,
  createRefundablesMatch,
  deleteRefundablesMatch,
  getRefundablesPendingCount,
} from './refundables';
