/**
 * Demo API Module
 *
 * Re-exports all demo API functions for convenient importing.
 */

// State management
export { resetDemoData, DEMO_VERSION } from './demoState';

// Dashboard
export { getDashboard, triggerSync } from './demoDashboard';

// Categories
export {
  getCategoryGroups,
  getCategoryGroupsDetailed,
  getFlexibleCategoryGroups,
  updateCategoryGroupSettings,
  setConfig,
  getUnmappedCategories,
  updateCategoryEmoji,
  updateCategoryName,
  linkToCategory,
  linkRollupToCategory,
} from './demoCategories';

// Items
export {
  toggleItemTracking,
  allocateFunds,
  recreateCategory,
  refreshItem,
  changeCategoryGroup,
} from './demoItems';

// Rollup
export {
  getRollupData,
  addToRollup,
  removeFromRollup,
  setRollupBudget,
  updateRollupEmoji,
  updateRollupCategoryName,
  createRollupCategory,
} from './demoRollup';

// Settings
export {
  getSettings,
  updateSettings,
  exportSettings,
  importSettings,
  previewImport,
} from './demoSettings';

// Security
export {
  getSecurityStatus,
  getSecurityEvents,
  getSecuritySummary,
  exportSecurityEvents,
  getSecurityAlerts,
  dismissSecurityAlerts,
} from './demoSecurity';

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
} from './demoVersion';

// Misc
export {
  getAutoSyncStatus,
  getDeploymentInfo,
  dismissNotice,
  clearCategoryCache,
} from './demoMisc';

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
} from './demoNotes';

// Stash
export {
  getStash,
  createStashItem,
  updateStashItem,
  archiveStashItem,
  unarchiveStashItem,
  deleteStashItem,
  completeStashItem,
  uncompleteStashItem,
  allocateStashFunds,
  allocateStashFundsBatch,
  changeStashGroup,
  linkStashCategory,
  syncStash,
  fetchOgImage,
  fetchFavicon,
  reorderStashItems,
  updateStashLayouts,
  getStashCategoryGroups,
  getStashConfig,
  updateStashConfig,
  // Available Funds
  getAvailableToStashData,
  // Category rollover balance
  updateCategoryRolloverBalance,
  // Group rollover balance (for flexible groups)
  updateGroupRolloverBalance,
  // Pending bookmarks
  getPendingBookmarks,
  getPendingCount,
  getSkippedBookmarks,
  skipPendingBookmark,
  convertPendingBookmark,
  importBookmarks,
  clearUnconvertedBookmarks,
  // Hypotheses
  getHypotheses,
  saveHypothesis,
  deleteHypothesis,
} from './demoStash';

// Stash History (Reports)
export { getStashHistory } from './demoStashHistory';

// Monarch Goals
export { getMonarchGoals, updateMonarchGoalLayouts } from './demoMonarchGoals';

// Openverse (image search)
export {
  searchImages as searchOpenverseImages,
  generateAttribution as generateOpenverseAttribution,
} from './demoOpenverse';
