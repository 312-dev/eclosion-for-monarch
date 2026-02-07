/**
 * OTP (One-Time Password) Handlers
 *
 * Email-based OTP verification for remote tunnel access.
 * Provides a first authentication layer before the passphrase screen.
 *
 * KV Schema:
 *   otp-email:{subdomain}   → { email }                                    (no TTL)
 *   otp:{subdomain}         → { code, attempts, created_at, resend_count } (TTL: 600s)
 *   otp-session:{token}     → { subdomain, device_key_hash, created_at }   (TTL: 604800s)
 *   otp-cooldown:{subdomain} → { last_sent }                               (TTL: 30s)
 */

import type { Env } from './index';
import { verifyManagementKey, constantTimeEqual, sha256, generateRandomHex, generateOtpCode } from './crypto';
import { sendOtpEmail } from './email';
import { logAudit, getClientIp } from './audit';

// =============================================================================
// Constants
// =============================================================================

const OTP_TTL = 600; // 10 minutes
const SESSION_TTL = 604800; // 1 week
const COOLDOWN_SECONDS = 60; // 60 seconds between sends
const COOLDOWN_KV_TTL = 60; // KV TTL matches cooldown
const MAX_RESENDS = 1; // 1 resend per 10-minute window
const MAX_ATTEMPTS = 5; // Per code

// =============================================================================
// KV Types
// =============================================================================

interface SubdomainData {
  tunnel_id: string;
  created_at: string;
  management_key_hash?: string;
}

interface OtpEmailData {
  email: string;
}

interface OtpData {
  code: string;
  attempts: number;
  created_at: string;
  resend_count: number;
  last_attempt_at?: string; // For exponential backoff
}

interface OtpSessionData {
  subdomain: string;
  device_key_hash: string;
  created_at: string;
}

interface OtpCooldownData {
  last_sent: string;
}

// =============================================================================
// Helpers
// =============================================================================

function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function errorResponse(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

// =============================================================================
// POST /api/otp/register — Desktop registers email on tunnel start
// =============================================================================

export async function handleOtpRegister(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { subdomain?: string; managementKey?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { subdomain, managementKey, email } = body;
  if (!subdomain || !managementKey || !email) {
    return errorResponse('subdomain, managementKey, and email are required', 400);
  }

  // Validate management key
  const subdomainData = await env.TUNNELS.get<SubdomainData>(
    `subdomain:${subdomain}`,
    'json',
  );
  if (!subdomainData?.management_key_hash) {
    return errorResponse('Subdomain not found or management key not configured', 404);
  }

  const keyValid = await verifyManagementKey(managementKey, subdomainData.management_key_hash);
  if (!keyValid) {
    return errorResponse('Invalid management key', 403);
  }

  // Store email for OTP sends
  await env.TUNNELS.put(
    `otp-email:${subdomain}`,
    JSON.stringify({ email } satisfies OtpEmailData),
  );

  // Audit log: successful OTP registration
  await logAudit(env.TUNNELS, 'otp_register', subdomain, getClientIp(request), true);

  return jsonResponse({ success: true });
}

// =============================================================================
// POST /api/otp/deregister — Desktop clears email on tunnel stop
// =============================================================================

export async function handleOtpDeregister(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { subdomain?: string; managementKey?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { subdomain, managementKey } = body;
  if (!subdomain || !managementKey) {
    return errorResponse('subdomain and managementKey are required', 400);
  }

  // Validate management key
  const subdomainData = await env.TUNNELS.get<SubdomainData>(
    `subdomain:${subdomain}`,
    'json',
  );
  if (!subdomainData?.management_key_hash) {
    return errorResponse('Subdomain not found or management key not configured', 404);
  }

  const keyValid = await verifyManagementKey(managementKey, subdomainData.management_key_hash);
  if (!keyValid) {
    return errorResponse('Invalid management key', 403);
  }

  // Delete OTP-related keys
  await Promise.all([
    env.TUNNELS.delete(`otp-email:${subdomain}`),
    env.TUNNELS.delete(`otp:${subdomain}`),
    env.TUNNELS.delete(`otp-cooldown:${subdomain}`),
  ]);

  // Audit log: successful OTP deregistration
  await logAudit(env.TUNNELS, 'otp_deregister', subdomain, getClientIp(request), true);

  return jsonResponse({ success: true });
}

// =============================================================================
// POST /api/otp/send — Remote user requests OTP code
// =============================================================================

export async function handleOtpSend(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { subdomain?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { subdomain, email } = body;
  if (!subdomain || !email) {
    return errorResponse('subdomain and email are required', 400);
  }

  // Generic success response — returned regardless of whether the email matched.
  // This prevents attackers from discovering the registered email.
  const genericResponse = () => jsonResponse({ sent: true, expiresIn: OTP_TTL });

  // Check email is registered (no-op response if not configured)
  const emailData = await env.TUNNELS.get<OtpEmailData>(
    `otp-email:${subdomain}`,
    'json',
  );
  if (!emailData) {
    return genericResponse();
  }

  // Check cooldown (applies regardless of email match to prevent enumeration)
  const cooldown = await env.TUNNELS.get<OtpCooldownData>(
    `otp-cooldown:${subdomain}`,
    'json',
  );
  if (cooldown) {
    const elapsed = Date.now() - new Date(cooldown.last_sent).getTime();
    const remaining = COOLDOWN_SECONDS - Math.floor(elapsed / 1000);
    if (remaining > 0) {
      return jsonResponse({ error: 'Please wait before requesting another code', retryAfter: remaining }, 429);
    }
  }

  // Compare emails via SHA-256 hash for constant-time comparison
  const inputHash = await sha256(email.toLowerCase().trim());
  const storedHash = await sha256(emailData.email.toLowerCase().trim());
  const emailMatch = constantTimeEqual(inputHash, storedHash);

  // Always set cooldown to rate-limit probing attempts
  await env.TUNNELS.put(
    `otp-cooldown:${subdomain}`,
    JSON.stringify({ last_sent: new Date().toISOString() } satisfies OtpCooldownData),
    { expirationTtl: COOLDOWN_KV_TTL },
  );

  // If email doesn't match, return the same generic response
  if (!emailMatch) {
    return genericResponse();
  }

  // Check resend limit within current OTP window
  const existingOtp = await env.TUNNELS.get<OtpData>(`otp:${subdomain}`, 'json');
  if (existingOtp && existingOtp.resend_count >= MAX_RESENDS) {
    return errorResponse('Maximum resend limit reached. Wait for the current code to expire.', 429);
  }

  // Generate code
  const code = generateOtpCode();
  const resendCount = existingOtp ? existingOtp.resend_count + 1 : 0;

  // Store OTP in KV
  await env.TUNNELS.put(
    `otp:${subdomain}`,
    JSON.stringify({
      code,
      attempts: 0,
      created_at: new Date().toISOString(),
      resend_count: resendCount,
    } satisfies OtpData),
    { expirationTtl: OTP_TTL },
  );

  // Extract geo info from Cloudflare request
  const cf = (request as Request & { cf?: { city?: string; country?: string } }).cf;
  const city = cf?.city;
  const country = cf?.country;

  // Send email via Resend (failure is silent — same response either way)
  try {
    await sendOtpEmail(env.RESEND_API_KEY, emailData.email, code, city, country);
  } catch {
    // Log but don't reveal failure to the client
  }

  return genericResponse();
}

// =============================================================================
// POST /api/otp/verify — Remote user submits OTP code
// =============================================================================

export async function handleOtpVerify(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { subdomain?: string; code?: string; deviceKeyHash?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const { subdomain, code, deviceKeyHash } = body;
  if (!subdomain || !code || !deviceKeyHash) {
    return errorResponse('subdomain, code, and deviceKeyHash are required', 400);
  }

  // Look up OTP
  const otpData = await env.TUNNELS.get<OtpData>(`otp:${subdomain}`, 'json');
  if (!otpData) {
    return errorResponse('Verification code expired. Request a new one.', 410);
  }

  // Check attempt limit
  if (otpData.attempts >= MAX_ATTEMPTS) {
    return errorResponse('Too many attempts. Request a new code.', 429);
  }

  // Exponential backoff: delay increases with each failed attempt
  // Delay = 2^(attempts-1) seconds: 0s, 1s, 2s, 4s, 8s for attempts 0,1,2,3,4
  if (otpData.attempts > 0 && otpData.last_attempt_at) {
    const backoffSeconds = Math.pow(2, otpData.attempts - 1);
    const lastAttempt = new Date(otpData.last_attempt_at).getTime();
    const elapsedMs = Date.now() - lastAttempt;
    const requiredMs = backoffSeconds * 1000;

    if (elapsedMs < requiredMs) {
      const waitSeconds = Math.ceil((requiredMs - elapsedMs) / 1000);
      return jsonResponse(
        { error: `Too many attempts. Please wait ${waitSeconds} seconds.`, retryAfter: waitSeconds },
        429,
      );
    }
  }

  // Increment attempts and record timestamp BEFORE comparing (prevents race conditions)
  otpData.attempts += 1;
  otpData.last_attempt_at = new Date().toISOString();
  await env.TUNNELS.put(
    `otp:${subdomain}`,
    JSON.stringify(otpData),
    { expirationTtl: OTP_TTL },
  );

  // Constant-time comparison
  if (!constantTimeEqual(code, otpData.code)) {
    const remaining = MAX_ATTEMPTS - otpData.attempts;
    return jsonResponse(
      { valid: false, attemptsRemaining: remaining },
      401,
    );
  }

  // Success — generate session token
  const sessionToken = generateRandomHex(64);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL * 1000).toISOString();

  // Store session in KV
  await env.TUNNELS.put(
    `otp-session:${sessionToken}`,
    JSON.stringify({
      subdomain,
      device_key_hash: deviceKeyHash,
      created_at: now.toISOString(),
    } satisfies OtpSessionData),
    { expirationTtl: SESSION_TTL },
  );

  // Delete the used OTP
  await env.TUNNELS.delete(`otp:${subdomain}`);

  return jsonResponse({
    valid: true,
    sessionToken,
    expiresAt,
  });
}

// =============================================================================
// GET /api/otp/session/:token — Backend validates OTP session
// =============================================================================

export async function handleOtpSessionCheck(
  token: string,
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const subdomain = url.searchParams.get('subdomain');
  const deviceKeyHash = url.searchParams.get('deviceKeyHash');

  if (!subdomain || !deviceKeyHash) {
    return jsonResponse({ valid: false }, 400);
  }

  const sessionData = await env.TUNNELS.get<OtpSessionData>(
    `otp-session:${token}`,
    'json',
  );

  if (!sessionData) {
    return jsonResponse({ valid: false });
  }

  // Validate subdomain and device key hash match
  const subdomainMatch = constantTimeEqual(sessionData.subdomain, subdomain);
  const deviceMatch = constantTimeEqual(sessionData.device_key_hash, deviceKeyHash);

  return jsonResponse({ valid: subdomainMatch && deviceMatch });
}
