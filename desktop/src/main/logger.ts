/**
 * Centralized Logger with Rotation
 *
 * Provides debug logging with automatic file rotation.
 * Logs are stored in the app data directory (not home dir) for discoverability.
 *
 * Features:
 * - Automatic rotation when log exceeds MAX_SIZE_BYTES
 * - Keeps up to MAX_ROTATED_FILES archived logs
 * - Platform-appropriate log directory
 */

import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getStateDir } from './paths';

// Configuration
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per log file
const MAX_ROTATED_FILES = 5; // Keep 5 archived logs

// Lazy initialization (app may not be ready yet)
let logDir: string | null = null;
let logPath: string | null = null;
let initialized = false;

/**
 * Initialize the logger directories and paths.
 * Safe to call multiple times - only initializes once.
 */
function ensureInitialized(): void {
  if (initialized) return;

  try {
    logDir = path.join(getStateDir(), 'logs');
    logPath = path.join(logDir, 'debug.log');

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    initialized = true;
  } catch (error) {
    // Fall back to home directory if state dir fails
    console.error('Failed to initialize log directory:', error);
    logDir = app.getPath('home');
    logPath = path.join(logDir, 'eclosion-debug.log');
    initialized = true;
  }
}

/**
 * Get the current log file size.
 */
function getLogSize(): number {
  if (!logPath) return 0;
  try {
    const stats = fs.statSync(logPath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Rotate log files.
 * debug.log -> debug.log.1 -> debug.log.2 -> ... -> debug.log.{MAX_ROTATED_FILES}
 */
function rotateLogFiles(): void {
  if (!logPath || !logDir) return;

  try {
    // Delete oldest log if it exists
    const oldestPath = `${logPath}.${MAX_ROTATED_FILES}`;
    if (fs.existsSync(oldestPath)) {
      fs.unlinkSync(oldestPath);
    }

    // Shift existing rotated logs
    for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
      const oldPath = `${logPath}.${i}`;
      const newPath = `${logPath}.${i + 1}`;
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    // Rotate current log to .1
    if (fs.existsSync(logPath)) {
      fs.renameSync(logPath, `${logPath}.1`);
    }
  } catch (error) {
    console.error('Failed to rotate log files:', error);
  }
}

/**
 * Write a debug log message with timestamp.
 * Automatically handles rotation when file exceeds max size.
 *
 * @param msg - The message to log
 * @param prefix - Optional prefix (e.g., "[Backend]")
 */
export function debugLog(msg: string, prefix?: string): void {
  ensureInitialized();
  if (!logPath) return;

  const timestamp = new Date().toISOString();
  const prefixStr = prefix ? `${prefix} ` : '';
  const line = `${timestamp} - ${prefixStr}${msg}\n`;

  // Always log to console
  console.log(prefix ? `${prefix} ${msg}` : msg);

  try {
    // Check if rotation is needed before writing
    if (getLogSize() > MAX_SIZE_BYTES) {
      rotateLogFiles();
    }

    fs.appendFileSync(logPath, line);
  } catch {
    // Ignore write errors - don't crash the app over logging
  }
}

/**
 * Initialize a new log session (writes header).
 * Call this once at app startup.
 */
export function initLogSession(): void {
  ensureInitialized();
  if (!logPath) return;

  try {
    // Check rotation before starting new session
    if (getLogSize() > MAX_SIZE_BYTES) {
      rotateLogFiles();
    }

    const header = `\n${'='.repeat(60)}\n=== Eclosion Debug Log - ${new Date().toISOString()} ===\n${'='.repeat(60)}\n`;
    fs.appendFileSync(logPath, header);
  } catch (error) {
    console.error('Failed to initialize log session:', error);
  }
}

/**
 * Get the log directory path.
 * Useful for displaying to users or for diagnostics.
 */
export function getLogDir(): string {
  ensureInitialized();
  return logDir || '';
}

/**
 * Get the main log file path.
 */
export function getLogPath(): string {
  ensureInitialized();
  return logPath || '';
}

/**
 * Get all log files (current + rotated) for diagnostics export.
 */
export function getAllLogFiles(): string[] {
  ensureInitialized();
  if (!logPath || !logDir) return [];

  const files: string[] = [];

  // Current log
  if (fs.existsSync(logPath)) {
    files.push(logPath);
  }

  // Rotated logs
  for (let i = 1; i <= MAX_ROTATED_FILES; i++) {
    const rotatedPath = `${logPath}.${i}`;
    if (fs.existsSync(rotatedPath)) {
      files.push(rotatedPath);
    }
  }

  return files;
}
