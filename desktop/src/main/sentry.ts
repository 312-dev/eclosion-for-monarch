/**
 * Sentry Crash Reporting
 *
 * Provides optional crash reporting via Sentry. Disabled by default.
 * To enable, set the SENTRY_DSN environment variable.
 *
 * Privacy note: Crash reports are sent only if SENTRY_DSN is configured.
 * Reports include stack traces, OS info, and app version. No personal data
 * or authentication tokens are included.
 *
 * Note: Sentry is only loaded in packaged builds. In dev mode, all Sentry
 * functions are no-ops. This avoids @sentry/electron's eager initialization
 * that tries to access Electron APIs at import time.
 */

import { app } from 'electron';
import { URL } from 'node:url';

// Sentry module - loaded dynamically only in packaged builds
let Sentry: typeof import('@sentry/electron/main') | null = null;

let sentryInitialized = false;

/**
 * Environment variable for Sentry DSN.
 * If not set, crash reporting is disabled.
 */
const SENTRY_DSN = process.env.SENTRY_DSN || '';

/**
 * Initialize Sentry crash reporting.
 * Should be called as early as possible in the main process.
 *
 * @returns true if Sentry was initialized, false if disabled
 */
export function initSentry(): boolean {
  // Skip in dev mode - @sentry/electron tries to use Electron APIs at import time
  if (!app.isPackaged) {
    console.log('Sentry: Disabled (development mode)');
    return false;
  }

  // Skip if no DSN configured
  if (!SENTRY_DSN) {
    console.log('Sentry: Disabled (no SENTRY_DSN configured)');
    return false;
  }

  // Skip if already initialized
  if (sentryInitialized) {
    return true;
  }

  try {
    // Dynamic import to avoid @sentry/electron's eager initialization in dev mode
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-undef
    Sentry = require('@sentry/electron/main');
    if (!Sentry) {
      console.error('Sentry: Failed to load module');
      return false;
    }

    Sentry.init({
      dsn: SENTRY_DSN,
      release: `eclosion@${app.getVersion()}`,
      environment: app.isPackaged ? 'production' : 'development',

      // Capture 100% of errors, but sample performance
      tracesSampleRate: 0.1,

      // Don't send PII
      sendDefaultPii: false,

      // Before sending, strip any sensitive data
      beforeSend(event) {
        // Remove any query params from URLs (might contain tokens)
        if (event.request?.url) {
          try {
            const url = new URL(event.request.url);
            url.search = '';
            event.request.url = url.toString();
          } catch {
            // If URL parsing fails, remove the URL entirely
            delete event.request.url;
          }
        }

        // Ensure no auth headers leak through
        if (event.request?.headers) {
          const sanitizedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(event.request.headers)) {
            const lowerKey = key.toLowerCase();
            if (
              lowerKey.includes('auth') ||
              lowerKey.includes('token') ||
              lowerKey.includes('cookie')
            ) {
              sanitizedHeaders[key] = '[REDACTED]';
            } else {
              sanitizedHeaders[key] = value;
            }
          }
          event.request.headers = sanitizedHeaders;
        }

        return event;
      },

      // Ignore common benign errors
      ignoreErrors: [
        // Network errors (user is offline)
        'net::ERR_INTERNET_DISCONNECTED',
        'net::ERR_NETWORK_CHANGED',
        'net::ERR_CONNECTION_RESET',
        'net::ERR_CONNECTION_REFUSED',
        // User cancellation
        'User cancelled',
        'AbortError',
      ],
    });

    // Set static context
    Sentry.setContext('app', {
      isPackaged: app.isPackaged,
      locale: app.getLocale(),
    });

    Sentry.setContext('system', {
      platform: process.platform,
      arch: process.arch,
    });

    sentryInitialized = true;
    console.log('Sentry: Initialized');
    return true;
  } catch (error) {
    console.error('Sentry: Failed to initialize:', error);
    return false;
  }
}

/**
 * Check if Sentry is enabled and initialized.
 */
export function isSentryEnabled(): boolean {
  return sentryInitialized;
}

/**
 * Capture an exception manually.
 * No-op if Sentry is not initialized.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!sentryInitialized || !Sentry) return;

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry?.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message manually.
 * No-op if Sentry is not initialized.
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info'
): void {
  if (!sentryInitialized || !Sentry) return;
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging context.
 * No-op if Sentry is not initialized.
 */
export function addBreadcrumb(breadcrumb: {
  category?: string;
  message: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  if (!sentryInitialized || !Sentry) return;
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context (only if user opts in).
 * We don't set this by default to respect privacy.
 */
export function setUserContext(id: string): void {
  if (!sentryInitialized || !Sentry) return;
  Sentry.setUser({ id });
}

/**
 * Clear user context.
 */
export function clearUserContext(): void {
  if (!sentryInitialized || !Sentry) return;
  Sentry.setUser(null);
}
