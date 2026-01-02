/**
 * ErrorPage - User-friendly error display
 *
 * Shows a friendly error message when something goes wrong,
 * similar to a 404 page but for various error conditions.
 *
 * Accessibility features:
 * - Semantic HTML with main landmark
 * - Proper heading hierarchy
 * - aria-hidden on decorative icons
 */

import { SadFaceIcon, HourglassIcon } from '../icons';

interface ErrorPageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorPage({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try Again"
}: ErrorPageProps) {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
      role="main"
      aria-labelledby="error-title"
    >
      <div className="max-w-md w-full text-center">
        {/* Error illustration */}
        <div className="mb-6" aria-hidden="true">
          <SadFaceIcon
            size={96}
            color="var(--monarch-text-muted)"
            strokeWidth={1.5}
            className="mx-auto"
          />
        </div>

        {/* Error title */}
        <h1
          id="error-title"
          className="text-2xl font-bold mb-3"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          {title}
        </h1>

        {/* Error message */}
        <p
          className="mb-6"
          style={{ color: 'var(--monarch-text-muted)' }}
          role="alert"
        >
          {message}
        </p>

        {/* Retry button */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-6 py-2 text-white rounded-lg btn-hover-lift hover-bg-orange-to-orange-hover"
          >
            {retryLabel}
          </button>
        )}

        {/* Help text */}
        <aside
          className="mt-8 p-4 rounded-lg text-left"
          style={{
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)'
          }}
          aria-label="Troubleshooting tips"
        >
          <h2
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Things to try:
          </h2>
          <ul
            className="text-sm space-y-1"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            <li>Check if the backend server is running</li>
            <li>Refresh the page</li>
            <li>Wait a moment and try again</li>
            <li>Check your internet connection</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

/**
 * RateLimitPage - Specific page for rate limit errors
 */
interface RateLimitPageProps {
  retryAfter?: number;
  onRetry?: () => void;
}

export function RateLimitPage({ retryAfter, onRetry }: RateLimitPageProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="max-w-md w-full text-center">
        {/* Hourglass illustration */}
        <div className="mb-6">
          <HourglassIcon
            size={96}
            color="var(--monarch-orange)"
            strokeWidth={1.5}
            className="mx-auto"
          />
        </div>

        {/* Title */}
        <h1
          className="text-2xl font-bold mb-3"
          style={{ color: 'var(--monarch-text-dark)' }}
        >
          Slow down there!
        </h1>

        {/* Message */}
        <p
          className="mb-2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          You've made too many requests. Please wait a moment before trying again.
        </p>

        {retryAfter && (
          <p
            className="mb-6 text-sm"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            Try again in about {retryAfter} seconds.
          </p>
        )}

        {/* Retry button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2 text-white rounded-lg btn-hover-lift hover-bg-orange-to-orange-hover"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
