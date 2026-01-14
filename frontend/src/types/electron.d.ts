/* eslint-disable max-lines -- Type declaration file for all Electron APIs */
/**
 * Electron API Type Declarations
 *
 * Types for the Electron API exposed via the preload script.
 * This API is available on `window.electron` when running in desktop mode.
 */

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export interface AppInfo {
  version: string;
  platform: string;
  arch: string;
  isPackaged: boolean;
  name: string;
}

export interface BackendStatus {
  running: boolean;
  port: number;
}

export interface UpdateStatus {
  updateAvailable: boolean;
  updateDownloaded: boolean;
  updateInfo: UpdateInfo | null;
  currentVersion: string;
  channel: 'stable' | 'beta';
}

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ErrorDialogOptions {
  title: string;
  content: string;
}

export interface SyncResult {
  success: boolean;
  error?: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
}

export interface DesktopSettings {
  menuBarMode: boolean;
  autoStart: boolean;
}

export interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export interface LogFileContent {
  content?: string;
  totalLines?: number;
  displayedLines?: number;
  truncated?: boolean;
  error?: string;
}

export interface ReadLogOptions {
  lines?: number;
  search?: string;
}

export interface HealthStatus {
  running: boolean;
  lastSync?: string;
}

export interface BackendStatusChange {
  running: boolean;
  lastSync?: string;
  timestamp: string;
}

export type BackendStartupPhase = 'initializing' | 'spawning' | 'waiting_for_health' | 'ready' | 'failed';

export interface BackendStartupStatus {
  phase: BackendStartupPhase;
  message: string;
  progress: number;
  error?: string;
}

export interface BackupResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  error?: string;
  filesRestored?: number;
  settingsRestored?: boolean;
}

export type HotkeyAction = 'toggle-window' | 'trigger-sync';

export interface HotkeyConfig {
  enabled: boolean;
  accelerator: string;
}

export type HotkeyConfigs = Record<HotkeyAction, HotkeyConfig>;

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: 'tray' | 'rocket' | 'keyboard' | 'link' | 'sync' | 'settings';
  tip?: string;
}

export interface OnboardingData {
  shouldShow: boolean;
  steps: OnboardingStep[];
  version: number;
}

export interface StartupMetrics {
  totalStartup: number;
  appReady: number;
  backendStart: number;
  windowCreate: number;
  postWindow: number;
  timestamp: string;
  version: string;
}

export interface StartupMetricsHistory extends StartupMetrics {
  id: string;
}

export interface StartupMetricsData {
  current: StartupMetrics | null;
  average: Partial<StartupMetrics> | null;
  history: StartupMetricsHistory[];
}

export interface CleanupResultData {
  success: boolean;
  filesDeleted: string[];
  errors: string[];
}

export interface FactoryResetResult {
  confirmed: boolean;
  result?: CleanupResultData;
}

export interface CleanupInstructions {
  platform: string;
  dataPath: string;
  instructions: string;
}

// Biometric Authentication Types

export type BiometricType = 'touchId' | 'windowsHello' | null;

// Lock Management Types

export type LockTrigger =
  | 'system-lock'
  | 'idle-1'
  | 'idle-5'
  | 'idle-15'
  | 'idle-30'
  | 'never';

export interface LockOption {
  value: LockTrigger;
  label: string;
}

export interface LockAPI {
  getTrigger: () => Promise<LockTrigger>;
  setTrigger: (trigger: LockTrigger) => Promise<void>;
  getOptions: () => Promise<LockOption[]>;
  lockApp: () => Promise<void>;
  onLocked: (callback: (data: { reason: string }) => void) => () => void;
}

// Lockout State API (persists failed login attempts)

export interface LockoutState {
  failedAttempts: number;
  cooldownUntil: number | null;
}

export interface LockoutAPI {
  getState: () => Promise<LockoutState>;
  setState: (state: LockoutState) => Promise<void>;
  clear: () => Promise<void>;
}

// Periodic Sync Types (scheduled sync while app is running)

export interface PeriodicSyncSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export interface PeriodicSyncInterval {
  value: number;
  label: string;
}

export interface PeriodicSyncAPI {
  getSettings: () => Promise<PeriodicSyncSettings>;
  getIntervals: () => Promise<PeriodicSyncInterval[]>;
  setEnabled: (enabled: boolean) => Promise<PeriodicSyncSettings>;
  setInterval: (intervalMinutes: number) => Promise<PeriodicSyncSettings>;
}

// Background Sync Types (sync when app is closed, via system scheduler)

export interface BackgroundSyncStatus {
  installed: boolean;
  intervalMinutes: number;
}

export interface BackgroundSyncInterval {
  value: number;
  label: string;
}

export interface BackgroundSyncResult {
  success: boolean;
  intervalMinutes?: number;
  error?: string;
}

export interface BackgroundSyncAPI {
  getStatus: () => Promise<BackgroundSyncStatus>;
  getIntervals: () => Promise<BackgroundSyncInterval[]>;
  enable: (intervalMinutes: number, passphrase: string) => Promise<BackgroundSyncResult>;
  disable: () => Promise<BackgroundSyncResult>;
  setInterval: (intervalMinutes: number) => Promise<BackgroundSyncResult>;
}

// Auto-Backup Types (encrypted daily backups)

export interface AutoBackupSettings {
  enabled: boolean;
  folderPath: string | null;
  retentionDays: number;
  lastBackupDate: string | null;
  scheduledTime: string; // HH:MM format (24-hour)
}

export interface AutoBackupRetentionOption {
  value: number;
  label: string;
}

export interface AutoBackupFileInfo {
  filename: string;
  filePath: string;
  date: string;
  createdAt: string;
  sizeBytes: number;
}

export interface AutoBackupResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export interface AutoBackupRestoreResult {
  success: boolean;
  needsCredentials: boolean;
  imported?: Record<string, boolean>;
  warnings?: string[];
  error?: string;
}

export interface AutoBackupInfo {
  valid: boolean;
  version?: number;
  createdAt?: string;
  error?: string;
}

export interface AutoBackupAPI {
  getSettings: () => Promise<AutoBackupSettings>;
  setEnabled: (enabled: boolean) => Promise<void>;
  selectFolder: () => Promise<string | null>;
  openFolder: () => Promise<void>;
  setRetention: (days: number) => Promise<void>;
  setScheduledTime: (time: string) => Promise<void>;
  getRetentionOptions: () => Promise<AutoBackupRetentionOption[]>;
  runNow: () => Promise<AutoBackupResult>;
  listBackups: () => Promise<AutoBackupFileInfo[]>;
  getInfo: (filePath: string) => Promise<AutoBackupInfo>;
  restore: (filePath: string, passphrase?: string) => Promise<AutoBackupRestoreResult>;
}

// Pending Sync API (for menu-triggered sync when locked)

export interface PendingSyncAPI {
  /** Check if there's a pending sync waiting for authentication */
  hasPending: () => Promise<boolean>;
  /** Clear the pending sync state */
  clearPending: () => Promise<void>;
  /** Execute pending sync after authentication with passphrase */
  executePending: (passphrase: string) => Promise<SyncResult>;
  /** Listen for pending sync requests from main process */
  onSyncPending: (callback: () => void) => () => void;
  /** Notify main process that a sync completed, to update tray menu */
  notifyCompleted: (lastSyncIso: string) => Promise<void>;
}

export interface BiometricAuthResult {
  success: boolean;
  passphrase?: string;
  error?: string;
}

export interface StoredCredentials {
  email: string;
  password: string;
  /** TOTP secret (only stored if mfaMode is 'secret') */
  mfaSecret?: string;
  /** MFA mode: 'secret' for TOTP secrets, 'code' for ephemeral 6-digit codes */
  mfaMode?: 'secret' | 'code';
}

export interface CredentialsAuthResult {
  success: boolean;
  credentials?: StoredCredentials;
  error?: string;
}

export interface CredentialsAPI {
  store: (credentials: StoredCredentials) => Promise<boolean>;
  get: () => Promise<StoredCredentials | null>;
  has: () => Promise<boolean>;
  clear: () => Promise<void>;
  getRequireTouchId: () => Promise<boolean>;
  setRequireTouchId: (required: boolean) => Promise<void>;
  authenticate: () => Promise<CredentialsAuthResult>;
  clearAll: () => Promise<void>;
  /** Get or create the notes encryption key for desktop mode */
  getNotesKey: () => Promise<string>;
}

/** Result of Touch ID setup prompt */
export interface TouchIdSetupResult {
  success: boolean;
  error?: string;
}

/** Result of fallback credential validation */
export interface FallbackValidationResult {
  success: boolean;
  error?: string;
}

export interface BiometricAPI {
  isAvailable: () => Promise<boolean>;
  getType: () => Promise<BiometricType>;
  getDisplayName: () => Promise<string>;
  isEnrolled: () => Promise<boolean>;
  enroll: (passphrase: string) => Promise<boolean>;
  authenticate: () => Promise<BiometricAuthResult>;
  clear: () => Promise<void>;
  getStoredPassphrase: () => Promise<string | null>;
  /** Check if passphrase is stored (for sync, regardless of biometric status) */
  isPassphraseStored: () => Promise<boolean>;
  /** Store passphrase for background sync (without enabling biometric unlock) */
  storeForSync: (passphrase: string) => Promise<boolean>;
  /** Prompt Touch ID during setup to verify user can use it */
  promptForSetup: () => Promise<TouchIdSetupResult>;
  /** Validate credentials for fallback authentication when Touch ID fails */
  validateFallback: (email: string, password: string) => Promise<FallbackValidationResult>;
}

export interface ElectronAPI {
  // Backend Communication
  getBackendPort: () => Promise<number>;
  getDesktopSecret: () => Promise<string>;
  getBackendStatus: () => Promise<BackendStatus>;
  isBackendStartupComplete: () => Promise<boolean>;
  onBackendStartupStatus: (callback: (status: BackendStartupStatus) => void) => () => void;
  triggerSync: () => Promise<SyncResult>;
  getHealthStatus: () => Promise<HealthStatus>;
  onBackendStatusChanged: (callback: (status: BackendStatusChange) => void) => () => void;

  // Auto-Start
  getAutoStartStatus: () => Promise<boolean>;
  setAutoStart: (enabled: boolean) => Promise<boolean>;

  // Updates
  checkForUpdates: () => Promise<UpdateCheckResult>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  getUpdateChannel: () => Promise<'stable' | 'beta'>;
  quitAndInstall: () => Promise<void>;
  /** Check if auto-update is enabled (when disabled, updates are shown but not auto-downloaded) */
  getAutoUpdateEnabled: () => Promise<boolean>;
  /** Enable or disable auto-update */
  setAutoUpdateEnabled: (enabled: boolean) => Promise<boolean>;
  /** Manually download an available update (use when auto-update is disabled) */
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;

  // Update event listeners
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void;
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void;
  onUpdateError: (callback: (error: { message: string }) => void) => () => void;

  // Native Dialogs
  showConfirmDialog: (options: ConfirmDialogOptions) => Promise<boolean>;
  showErrorDialog: (options: ErrorDialogOptions) => Promise<void>;

  // App Info
  getAppInfo: () => Promise<AppInfo>;
  isDesktop: () => Promise<boolean>;

  // Navigation
  onNavigate: (callback: (path: string) => void) => () => void;

  // Desktop Settings
  getDesktopSettings: () => Promise<DesktopSettings>;
  setMenuBarMode: (enabled: boolean) => Promise<boolean>;
  getStateDir: () => Promise<string>;
  revealDataFolder: () => Promise<void>;

  // Log Viewer
  getLogFiles: () => Promise<LogFileInfo[]>;
  readLogFile: (filePath: string, options?: ReadLogOptions) => Promise<LogFileContent>;

  // Backup & Restore
  createBackup: () => Promise<BackupResult>;
  restoreBackup: () => Promise<RestoreResult>;
  getBackupWarning: () => Promise<string>;
  getRestoreWarning: () => Promise<string>;

  // Global Hotkeys
  getHotkeyConfigs: () => Promise<HotkeyConfigs>;
  setHotkeyConfig: (action: HotkeyAction, config: HotkeyConfig) => Promise<boolean>;
  validateShortcut: (accelerator: string, currentAction?: HotkeyAction) => Promise<string | null>;
  resetHotkeys: () => Promise<void>;

  // Onboarding
  getOnboardingData: () => Promise<OnboardingData>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;

  // Startup Metrics
  getStartupMetrics: () => Promise<StartupMetricsData>;
  clearStartupMetrics: () => Promise<void>;

  // Data Cleanup
  showFactoryResetDialog: () => Promise<FactoryResetResult>;
  getCleanupInstructions: () => Promise<CleanupInstructions>;

  // Biometric Authentication
  biometric: BiometricAPI;

  // Credentials Storage (desktop mode)
  credentials: CredentialsAPI;

  // Lock Management
  lock: LockAPI;

  // Lockout State (failed login attempts)
  lockout: LockoutAPI;

  // Pending Sync (for menu-triggered sync when locked)
  pendingSync: PendingSyncAPI;

  // Periodic Sync (scheduled sync while app is running)
  periodicSync: PeriodicSyncAPI;

  // Background Sync (sync when app is closed)
  backgroundSync: BackgroundSyncAPI;

  // Auto-Backup (encrypted daily backups)
  autoBackup: AutoBackupAPI;

  // Re-authentication (for expired MFA sessions)
  reauth: ReauthAPI;

  // Rate Limit (for handling Monarch API 429 responses)
  rateLimit?: RateLimitAPI;

  // Window Mode (compact for loading/login, full for main app)
  windowMode: WindowModeAPI;
}

/** Rate Limit API for handling Monarch API 429 responses */
export interface RateLimitAPI {
  /** Listen for rate limit events from main process (e.g., during session restore) */
  onRateLimited: (callback: (data: { retryAfter: number }) => void) => () => void;
}

/** Data sent when MFA is required during session restore */
export interface MfaRequiredData {
  email: string;
  mfaMode: 'secret' | 'code';
}

/** Re-authentication API for handling expired MFA sessions */
export interface ReauthAPI {
  /** Listen for re-authentication requests from the main process */
  onNeedsReauth: (callback: () => void) => () => void;
  /** Listen for MFA required events during session restore (e.g., 6-digit code users on restart) */
  onMfaRequired: (callback: (data: MfaRequiredData) => void) => () => void;
  /** Submit MFA code to complete session restore */
  submitMfaCode: (mfaCode: string, mfaMode: 'secret' | 'code') => Promise<{ success: boolean; error?: string }>;
}

/** Window mode for compact (loading/login) vs full (main app) views */
export type WindowMode = 'compact' | 'full';

/** Window Mode API for switching between compact and full window sizes */
export interface WindowModeAPI {
  /** Set the window mode ('compact' for loading/login, 'full' for main app) */
  setMode: (mode: WindowMode) => Promise<void>;
  /** Get the current window mode */
  getMode: () => Promise<WindowMode>;
  /**
   * Dynamically resize the compact window based on content height.
   * Only works in compact mode. The height is clamped to min/max bounds
   * and respects the user's screen size.
   * @param height - The desired content height in pixels
   * @returns The actual height applied (after clamping)
   */
  setCompactSize: (height: number) => Promise<number>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }

  // Extend globalThis to include electron property (used for SSR-safe access)
  var electron: ElectronAPI | undefined;
}

export {};
