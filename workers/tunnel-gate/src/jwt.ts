/**
 * JWT Sign/Verify
 *
 * Minimal JWT implementation using Web Crypto API (HMAC-SHA256).
 * No external dependencies — runs on Cloudflare Workers.
 *
 * JWT format: base64url(header).base64url(payload).base64url(signature)
 * Header is always: {"alg":"HS256","typ":"JWT"}
 */

export interface JwtPayload {
  sub: string; // Subdomain
  dev: string; // SHA-256(device cookie value)
  iat: number; // Issued-at (unix seconds)
  exp: number; // Expiry (unix seconds)
}

// Pre-encoded header: {"alg":"HS256","typ":"JWT"}
const JWT_HEADER = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

function base64urlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
  const encoded = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw',
    encoded,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Sign a JWT payload with HMAC-SHA256.
 * Returns the full JWT string.
 */
export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(new TextEncoder().encode(payloadStr));

  const signingInput = `${JWT_HEADER}.${payloadB64}`;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  );

  const signatureB64 = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
}

/**
 * Verify a JWT and return the payload, or null if invalid.
 * Checks signature only — caller must check exp, sub, dev claims.
 */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;

  // Verify header matches expected value
  if (header !== JWT_HEADER) return null;

  const signingInput = `${header}.${payload}`;
  const key = await getKey(secret);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64urlDecode(signature);
  } catch {
    return null;
  }

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    new TextEncoder().encode(signingInput),
  );

  if (!valid) return null;

  try {
    const payloadBytes = base64urlDecode(payload);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    return JSON.parse(payloadStr) as JwtPayload;
  } catch {
    return null;
  }
}
