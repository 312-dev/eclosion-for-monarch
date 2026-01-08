/**
 * Backup & Restore
 *
 * Allows users to export all data and settings for backup or migration.
 * Creates a JSON-based backup file with base64-encoded binary data.
 *
 * SECURITY NOTE: Backup files contain sensitive credentials. Users should
 * be warned to store backups securely and not share them.
 */

import { app, dialog } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getStateDir } from './paths';
import Store from 'electron-store';

const store = new Store();

/**
 * Backup file format version.
 * Increment when making breaking changes to the format.
 */
const BACKUP_FORMAT_VERSION = 1;

/**
 * Files to include in backup (relative to state directory).
 * These are the core application data files.
 */
const DATA_FILES = [
  'credentials.json',
  'mm_session.pickle',
  'tracker_state.json',
  'security_events.db',
];

/**
 * Structure of a backup file.
 */
interface BackupManifest {
  version: number;
  appVersion: string;
  createdAt: string;
  platform: string;
  arch: string;
  files: BackupFile[];
  settings: Record<string, unknown>;
}

interface BackupFile {
  name: string;
  encoding: 'base64' | 'utf8';
  content: string;
  size: number;
}

/**
 * Check if a file should be encoded as base64 (binary) or utf8 (text).
 */
function isBinaryFile(filename: string): boolean {
  const binaryExtensions = ['.pickle', '.db', '.sqlite', '.bin'];
  return binaryExtensions.some((ext) => filename.endsWith(ext));
}

/**
 * Read a file and return its content with appropriate encoding.
 */
function readFileForBackup(filePath: string): BackupFile | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const filename = path.basename(filePath);
    const isBinary = isBinaryFile(filename);

    if (isBinary) {
      const buffer = fs.readFileSync(filePath);
      return {
        name: filename,
        encoding: 'base64',
        content: buffer.toString('base64'),
        size: stats.size,
      };
    } else {
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        name: filename,
        encoding: 'utf8',
        content,
        size: stats.size,
      };
    }
  } catch (error) {
    console.error(`Failed to read file for backup: ${filePath}`, error);
    return null;
  }
}

/**
 * Write a file from backup data.
 */
function writeFileFromBackup(stateDir: string, file: BackupFile): boolean {
  try {
    const filePath = path.join(stateDir, file.name);

    if (file.encoding === 'base64') {
      const buffer = Buffer.from(file.content, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      fs.writeFileSync(filePath, file.content, 'utf8');
    }

    return true;
  } catch (error) {
    console.error(`Failed to write file from backup: ${file.name}`, error);
    return false;
  }
}

/**
 * Create a backup of all application data and settings.
 * Returns the path where the backup was saved, or null if cancelled.
 */
export async function createBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-').slice(0, 19);
  const defaultFilename = `eclosion-backup-${timestamp}.json`;

  const result = await dialog.showSaveDialog({
    title: 'Create Backup',
    defaultPath: path.join(app.getPath('downloads'), defaultFilename),
    filters: [
      { name: 'Eclosion Backup', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { success: false };
  }

  try {
    const stateDir = getStateDir();
    const files: BackupFile[] = [];

    // Read all data files
    for (const filename of DATA_FILES) {
      const filePath = path.join(stateDir, filename);
      const fileData = readFileForBackup(filePath);
      if (fileData) {
        files.push(fileData);
      }
    }

    // Get desktop settings
    const settings = store.store;

    // Build the backup manifest
    const backup: BackupManifest = {
      version: BACKUP_FORMAT_VERSION,
      appVersion: app.getVersion(),
      createdAt: new Date().toISOString(),
      platform: process.platform,
      arch: process.arch,
      files,
      settings,
    };

    // Write backup file
    fs.writeFileSync(result.filePath, JSON.stringify(backup, null, 2), 'utf8');

    return { success: true, path: result.filePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to create backup:', error);
    return { success: false, error: message };
  }
}

/**
 * Validate a backup file before restoring.
 */
function validateBackup(backup: unknown): backup is BackupManifest {
  if (!backup || typeof backup !== 'object') {
    return false;
  }

  const manifest = backup as Partial<BackupManifest>;

  if (typeof manifest.version !== 'number') {
    return false;
  }

  if (manifest.version > BACKUP_FORMAT_VERSION) {
    // Backup was created with a newer version - may not be compatible
    return false;
  }

  if (!Array.isArray(manifest.files)) {
    return false;
  }

  if (!manifest.settings || typeof manifest.settings !== 'object') {
    return false;
  }

  return true;
}

/**
 * Get information about a backup file for preview.
 */
export interface BackupInfo {
  valid: boolean;
  error?: string;
  appVersion?: string;
  createdAt?: string;
  platform?: string;
  fileCount?: number;
  files?: string[];
  hasSettings?: boolean;
}

/**
 * Read and validate a backup file, returning info for preview.
 */
export async function previewBackup(filePath: string): Promise<BackupInfo> {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const backup = JSON.parse(content);

    if (!validateBackup(backup)) {
      if (backup && typeof backup === 'object' && 'version' in backup) {
        const version = (backup as { version?: number }).version;
        if (typeof version === 'number' && version > BACKUP_FORMAT_VERSION) {
          return {
            valid: false,
            error: `Backup was created with a newer version of Eclosion (format v${version}). Please update Eclosion to restore this backup.`,
          };
        }
      }
      return { valid: false, error: 'Invalid backup file format' };
    }

    return {
      valid: true,
      appVersion: backup.appVersion,
      createdAt: backup.createdAt,
      platform: backup.platform,
      fileCount: backup.files.length,
      files: backup.files.map((f) => f.name),
      hasSettings: Object.keys(backup.settings).length > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, error: `Failed to read backup: ${message}` };
  }
}

/**
 * Restore application data and settings from a backup file.
 * Returns the result of the restore operation.
 */
export async function restoreBackup(): Promise<{
  success: boolean;
  error?: string;
  filesRestored?: number;
  settingsRestored?: boolean;
}> {
  // Show file picker
  const result = await dialog.showOpenDialog({
    title: 'Restore Backup',
    filters: [
      { name: 'Eclosion Backup', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }

  const filePath = result.filePaths[0];

  try {
    // Read and validate backup
    const content = fs.readFileSync(filePath, 'utf8');
    const backup = JSON.parse(content);

    if (!validateBackup(backup)) {
      return { success: false, error: 'Invalid backup file format' };
    }

    const stateDir = getStateDir();

    // Ensure state directory exists
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    // Restore files
    let filesRestored = 0;
    for (const file of backup.files) {
      if (writeFileFromBackup(stateDir, file)) {
        filesRestored++;
      }
    }

    // Restore settings
    let settingsRestored = false;
    if (backup.settings && Object.keys(backup.settings).length > 0) {
      for (const [key, value] of Object.entries(backup.settings)) {
        store.set(key, value);
      }
      settingsRestored = true;
    }

    return { success: true, filesRestored, settingsRestored };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to restore backup:', error);
    return { success: false, error: message };
  }
}

/**
 * Get the warning message for creating a backup.
 */
export function getBackupWarning(): string {
  return `This backup file will contain your Monarch Money credentials and session data.

• Store the backup file securely
• Do not share it with others
• Delete old backups you no longer need

The backup does NOT include your Monarch Money account data—only the credentials used to connect to your account.`;
}

/**
 * Get the warning message for restoring a backup.
 */
export function getRestoreWarning(): string {
  return `Restoring a backup will replace your current data and settings.

• Your existing credentials will be overwritten
• Desktop settings will be replaced
• The app will need to be restarted after restore

Make sure you trust the source of this backup file.`;
}
