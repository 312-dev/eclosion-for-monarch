/**
 * Remote Command Polling
 *
 * Bridges remote tunnel users to Electron-only features (updates, etc.)
 * by polling Flask for queued commands and pushing status back.
 *
 * Pattern:
 * 1. Remote user hits /remote/updates/check → Flask queues command
 * 2. This module polls /internal/remote-commands every 5s
 * 3. Executes the command (e.g., checkForUpdates)
 * 4. Pushes result back via /internal/remote-commands/ack
 * 5. Pushes updated status via /internal/update-status
 */

import { net } from 'electron';
import { autoUpdater } from 'electron-updater';
import { debugLog } from './logger';
import { checkForUpdates, getUpdateStatus, quitAndInstall } from './updater';

const LOG_PREFIX = '[RemoteCmd]';
const POLL_INTERVAL_MS = 5000;

let pollInterval: ReturnType<typeof setInterval> | null = null;
let activePort: number | null = null;
let activeSecret: string | null = null;

interface RemoteCommand {
  id: string;
  type: string;
  queued_at: string;
}

/**
 * Push current update status to Flask's in-memory cache.
 */
export async function pushUpdateStatusToFlask(
  port: number,
  desktopSecret: string,
): Promise<void> {
  const status = getUpdateStatus();
  const payload = {
    current_version: status.currentVersion,
    channel: status.channel,
    update_available: status.updateAvailable,
    update_downloaded: status.updateDownloaded,
    update_info: status.updateInfo ? { version: status.updateInfo.version } : null,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await net.fetch(`http://127.0.0.1:${port}/internal/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Desktop-Secret': desktopSecret,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      debugLog(`Failed to push update status: HTTP ${response.status}`, LOG_PREFIX);
    }
  } catch (error) {
    debugLog(`Error pushing update status: ${error}`, LOG_PREFIX);
  }
}

/**
 * Execute a remote command dispatched by a tunnel user.
 */
async function executeCommand(
  command: RemoteCommand,
  port: number,
  desktopSecret: string,
): Promise<void> {
  debugLog(`Executing remote command: ${command.type} (${command.id})`, LOG_PREFIX);

  let result: Record<string, unknown> = {};

  switch (command.type) {
    case 'check_update': {
      const checkResult = await checkForUpdates();
      result = {
        update_available: checkResult.updateAvailable,
        version: checkResult.version,
        error: checkResult.error,
      };
      break;
    }
    case 'install_update': {
      // quitAndInstall will stop the backend and restart the app.
      // The ACK may not make it back, but that's expected.
      debugLog('Remote install requested — quitting and installing...', LOG_PREFIX);
      await quitAndInstall();
      return; // App is shutting down
    }
    default:
      debugLog(`Unknown command type: ${command.type}`, LOG_PREFIX);
      result = { error: `Unknown command type: ${command.type}` };
  }

  // ACK the command with its result
  try {
    await net.fetch(`http://127.0.0.1:${port}/internal/remote-commands/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Desktop-Secret': desktopSecret,
      },
      body: JSON.stringify({ id: command.id, result }),
    });
  } catch (error) {
    debugLog(`Error ACKing command ${command.id}: ${error}`, LOG_PREFIX);
  }

  // Push updated status after command execution
  await pushUpdateStatusToFlask(port, desktopSecret);
}

/**
 * Poll Flask for pending remote commands and execute them.
 */
async function pollForCommands(port: number, desktopSecret: string): Promise<void> {
  try {
    const response = await net.fetch(`http://127.0.0.1:${port}/internal/remote-commands`, {
      method: 'GET',
      headers: { 'X-Desktop-Secret': desktopSecret },
    });

    if (!response.ok) {
      debugLog(`Poll failed: HTTP ${response.status}`, LOG_PREFIX);
      return;
    }

    const data = (await response.json()) as { commands: RemoteCommand[] };
    if (!data.commands || data.commands.length === 0) {
      return;
    }

    debugLog(`Received ${data.commands.length} remote command(s)`, LOG_PREFIX);

    for (const command of data.commands) {
      await executeCommand(command, port, desktopSecret);
    }
  } catch (error) {
    // Suppress connection errors (backend may be restarting)
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('ECONNREFUSED')) {
      debugLog(`Poll error: ${msg}`, LOG_PREFIX);
    }
  }
}

/**
 * Push status to Flask when auto-updater events fire (auto-check, auto-download).
 * Only pushes when polling is active (tunnel is running).
 */
function onUpdaterStatusChanged(): void {
  if (activePort !== null && activeSecret !== null) {
    pushUpdateStatusToFlask(activePort, activeSecret).catch((error) => {
      debugLog(`Failed to push updater event status: ${error}`, LOG_PREFIX);
    });
  }
}

/**
 * Start polling Flask for remote commands.
 * Called when the tunnel starts.
 */
export function startRemoteCommandPolling(port: number, desktopSecret: string): void {
  stopRemoteCommandPolling();

  activePort = port;
  activeSecret = desktopSecret;

  debugLog('Starting remote command polling (every 5s)', LOG_PREFIX);
  pollInterval = setInterval(() => {
    if (activePort !== null && activeSecret !== null) {
      pollForCommands(activePort, activeSecret).catch((error) => {
        debugLog(`Poll interval error: ${error}`, LOG_PREFIX);
      });
    }
  }, POLL_INTERVAL_MS);

  // Listen for auto-updater events to keep remote status fresh
  autoUpdater.on('update-available', onUpdaterStatusChanged);
  autoUpdater.on('update-not-available', onUpdaterStatusChanged);
  autoUpdater.on('update-downloaded', onUpdaterStatusChanged);
}

/**
 * Stop polling for remote commands.
 * Called when the tunnel stops.
 */
export function stopRemoteCommandPolling(): void {
  if (pollInterval) {
    debugLog('Stopping remote command polling', LOG_PREFIX);
    clearInterval(pollInterval);
    pollInterval = null;
  }

  // Remove auto-updater listeners
  autoUpdater.removeListener('update-available', onUpdaterStatusChanged);
  autoUpdater.removeListener('update-not-available', onUpdaterStatusChanged);
  autoUpdater.removeListener('update-downloaded', onUpdaterStatusChanged);

  activePort = null;
  activeSecret = null;
}

/**
 * Check if remote command polling is currently active.
 */
export function isRemoteCommandPollingActive(): boolean {
  return pollInterval !== null;
}
