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
