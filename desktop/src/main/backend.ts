/**
 * Backend Process Manager
 *
 * Manages the Python Flask backend as a subprocess.
 * Handles port selection, health checks, crash recovery, and graceful shutdown.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'node:fs';
import { app, dialog } from 'electron';
import getPort from 'get-port';

// Debug logging to file - always enabled for production diagnostics
function debugLog(msg: string): void {
  console.log(msg);
  const logPath = path.join(app.getPath('home'), 'eclosion-debug.log');
  try {
    fs.appendFileSync(logPath, `${new Date().toISOString()} - [Backend] ${msg}\n`);
  } catch {
    // Ignore write errors
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
   * Get the state directory path for the current platform.
   */
  private getStateDir(): string {
    const appName = 'Eclosion';

    switch (process.platform) {
      case 'darwin':
        return path.join(app.getPath('home'), 'Library', 'Application Support', appName);
      case 'win32':
        return path.join(app.getPath('appData'), appName);
      default: // Linux
        return path.join(app.getPath('home'), '.config', appName.toLowerCase());
    }
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
    this.port = await getPort({ port: [5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009, 5010] });

    const backendPath = this.getBackendPath();
    const stateDir = this.getStateDir();

    debugLog(`Starting backend on port ${this.port}`);
    debugLog(`Backend path: ${backendPath}`);
    debugLog(`Backend exists: ${fs.existsSync(backendPath)}`);
    debugLog(`State directory: ${stateDir}`);

    this.process = spawn(backendPath, [], {
      env: {
        ...process.env,
        PORT: String(this.port),
        STATE_DIR: stateDir,
        FLASK_DEBUG: '0',
        // Ensure only localhost binding for security
        HOST: '127.0.0.1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Log backend output
    this.process.stdout?.on('data', (data: Buffer) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      console.error(`[Backend Error] ${data.toString().trim()}`);
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
    this.healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${this.port}/health`);
        if (response.ok) {
          this.restartAttempts = 0; // Reset on successful check
        }
      } catch {
        console.warn('Health check failed');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle backend process exit.
   */
  private handleExit(): void {
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
          'Please check the logs at ~/eclosion-debug.log and restart the app.'
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
  }

  /**
   * Trigger a manual sync via the backend.
   */
  async triggerSync(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
   * Check if a sync is needed (for wake-from-sleep handling).
   */
  async checkSyncNeeded(): Promise<void> {
    try {
      const response = await fetch(`http://127.0.0.1:${this.port}/recurring/auto-sync/status`, {
        credentials: 'include',
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
            await this.triggerSync();
          }
        }
      }
    } catch (err) {
      console.error('Failed to check sync status:', err);
    }
  }
}
