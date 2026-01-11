/**
 * Windows Background Sync - Task Scheduler
 *
 * Manages a scheduled task for running sync when the app is closed.
 * Uses schtasks.exe command-line tool to create/delete tasks.
 */

import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { isBetaBuild } from '../beta';
import { debugLog as log } from '../logger';
import { getStateDir } from '../paths';

function debugLog(msg: string): void {
  log(msg, '[BackgroundSync:Windows]');
}

// Task name - separate for beta/stable
const TASK_NAME = isBetaBuild() ? 'Eclosion Beta Background Sync' : 'Eclosion Background Sync';

/**
 * Escape a string for use in Windows command line.
 */
function escapeArg(arg: string): string {
  // Wrap in quotes and escape internal quotes
  return `"${arg.replace(/"/g, '\\"')}"`;
}

/**
 * Check if the scheduled task exists.
 */
export async function isInstalled(): Promise<boolean> {
  try {
    const result = execSync(`schtasks /query /tn "${TASK_NAME}" 2>&1`, {
      encoding: 'utf8',
      windowsHide: true,
    });
    return result.includes(TASK_NAME);
  } catch {
    // schtasks returns non-zero if task doesn't exist
    return false;
  }
}

/**
 * Install the scheduled task.
 */
export async function install(intervalMinutes: number, syncCliPath: string): Promise<void> {
  const stateDir = getStateDir();
  const logPath = path.join(stateDir, 'logs', 'background-sync-task.log');

  debugLog(`Installing Task: ${TASK_NAME}`);
  debugLog(`Sync CLI path: ${syncCliPath}`);
  debugLog(`Interval: ${intervalMinutes} minutes`);

  // Delete existing task if present
  try {
    execSync(`schtasks /delete /tn "${TASK_NAME}" /f 2>nul`, {
      encoding: 'utf8',
      windowsHide: true,
    });
    debugLog('Deleted existing task');
  } catch {
    // Ignore if doesn't exist
  }

  // Create the scheduled task
  // Uses /sc minute /mo N for interval-based scheduling
  return new Promise((resolve, reject) => {
    // Build the command to run - includes environment variables via wrapper script or cmd
    // We use cmd /c to set environment variables before running the sync CLI
    const command = `cmd /c "set STATE_DIR=${stateDir} && set RELEASE_CHANNEL=${isBetaBuild() ? 'beta' : 'stable'} && ${escapeArg(syncCliPath)} >> ${escapeArg(logPath)} 2>&1"`;

    const args = [
      '/create',
      '/tn', TASK_NAME,
      '/tr', command,
      '/sc', 'minute',
      '/mo', String(intervalMinutes),
      '/f', // Force overwrite
    ];

    debugLog(`Running: schtasks ${args.join(' ')}`);

    const schtasks = spawn('schtasks', args, { windowsHide: true });

    let stderr = '';
    schtasks.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    schtasks.on('close', (code) => {
      if (code === 0) {
        debugLog('Task created successfully');
        resolve();
      } else {
        reject(new Error(`schtasks /create failed with code ${code}: ${stderr}`));
      }
    });

    schtasks.on('error', (err) => {
      reject(new Error(`Failed to run schtasks: ${err.message}`));
    });
  });
}

/**
 * Uninstall the scheduled task.
 */
export async function uninstall(): Promise<void> {
  debugLog(`Uninstalling Task: ${TASK_NAME}`);

  return new Promise((resolve, reject) => {
    const schtasks = spawn('schtasks', ['/delete', '/tn', TASK_NAME, '/f'], {
      windowsHide: true,
    });

    let stderr = '';
    schtasks.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    schtasks.on('close', (code) => {
      if (code === 0) {
        debugLog('Task deleted successfully');
        resolve();
      } else if (stderr.includes('does not exist')) {
        // Task doesn't exist - that's fine
        debugLog('Task does not exist');
        resolve();
      } else {
        reject(new Error(`schtasks /delete failed with code ${code}: ${stderr}`));
      }
    });

    schtasks.on('error', (err) => {
      reject(new Error(`Failed to run schtasks: ${err.message}`));
    });
  });
}
