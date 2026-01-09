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
}

export interface BiometricAuthResult {
  success: boolean;
  passphrase?: string;
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
}

export interface ElectronAPI {
  // Backend Communication
  getBackendPort: () => Promise<number>;
  getDesktopSecret: () => Promise<string>;
  getBackendStatus: () => Promise<BackendStatus>;
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

  // Lock Management
  lock: LockAPI;

  // Pending Sync (for menu-triggered sync when locked)
  pendingSync: PendingSyncAPI;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }

  // Extend globalThis to include electron property (used for SSR-safe access)
  var electron: ElectronAPI | undefined;
}

export {};
