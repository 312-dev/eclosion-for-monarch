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
import { EventEmitter } from 'node:events';
import { debugLog as log, getLogDir } from './logger';
import { updateHealthStatus } from './tray';
import { getStateDir } from './paths';

/** Filename for the persistent session secret */
const SESSION_SECRET_FILE = '.session_secret';

/**
 * Get or create a persistent session secret.
 *
 * This secret is used by Flask to sign session cookies. By persisting it,
 * user sessions survive backend restarts (e.g., app updates, reboots).
 *
 * The secret is stored in the app's state directory which is already
 * protected by OS-level permissions (same location as encrypted credentials).
 */
function getOrCreateSessionSecret(): string {
  const stateDir = getStateDir();
  const secretPath = path.join(stateDir, SESSION_SECRET_FILE);

  try {
    // Try to read existing secret
    if (fs.existsSync(secretPath)) {
      const secret = fs.readFileSync(secretPath, 'utf-8').trim();
      // Validate it's a reasonable length (64 hex chars = 32 bytes)
      if (secret.length >= 64) {
        return secret;
      }
      // Invalid/corrupted file, regenerate
      console.warn('Session secret file invalid, regenerating');
    }

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');

    // Ensure state directory exists (mkdirSync with recursive is idempotent)
    fs.mkdirSync(stateDir, { recursive: true });

    // Write with restrictive permissions (owner read/write only)
    fs.writeFileSync(secretPath, newSecret, { mode: 0o600 });
    console.log('Generated new persistent session secret');

    return newSecret;
  } catch (err) {
    // If we can't read/write the file, fall back to ephemeral secret
    console.error('Failed to persist session secret, using ephemeral:', err);
    return crypto.randomBytes(32).toString('hex');
  }
}

/** Status updates emitted during backend startup */
export interface BackendStartupStatus {
  phase: 'initializing' | 'spawning' | 'waiting_for_health' | 'ready' | 'failed';
  message: string;
  progress: number; // 0-100
  error?: string;
}

/**
 * Maximum time to wait for the backend to become healthy (3 minutes).
 * This matches the loading screen timeout in StartupLoadingScreen.tsx.
 */
const BACKEND_HEALTH_TIMEOUT_MS = 180000;

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

export class BackendManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private port = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private restartAttempts = 0;
  private readonly maxRestarts = 3;
  private isShuttingDown = false;
  private startupComplete = false;
  /**
   * Runtime secret token for API authentication.
   * Generated fresh on each app start to prevent unauthorized access.
   * Only the Electron app knows this secret.
   */
  private desktopSecret: string = '';

  constructor() {
    super();
  }

  /**
   * Emit a startup status update to listeners.
   */
  private emitStartupStatus(status: BackendStartupStatus): void {
    this.emit('startup-status', status);
  }

  /**
   * Check if initial startup has completed.
   */
  isStartupComplete(): boolean {
    return this.startupComplete;
  }

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
   * Emits 'startup-status' events during the process for UI feedback.
   */
  async start(): Promise<void> {
    if (this.process) {
      console.log('Backend already running');
      return;
    }

    this.emitStartupStatus({
      phase: 'initializing',
      message: 'Finding available port...',
      progress: 10,
    });

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

    this.emitStartupStatus({
      phase: 'spawning',
      message: 'Starting backend server...',
      progress: 25,
    });

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
        // Persistent session secret - allows sessions to survive backend restarts
        SESSION_SECRET: getOrCreateSessionSecret(),
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
      this.emitStartupStatus({
        phase: 'failed',
        message: 'Failed to start backend process',
        progress: 0,
        error: err.message,
      });
    });

    this.emitStartupStatus({
      phase: 'waiting_for_health',
      message: 'Waiting for server to respond...',
      progress: 40,
    });

    // Wait for backend to be ready
    await this.waitForHealth();

    this.startupComplete = true;
    this.emitStartupStatus({
      phase: 'ready',
      message: 'Backend is ready!',
      progress: 100,
    });

    // Start health monitoring
    this.startHealthCheck();
  }

  /**
   * Wait for the backend health endpoint to respond.
   * Emits progress updates during the wait.
   */
  private async waitForHealth(timeout = BACKEND_HEALTH_TIMEOUT_MS): Promise<void> {
    const startTime = Date.now();
    const healthUrl = `http://127.0.0.1:${this.port}/health`;
    let lastProgressEmit = 0;

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

      // Emit progress updates every second (2 poll cycles)
      const elapsed = Date.now() - startTime;
      if (elapsed - lastProgressEmit >= 1000) {
        // Progress from 40% to 95% over the timeout period
        const healthProgress = Math.min(95, 40 + (elapsed / timeout) * 55);
        this.emitStartupStatus({
          phase: 'waiting_for_health',
          message: 'Waiting for server to respond...',
          progress: Math.round(healthProgress),
        });
        lastProgressEmit = elapsed;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.emitStartupStatus({
      phase: 'failed',
      message: 'Backend failed to start within timeout',
      progress: 0,
      error: 'Server did not respond within 3 minutes',
    });

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
   * @param passphrase Optional passphrase to unlock credentials if locked (legacy mode)
   */
  async triggerSync(passphrase?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const body: { passphrase?: string } = {};
      if (passphrase) {
        body.passphrase = passphrase;
      }

      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Desktop-Secret': this.desktopSecret,
        },
        body: JSON.stringify(body),
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
   * Restore credentials from Electron safeStorage to backend session.
   * Used on app startup to establish session without user interaction.
   *
   * @param credentials Credentials from safeStorage
   * @returns Success/failure of session restoration, with mfaRequired flag if MFA needed
   */
  async restoreSession(credentials: {
    email: string;
    password: string;
    mfaSecret?: string;
    mfaMode?: 'secret' | 'code';
  }): Promise<{ success: boolean; error?: string; mfaRequired?: boolean }> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/auth/desktop-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Desktop-Secret': this.desktopSecret,
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          mfa_secret: credentials.mfaSecret || '',
          mfa_mode: credentials.mfaMode || 'secret',
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        return { success: false, error: data.error || 'Session restore failed' };
      }

      const result = await response.json() as { success: boolean; error?: string };

      // Check if the error indicates MFA is required
      if (!result.success && result.error) {
        const errorLower = result.error.toLowerCase();
        const isMfaError = errorLower.includes('mfa') ||
                          errorLower.includes('multi-factor') ||
                          errorLower.includes('2fa') ||
                          errorLower.includes('two-factor');
        if (isMfaError) {
          return { success: false, error: result.error, mfaRequired: true };
        }
      }

      return result;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }

  /**
   * Fetch the last sync time from the backend.
   * Uses auto-sync/status endpoint which doesn't require auth.
   * Returns the ISO timestamp string or null if never synced.
   */
  async fetchLastSyncTime(): Promise<string | null> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/auto-sync/status`, {
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
   * Check if a sync is needed based on interval (for startup and wake-from-sleep).
   *
   * Desktop mode: Credentials should already be in session (via restoreSession).
   * Legacy mode: Passphrase unlocks encrypted credentials.
   *
   * @param passphrase Passphrase for legacy mode (optional)
   * @returns Result indicating if sync was triggered and its outcome
   */
  async checkSyncNeeded(passphrase?: string): Promise<{ synced: boolean; success?: boolean; error?: string }> {
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

        // Use the configured interval, or default to 6 hours
        const intervalMinutes = data.interval_minutes || 360;
        const intervalHours = intervalMinutes / 60;

        // Check if enough time has passed since last sync
        if (data.last_sync) {
          const lastSync = new Date(data.last_sync);
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

          if (hoursSinceSync >= intervalHours) {
            console.log(`Desktop auto-sync: ${hoursSinceSync.toFixed(1)} hours since last sync (interval: ${intervalHours}h)`);
            // For desktop mode, credentials are already in session
            // For legacy mode, pass the passphrase
            const result = await this.triggerSync(passphrase);
            return { synced: true, success: result.success, error: result.error };
          }
        } else {
          // No last_sync means never synced - trigger initial sync
          console.log('Desktop auto-sync: No previous sync, triggering initial sync');
          const result = await this.triggerSync(passphrase);
          return { synced: true, success: result.success, error: result.error };
        }
      }
      return { synced: false };
    } catch (err) {
      console.error('Failed to check sync status:', err);
      return { synced: false };
    }
  }
}
