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
let redactedLogPath: string | null = null;
let initialized = false;

/**
 * Redact personally identifiable information (PII) from a log message.
 * This allows logs to be safely shared for support without exposing sensitive data.
 *
 * Covers:
 * - Identity: emails, usernames, paths, IPs
 * - Financial: credit cards, account numbers, SSN, dollar amounts
 * - Contact: phone numbers
 * - Security: tokens, API keys, URL params
 */
function redactMessage(msg: string): string {
  let redacted = msg;

  // =========================================================================
  // Identity
  // =========================================================================

  // Email addresses
  redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

  // IPv4 addresses (but not version numbers like 1.2.3)
  redacted = redacted.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  // IPv6 addresses (simplified pattern)
  redacted = redacted.replace(/([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}/g, '[IP]');

  // User paths - macOS
  redacted = redacted.replace(/\/Users\/[^/\s]+/g, '/Users/[USER]');

  // User paths - Linux
  redacted = redacted.replace(/\/home\/[^/\s]+/g, '/home/[USER]');

  // User paths - Windows (case-insensitive)
  redacted = redacted.replace(/C:\\Users\\[^\\\s]+/gi, 'C:\\Users\\[USER]');

  // =========================================================================
  // Financial
  // =========================================================================

  // Credit card numbers (13-19 digits, with optional spaces/dashes)
  // Covers Visa, Mastercard, Amex, Discover, etc.
  redacted = redacted.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,7}\b/g, '[CARD]');

  // Bank account numbers (8-17 consecutive digits - common range for US accounts)
  // Must be standalone number, not part of larger context
  redacted = redacted.replace(/\b\d{8,17}\b/g, '[ACCOUNT]');

  // Routing numbers (9 digits, standalone)
  redacted = redacted.replace(/\b\d{9}\b/g, '[ROUTING]');

  // SSN (xxx-xx-xxxx format)
  redacted = redacted.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

  // Dollar amounts ($X,XXX.XX format) - preserves that it's money but hides amount
  redacted = redacted.replace(/\$[\d,]+\.?\d*/g, '$[AMT]');

  // =========================================================================
  // Contact
  // =========================================================================

  // Phone numbers - various formats
  // (xxx) xxx-xxxx, xxx-xxx-xxxx, xxx.xxx.xxxx, +1xxxxxxxxxx
  redacted = redacted.replace(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]');
  redacted = redacted.replace(/\+\d{1,3}\d{10}\b/g, '[PHONE]');

  // =========================================================================
  // Security
  // =========================================================================

  // Long tokens/UUIDs (32+ alphanumeric chars that look like secrets)
  redacted = redacted.replace(/\b[a-zA-Z0-9+/=_-]{32,}\b/g, '[TOKEN]');

  // URL query parameters (often contain tokens, session IDs, etc.)
  redacted = redacted.replace(/\?[^\s"']+/g, '?[PARAMS]');

  return redacted;
}

/**
 * Initialize the logger directories and paths.
 * Safe to call multiple times - only initializes once.
 */
function ensureInitialized(): void {
  if (initialized) return;

  try {
    logDir = path.join(getStateDir(), 'logs');
    logPath = path.join(logDir, 'debug.log');
    redactedLogPath = path.join(logDir, 'redacted.log');

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
    redactedLogPath = path.join(logDir, 'eclosion-redacted.log');
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
 * Get the current redacted log file size.
 */
function getRedactedLogSize(): number {
  if (!redactedLogPath) return 0;
  try {
    const stats = fs.statSync(redactedLogPath);
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
 * Rotate redacted log files.
 * redacted.log -> redacted.log.1 -> ... -> redacted.log.{MAX_ROTATED_FILES}
 */
function rotateRedactedLogFiles(): void {
  if (!redactedLogPath || !logDir) return;

  try {
    // Delete oldest log if it exists
    const oldestPath = `${redactedLogPath}.${MAX_ROTATED_FILES}`;
    if (fs.existsSync(oldestPath)) {
      fs.unlinkSync(oldestPath);
    }

    // Shift existing rotated logs
    for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
      const oldPath = `${redactedLogPath}.${i}`;
      const newPath = `${redactedLogPath}.${i + 1}`;
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }

    // Rotate current log to .1
    if (fs.existsSync(redactedLogPath)) {
      fs.renameSync(redactedLogPath, `${redactedLogPath}.1`);
    }
  } catch (error) {
    console.error('Failed to rotate redacted log files:', error);
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

  // Also write to redacted log (PII stripped)
  if (redactedLogPath) {
    try {
      if (getRedactedLogSize() > MAX_SIZE_BYTES) {
        rotateRedactedLogFiles();
      }

      const redactedLine = `${timestamp} - ${prefixStr}${redactMessage(msg)}\n`;
      fs.appendFileSync(redactedLogPath, redactedLine);
    } catch {
      // Ignore write errors - don't crash the app over logging
    }
  }
}

/**
 * Initialize a new log session (writes header).
 * Call this once at app startup.
 */
export function initLogSession(): void {
  ensureInitialized();
  if (!logPath) return;

  const timestamp = new Date().toISOString();
  const header = `\n${'='.repeat(60)}\n=== Eclosion Debug Log - ${timestamp} ===\n${'='.repeat(60)}\n`;

  try {
    // Check rotation before starting new session
    if (getLogSize() > MAX_SIZE_BYTES) {
      rotateLogFiles();
    }

    fs.appendFileSync(logPath, header);
  } catch (error) {
    console.error('Failed to initialize log session:', error);
  }

  // Also initialize redacted log session
  if (redactedLogPath) {
    try {
      if (getRedactedLogSize() > MAX_SIZE_BYTES) {
        rotateRedactedLogFiles();
      }

      const redactedHeader = `\n${'='.repeat(60)}\n=== Eclosion Redacted Log - ${timestamp} ===\n${'='.repeat(60)}\n`;
      fs.appendFileSync(redactedLogPath, redactedHeader);
    } catch (error) {
      console.error('Failed to initialize redacted log session:', error);
    }
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

/**
 * Get the redacted log file path.
 */
export function getRedactedLogPath(): string {
  ensureInitialized();
  return redactedLogPath || '';
}

/**
 * Get all redacted log files (current + rotated) for shareable diagnostics.
 */
export function getAllRedactedLogFiles(): string[] {
  ensureInitialized();
  if (!redactedLogPath || !logDir) return [];

  const files: string[] = [];

  // Current log
  if (fs.existsSync(redactedLogPath)) {
    files.push(redactedLogPath);
  }

  // Rotated logs
  for (let i = 1; i <= MAX_ROTATED_FILES; i++) {
    const rotatedPath = `${redactedLogPath}.${i}`;
    if (fs.existsSync(rotatedPath)) {
      files.push(rotatedPath);
    }
  }

  return files;
}
