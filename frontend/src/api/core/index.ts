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
export { getDashboard, triggerSync } from './dashboard';

// Categories
export {
  getCategoryGroups,
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

// Wishlist
export {
  getWishlist,
  createWishlistItem,
  updateWishlistItem,
  archiveWishlistItem,
  unarchiveWishlistItem,
  deleteWishlistItem,
  allocateWishlistFunds,
  changeWishlistGroup,
  linkWishlistCategory,
  syncWishlist,
  reorderWishlistItems,
  updateWishlistLayouts,
  getWishlistCategoryGroups,
  getWishlistConfig,
  updateWishlistConfig,
  // Pending bookmarks
  getPendingBookmarks,
  getPendingCount,
  getSkippedBookmarks,
  skipPendingBookmark,
  convertPendingBookmark,
  importBookmarks,
  clearUnconvertedBookmarks,
} from './wishlist';
