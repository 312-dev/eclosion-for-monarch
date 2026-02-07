/**
 * Demo Login for IFTTT Review
 *
 * Provides a simplified email/password login flow for IFTTT's review process.
 * Instead of the normal OTP + tunnel approval flow, the demo subdomain uses
 * a static password (stored as a Worker secret) to authenticate.
 *
 * The login form is served at /oauth/authorize (same URL as the subdomain form)
 * when a link_token query parameter is present, keeping the URL consistent.
 *
 * Flow:
 * 1. User enters "demo" as subdomain on the authorize page
 * 2. JS redirects to /oauth/authorize?link_token=... (same origin, same path)
 * 3. GET handler detects link_token, renders email/password login form
 * 4. Form POSTs to /oauth/authorize with credentials + link_token
 * 5. POST handler validates, generates auth code + action secret, seeds demo data
 * 6. Redirects back to IFTTT with the authorization code
 */

import type { Env, OtpApproval, AuthCodeData, ActionSecretData } from '../types';
import { DEMO_SUBDOMAIN } from '../types';
import { generateAuthCode } from './tokens';

const DEMO_EMAIL = 'demo@eclosion.app';

/**
 * Seed the demo EventBroker with sample trigger events and field options
 * so trigger polling and field option requests return realistic data.
 */
async function seedDemoData(env: Env): Promise<void> {
  const brokerId = env.EVENT_BROKER.idFromName(DEMO_SUBDOMAIN);
  const broker = env.EVENT_BROKER.get(brokerId);

  const now = Math.floor(Date.now() / 1000);
  const events = [
    {
      id: `demo-goal-1-${now}`,
      trigger_slug: 'goal_achieved',
      timestamp: now,
      data: {
        goal_name: 'Emergency Fund',
        target_amount: '10000',
        achieved_at: new Date(now * 1000).toISOString(),
      },
    },
    {
      id: `demo-goal-2-${now}`,
      trigger_slug: 'goal_achieved',
      timestamp: now - 86400,
      data: {
        goal_name: 'Vacation Fund',
        target_amount: '3000',
        achieved_at: new Date((now - 86400) * 1000).toISOString(),
      },
    },
    {
      id: `demo-goal-3-${now}`,
      trigger_slug: 'goal_achieved',
      timestamp: now - 172800,
      data: {
        goal_name: 'New Car',
        target_amount: '25000',
        achieved_at: new Date((now - 172800) * 1000).toISOString(),
      },
    },
  ];

  const fieldOptions: Record<string, Array<{ label: string; value: string }>> = {
    category: [
      { label: 'Groceries', value: 'demo-category-groceries' },
      { label: 'Rent', value: 'demo-category-rent' },
      { label: 'Utilities', value: 'demo-category-utilities' },
    ],
    goal: [
      { label: 'Emergency Fund ($10,000 target)', value: 'demo-goal-emergency' },
      { label: 'Vacation Fund ($3,000 target)', value: 'demo-goal-vacation' },
      { label: 'New Car ($25,000 target)', value: 'demo-goal-car' },
    ],
    goal_name: [
      { label: 'Emergency Fund', value: 'demo-goal-emergency' },
      { label: 'Vacation Fund', value: 'demo-goal-vacation' },
      { label: 'New Car', value: 'demo-goal-car' },
    ],
  };

  // Seed trigger events
  await Promise.all(
    events.map((event) =>
      broker.fetch(
        new Request('https://broker/triggers/push', {
          method: 'POST',
          body: JSON.stringify(event),
        }),
      ),
    ),
  );

  // Seed field options cache
  await Promise.all(
    Object.entries(fieldOptions).map(([fieldSlug, options]) =>
      broker.fetch(
        new Request('https://broker/field-options/set', {
          method: 'POST',
          body: JSON.stringify({ field_slug: fieldSlug, options }),
        }),
      ),
    ),
  );
}

/**
 * Handle a demo credential submission (form-encoded POST to /oauth/authorize).
 * Validates email + password, generates auth code + action secret, seeds demo
 * data, and returns a redirect to IFTTT.
 */
export async function handleDemoCredentials(
  email: string,
  password: string,
  linkToken: string,
  env: Env,
): Promise<Response> {
  // Validate credentials
  if (email !== DEMO_EMAIL || password !== env.DEMO_PASSWORD) {
    return new Response(generateDemoLoginPage(linkToken, 'Invalid email or password.'), {
      status: 401,
      headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  // Look up and consume the link token (one-time use)
  const approval = await env.IFTTT_TOKENS.get<OtpApproval>(`link:${linkToken}`, 'json');

  if (!approval) {
    return new Response(
      generateDemoLoginPage('', 'Session expired. Please start the connection process again.'),
      { status: 400, headers: { 'Content-Type': 'text/html;charset=utf-8', 'Cache-Control': 'no-store' } },
    );
  }

  // Delete the link token (one-time use)
  await env.IFTTT_TOKENS.delete(`link:${linkToken}`);

  const { redirect_uri, state } = approval;

  // Generate auth code
  const code = generateAuthCode();
  const authCodeData: AuthCodeData = {
    subdomain: DEMO_SUBDOMAIN,
    redirect_uri,
    created_at: new Date().toISOString(),
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

  // Store auth code (10-min TTL) and action secret, then seed demo data
  await Promise.all([
    env.IFTTT_TOKENS.put(`auth-code:${code}`, JSON.stringify(authCodeData), {
      expirationTtl: 600,
    }),
    env.IFTTT_TOKENS.put(
      `action-secret:${DEMO_SUBDOMAIN}`,
      JSON.stringify(actionSecretData),
    ),
    seedDemoData(env),
  ]);

  // Build redirect URL back to IFTTT
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  if (state) {
    redirectUrl.searchParams.set('state', state);
  }

  return Response.redirect(redirectUrl.toString(), 302);
}

/**
 * Generate the login page HTML. Looks like a standard sign-in page.
 */
export function generateDemoLoginPage(linkToken: string, error?: string): string {
  const errorHtml = error
    ? `<div class="error-msg" style="display:block">${escapeHtml(error)}</div>`
    : '<div id="error" class="error-msg"></div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light dark">
<title>Eclosion - Authorize IFTTT</title>
<link rel="icon" type="image/svg+xml" href="https://eclosion.app/icons/icon-192.svg">
<style>
:root{--bg-page:#f5f5f4;--bg-card:#ffffff;--bg-input:#ffffff;--border:#e8e6e3;--text:#22201d;--text-muted:#5f5c59;--primary:#ff692d;--primary-hover:#eb5519;--error:#dc2626;--error-bg:rgba(220,38,38,.1);--shadow:0 8px 32px rgba(0,0,0,.08)}
@media(prefers-color-scheme:dark){:root{--bg-page:#1a1918;--bg-card:#262524;--bg-input:#1f1e1d;--border:#3d3b39;--text:#f5f5f4;--text-muted:#a8a5a0;--primary:#ff8050;--primary-hover:#ff6a30;--error:#f87171;--error-bg:rgba(248,113,113,.15);--shadow:0 8px 32px rgba(0,0,0,.3)}}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg-page);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:var(--bg-card);border-radius:12px;padding:40px;max-width:420px;width:100%;box-shadow:var(--shadow);border:1px solid var(--border)}
.logos{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:24px}
.logo-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.logo-eclosion{background:transparent}
.logo-ifttt{background:#000}
.connect-arrow{color:var(--text-muted);font-size:24px}
h1{font-size:20px;font-weight:700;text-align:center;margin-bottom:8px}
.desc{color:var(--text-muted);text-align:center;margin-bottom:24px;font-size:14px;line-height:1.5}
.field-label{font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:6px;display:block}
.input-wrapper{margin-bottom:16px}
.input-field{width:100%;padding:14px;background:var(--bg-input);border:2px solid var(--border);border-radius:8px;font-size:15px;color:var(--text);outline:none;font-family:inherit;transition:border-color .15s}
.input-field:focus{border-color:var(--primary)}
.input-field::placeholder{color:var(--text-muted)}
.btn{width:100%;padding:14px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s}
.btn:hover{background:var(--primary-hover)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.error-msg{color:var(--error);background:var(--error-bg);padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:16px;display:none}
.consent{color:var(--text-muted);font-size:12px;text-align:center;margin-top:16px;line-height:1.5}
.consent a{color:var(--primary);text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="logos">
    <div class="logo-icon logo-eclosion">
      <svg width="48" height="48" viewBox="22 8 58 88" fill="none"><defs><linearGradient id="a" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" style="stop-color:#ff692d"/><stop offset="100%" style="stop-color:#ff8f5a"/></linearGradient></defs><g fill="url(#a)"><path d="M32.527 56.156c.8.438 1.426 1.012 2.07 1.645.063.058.133.117.196.18 2.328 2.187 4.109 5.675 5.004 8.702.128.399.292.774.457 1.16.312.778.574 1.567.843 2.356.196-.36.293-.719.383-1.117a48.947 48.947 0 0 0 .39-1.863c1.208-6.254 1.208-6.254 3.04-7.704.273-.168.476-.222.789-.214.344.078.469.164.695.43.106.269.106.269.043.538-.137.23-.137.23-.437.43-.082.016-.16.023-.25.035-.434.113-.551.45-.766.813-.75 1.437-1.125 2.984-1.484 4.55.39-.597.39-.597.668-1.253.187-.485.437-.895.718-1.325q.06-.098.125-.191c.344-.504.703-.938 1.301-1.129.285 0 .285 0 .528.11.16.19.16.19.218.472-.086.473-.36.738-.71 1.059-.176.187-.286.379-.41.61-.052.085-.099.175-.153.269l-.156.285-.16.304c-.942 1.758-1.672 3.618-2.372 5.493a17.6 17.6 0 0 0 2.235-2.211c.215-.242.437-.465.668-.688q.117-.128.246-.25a9 9 0 0 1 1.453-1.25q.247-.253.5-.5.248-.21.508-.422c.293-.234.59-.476.875-.726.718-.613 1.464-1.133 2.25-1.645q.326-.21.64-.433c.953-.633 1.961-1.082 3.028-1.477.09-.031.175-.062.27-.101.694-.235 1.398-.27 2.132-.297l.242-.016c.727-.02 1.184.18 1.711.656.305.325.336.59.367 1.028-.07 2.015-1.207 3.578-2.43 5.093-.226.278-.445.559-.667.844-.266.34-.532.676-.801 1.016a10.7 10.7 0 0 0-1.43 2.496A7.5 7.5 0 0 1 54 73.5l-.286.441c-.84 1.25-1.914 2.621-3.312 3.258h-.203q.005.083.015.164c.098 2.149-1.09 3.934-2.464 5.477-.856.922-2.38 1.8-3.657 1.879a3 3 0 0 1-.191-.02c-.336 1.281-.336 1.281-.156 2.555.175.512.187.996.191 1.527 0 .125 0 .125.004.25-.004.574-.113.902-.492 1.344-.375.312-.875.277-1.34.27-.52-.079-.797-.336-1.11-.743-.535-.765-.613-1.836-.456-2.734.18-.844.457-1.606.859-2.367-.102.011-.2.027-.305.043-.46.004-.703-.254-1.03-.563-.567-.61-.599-1.39-.63-2.183-.004-.079-.004-.157-.012-.235-.007-.187-.02-.375-.023-.562-.117.047-.117.047-.227.101-.39.14-.687.117-1.078 0-.347-.277-.507-.469-.597-.902-.047.05-.098.098-.145.156-1.027 1.063-2.062 2.05-3.273 2.91-.125.094-.254.184-.38.278-.48.355-.48.355-.702.355v.203c-.89.68-1.797.723-2.875.63-.504-.067-.903-.266-1.324-.532-.133-.078-.133-.078-.27-.152a24 24 0 0 1-1.332-.848v.176c-.047 1.023-.45 1.836-1.2 2.53-.609.524-1.124.759-1.925.735-.516-.078-.875-.312-1.21-.703-.333-.504-.333-.973-.227-1.539.203-.7.765-1.168 1.378-1.527l.204-.11c.59-.347.843-.957 1.12-1.562.157-.762.126-1.317-.288-1.985-.196-.28-.399-.55-.61-.828-.437-.578-.613-1.066-.64-1.785q-.013-.11-.02-.226c-.043-.801.23-1.477.73-2.094.41-.438.895-.754 1.391-1.082.07-.059.14-.113.219-.172.18-.129.18-.129.379-.129.152-.336.199-.523.199-.898-.164-.254-.164-.254-.375-.516a5.3 5.3 0 0 1-.824-1.586c-.035-.094-.067-.195-.106-.293-.617-1.762-.785-3.668-.004-5.41.137-.277.282-.555.422-.824.575-1.106.645-1.875.285-3.075-.421-1.492-.472-2.875.141-4.32 1.305-2.203 4.434-1.008 6.29-.12z"/><path d="M71.301 36.043c.07 0 .14-.008.215-.008.379 0 .629.063.922.297.488.496.675 1.043.683 1.727a6.3 6.3 0 0 1-.183 1.347c-.254 1.13-.235 1.875.281 2.934.45.984.45 2.21.078 3.227-.047.117-.047.117-.098.234q-.057.14-.109.281c-.234.547-.48.985-.89 1.418.14.442.32.63.687.903.476.347.906.734 1.113 1.296.121 1.055-.074 1.696-.719 2.508-.28.367-.394.617-.378 1.094.16.773.523 1.168 1.164 1.61.32.257.496.511.578.913.008.422-.024.645-.238 1.02-.387.324-.7.473-1.207.457-.637-.242-1.165-.742-1.481-1.336-.125-.383-.14-.672-.121-1.062l-.164.117c-.887.617-1.715.996-2.828.84-.633-.184-1.149-.688-1.633-1.11a11 11 0 0 0-.68-.527 6.3 6.3 0 0 1-.945-.941 6 6 0 0 0-.445-.481c-.024.059-.04.121-.059.188-.144.21-.144.21-.488.343-.356.07-.356.07-.656-.031-.012.094-.024.195-.04.293-.02.188-.02.188-.046.379l-.051.383c-.067.379-.113.633-.426.867-.516.277-.516.277-.734.277q.036.136.086.278c.32 1.039.5 1.898.011 2.921-.207.305-.207.305-.5.5-.488.094-.87.07-1.308-.167-.274-.333-.297-.606-.285-1.032l.03-.312c.01-.105.016-.207.028-.313.035-.277.035-.277.133-.574.012-.187.016-.367.016-.55v-.294c-.004-.27-.004-.27-.114-.554-.215-.094-.215-.094-.472-.164-1.461-.504-2.32-1.41-2.993-2.77-.332-.766-.453-1.433-.437-2.27q-.129-.033-.27-.074c-1.503-.574-2.449-2.808-3.097-4.187a9 9 0 0 0-1.149-1.848c-.726-.918-1.343-1.855-1.68-2.992-.054-.145-.054-.145-.1-.297-.04-.52 0-.863.296-1.3.75-.454 1.539-.403 2.375-.22.969.297 1.777.77 2.625 1.317l.293.168c.105.066.105.066.207.137v.195c.059.027.121.059.18.086.836.441 1.554 1.148 2.222 1.816.16.145.325.285.489.434.699.625 1.265 1.328 1.84 2.066.156.207.156.207.37.301-.234-.726-.5-1.441-.789-2.148q-.06-.165-.125-.328c-.414-1.11-.414-1.11-1.125-2.04-.16-.187-.16-.187-.132-.562l.07-.32c.383-.047.547-.043.851.191.52.637.875 1.234 1.149 2.004-.3-1.57-.3-1.57-1-3-.195-.102-.395-.207-.598-.297-.105-.25-.105-.25-.097-.5.101-.18.101-.18.296-.3.301-.063.5-.051.774.09 1.46 1.07 1.7 3.753 1.96 5.413q.037.253.079.5l.187 1.196c.07-.18.07-.18.145-.36.215-.547.437-1.094.656-1.64q.054-.136.11-.278c.48-1.168.984-2.27 1.691-3.324.039-.062.078-.117.121-.187 1.156-1.711 2.531-3.211 4.598-3.743.43-.074.844-.117 1.281-.125zm-10 9.86.102.195z"/><path d="M54.5 11.598c1.3.414 2.371 1.36 3.004 2.547 1.414 2.746 1.469 5.734 1.496 8.758.05-.094.105-.184.156-.278.375-.656.746-1.308 1.145-1.941q.066-.105.125-.203.55-.866 1.172-1.68l.125-.176c.359-.48.843-.859 1.375-1.125.328-.047.48-.004.804.098.196.305.196.305.188.512-.09.191-.09.191-.266.265a5 5 0 0 0-.23.051c-.969.29-1.567 1.262-2.094 2.074l-.098.301q.084-.122.18-.25c.43-.52 1.043-1.031 1.687-1.238.231-.012.231-.012.461.183q.084.099.172.204c-.125.39-.355.5-.703.68-.586.35-1.043.855-1.48 1.37-.371.422-.762.828-1.145 1.239a5 5 0 0 0-.183.195q-.078.08-.16.172c-.141.144-.141.144-.231.344l.285-.168A28 28 0 0 1 63.402 22q.152-.068.317-.136c.718-.29 1.453-.516 2.191-.735.102-.031.203-.054.305-.086 1.562-.453 3.363-.812 4.883-.043.324.22.449.457.523.832.02.543-.187.856-.523 1.266-.063.086-.13.168-.192.25-.531.633-1.097 1.031-1.808 1.453-.899.563-1.727 1.156-2.5 1.899-2.223 2.117-2.223 2.117-3.504 2.125L62.8 28.8c-.02.094-.04.195-.055.293-.289.984-1.262 1.84-2.102 2.363-.644.344-1.265.532-2 .555-.738-.012-.738-.012-1.32.367-.164.422-.203.875-.265 1.32-.102.52-.282 1.024-.657 1.399-.531.047-.875.055-1.304-.297-.301-.5-.266-1.05-.16-1.61.199-.628.64-1.101 1.062-1.593q-.117-.14-.246-.285c-.305-.364-.38-.594-.38-1.082.044-.399.185-.762.325-1.133-.074.012-.148.016-.226.027-.274-.027-.274-.027-.5-.199-.172-.223-.22-.352-.274-.625-.094.047-.195.102-.297.152a15 15 0 0 1-2.773 1.082c-.813.227-1.473.18-2.227-.234a9 9 0 0 1-.703-.703 10 10 0 0 0-.293-.29c-.066-.07-.137-.136-.207-.21q-.042.092-.078.183c-.297.547-.84.887-1.422 1.075-.32.07-.574.086-.898.047-.336-.211-.594-.415-.703-.805.015-.422.054-.695.234-1.07.355-.305.726-.383 1.168-.516.484-.18.84-.465 1.121-.899.102-.273.082-.484.047-.773-.012-.148-.012-.148-.027-.293-.028-.246-.028-.246-.141-.45-.066-.741-.059-1.382.402-2 .383-.405.75-.57 1.27-.726a8 8 0 0 0 .926-.37c-.016-.052-.024-.11-.04-.169-.312-1.285-.375-2.941.305-4.117.25-.367.5-.727.836-1.016h.203q.038-.086.086-.18c.094-.187.203-.366.313-.546.203-.406.257-.813.297-1.258.093-.93.261-1.7 1-2.312.074-.079.152-.157.226-.243.41-.238.723-.175 1.176-.062z"/></g></svg>
    </div>
    <span class="connect-arrow">\u2194</span>
    <div class="logo-icon logo-ifttt">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff"><path d="M0 8.82h2.024v6.36H0zm11.566 0h-3.47v2.024h1.446v4.337h2.024v-4.337h1.446V8.82zm5.494 0h-3.47v2.024h1.446v4.337h2.024v-4.337h1.446V8.82zm5.494 0h-3.47v2.024h1.446v4.337h2.024v-4.337H24V8.82zM7.518 10.843V8.82H2.892v6.36h2.024v-1.734H6.65v-2.024H4.916v-.578z"/></svg>
    </div>
  </div>

  <h1>Sign in to Eclosion</h1>
  <p class="desc">Sign in to your Eclosion account to authorize IFTTT access.</p>

  ${errorHtml}

  <form method="POST" action="/oauth/authorize">
    <input type="hidden" name="link_token" value="${escapeHtml(linkToken)}">

    <div class="input-wrapper">
      <label class="field-label" for="email">Email</label>
      <input type="email" id="email" name="email" class="input-field" placeholder="you@example.com" autocomplete="email" required>
    </div>

    <div class="input-wrapper">
      <label class="field-label" for="password">Password</label>
      <input type="password" id="password" name="password" class="input-field" placeholder="Enter your password" autocomplete="current-password" required>
    </div>

    <button type="submit" class="btn">Sign In</button>
  </form>

  <p class="consent">By signing in, you authorize IFTTT to access your Eclosion account. <a href="https://eclosion.app/docs" target="_blank">Learn more</a></p>
</div>

<script>
document.getElementById('email')?.focus();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
