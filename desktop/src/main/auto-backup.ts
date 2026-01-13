/**
 * Auto-Backup Manager
 *
 * Manages automatic daily encrypted backups to a user-selected folder.
 * Backups use the settings export format, encrypted with the user's
 * Monarch credentials (email + password).
 *
 * Features:
 * - Daily backups triggered on app launch
 * - Configurable retention (7-30 days)
 * - Automatic cleanup of old backups
 * - Support for cloud-synced folders (iCloud, Google Drive, etc.)
 */

import { dialog } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getStore } from './store';
import { getMonarchCredentials, hasMonarchCredentials } from './biometric';
import { debugLog as log } from './logger';
import type { BackendManager } from './backend';

// Wrapper to add [AutoBackup] prefix to all log messages
function debugLog(msg: string): void {
  log(msg, '[AutoBackup]');
}

// Store keys for auto-backup settings
const AUTO_BACKUP_ENABLED_KEY = 'autoBackup.enabled';
const AUTO_BACKUP_FOLDER_KEY = 'autoBackup.folderPath';
const AUTO_BACKUP_RETENTION_KEY = 'autoBackup.retentionDays';
const AUTO_BACKUP_LAST_DATE_KEY = 'autoBackup.lastBackupDate';

// Backup file naming pattern
const BACKUP_FILE_PREFIX = 'eclosion-backup-';
const BACKUP_FILE_EXTENSION = '.json.enc';
// Auto backups: date only (e.g., eclosion-backup-2026-01-12.json.enc)
const AUTO_BACKUP_FILE_PATTERN = /^eclosion-backup-(\d{4}-\d{2}-\d{2})\.json\.enc$/;
// Manual backups: date + time (e.g., eclosion-backup-2026-01-12-104832.json.enc)
const MANUAL_BACKUP_FILE_PATTERN = /^eclosion-backup-(\d{4}-\d{2}-\d{2})-(\d{6})\.json\.enc$/;

// Encrypted backup file format version
const BACKUP_FORMAT_VERSION = 1;

// Default retention: 14 days
const DEFAULT_RETENTION_DAYS = 14;

// Available retention options
export const RETENTION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 21, label: '21 days' },
  { value: 30, label: '30 days' },
];

// Check interval for daily backup (4 hours in ms)
const BACKUP_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

/**
 * Auto-backup settings structure.
 */
export interface AutoBackupSettings {
  enabled: boolean;
  folderPath: string | null;
  retentionDays: number;
  lastBackupDate: string | null; // ISO date (YYYY-MM-DD)
}

/**
 * Encrypted backup file structure.
 */
interface EncryptedBackupFile {
  eclosion_encrypted_backup: {
    version: number;
    created_at: string;
    source_mode: 'production' | 'demo';
  };
  salt: string;
  data: string;
}

/**
 * Backup file info for listing.
 */
export interface BackupFileInfo {
  filename: string;
  filePath: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // Full ISO timestamp from file
  sizeBytes: number;
}

/**
 * Result of a backup operation.
 */
export interface BackupResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Result of a restore operation.
 */
export interface RestoreResult {
  success: boolean;
  needsCredentials: boolean;
  imported?: Record<string, boolean>;
  warnings?: string[];
  error?: string;
}

// State
let backendManagerRef: BackendManager | null = null;
let backupCheckTimer: NodeJS.Timeout | null = null;

/**
 * Get current auto-backup settings.
 */
export function getAutoBackupSettings(): AutoBackupSettings {
  const store = getStore();
  return {
    enabled: store.get(AUTO_BACKUP_ENABLED_KEY, false) as boolean,
    folderPath: store.get(AUTO_BACKUP_FOLDER_KEY, null) as string | null,
    retentionDays: store.get(AUTO_BACKUP_RETENTION_KEY, DEFAULT_RETENTION_DAYS) as number,
    lastBackupDate: store.get(AUTO_BACKUP_LAST_DATE_KEY, null) as string | null,
  };
}

/**
 * Set auto-backup enabled state.
 */
export function setAutoBackupEnabled(enabled: boolean): void {
  getStore().set(AUTO_BACKUP_ENABLED_KEY, enabled);
  debugLog(`Enabled: ${enabled}`);

  if (enabled) {
    startBackupCheckTimer();
  } else {
    stopBackupCheckTimer();
  }
}

/**
 * Set auto-backup folder path.
 */
export function setAutoBackupFolder(folderPath: string): void {
  // Verify the folder exists
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder does not exist: ${folderPath}`);
  }

  getStore().set(AUTO_BACKUP_FOLDER_KEY, folderPath);
  debugLog(`Folder set: ${folderPath}`);
}

/**
 * Set retention days.
 */
export function setAutoBackupRetention(days: number): void {
  // Validate retention value
  if (!RETENTION_OPTIONS.some((opt) => opt.value === days)) {
    debugLog(`Invalid retention: ${days}, using default`);
    days = DEFAULT_RETENTION_DAYS;
  }

  getStore().set(AUTO_BACKUP_RETENTION_KEY, days);
  debugLog(`Retention set: ${days} days`);
}

/**
 * Open folder selection dialog.
 * Returns the selected path or null if cancelled.
 */
export async function selectBackupFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select Backup Folder',
    properties: ['openDirectory', 'createDirectory'],
    message: 'Choose a folder for automatic backups. For cloud sync, select a folder in your cloud storage.',
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folderPath = result.filePaths[0];
  setAutoBackupFolder(folderPath);
  return folderPath;
}

/**
 * Get today's date as YYYY-MM-DD string.
 */
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Generate backup filename for a given date.
 * @param date Date string (YYYY-MM-DD)
 * @param includeTime If true, includes HHMMSS timestamp for manual backups
 */
function getBackupFilename(date: string, includeTime = false): string {
  if (includeTime) {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8).replaceAll(':', ''); // HHMMSS
    return `${BACKUP_FILE_PREFIX}${date}-${time}${BACKUP_FILE_EXTENSION}`;
  }
  return `${BACKUP_FILE_PREFIX}${date}${BACKUP_FILE_EXTENSION}`;
}

/**
 * Execute a backup.
 * Creates an encrypted backup file in the configured folder.
 * @param isManual If true, creates a timestamped backup that won't be auto-cleaned
 */
export async function executeAutoBackup(isManual = false): Promise<BackupResult> {
  const settings = getAutoBackupSettings();

  if (!settings.enabled) {
    return { success: false, error: 'Auto-backup is not enabled' };
  }

  if (!settings.folderPath) {
    return { success: false, error: 'No backup folder configured' };
  }

  if (!fs.existsSync(settings.folderPath)) {
    return { success: false, error: 'Backup folder does not exist' };
  }

  if (!backendManagerRef) {
    return { success: false, error: 'Backend not available' };
  }

  // Get Monarch credentials for encryption
  if (!hasMonarchCredentials()) {
    return { success: false, error: 'No Monarch credentials available' };
  }

  const credentials = getMonarchCredentials();
  if (!credentials) {
    return { success: false, error: 'Failed to retrieve Monarch credentials' };
  }

  // Create passphrase from email + password
  const passphrase = credentials.email + credentials.password;

  try {
    // Call backend to get encrypted export
    const port = backendManagerRef.getPort();
    const secret = backendManagerRef.getDesktopSecret();

    const response = await fetch(`http://127.0.0.1:${port}/settings/export-encrypted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Desktop-Secret': secret,
      },
      body: JSON.stringify({ passphrase }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: data.error || `Backend error: ${response.status}` };
    }

    const exportResult = (await response.json()) as {
      success: boolean;
      salt?: string;
      data?: string;
      error?: string;
    };

    if (!exportResult.success || !exportResult.salt || !exportResult.data) {
      return { success: false, error: exportResult.error || 'Export failed' };
    }

    // Build the backup file content
    const backupFile: EncryptedBackupFile = {
      eclosion_encrypted_backup: {
        version: BACKUP_FORMAT_VERSION,
        created_at: new Date().toISOString(),
        source_mode: 'production',
      },
      salt: exportResult.salt,
      data: exportResult.data,
    };

    // Write to file
    const today = getTodayDate();
    const filename = getBackupFilename(today, isManual);
    const filePath = path.join(settings.folderPath, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupFile, null, 2), 'utf8');

    // Update last backup date
    getStore().set(AUTO_BACKUP_LAST_DATE_KEY, today);

    debugLog(`Backup created: ${filePath}`);

    // Cleanup old backups
    await cleanupOldBackups();

    return { success: true, filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    debugLog(`Backup failed: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * List available backups in the configured folder.
 */
export function listBackups(): BackupFileInfo[] {
  const settings = getAutoBackupSettings();

  if (!settings.folderPath || !fs.existsSync(settings.folderPath)) {
    return [];
  }

  const backups: BackupFileInfo[] = [];

  try {
    const files = fs.readdirSync(settings.folderPath);

    for (const filename of files) {
      // Match both auto backups (date only) and manual backups (date + time)
      const autoMatch = AUTO_BACKUP_FILE_PATTERN.exec(filename);
      const manualMatch = MANUAL_BACKUP_FILE_PATTERN.exec(filename);
      if (!autoMatch && !manualMatch) continue;

      const date = autoMatch ? autoMatch[1] : manualMatch![1];
      const filePath = path.join(settings.folderPath, filename);

      try {
        // Read file content first to avoid TOCTOU race between stat and read
        const content = fs.readFileSync(filePath, 'utf8');
        const backup = JSON.parse(content) as EncryptedBackupFile;

        // Get size from content length, use embedded timestamp or current time as fallback
        const createdAt = backup.eclosion_encrypted_backup?.created_at || new Date().toISOString();

        backups.push({
          filename,
          filePath,
          date,
          createdAt,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
        });
      } catch {
        // Skip files that can't be read
        debugLog(`Skipping unreadable backup: ${filename}`);
      }
    }

    // Sort by date descending (newest first)
    backups.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    debugLog(`Failed to list backups: ${error instanceof Error ? error.message : String(error)}`);
  }

  return backups;
}

/**
 * Cleanup old backups beyond the retention period.
 * Only deletes auto backups (date-only filenames), not manual backups (timestamped).
 */
export async function cleanupOldBackups(): Promise<void> {
  const settings = getAutoBackupSettings();

  if (!settings.folderPath || !fs.existsSync(settings.folderPath)) {
    return;
  }

  const backups = listBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - settings.retentionDays);
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

  let deletedCount = 0;

  for (const backup of backups) {
    // Only auto-cleanup auto backups (date-only filenames), preserve manual backups
    const isAutoBackup = AUTO_BACKUP_FILE_PATTERN.test(backup.filename);
    if (!isAutoBackup) continue;

    if (backup.date < cutoffDateStr) {
      try {
        fs.unlinkSync(backup.filePath);
        deletedCount++;
        debugLog(`Deleted old backup: ${backup.filename}`);
      } catch (error) {
        debugLog(`Failed to delete backup ${backup.filename}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (deletedCount > 0) {
    debugLog(`Cleanup: deleted ${deletedCount} old backup(s)`);
  }
}

/**
 * Restore from an encrypted backup file.
 *
 * @param filePath Path to the backup file
 * @param passphrase Optional passphrase (email + password) for decryption.
 *                   If not provided, uses current Monarch credentials.
 */
export async function restoreFromBackup(
  filePath: string,
  passphrase?: string
): Promise<RestoreResult> {
  if (!backendManagerRef) {
    return { success: false, needsCredentials: false, error: 'Backend not available' };
  }

  // Read and parse backup file
  let backupFile: EncryptedBackupFile;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    backupFile = JSON.parse(content) as EncryptedBackupFile;
  } catch (error) {
    return {
      success: false,
      needsCredentials: false,
      error: `Failed to read backup file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  // Validate backup format
  if (!backupFile.eclosion_encrypted_backup || !backupFile.salt || !backupFile.data) {
    return { success: false, needsCredentials: false, error: 'Invalid backup file format' };
  }

  // Check version compatibility
  if (backupFile.eclosion_encrypted_backup.version > BACKUP_FORMAT_VERSION) {
    return {
      success: false,
      needsCredentials: false,
      error: `Backup was created with a newer version (v${backupFile.eclosion_encrypted_backup.version}). Please update Eclosion.`,
    };
  }

  // Use provided passphrase or get from current credentials
  let decryptionPassphrase = passphrase;
  if (!decryptionPassphrase) {
    if (!hasMonarchCredentials()) {
      return { success: false, needsCredentials: true, error: 'No credentials available' };
    }

    const credentials = getMonarchCredentials();
    if (!credentials) {
      return { success: false, needsCredentials: true, error: 'Failed to retrieve credentials' };
    }

    decryptionPassphrase = credentials.email + credentials.password;
  }

  try {
    // Call backend to decrypt and import
    const port = backendManagerRef.getPort();
    const secret = backendManagerRef.getDesktopSecret();

    const response = await fetch(`http://127.0.0.1:${port}/settings/import-encrypted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Desktop-Secret': secret,
      },
      body: JSON.stringify({
        salt: backupFile.salt,
        data: backupFile.data,
        passphrase: decryptionPassphrase,
      }),
    });

    const result = (await response.json()) as {
      success: boolean;
      needs_credentials?: boolean;
      imported?: Record<string, boolean>;
      warnings?: string[];
      error?: string;
    };

    return {
      success: result.success,
      needsCredentials: result.needs_credentials ?? false,
      imported: result.imported,
      warnings: result.warnings,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      needsCredentials: false,
      error: `Restore failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get backup file info for preview.
 */
export function getBackupInfo(filePath: string): {
  valid: boolean;
  version?: number;
  createdAt?: string;
  error?: string;
} {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const backup = JSON.parse(content) as EncryptedBackupFile;

    if (!backup.eclosion_encrypted_backup) {
      return { valid: false, error: 'Invalid backup file format' };
    }

    return {
      valid: true,
      version: backup.eclosion_encrypted_backup.version,
      createdAt: backup.eclosion_encrypted_backup.created_at,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to read backup: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Check if a daily backup is needed and run it if so.
 */
export async function checkAndRunDailyBackup(): Promise<void> {
  const settings = getAutoBackupSettings();

  if (!settings.enabled || !settings.folderPath) {
    debugLog('Daily check: backup not configured');
    return;
  }

  const today = getTodayDate();

  if (settings.lastBackupDate === today) {
    debugLog('Daily check: already backed up today');
    return;
  }

  debugLog('Daily check: running backup');
  const result = await executeAutoBackup();

  if (result.success) {
    debugLog('Daily check: backup completed successfully');
  } else {
    debugLog(`Daily check: backup failed - ${result.error}`);
  }
}

/**
 * Start the periodic backup check timer.
 */
function startBackupCheckTimer(): void {
  stopBackupCheckTimer();

  backupCheckTimer = setInterval(() => {
    void checkAndRunDailyBackup();
  }, BACKUP_CHECK_INTERVAL_MS);

  debugLog('Backup check timer started');
}

/**
 * Stop the periodic backup check timer.
 */
function stopBackupCheckTimer(): void {
  if (backupCheckTimer) {
    clearInterval(backupCheckTimer);
    backupCheckTimer = null;
    debugLog('Backup check timer stopped');
  }
}

/**
 * Initialize auto-backup with backend manager.
 * Call this after backend manager is ready.
 */
export function initializeAutoBackup(backendManager: BackendManager): void {
  backendManagerRef = backendManager;

  const settings = getAutoBackupSettings();
  debugLog(`Initialized. Enabled: ${settings.enabled}, Folder: ${settings.folderPath || 'none'}`);

  if (settings.enabled) {
    startBackupCheckTimer();
  }
}

/**
 * Cleanup auto-backup on app shutdown.
 */
export function cleanupAutoBackup(): void {
  stopBackupCheckTimer();
  backendManagerRef = null;
}

/**
 * Get available retention options.
 */
export function getRetentionOptions(): Array<{ value: number; label: string }> {
  return RETENTION_OPTIONS;
}
