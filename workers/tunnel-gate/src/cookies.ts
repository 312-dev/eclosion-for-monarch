/**
 * Cookie Utilities
 *
 * Parsing, stripping, and building cookies for the gate Worker.
 *
 * Key security feature: stripAuthCookies removes eclosion-otp and
 * eclosion-device from forwarded requests so the proxied application
 * (or an attacker controlling the port) never sees session credentials.
 */

const AUTH_COOKIES = new Set(['eclosion-otp', 'eclosion-device']);

/**
 * Parse a cookie header and extract named values.
 */
export function parseCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;

  for (const part of header.split(';')) {
    const [cookieName, ...rest] = part.trim().split('=');
    if (cookieName?.trim() === name) {
      return rest.join('=').trim() || null;
    }
  }
  return null;
}

/**
 * Strip auth cookies from the request before forwarding to the tunnel origin.
 * Returns a new Request with eclosion-otp and eclosion-device removed.
 */
export function stripAuthCookies(request: Request): Request {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return request;

  const filtered = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter((part) => {
      const name = part.split('=')[0]?.trim();
      return !name || !AUTH_COOKIES.has(name);
    })
    .join('; ');

  const newHeaders = new Headers(request.headers);
  if (filtered) {
    newHeaders.set('Cookie', filtered);
  } else {
    newHeaders.delete('Cookie');
  }

  return new Request(request.url, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: request.redirect,
  });
}

/**
 * Build a Set-Cookie header string for the JWT session cookie.
 * Host-only (no Domain attribute) — scoped to the exact subdomain.
 */
export function buildSessionCookie(jwt: string): string {
  const maxAge = 604800; // 7 days
  return `eclosion-otp=${jwt}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

/**
 * Build a Set-Cookie header to clear the session cookie.
 */
export function buildClearSessionCookie(): string {
  return 'eclosion-otp=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';
}
