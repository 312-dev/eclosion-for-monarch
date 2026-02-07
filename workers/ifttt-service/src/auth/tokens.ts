/**
 * OAuth Token Management
 *
 * Handles token generation, validation, and subdomain resolution.
 * Uses non-expiring JWTs signed with HMAC-SHA256 (OAUTH_SIGNING_SECRET).
 * Token format mirrors tunnel-gate/src/jwt.ts but with OAuth-specific claims.
 */

import type { Env, TokenData, ActionSecretData, IftttUserData } from '../types';

// --- JWT Implementation (matches tunnel-gate pattern) ---

interface OAuthJwtPayload {
  sub: string; // Subdomain
  iss: string; // Issuer: "eclosion-ifttt"
  iat: number; // Issued-at (unix seconds)
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

export async function signToken(subdomain: string, secret: string): Promise<string> {
  const payload: OAuthJwtPayload = {
    sub: subdomain,
    iss: 'eclosion-ifttt',
    iat: Math.floor(Date.now() / 1000),
  };

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

export async function verifyToken(token: string, secret: string): Promise<OAuthJwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
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
    return JSON.parse(payloadStr) as OAuthJwtPayload;
  } catch {
    return null;
  }
}

// --- Token Helpers ---

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a non-expiring access token for a subdomain and store its hash in KV.
 */
export async function generateAccessToken(
  subdomain: string,
  env: Env,
): Promise<string> {
  const token = await signToken(subdomain, env.OAUTH_SIGNING_SECRET);
  const tokenHash = await sha256(token);

  const tokenData: TokenData = {
    subdomain,
    created_at: new Date().toISOString(),
  };

  // Store token hash + mark user as connected in parallel
  await Promise.all([
    env.IFTTT_TOKENS.put(`token:${tokenHash}`, JSON.stringify(tokenData)),
    env.IFTTT_TOKENS.put(
      `user:${subdomain}`,
      JSON.stringify({ connected: true, connected_at: new Date().toISOString() }),
    ),
  ]);

  return token;
}

/**
 * Extract subdomain from a Bearer token in the Authorization header.
 * Returns null if the token is invalid or the user has disconnected.
 *
 * Auth relies on JWT signature verification (HMAC-SHA256) rather than
 * KV token-hash lookups, avoiding KV eventual-consistency issues that
 * caused intermittent 401s during IFTTT's rapid test/setup → poll flow.
 */
export async function resolveSubdomain(
  request: Request,
  env: Env,
): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, env.OAUTH_SIGNING_SECRET);
  if (!payload) return null;

  // Check if user has explicitly disconnected
  const userData = await env.IFTTT_TOKENS.get<IftttUserData>(`user:${payload.sub}`, 'json');
  if (userData && userData.connected === false) return null;

  return payload.sub;
}

/**
 * Resolve subdomain + action secret in parallel.
 * After JWT signature verification yields the subdomain, fetch the
 * user's connection status and action secret from KV concurrently.
 */
export async function resolveSubdomainAndSecret(
  request: Request,
  env: Env,
): Promise<{ subdomain: string | null; actionSecret: string | null }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer '))
    return { subdomain: null, actionSecret: null };

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, env.OAUTH_SIGNING_SECRET);
  if (!payload) return { subdomain: null, actionSecret: null };

  // Parallel KV reads: disconnected check + action secret
  const [userData, secretData] = await Promise.all([
    env.IFTTT_TOKENS.get<IftttUserData>(`user:${payload.sub}`, 'json'),
    env.IFTTT_TOKENS.get<ActionSecretData>(`action-secret:${payload.sub}`, 'json'),
  ]);

  // User explicitly disconnected
  if (userData && userData.connected === false)
    return { subdomain: null, actionSecret: null };

  return { subdomain: payload.sub, actionSecret: secretData?.secret ?? null };
}

/**
 * Generate a random authorization code.
 */
export function generateAuthCode(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
