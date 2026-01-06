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
  runInBackground: boolean;
  showInDock: boolean;
  autoStart: boolean;
}

export interface ElectronAPI {
  // Backend Communication
  getBackendPort: () => Promise<number>;
  getBackendStatus: () => Promise<BackendStatus>;
  triggerSync: () => Promise<SyncResult>;

  // Auto-Start
  getAutoStartStatus: () => Promise<boolean>;
  setAutoStart: (enabled: boolean) => Promise<boolean>;

  // Updates
  checkForUpdates: () => Promise<UpdateCheckResult>;
  getUpdateStatus: () => Promise<UpdateStatus>;
  setUpdateChannel: (channel: 'stable' | 'beta') => Promise<'stable' | 'beta'>;
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
  setRunInBackground: (enabled: boolean) => Promise<boolean>;
  setShowInDock: (enabled: boolean) => Promise<boolean>;
  getStateDir: () => Promise<string>;
  revealDataFolder: () => Promise<void>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }

  // Extend globalThis to include electron property (used for SSR-safe access)
  var electron: ElectronAPI | undefined;
}

export {};
