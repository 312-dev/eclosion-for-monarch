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

// Savings goal base types (shared between recurring and stash)
export type { SavingsGoalBase, SavingsGoalComputed } from './savingsGoal';

// Stash items (savings goals)
export type {
  StashGoalType,
  StashItem,
  CreateStashItemRequest,
  UpdateStashItemRequest,
  StashSyncResult,
  StashLayoutUpdate,
  StashData,
  StashHypothesis,
  SaveHypothesisRequest,
  SaveHypothesisResponse,
  GetHypothesesResponse,
  DeleteHypothesisResponse,
} from './stash';

// Stash configuration
export type {
  StashConfig,
  StashWizardState,
  CategoryMappingChoice,
  CategoryMappingRequest,
  StashImageUploadResult,
} from './stashConfig';

// Stash events (ephemeral, for hypothetical projections)
export type { StashEvent, StashEventType, StashEventsMap } from './stashEvent';

// Timeline types (for hypothesize mode emulator)
export type {
  TimelineResolution,
  NamedEventType,
  NamedEvent,
  TimelineDataPoint,
  TimelineItemConfig,
  TimelineZoomState,
  ProjectedCardState,
  EditingEventContext,
  TimelineScenarioState,
  TimelineProjectionResult,
  TimelineProjectionInput,
} from './timeline';
export { createDefaultTimelineState, DEFAULT_TIMELINE_ZOOM } from './timeline';

// Monarch goals (displayed in Stash grid)
export type { GoalStatus, MonarchGoal, MonarchGoalLayoutUpdate } from './monarchGoal';

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
  CategoryGroupDetailed,
  CategoryGroupRolloverPeriod,
  UpdateCategoryGroupSettingsRequest,
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
  NotesExportCategoryNote,
  NotesExportGeneralNote,
  NotesExportArchivedNote,
  NotesExport,
  StashExportConfig,
  StashExportItem,
  StashExportBookmark,
  StashExport,
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

// Available Funds calculation
export type {
  AccountBalance,
  CategoryBudget,
  GoalBalance,
  StashItemBalance,
  AvailableToStashData,
  AvailableToStashOptions,
  AvailableToStashBreakdown,
  AvailableToStashResult,
  BreakdownLineItem,
  DetailedBreakdown,
} from './availableToStash';
export {
  CASH_ACCOUNT_TYPES,
  CREDIT_CARD_ACCOUNT_TYPES,
  DEBT_ACCOUNT_TYPES,
  isCashAccount,
  isCreditCardAccount,
  isDebtAccount,
} from './availableToStash';

// Stash history and reports
export type {
  StashMonthData,
  StashHistoryItem,
  StashHistoryResponse,
  StashReportTimeRange,
  StashReportTabMode,
  StashReportSettings,
} from './stashHistory';
export { DEFAULT_REPORT_SETTINGS, timeRangeToMonths } from './stashHistory';

// Openverse image search
export type {
  OpenverseCredentials,
  OpenverseAccessToken,
  OpenverseImage,
  OpenverseSearchRequest,
  OpenverseLicenseFilter,
  OpenverseSearchResult,
  OpenverseRegisterRequest,
  OpenverseRegisterResponse,
  OpenverseTokenRequest,
  OpenverseTokenResponse,
  ImageSelection,
} from './openverse';
