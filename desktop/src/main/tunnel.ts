/**
 * Remote Access Tunnel Manager (Named Tunnels)
 *
 * Manages Cloudflare Named Tunnels with claimed *.eclosion.me subdomains.
 *
 * Security model:
 * - Tunnel is opt-in and disabled by default
 * - Subdomain claimed once via the provisioner Worker, credentials stored locally
 * - Tunnel credentials encrypted at rest via Electron's safeStorage
 * - Remote users authenticate via email OTP + desktop passphrase
 * - OTP email registered/deregistered with provisioner on tunnel start/stop
 * - TLS termination at Cloudflare (HTTPS automatic)
 * - Real client IP forwarded via CF-Connecting-IP header
 *
 * Credential flow:
 * 1. User claims subdomain → Worker creates tunnel + DNS + remote ingress → returns credentials once
 * 2. Credentials encrypted via safeStorage, stored in electron-store
 * 3. On tunnel start: update remote ingress port → decrypt → write temp credentials file → spawn cloudflared
 * 4. On tunnel stop: kill process → delete temp credentials file
 */

import { spawn, type ChildProcess } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, chmodSync, writeFileSync, unlinkSync } from 'fs';
import { get as httpsGet } from 'https';
import { join } from 'path';
import { app, safeStorage, net } from 'electron';
import { debugLog } from './logger';
import { getStore } from './store';
import { getMonarchCredentials } from './biometric';

// =============================================================================
// Constants
// =============================================================================

const PROVISIONER_BASE_URL = 'https://tunnel-api.eclosion.me';

// =============================================================================
// Types
// =============================================================================

interface TunnelCredentials {
  AccountTag: string;
  TunnelID: string;
  TunnelSecret: string;
}

interface ActiveTunnel {
  url: string;
  port: number;
  process: ChildProcess;
  credentialsFilePath: string;
}

interface ClaimResponse {
  subdomain: string;
  tunnelId: string;
  accountTag: string;
  tunnelSecret: string;
  managementKey: string;
  error?: string;
}

interface CheckResponse {
  available: boolean;
  error?: string;
}

export interface TunnelConfig {
  subdomain: string | null;
  tunnelId: string | null;
  enabled: boolean;
  createdAt: string | null;
}

// =============================================================================
// State
// =============================================================================

let activeTunnel: ActiveTunnel | null = null;

// =============================================================================
// Credential Storage (safeStorage)
// =============================================================================

/**
 * Store tunnel credentials encrypted via safeStorage.
 * Credentials are only available at claim time — this is the only copy.
 */
function storeTunnelCredentials(creds: TunnelCredentials): boolean {
  if (!safeStorage.isEncryptionAvailable()) {
    debugLog('[Tunnel] safeStorage encryption not available');
    return false;
  }

  const encrypted = safeStorage.encryptString(JSON.stringify(creds));
  getStore().set('tunnel.encryptedCredentials', encrypted.toString('base64'));
  debugLog('[Tunnel] Credentials stored in safeStorage');
  return true;
}

/**
 * Retrieve and decrypt tunnel credentials from safeStorage.
 */
function getTunnelCredentials(): TunnelCredentials | null {
  const encrypted = getStore().get('tunnel.encryptedCredentials') as string | undefined;
  if (!encrypted) return null;

  try {
    const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
    return JSON.parse(decrypted) as TunnelCredentials;
  } catch (error) {
    debugLog(`[Tunnel] Failed to decrypt credentials: ${error}`);
    return null;
  }
}

/**
 * Retrieve and decrypt the management key from safeStorage.
 * Used for OTP registration with the provisioner Worker.
 */
export function getManagementKey(): string | null {
  const encrypted = getStore().get('tunnel.encryptedManagementKey') as string | undefined;
  if (!encrypted) return null;

  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
  } catch (error) {
    debugLog(`[Tunnel] Failed to decrypt management key: ${error}`);
    return null;
  }
}

/**
 * Write a temporary credentials file for cloudflared.
 * Returns the path to the file.
 */
function writeCredentialsFile(creds: TunnelCredentials): string {
  const credentialsPath = join(app.getPath('userData'), 'tunnel-credentials.json');
  writeFileSync(credentialsPath, JSON.stringify(creds), { mode: 0o600 });
  debugLog(`[Tunnel] Credentials file written to ${credentialsPath}`);
  return credentialsPath;
}

/**
 * Delete the temporary credentials file.
 */
function deleteCredentialsFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      debugLog('[Tunnel] Credentials file deleted');
    }
  } catch (error) {
    debugLog(`[Tunnel] Error deleting credentials file: ${error}`);
  }
}

// =============================================================================
// OTP Email Registration
// =============================================================================

/**
 * Register the user's Monarch email with the provisioner worker for OTP.
 * Called after tunnel connects successfully.
 */
async function registerOtpEmail(subdomain: string): Promise<void> {
  const managementKey = getManagementKey();
  if (!managementKey) {
    debugLog('[Tunnel] No management key available, skipping OTP registration');
    return;
  }

  const credentials = getMonarchCredentials();
  if (!credentials?.email) {
    debugLog('[Tunnel] No Monarch email available, skipping OTP registration');
    return;
  }

  try {
    await provisionerFetch('/api/otp/register', {
      method: 'POST',
      body: {
        subdomain,
        managementKey,
        email: credentials.email,
      },
    });
    debugLog(`[Tunnel] OTP email registered for ${subdomain}`);
  } catch (error) {
    // Non-fatal — tunnel still works, just without OTP protection
    debugLog(`[Tunnel] OTP registration failed (non-fatal): ${error}`);
  }
}

/**
 * Deregister OTP email from the provisioner worker.
 * Called before tunnel stops. Fire-and-forget to avoid blocking shutdown.
 */
function deregisterOtpEmail(subdomain: string): void {
  const managementKey = getManagementKey();
  if (!managementKey) return;

  // Fire-and-forget — don't await, don't block tunnel stop
  provisionerFetch('/api/otp/deregister', {
    method: 'POST',
    body: { subdomain, managementKey },
  }).catch((error) => {
    debugLog(`[Tunnel] OTP deregistration failed (non-fatal): ${error}`);
  });
}

// =============================================================================
// Remote Ingress Management
// =============================================================================

/**
 * Update the remote ingress rules with the current backend port.
 * Called before spawning cloudflared so the remote config has the correct port.
 */
async function updateIngress(subdomain: string, port: number): Promise<void> {
  const managementKey = getManagementKey();
  if (!managementKey) {
    throw new Error('No management key available for ingress update');
  }

  debugLog(`[Tunnel] Updating remote ingress for ${subdomain} → localhost:${port}`);

  await provisionerFetch('/api/tunnel/update-ingress', {
    method: 'POST',
    body: { subdomain, managementKey, port },
  });

  debugLog('[Tunnel] Remote ingress updated');
}

// =============================================================================
// cloudflared Binary Management
// =============================================================================

/**
 * Get the cloudflared binary path for the current platform.
 */
function getCloudflaredPath(): string {
  const userDataPath = app.getPath('userData');
  const binDir = join(userDataPath, 'bin');

  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  let binaryName = 'cloudflared';
  if (process.platform === 'win32') {
    binaryName = 'cloudflared.exe';
  }

  return join(binDir, binaryName);
}

/**
 * Get the download URL for cloudflared based on platform/arch.
 */
function getCloudflaredDownloadUrl(): string {
  const platform = process.platform;
  const arch = process.arch;
  const baseUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download';

  if (platform === 'darwin') {
    return `${baseUrl}/cloudflared-darwin-amd64.tgz`;
  } else if (platform === 'win32') {
    return arch === 'x64'
      ? `${baseUrl}/cloudflared-windows-amd64.exe`
      : `${baseUrl}/cloudflared-windows-386.exe`;
  } else if (platform === 'linux') {
    if (arch === 'x64') return `${baseUrl}/cloudflared-linux-amd64`;
    if (arch === 'arm64') return `${baseUrl}/cloudflared-linux-arm64`;
    if (arch === 'arm') return `${baseUrl}/cloudflared-linux-arm`;
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

/**
 * Download a file from URL to destination path.
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    debugLog(`[Tunnel] Downloading from ${url}`);

    const handleResponse = (response: NodeJS.ReadableStream & { statusCode?: number; headers?: { location?: string } }): void => {
      const res = response as { statusCode?: number; headers?: { location?: string } };
      if (res.statusCode === 302 || res.statusCode === 301) {
        const redirectUrl = res.headers?.location;
        if (redirectUrl) {
          debugLog(`[Tunnel] Following redirect to ${redirectUrl}`);
          httpsGet(redirectUrl, handleResponse).on('error', reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Download failed with status ${res.statusCode}`));
        return;
      }

      const file = createWriteStream(destPath);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        if (process.platform !== 'win32') {
          chmodSync(destPath, 0o755);
        }
        debugLog(`[Tunnel] Download complete: ${destPath}`);
        resolve();
      });
      file.on('error', (err) => {
        reject(err);
      });
    };

    httpsGet(url, handleResponse).on('error', reject);
  });
}

/**
 * Ensure cloudflared binary is available, downloading if necessary.
 */
async function ensureCloudflared(): Promise<string> {
  const binaryPath = getCloudflaredPath();

  if (existsSync(binaryPath)) {
    debugLog(`[Tunnel] cloudflared already exists at ${binaryPath}`);
    return binaryPath;
  }

  debugLog('[Tunnel] cloudflared not found, downloading...');
  const downloadUrl = getCloudflaredDownloadUrl();

  if (process.platform === 'darwin') {
    const tgzPath = `${binaryPath}.tgz`;
    await downloadFile(downloadUrl, tgzPath);

    const { execSync } = await import('child_process');
    const binDir = join(app.getPath('userData'), 'bin');
    execSync(`tar -xzf "${tgzPath}" -C "${binDir}"`, { stdio: 'ignore' });

    const { unlinkSync: unlinkTgz } = await import('fs');
    unlinkTgz(tgzPath);

    debugLog(`[Tunnel] Extracted cloudflared to ${binaryPath}`);
  } else {
    await downloadFile(downloadUrl, binaryPath);
  }

  return binaryPath;
}

// =============================================================================
// Provisioner API
// =============================================================================

/**
 * Make a request to the tunnel provisioner Worker.
 */
async function provisionerFetch<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const url = `${PROVISIONER_BASE_URL}${path}`;
  const fetchOptions: RequestInit = {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
  };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await net.fetch(url, fetchOptions);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }

  return data;
}

/**
 * Check if a subdomain is available.
 */
export async function checkSubdomainAvailability(
  subdomain: string,
): Promise<{ available: boolean; error?: string }> {
  try {
    return await provisionerFetch<CheckResponse>(
      `/api/check/${subdomain.toLowerCase()}`,
    );
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Failed to check availability',
    };
  }
}

/**
 * Claim a subdomain and store the returned credentials.
 */
export async function claimSubdomain(
  subdomain: string,
): Promise<{ success: boolean; subdomain?: string; error?: string }> {
  try {
    const result = await provisionerFetch<ClaimResponse>('/api/claim', {
      method: 'POST',
      body: { subdomain: subdomain.toLowerCase() },
    });

    // Store credentials in safeStorage
    const stored = storeTunnelCredentials({
      AccountTag: result.accountTag,
      TunnelID: result.tunnelId,
      TunnelSecret: result.tunnelSecret,
    });

    if (!stored) {
      return { success: false, error: 'Failed to store tunnel credentials securely' };
    }

    // Store tunnel metadata in electron-store
    const store = getStore();
    store.set('tunnel.subdomain', result.subdomain);
    store.set('tunnel.tunnelId', result.tunnelId);
    store.set('tunnel.enabled', true);
    store.set('tunnel.createdAt', new Date().toISOString());

    // Encrypt and store management key via safeStorage
    if (result.managementKey && safeStorage.isEncryptionAvailable()) {
      const encryptedKey = safeStorage.encryptString(result.managementKey);
      store.set('tunnel.encryptedManagementKey', encryptedKey.toString('base64'));
    }

    debugLog(`[Tunnel] Subdomain claimed: ${result.subdomain}.eclosion.me`);
    return { success: true, subdomain: result.subdomain };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to claim subdomain';
    debugLog(`[Tunnel] Claim failed: ${msg}`);
    return { success: false, error: msg };
  }
}

/**
 * Release a claimed subdomain.
 * Stops the tunnel if active, calls the provisioner to delete tunnel + DNS + KV,
 * and clears all local tunnel store keys.
 */
export async function unclaimSubdomain(): Promise<{ success: boolean; error?: string }> {
  try {
    const store = getStore();
    const subdomain = store.get('tunnel.subdomain') as string | undefined;

    if (!subdomain) {
      return { success: false, error: 'No subdomain configured' };
    }

    // Stop tunnel if active (handles OTP deregistration and sets enabled = false)
    if (activeTunnel) {
      stopTunnel();
    }

    // Call provisioner to delete tunnel + DNS + KV (requires management key)
    const managementKey = getManagementKey();
    if (managementKey) {
      try {
        await provisionerFetch('/api/unclaim', {
          method: 'POST',
          body: { subdomain, managementKey },
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to unclaim subdomain';
        debugLog(`[Tunnel] Unclaim API call failed: ${msg}`);
        return { success: false, error: msg };
      }
    } else {
      // No management key — can't clean up server-side resources.
      // Clear local state only so the user can reclaim a new subdomain.
      debugLog('[Tunnel] No management key — skipping server-side cleanup, clearing local state only');
    }

    // Clear all local tunnel store keys
    store.delete('tunnel.subdomain');
    store.delete('tunnel.tunnelId');
    store.delete('tunnel.enabled');
    store.delete('tunnel.createdAt');
    store.delete('tunnel.encryptedCredentials');
    store.delete('tunnel.encryptedManagementKey');

    debugLog(`[Tunnel] Subdomain released: ${subdomain}.eclosion.me`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to release subdomain';
    debugLog(`[Tunnel] Unclaim failed: ${msg}`);
    return { success: false, error: msg };
  }
}

// =============================================================================
// Tunnel Lifecycle
// =============================================================================

/**
 * Start the named tunnel to the specified local port.
 * Returns the public HTTPS URL (subdomain.eclosion.me).
 */
export async function startTunnel(port: number): Promise<string> {
  if (activeTunnel) {
    debugLog(`[Tunnel] Already active at ${activeTunnel.url}`);
    return activeTunnel.url;
  }

  const store = getStore();
  const subdomain = store.get('tunnel.subdomain') as string | undefined;
  const tunnelId = store.get('tunnel.tunnelId') as string | undefined;

  if (!subdomain || !tunnelId) {
    throw new Error('No subdomain claimed. Set up a subdomain first.');
  }

  // Get credentials from safeStorage
  const credentials = getTunnelCredentials();
  if (!credentials) {
    throw new Error('Tunnel credentials not found or could not be decrypted');
  }

  debugLog(`[Tunnel] Starting named tunnel for ${subdomain}.eclosion.me on port ${port}...`);

  const binaryPath = await ensureCloudflared();

  // Update remote ingress with the current port before starting cloudflared
  await updateIngress(subdomain, port);

  // Write temporary credentials file
  const credentialsFilePath = writeCredentialsFile(credentials);

  try {
    // Spawn cloudflared with credentials file — ingress rules are managed remotely
    const tunnelProcess = spawn(binaryPath, [
      'tunnel', '--no-autoupdate',
      '--credentials-file', credentialsFilePath,
      'run', tunnelId,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for tunnel to connect
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        tunnelProcess.kill();
        deleteCredentialsFile(credentialsFilePath);
        reject(new Error('Tunnel connection timeout'));
      }, 60000);

      let output = '';

      const handleOutput = (data: Buffer): void => {
        const text = data.toString();
        output += text;
        debugLog(`[Tunnel] ${text.trim()}`);

        // Named tunnels log "Registered tunnel connection" when connected
        if (text.includes('Registered tunnel connection') || text.includes('Connection registered')) {
          clearTimeout(timeout);
          resolve();
        }
      };

      tunnelProcess.stdout?.on('data', handleOutput);
      tunnelProcess.stderr?.on('data', handleOutput);

      tunnelProcess.on('error', (error) => {
        clearTimeout(timeout);
        deleteCredentialsFile(credentialsFilePath);
        reject(error);
      });

      tunnelProcess.on('exit', (code) => {
        if (!activeTunnel) {
          clearTimeout(timeout);
          deleteCredentialsFile(credentialsFilePath);
          reject(new Error(`cloudflared exited with code ${code}\n${output}`));
        }
      });
    });

    const url = `https://${subdomain}.eclosion.me`;
    activeTunnel = { url, port, process: tunnelProcess, credentialsFilePath };

    debugLog(`[Tunnel] Started successfully: ${url}`);

    // Mark tunnel as enabled
    store.set('tunnel.enabled', true);

    // Register OTP email with provisioner (non-blocking)
    registerOtpEmail(subdomain).catch((error) => {
      debugLog(`[Tunnel] OTP registration error (non-fatal): ${error}`);
    });

    return url;
  } catch (error) {
    deleteCredentialsFile(credentialsFilePath);
    debugLog(`[Tunnel] Failed to start: ${error}`);
    throw error;
  }
}

/**
 * Stop the active tunnel.
 */
export function stopTunnel(): void {
  if (!activeTunnel) {
    debugLog('[Tunnel] No active tunnel to stop');
    return;
  }

  debugLog(`[Tunnel] Stopping tunnel at ${activeTunnel.url}`);

  // Deregister OTP email (fire-and-forget, non-blocking)
  const subdomain = getStore().get('tunnel.subdomain') as string | undefined;
  if (subdomain) {
    deregisterOtpEmail(subdomain);
  }

  try {
    activeTunnel.process.kill();
    debugLog('[Tunnel] Process killed');
  } catch (error) {
    debugLog(`[Tunnel] Error killing process: ${error}`);
  }

  // Clean up temporary credentials file
  deleteCredentialsFile(activeTunnel.credentialsFilePath);

  activeTunnel = null;

  // Mark tunnel as disabled
  getStore().set('tunnel.enabled', false);

  debugLog('[Tunnel] Stopped');
}

/**
 * Get the current tunnel URL, or null if not active.
 */
export function getTunnelUrl(): string | null {
  return activeTunnel?.url ?? null;
}

/**
 * Check if a tunnel is currently active.
 */
export function isTunnelActive(): boolean {
  return activeTunnel !== null;
}

/**
 * Check if the tunnel is enabled (persisted setting for auto-start).
 */
export function isTunnelEnabled(): boolean {
  return getStore().get('tunnel.enabled', false);
}

/**
 * Check if a subdomain has been configured (claimed).
 */
export function isTunnelConfigured(): boolean {
  return !!getStore().get('tunnel.subdomain');
}

/**
 * Get the tunnel configuration.
 */
export function getTunnelConfig(): TunnelConfig {
  const store = getStore();
  return {
    subdomain: (store.get('tunnel.subdomain') as string) ?? null,
    tunnelId: (store.get('tunnel.tunnelId') as string) ?? null,
    enabled: isTunnelEnabled(),
    createdAt: (store.get('tunnel.createdAt') as string) ?? null,
  };
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Clean up tunnel resources when the app is quitting.
 */
export function cleanupTunnel(): void {
  if (activeTunnel) {
    debugLog('[Tunnel] Cleaning up on app quit');
    try {
      activeTunnel.process.kill();
    } catch {
      // Ignore errors during cleanup
    }
    deleteCredentialsFile(activeTunnel.credentialsFilePath);
    activeTunnel = null;
  }
}
