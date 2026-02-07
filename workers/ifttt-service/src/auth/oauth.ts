/**
 * OAuth2 Authorization Endpoints
 *
 * Handles the OAuth2 authorization code flow for IFTTT with OTP verification:
 * 1. GET  /oauth/authorize  — Render authorization page (user enters subdomain)
 * 2. POST /oauth/authorize  — Validate subdomain, return redirect URL to tunnel for OTP
 * 3. POST /oauth/approve    — After OTP + user approval, generate auth code + action secret
 * 4. POST /oauth/token      — Exchange auth code for access token
 */

import type { Env, AuthCodeData, SubdomainData, OtpApproval, IftttUserData, ActionSecretData } from '../types';
import { isDemoSubdomain, DEMO_SUBDOMAIN } from '../types';
import { generateAuthCode, generateAccessToken } from './tokens';
import { generateAuthorizePage } from './authorize-page';
import { generateDemoLoginPage, handleDemoCredentials } from './demo-login';

const LINK_TOKEN_TTL = 600; // 10 minutes

// --- PKCE Helpers ---

/**
 * Base64url encode a Uint8Array (for PKCE challenge verification).
 */
function base64urlEncode(data: Uint8Array): string {
  const binary = String.fromCharCode(...data);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Compute SHA-256 hash and return base64url-encoded result.
 * Used to verify code_verifier against code_challenge.
 */
async function sha256Base64url(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return base64urlEncode(new Uint8Array(digest));
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * GET /oauth/authorize
 * Renders the authorization page where the user enters their Eclosion subdomain.
 * If a link_token query param is present, renders the demo login form instead
 * (the user already entered "demo" as their subdomain and was redirected here).
 */
export function handleAuthorizeGet(request: Request): Response {
  const url = new URL(request.url);
  const linkToken = url.searchParams.get('link_token');

  // If link_token is present, this is the demo login step
  if (linkToken) {
    return new Response(generateDemoLoginPage(linkToken), {
      headers: {
        'Content-Type': 'text/html;charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-store',
      },
    });
  }

  const state = url.searchParams.get('state') ?? '';
  const redirectUri = url.searchParams.get('redirect_uri') ?? '';

  return new Response(generateAuthorizePage(state, redirectUri), {
    headers: {
      'Content-Type': 'text/html;charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * POST /oauth/authorize
 * Validates the subdomain, checks it's not already connected, verifies OTP is configured,
 * generates a link_token, and returns a redirect URL to the tunnel for OTP verification.
 */
export async function handleAuthorizePost(
  request: Request,
  env: Env,
): Promise<Response> {
  const contentType = request.headers.get('Content-Type') ?? '';

  // Handle form-encoded POST from the demo login form
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    const linkToken = String(formData.get('link_token') ?? '');
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    if (linkToken && email && password) {
      return handleDemoCredentials(email, password, linkToken, env);
    }

    return Response.json({ error: 'Invalid form submission' }, { status: 400 });
  }

  let body: {
    subdomain?: string;
    state?: string;
    redirect_uri?: string;
    code_challenge?: string;
    code_challenge_method?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { subdomain, state, redirect_uri, code_challenge, code_challenge_method } = body;

  if (!subdomain || !redirect_uri) {
    return Response.json(
      { error: 'subdomain and redirect_uri are required' },
      { status: 400 },
    );
  }

  // Validate PKCE parameters if provided
  if (code_challenge_method && code_challenge_method !== 'S256') {
    return Response.json(
      { error: 'Only S256 code_challenge_method is supported' },
      { status: 400 },
    );
  }

  // Demo subdomain: skip tunnel validation, redirect to worker-hosted login
  if (isDemoSubdomain(subdomain)) {
    const linkToken = generateAuthCode();
    const otpApproval: OtpApproval = {
      subdomain: DEMO_SUBDOMAIN,
      redirect_uri,
      state: state ?? '',
      created_at: Date.now(),
      code_challenge,
      code_challenge_method: code_challenge_method === 'S256' ? 'S256' : undefined,
    };

    await env.IFTTT_TOKENS.put(
      `link:${linkToken}`,
      JSON.stringify(otpApproval),
      { expirationTtl: LINK_TOKEN_TTL },
    );

    const redirectUrl = `https://ifttt-api.eclosion.app/oauth/authorize?link_token=${linkToken}`;
    return Response.json({ redirect_url: redirectUrl });
  }

  // Validate subdomain exists in TUNNELS KV
  const subdomainData = await env.TUNNELS.get<SubdomainData>(
    `subdomain:${subdomain}`,
    'json',
  );

  if (!subdomainData) {
    return Response.json(
      { error: 'Subdomain not found. Make sure you have claimed a subdomain in Eclosion.' },
      { status: 404 },
    );
  }

  // Check if IFTTT is already connected for this subdomain
  const userData = await env.IFTTT_TOKENS.get<IftttUserData>(
    `user:${subdomain}`,
    'json',
  );

  if (userData?.connected) {
    return Response.json(
      { error: 'This subdomain already has an active IFTTT connection. Disconnect it in your Eclosion desktop app first.' },
      { status: 409 },
    );
  }

  // Check that OTP email is configured (required for verification)
  const otpEmail = await env.TUNNELS.get(`otp-email:${subdomain}`);
  if (!otpEmail) {
    return Response.json(
      { error: 'Remote access email is not configured. Please set up remote access in your Eclosion desktop app first.' },
      { status: 400 },
    );
  }

  // Generate link token for OTP + approval flow
  const linkToken = generateAuthCode();
  const otpApproval: OtpApproval = {
    subdomain,
    redirect_uri,
    state: state ?? '',
    created_at: Date.now(),
    code_challenge,
    code_challenge_method: code_challenge_method === 'S256' ? 'S256' : undefined,
  };

  await env.IFTTT_TOKENS.put(
    `link:${linkToken}`,
    JSON.stringify(otpApproval),
    { expirationTtl: LINK_TOKEN_TTL },
  );

  // Redirect URL: user goes to their tunnel, which triggers OTP via tunnel-gate
  // After OTP, Flask serves the approval page at /ifttt/authorize
  const redirectUrl = `https://${subdomain}.eclosion.me/ifttt/authorize?link_token=${linkToken}`;

  return Response.json({ redirect_url: redirectUrl });
}

/**
 * POST /oauth/approve
 * Called from the approval page (served by Flask through tunnel after OTP).
 * Validates the link_token, generates an auth code + per-subdomain action secret,
 * and returns the redirect URL to complete the IFTTT OAuth flow.
 */
export async function handleApprove(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { link_token?: string; approved?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { link_token, approved } = body;
  if (!link_token || approved === undefined) {
    return Response.json(
      { error: 'link_token and approved are required' },
      { status: 400 },
    );
  }

  // Look up and consume the link token (one-time use)
  const approval = await env.IFTTT_TOKENS.get<OtpApproval>(
    `link:${link_token}`,
    'json',
  );

  if (!approval) {
    return Response.json(
      { error: 'Link token expired or not found. Please start the connection process again.' },
      { status: 404 },
    );
  }

  // Delete the link token immediately (one-time use)
  await env.IFTTT_TOKENS.delete(`link:${link_token}`);

  if (!approved) {
    return Response.json({ status: 'denied' });
  }

  const { subdomain, redirect_uri, state, code_challenge, code_challenge_method } = approval;

  // Generate auth code
  const code = generateAuthCode();
  const authCodeData: AuthCodeData = {
    subdomain,
    redirect_uri,
    created_at: new Date().toISOString(),
    code_challenge,
    code_challenge_method,
  };

  // Generate per-subdomain action secret
  const actionSecretBytes = new Uint8Array(32);
  crypto.getRandomValues(actionSecretBytes);
  const actionSecret = Array.from(actionSecretBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const actionSecretData: ActionSecretData = {
    secret: actionSecret,
    created_at: new Date().toISOString(),
  };

  // Store auth code (10-min TTL) and action secret (permanent)
  // Action secret stored in both IFTTT_TOKENS (for this worker) and TUNNELS (for tunnel-gate)
  await Promise.all([
    env.IFTTT_TOKENS.put(
      `auth-code:${code}`,
      JSON.stringify(authCodeData),
      { expirationTtl: 600 },
    ),
    env.IFTTT_TOKENS.put(
      `action-secret:${subdomain}`,
      JSON.stringify(actionSecretData),
    ),
    // Also store in TUNNELS KV for tunnel-gate to validate IFTTT requests
    env.TUNNELS.put(
      `ifttt-secret:${subdomain}`,
      actionSecret,
    ),
  ]);

  // Build redirect URL back to IFTTT
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return Response.json({
    status: 'approved',
    redirect_url: redirectUrl.toString(),
  });
}

/**
 * POST /oauth/token
 * Exchanges an authorization code for an access token.
 * IFTTT sends: grant_type, code, client_id, client_secret, redirect_uri
 */
export async function handleTokenExchange(
  request: Request,
  env: Env,
): Promise<Response> {
  const contentType = request.headers.get('Content-Type') ?? '';

  let grantType: string | null = null;
  let code: string | null = null;
  let clientId: string | null = null;
  let clientSecret: string | null = null;
  let codeVerifier: string | null = null;

  // IFTTT sends as application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    grantType = formData.get('grant_type') as string | null;
    code = formData.get('code') as string | null;
    clientId = formData.get('client_id') as string | null;
    clientSecret = formData.get('client_secret') as string | null;
    codeVerifier = formData.get('code_verifier') as string | null;
  } else {
    // Also support JSON
    try {
      const body = await request.json() as Record<string, string>;
      grantType = body.grant_type ?? null;
      code = body.code ?? null;
      clientId = body.client_id ?? null;
      clientSecret = body.client_secret ?? null;
      codeVerifier = body.code_verifier ?? null;
    } catch {
      return Response.json({ error: 'invalid_request' }, { status: 400 });
    }
  }

  if (grantType !== 'authorization_code') {
    return Response.json(
      { error: 'unsupported_grant_type' },
      { status: 400 },
    );
  }

  // Validate client credentials
  if (clientId !== env.OAUTH_CLIENT_ID || clientSecret !== env.OAUTH_CLIENT_SECRET) {
    return Response.json(
      { error: 'invalid_client' },
      { status: 401 },
    );
  }

  if (!code) {
    return Response.json(
      { error: 'invalid_grant', error_description: 'Authorization code is required' },
      { status: 400 },
    );
  }

  // Look up the auth code in KV
  const authCodeData = await env.IFTTT_TOKENS.get<AuthCodeData>(
    `auth-code:${code}`,
    'json',
  );

  if (!authCodeData) {
    return Response.json(
      { error: 'invalid_grant', error_description: 'Authorization code is invalid or expired' },
      { status: 400 },
    );
  }

  // PKCE verification: if code_challenge was stored, require valid code_verifier
  if (authCodeData.code_challenge) {
    if (!codeVerifier) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'code_verifier is required for PKCE' },
        { status: 400 },
      );
    }

    // Verify: SHA256(code_verifier) === code_challenge
    const computedChallenge = await sha256Base64url(codeVerifier);
    if (!constantTimeEqual(computedChallenge, authCodeData.code_challenge)) {
      return Response.json(
        { error: 'invalid_grant', error_description: 'code_verifier does not match code_challenge' },
        { status: 400 },
      );
    }
  }

  // Delete the auth code (one-time use)
  await env.IFTTT_TOKENS.delete(`auth-code:${code}`);

  // Generate non-expiring access token
  const accessToken = await generateAccessToken(authCodeData.subdomain, env);

  return Response.json({
    token_type: 'Bearer',
    access_token: accessToken,
  });
}
