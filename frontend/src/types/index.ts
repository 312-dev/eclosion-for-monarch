/**
 * Type Definitions
 *
 * Re-exports all types from domain-specific files for convenient importing.
 *
 * Usage:
 *   import type { RecurringItem, AuthStatus, DashboardData } from '../types';
 */

// Common types (shared across domains)
export type { ItemStatus } from './common';

// Savings goal base types (shared between recurring and wishlist)
export type { SavingsGoalBase, SavingsGoalComputed } from './savingsGoal';

// Wishlist items
export type {
  WishlistItem,
  CreateWishlistItemRequest,
  UpdateWishlistItemRequest,
  WishlistSyncResult,
  WishlistLayoutUpdate,
  WishlistData,
} from './wishlist';

// Wishlist configuration
export type {
  WishlistConfig,
  WishlistWizardState,
  CategoryMappingChoice,
  CategoryMappingRequest,
  WishlistImageUploadResult,
} from './wishlistConfig';

// Recurring items and rollup
export type { RecurringItem, RollupItem, RollupData } from './recurring';

// Dashboard and summary data
export type {
  DashboardSummary,
  DashboardConfig,
  ReadyToAssign,
  RemovedItemNotice,
  DashboardData,
} from './dashboard';

// Authentication and security
export type {
  AuthStatus,
  LoginResult,
  SetPassphraseResult,
  UnlockResult,
  UpdateCredentialsResult,
  SecurityStatus,
} from './auth';

// Category operations
export type {
  CategoryGroup,
  UnmappedCategory,
  LinkCategoryResult,
  DeletableCategory,
  DeletableCategoriesResult,
  DeleteCategoriesResult,
  ResetDedicatedResult,
  ResetRollupResult,
} from './category';

// Version and changelog
export type {
  ChangelogSection,
  ChangelogEntry,
  VersionInfo,
  ChangelogResponse,
  VersionCheckResult,
  ChangelogStatusResult,
  MarkChangelogReadResult,
  DeploymentInfo,
} from './version';

// Sync operations and settings
export type {
  Settings,
  SyncResult,
  AllocateResult,
  ResetAppResult,
  AutoSyncStatus,
  EnableAutoSyncResult,
  DisableAutoSyncResult,
} from './sync';

// Settings export/import
export type {
  EclosionExportMetadata,
  RecurringExportConfig,
  RecurringExportCategory,
  RecurringExportRollup,
  RecurringExport,
  AppSettingsExport,
  EclosionExport,
  ImportOptions,
  ImportResult,
  ImportPreview,
  ImportPreviewResponse,
} from './settings-export';

// Security events and audit logging
export type {
  SecurityEvent,
  SecurityEventsResponse,
  SecurityEventSummary,
  SecurityAlertsResponse,
  SecurityAlertEvent,
  SecurityEventType,
  SecurityEventsQueryOptions,
} from './security';

// Bookmark sync
export type {
  BrowserType,
  PermissionStatus,
  Bookmark,
  DetectedBrowser,
  BookmarkFolder,
  BookmarkSyncConfig,
  BookmarkChange,
  BookmarkSyncResult,
  PermissionResult,
} from './bookmarks';

// Monthly notes
export type {
  MonthKey,
  CategoryReference,
  Note,
  GeneralMonthNote,
  MonthMetadata,
  ArchivedNote,
  EffectiveNote,
  CategoryGroupWithNotes,
  CategoryWithNotes,
  MonthNotesState,
  NoteVersion,
  NoteRevisionHistory,
  SaveCategoryNoteRequest,
  SaveGeneralNoteRequest,
  ExportNotesRequest,
  SaveNoteResponse,
  GetMonthNotesResponse,
  GetRevisionHistoryResponse,
} from './notes';

// Pending bookmarks (review workflow)
export type {
  PendingBookmark,
  PendingBookmarkStatus,
  PendingBookmarksResponse,
  PendingCountResponse,
  ImportBookmark,
  ImportBookmarksResponse,
  PendingBookmarkActionResponse,
} from './pendingBookmark';
