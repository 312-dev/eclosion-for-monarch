/**
 * Backend Process Manager
 *
 * Manages the Python Flask backend as a subprocess.
 * Handles port selection, health checks, crash recovery, and graceful shutdown.
 */

import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { app, dialog } from 'electron';
import getPort from 'get-port';
import { debugLog as log, getLogDir } from './logger';
import { updateHealthStatus } from './tray';
import { getStateDir } from './paths';

// Wrapper to add [Backend] prefix to all log messages
function debugLog(msg: string): void {
  log(msg, '[Backend]');
}

// Backend log file stream (separate from main debug log)
let backendLogStream: fs.WriteStream | null = null;

/**
 * Initialize the backend log file stream.
 */
function initBackendLog(): void {
  // Close existing stream first to prevent leaks on restart
  closeBackendLog();

  const logDir = getLogDir();
  if (!logDir) return;

  try {
    const backendLogPath = path.join(logDir, 'backend.log');

    // Rotate if file is too large (>5MB)
    if (fs.existsSync(backendLogPath)) {
      const stats = fs.statSync(backendLogPath);
      if (stats.size > 5 * 1024 * 1024) {
        const rotatedPath = `${backendLogPath}.1`;
        if (fs.existsSync(rotatedPath)) {
          fs.unlinkSync(rotatedPath);
        }
        fs.renameSync(backendLogPath, rotatedPath);
      }
    }

    backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
    backendLogStream.write(`\n${'='.repeat(60)}\n`);
    backendLogStream.write(`Backend Log - ${new Date().toISOString()}\n`);
    backendLogStream.write(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error('Failed to initialize backend log:', error);
  }
}

/**
 * Write a line to the backend log.
 */
function writeBackendLog(line: string, isError = false): void {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '[ERROR]' : '[OUT]';
  const formatted = `${timestamp} ${prefix} ${line}\n`;

  // Also log to console
  if (isError) {
    console.error(`[Backend] ${line}`);
  } else {
    console.log(`[Backend] ${line}`);
  }

  // Write to backend log file
  if (backendLogStream) {
    backendLogStream.write(formatted);
  }
}

/**
 * Close the backend log stream.
 */
function closeBackendLog(): void {
  if (backendLogStream) {
    backendLogStream.end();
    backendLogStream = null;
  }
}

export class BackendManager {
  private process: ChildProcess | null = null;
  private port = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private restartAttempts = 0;
  private readonly maxRestarts = 3;
  private isShuttingDown = false;
  /**
   * Runtime secret token for API authentication.
   * Generated fresh on each app start to prevent unauthorized access.
   * Only the Electron app knows this secret.
   */
  private desktopSecret: string = '';

  /**
   * Get the path to the backend executable based on platform.
   */
  private getBackendPath(): string {
    const resourcesPath = process.resourcesPath || app.getAppPath();
    const backendDir = path.join(resourcesPath, 'backend');

    if (process.platform === 'win32') {
      return path.join(backendDir, 'eclosion-backend.exe');
    }
    return path.join(backendDir, 'eclosion-backend');
  }

  /**
   * Start the Python backend subprocess.
   */
  async start(): Promise<void> {
    if (this.process) {
      console.log('Backend already running');
      return;
    }

    // Find available port
    // Expanded port range (5001-5100) to handle cases where other apps use these ports
    const portRange = Array.from({ length: 100 }, (_, i) => 5001 + i);
    this.port = await getPort({ port: portRange });

    // Generate a cryptographically secure runtime secret
    // This prevents other local processes (browser tabs, malicious apps) from accessing the API
    this.desktopSecret = crypto.randomBytes(32).toString('hex');

    const backendPath = this.getBackendPath();
    const stateDir = getStateDir();

    debugLog(`Starting backend on port ${this.port}`);
    debugLog(`Backend path: ${backendPath}`);
    debugLog(`Backend exists: ${fs.existsSync(backendPath)}`);
    debugLog(`State directory: ${stateDir}`);

    // Initialize backend-specific log file
    initBackendLog();

    this.process = spawn(backendPath, [], {
      env: {
        ...process.env,
        PORT: String(this.port),
        STATE_DIR: stateDir,
        FLASK_DEBUG: '0',
        // Ensure only localhost binding for security
        HOST: '127.0.0.1',
        // Signal to backend that we're running in desktop mode
        ECLOSION_DESKTOP: '1',
        // Runtime secret for API authentication - only the Electron app knows this
        DESKTOP_SECRET: this.desktopSecret,
        // Pass build-time version and channel to backend
        // These are injected by esbuild at build time (see build-main.js)
        APP_VERSION: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0',
        RELEASE_CHANNEL: typeof __RELEASE_CHANNEL__ !== 'undefined' ? __RELEASE_CHANNEL__ : 'dev',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log backend output to separate backend.log
    this.process.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line) writeBackendLog(line);
      }
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().trim().split('\n');
      for (const line of lines) {
        if (line) writeBackendLog(line, true);
      }
    });

    this.process.on('exit', (code, signal) => {
      console.log(`Backend exited with code ${code}, signal ${signal}`);
      this.process = null;
      this.handleExit();
    });

    this.process.on('error', (err) => {
      console.error('Failed to start backend:', err);
      this.process = null;
    });

    // Wait for backend to be ready
    await this.waitForHealth();

    // Start health monitoring
    this.startHealthCheck();
  }

  /**
   * Wait for the backend health endpoint to respond.
   */
  private async waitForHealth(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `http://127.0.0.1:${this.port}/health`;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          console.log('Backend is healthy');
          return;
        }
      } catch {
        // Backend not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error('Backend failed to start within timeout');
  }

  /**
   * Start periodic health checks.
   */
  private startHealthCheck(): void {
    // Update status immediately when starting
    updateHealthStatus(true);

    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (response.ok) {
          this.restartAttempts = 0; // Reset on successful check
          updateHealthStatus(true);
        } else {
          updateHealthStatus(false);
        }
      } catch {
        console.warn('Health check failed');
        updateHealthStatus(false);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle backend process exit.
   */
  private handleExit(): void {
    // Update tray to show backend stopped
    updateHealthStatus(false);

    if (this.isShuttingDown) {
      return;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Attempt restart if within limits
    if (this.restartAttempts < this.maxRestarts) {
      this.restartAttempts++;
      debugLog(`Attempting backend restart (${this.restartAttempts}/${this.maxRestarts})`);
      this.start().catch((err) => {
        debugLog(`Failed to restart backend: ${err instanceof Error ? err.message : String(err)}`);
      });
    } else {
      debugLog('Max restart attempts reached - showing error dialog');
      dialog.showErrorBox(
        'Backend Failed',
        'The Eclosion backend failed to start after multiple attempts.\n\n' +
          `Please check the logs at ${getLogDir()} and restart the app.`
      );
    }
  }

  /**
   * Get the port the backend is running on.
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Get the runtime secret for API authentication.
   * This secret is required in the X-Desktop-Secret header for all API requests.
   */
  getDesktopSecret(): string {
    return this.desktopSecret;
  }

  /**
   * Check if the backend is running.
   */
  isRunning(): boolean {
    return this.process !== null;
  }

  /**
   * Stop the backend process gracefully.
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.process) {
      console.log('Stopping backend...');

      // Send graceful shutdown signal
      this.process.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('Backend did not exit gracefully, forcing...');
          this.process?.kill('SIGKILL');
          resolve();
        }, 5000);

        this.process?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
      console.log('Backend stopped');
    }

    // Close the backend log stream
    closeBackendLog();
  }

  /**
   * Trigger a manual sync via the backend.
   */
  async triggerSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Desktop-Secret': this.desktopSecret,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        return { success: false, error: data.error || 'Sync failed' };
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Fetch the last sync time from the backend.
   * Returns the formatted time string or null if never synced.
   */
  async fetchLastSyncTime(): Promise<string | null> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/dashboard`, {
        headers: {
          'X-Desktop-Secret': this.desktopSecret,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { last_sync?: string | null };
        if (data.last_sync) {
          return data.last_sync;
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to fetch last sync time:', err);
      return null;
    }
  }

  /**
   * Check if a sync is needed (for wake-from-sleep handling).
   * Returns the result of the sync if triggered, or null if no sync was needed.
   */
  async checkSyncNeeded(): Promise<{ synced: boolean; success?: boolean; error?: string }> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/auto-sync/status`, {
        headers: {
          'X-Desktop-Secret': this.desktopSecret,
        },
      });

      if (response.ok) {
        const data = await response.json() as {
          enabled?: boolean;
          last_sync?: string;
          interval_minutes?: number;
        };
        // If auto-sync is enabled and last sync was too long ago, trigger sync
        if (data.enabled && data.last_sync) {
          const lastSync = new Date(data.last_sync);
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
          const intervalHours = (data.interval_minutes || 360) / 60;

          if (hoursSinceSync > intervalHours) {
            console.log(`Triggering sync after wake (${hoursSinceSync.toFixed(1)} hours since last sync)`);
            const result = await this.triggerSync();
            return { synced: true, success: result.success, error: result.error };
          }
        }
      }
      return { synced: false };
    } catch (err) {
      console.error('Failed to check sync status:', err);
      return { synced: false };
    }
  }
}
