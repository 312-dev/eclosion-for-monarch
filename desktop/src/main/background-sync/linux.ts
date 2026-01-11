/**
 * Linux Background Sync - systemd User Timer
 *
 * Manages a systemd user timer for running sync when the app is closed.
 * Creates .service and .timer files in ~/.config/systemd/user/
 * and manages them via systemctl --user.
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { isBetaBuild } from '../beta';
import { debugLog as log } from '../logger';
import { getStateDir } from '../paths';

function debugLog(msg: string): void {
  log(msg, '[BackgroundSync:Linux]');
}

// Service/timer names - separate for beta/stable
const UNIT_NAME = isBetaBuild() ? 'eclosion-beta-sync' : 'eclosion-sync';
const SERVICE_FILE = `${UNIT_NAME}.service`;
const TIMER_FILE = `${UNIT_NAME}.timer`;

/**
 * Get the systemd user unit directory.
 */
function getSystemdUserDir(): string {
  return path.join(os.homedir(), '.config', 'systemd', 'user');
}

/**
 * Generate the systemd service file content.
 */
function generateService(syncCliPath: string): string {
  const stateDir = getStateDir();

  return `[Unit]
Description=Eclosion Background Sync${isBetaBuild() ? ' (Beta)' : ''}
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=${syncCliPath}
Environment=STATE_DIR=${stateDir}
Environment=RELEASE_CHANNEL=${isBetaBuild() ? 'beta' : 'stable'}
Nice=10

# Don't restart on failure - let timer handle retries
Restart=no
`;
}

/**
 * Generate the systemd timer file content.
 */
function generateTimer(intervalMinutes: number): string {
  return `[Unit]
Description=Eclosion Background Sync Timer${isBetaBuild() ? ' (Beta)' : ''}

[Timer]
# Start 5 minutes after boot
OnBootSec=5min
# Run at the specified interval
OnUnitActiveSec=${intervalMinutes}min
# Persist timer state across reboots
Persistent=true

[Install]
WantedBy=timers.target
`;
}

/**
 * Check if the systemd timer is installed and enabled.
 */
export async function isInstalled(): Promise<boolean> {
  try {
    const result = execSync(`systemctl --user is-enabled ${TIMER_FILE} 2>&1`, {
      encoding: 'utf8',
    });
    return result.trim() === 'enabled';
  } catch {
    // systemctl returns non-zero if not enabled
    return false;
  }
}

/**
 * Install the systemd timer.
 */
export async function install(intervalMinutes: number, syncCliPath: string): Promise<void> {
  const systemdDir = getSystemdUserDir();
  const servicePath = path.join(systemdDir, SERVICE_FILE);
  const timerPath = path.join(systemdDir, TIMER_FILE);

  debugLog(`Installing systemd timer: ${UNIT_NAME}`);
  debugLog(`Sync CLI path: ${syncCliPath}`);
  debugLog(`Interval: ${intervalMinutes} minutes`);

  // Ensure systemd user directory exists
  if (!fs.existsSync(systemdDir)) {
    fs.mkdirSync(systemdDir, { recursive: true });
  }

  // Stop and disable if already running
  try {
    execSync(`systemctl --user stop ${TIMER_FILE} 2>/dev/null`);
    execSync(`systemctl --user disable ${TIMER_FILE} 2>/dev/null`);
    debugLog('Stopped and disabled existing timer');
  } catch {
    // Ignore if not running
  }

  // Write service file
  const serviceContent = generateService(syncCliPath);
  fs.writeFileSync(servicePath, serviceContent, { mode: 0o644 });
  debugLog(`Wrote service file: ${servicePath}`);

  // Write timer file
  const timerContent = generateTimer(intervalMinutes);
  fs.writeFileSync(timerPath, timerContent, { mode: 0o644 });
  debugLog(`Wrote timer file: ${timerPath}`);

  // Reload systemd daemon
  return new Promise((resolve, reject) => {
    const reload = spawn('systemctl', ['--user', 'daemon-reload']);

    reload.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`daemon-reload failed with code ${code}`));
        return;
      }

      // Enable and start the timer
      const enable = spawn('systemctl', ['--user', 'enable', '--now', TIMER_FILE]);

      let stderr = '';
      enable.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      enable.on('close', (enableCode) => {
        if (enableCode === 0) {
          debugLog('Timer enabled and started successfully');
          resolve();
        } else {
          reject(new Error(`enable --now failed with code ${enableCode}: ${stderr}`));
        }
      });

      enable.on('error', (err) => {
        reject(new Error(`Failed to run systemctl enable: ${err.message}`));
      });
    });

    reload.on('error', (err) => {
      reject(new Error(`Failed to run systemctl daemon-reload: ${err.message}`));
    });
  });
}

/**
 * Uninstall the systemd timer.
 */
export async function uninstall(): Promise<void> {
  const systemdDir = getSystemdUserDir();
  const servicePath = path.join(systemdDir, SERVICE_FILE);
  const timerPath = path.join(systemdDir, TIMER_FILE);

  debugLog(`Uninstalling systemd timer: ${UNIT_NAME}`);

  // Stop and disable the timer
  try {
    execSync(`systemctl --user stop ${TIMER_FILE} 2>/dev/null`);
    execSync(`systemctl --user disable ${TIMER_FILE} 2>/dev/null`);
    debugLog('Stopped and disabled timer');
  } catch {
    // Ignore if not running
  }

  // Remove unit files
  if (fs.existsSync(timerPath)) {
    fs.unlinkSync(timerPath);
    debugLog('Removed timer file');
  }

  if (fs.existsSync(servicePath)) {
    fs.unlinkSync(servicePath);
    debugLog('Removed service file');
  }

  // Reload daemon to pick up changes
  try {
    execSync('systemctl --user daemon-reload');
  } catch {
    // Non-critical
  }
}
