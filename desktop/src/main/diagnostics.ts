/**
 * Diagnostics Export
 *
 * Collects system information, logs, and settings for support requests.
 * Produces a ZIP file that users can attach to bug reports.
 */

import { app, dialog } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { getAllLogFiles, getLogDir } from './logger';
import { getUpdateChannel } from './updater';
import { getStateDir } from './paths';
import { isSentryEnabled } from './sentry';
import Store from 'electron-store';

const store = new Store();

/**
 * Sensitive keys that should be redacted from settings export.
 */
const SENSITIVE_KEYS = ['token', 'password', 'secret', 'key', 'auth', 'credential'];

/**
 * Check if a key name appears to be sensitive.
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));
}

/**
 * Recursively sanitize an object by redacting sensitive values.
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH]';

  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Redact anything that looks like a token or long random string
    if (obj.length > 32 && /^[a-zA-Z0-9+/=_-]+$/.test(obj)) {
      return '[REDACTED]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Collect system information.
 */
function getSystemInfo(): Record<string, unknown> {
  return {
    app: {
      version: app.getVersion(),
      name: app.getName(),
      isPackaged: app.isPackaged,
      updateChannel: getUpdateChannel(),
      crashReporting: isSentryEnabled() ? 'enabled' : 'disabled',
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      osVersion: os.release(),
      osType: os.type(),
      hostname: '[REDACTED]', // Don't include actual hostname
      cpus: os.cpus().length,
      totalMemory: `${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB`,
      freeMemory: `${Math.round(os.freemem() / (1024 * 1024 * 1024))}GB`,
    },
    electron: {
      version: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
    },
    paths: {
      stateDir: getStateDir(),
      logDir: getLogDir(),
      userData: app.getPath('userData'),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get sanitized desktop settings.
 */
function getSanitizedSettings(): Record<string, unknown> {
  const allSettings = store.store as Record<string, unknown>;
  return sanitizeObject(allSettings) as Record<string, unknown>;
}

/**
 * Read log file contents with size limit.
 */
function readLogFile(filePath: string, maxSize = 1024 * 1024): string {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > maxSize) {
      // Read only the last maxSize bytes with proper fd cleanup
      const fd = fs.openSync(filePath, 'r');
      try {
        const buffer = Buffer.alloc(maxSize);
        fs.readSync(fd, buffer, 0, maxSize, stats.size - maxSize);
        return `[Truncated - showing last ${Math.round(maxSize / 1024)}KB of ${Math.round(stats.size / 1024)}KB]\n\n${buffer.toString('utf8')}`;
      } finally {
        fs.closeSync(fd);
      }
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return `[Error reading file: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

/**
 * Export diagnostics bundle to a user-selected location.
 * Returns the path where the file was saved, or null if cancelled.
 */
export async function exportDiagnostics(): Promise<string | null> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const defaultFilename = `eclosion-diagnostics-${timestamp}.txt`;

  const result = await dialog.showSaveDialog({
    title: 'Export Diagnostics',
    defaultPath: path.join(app.getPath('downloads'), defaultFilename),
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  // Build the diagnostics report
  const lines: string[] = [];

  lines.push('=' .repeat(70));
  lines.push('ECLOSION DIAGNOSTICS REPORT');
  lines.push('=' .repeat(70));
  lines.push('');

  // System Info
  lines.push('-'.repeat(70));
  lines.push('SYSTEM INFORMATION');
  lines.push('-'.repeat(70));
  lines.push(JSON.stringify(getSystemInfo(), null, 2));
  lines.push('');

  // Settings (sanitized)
  lines.push('-'.repeat(70));
  lines.push('DESKTOP SETTINGS (Sanitized)');
  lines.push('-'.repeat(70));
  lines.push(JSON.stringify(getSanitizedSettings(), null, 2));
  lines.push('');

  // Log files
  const logFiles = getAllLogFiles();
  for (const logFile of logFiles) {
    const relativePath = path.basename(logFile);
    lines.push('-'.repeat(70));
    lines.push(`LOG FILE: ${relativePath}`);
    lines.push('-'.repeat(70));
    lines.push(readLogFile(logFile));
    lines.push('');
  }

  // Backend logs (if they exist)
  const backendLogPath = path.join(getLogDir(), 'backend.log');
  if (fs.existsSync(backendLogPath)) {
    lines.push('-'.repeat(70));
    lines.push('BACKEND LOG: backend.log');
    lines.push('-'.repeat(70));
    lines.push(readLogFile(backendLogPath));
    lines.push('');
  }

  // Write the report
  const report = lines.join('\n');
  fs.writeFileSync(result.filePath, report, 'utf8');

  return result.filePath;
}

/**
 * Copy debug info to clipboard (quick version for bug reports).
 */
export function getQuickDebugInfo(): string {
  const info = getSystemInfo();
  const lines = [
    `Eclosion v${(info.app as Record<string, unknown>).version}`,
    `Platform: ${(info.system as Record<string, unknown>).platform} ${(info.system as Record<string, unknown>).arch}`,
    `OS: ${(info.system as Record<string, unknown>).osType} ${(info.system as Record<string, unknown>).osVersion}`,
    `Electron: ${(info.electron as Record<string, unknown>).version}`,
    `Update Channel: ${(info.app as Record<string, unknown>).updateChannel}`,
    `Crash Reporting: ${(info.app as Record<string, unknown>).crashReporting}`,
  ];
  return lines.join('\n');
}
