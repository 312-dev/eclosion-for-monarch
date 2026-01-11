/**
 * macOS Background Sync - Launch Agent
 *
 * Manages a launchd Launch Agent for running sync when the app is closed.
 * Creates a plist file in ~/Library/LaunchAgents/ and loads/unloads via launchctl.
 */

import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { isBetaBuild } from '../beta';
import { debugLog as log } from '../logger';
import { getStateDir } from '../paths';

function debugLog(msg: string): void {
  log(msg, '[BackgroundSync:macOS]');
}

// Launch Agent identifiers - separate for beta/stable
const LABEL = isBetaBuild() ? 'app.eclosion.beta.background-sync' : 'app.eclosion.background-sync';
const PLIST_FILENAME = `${LABEL}.plist`;

/**
 * Get the path to the Launch Agent plist file.
 */
function getPlistPath(): string {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', PLIST_FILENAME);
}

/**
 * Generate the plist XML content.
 */
function generatePlist(intervalMinutes: number, syncCliPath: string): string {
  const intervalSeconds = intervalMinutes * 60;
  const stateDir = getStateDir();
  const logPath = path.join(stateDir, 'logs', 'background-sync-launchd.log');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${syncCliPath}</string>
    </array>

    <key>EnvironmentVariables</key>
    <dict>
        <key>STATE_DIR</key>
        <string>${stateDir}</string>
        <key>RELEASE_CHANNEL</key>
        <string>${isBetaBuild() ? 'beta' : 'stable'}</string>
    </dict>

    <key>StartInterval</key>
    <integer>${intervalSeconds}</integer>

    <key>RunAtLoad</key>
    <false/>

    <key>StandardOutPath</key>
    <string>${logPath}</string>

    <key>StandardErrorPath</key>
    <string>${logPath}</string>

    <key>Nice</key>
    <integer>10</integer>

    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
`;
}

/**
 * Check if the Launch Agent is installed and loaded.
 */
export async function isInstalled(): Promise<boolean> {
  const plistPath = getPlistPath();

  // Check if plist exists
  if (!fs.existsSync(plistPath)) {
    return false;
  }

  // Check if loaded in launchctl
  try {
    const result = execSync(`launchctl list ${LABEL} 2>&1`, { encoding: 'utf8' });
    return result.includes(LABEL);
  } catch {
    // launchctl returns non-zero if not loaded
    return false;
  }
}

/**
 * Install the Launch Agent.
 */
export async function install(intervalMinutes: number, syncCliPath: string): Promise<void> {
  const plistPath = getPlistPath();
  const plistDir = path.dirname(plistPath);

  debugLog(`Installing Launch Agent: ${LABEL}`);
  debugLog(`Sync CLI path: ${syncCliPath}`);
  debugLog(`Interval: ${intervalMinutes} minutes`);

  // Ensure LaunchAgents directory exists
  if (!fs.existsSync(plistDir)) {
    fs.mkdirSync(plistDir, { recursive: true });
  }

  // Unload if already loaded (to update)
  try {
    execSync(`launchctl unload "${plistPath}" 2>/dev/null`);
    debugLog('Unloaded existing Launch Agent');
  } catch {
    // Ignore if not loaded
  }

  // Write plist file
  const plistContent = generatePlist(intervalMinutes, syncCliPath);
  fs.writeFileSync(plistPath, plistContent, { mode: 0o644 });
  debugLog(`Wrote plist to: ${plistPath}`);

  // Load the Launch Agent
  return new Promise((resolve, reject) => {
    const launchctl = spawn('launchctl', ['load', plistPath]);

    let stderr = '';
    launchctl.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    launchctl.on('close', (code) => {
      if (code === 0) {
        debugLog('Launch Agent loaded successfully');
        resolve();
      } else {
        reject(new Error(`launchctl load failed with code ${code}: ${stderr}`));
      }
    });

    launchctl.on('error', (err) => {
      reject(new Error(`Failed to run launchctl: ${err.message}`));
    });
  });
}

/**
 * Uninstall the Launch Agent.
 */
export async function uninstall(): Promise<void> {
  const plistPath = getPlistPath();

  debugLog(`Uninstalling Launch Agent: ${LABEL}`);

  // Unload from launchctl
  try {
    execSync(`launchctl unload "${plistPath}" 2>/dev/null`);
    debugLog('Unloaded Launch Agent');
  } catch {
    // Ignore if not loaded
  }

  // Remove plist file
  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
    debugLog('Removed plist file');
  }
}
