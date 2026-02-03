/**
 * Cryptographic Utilities
 *
 * SHA-256 hashing and constant-time comparison for OTP and management key operations.
 * Uses the Web Crypto API available in Cloudflare Workers.
 */

/**
 * SHA-256 hash a string and return the hex digest.
 */
export async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a management key against a stored SHA-256 hash.
 */
export async function verifyManagementKey(
  key: string,
  storedHash: string,
): Promise<boolean> {
  const computed = await sha256(key);
  return constantTimeEqual(computed, storedHash);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if strings are equal, false otherwise.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generate cryptographically random hex string of the specified byte length.
 */
export function generateRandomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hash a management key using SHA-256.
 * Alias for sha256 used in subdomain claim flow.
 */
export async function hashManagementKey(key: string): Promise<string> {
  return sha256(key);
}

/**
 * Generate a 6-digit OTP code.
 */
export function generateOtpCode(): string {
  const buffer = new Uint8Array(4);
  crypto.getRandomValues(buffer);
  const num = ((buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3]) >>> 0;
  return String(num % 1000000).padStart(6, '0');
}
