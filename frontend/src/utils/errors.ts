/**
 * Error Utilities
 *
 * Centralized error handling and formatting functions.
 * All error handling in the application should use these utilities
 * for consistent user-facing messages and logging.
 */

import { RateLimitError } from '../api/client';

/**
 * Extract a user-friendly message from an unknown error.
 *
 * This is the primary utility for converting any error type
 * into a displayable string. Use this in catch blocks.
 *
 * @param error - Any error value (Error, string, or unknown)
 * @returns User-friendly error message
 *
 * @example
 * catch (error) {
 *   setError(getErrorMessage(error));
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof RateLimitError) {
    return `Rate limit reached. Please wait ${error.retryAfter} seconds and try again.`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

/**
 * Handle an API error with logging and return a user-friendly message.
 *
 * Use this when you want to log the error with context while also
 * getting a message to display to the user.
 *
 * @param error - Any error value
 * @param context - Description of what operation failed (for logging)
 * @returns User-friendly error message
 *
 * @example
 * catch (error) {
 *   setError(handleApiError(error, 'Failed to save settings'));
 * }
 */
export function handleApiError(error: unknown, context: string): string {
  console.error(`${context}:`, error);
  return getErrorMessage(error);
}

/**
 * Check if an error is a rate limit error.
 *
 * @param err - The error to check
 * @returns True if the error is a rate limit error
 */
export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError;
}

/**
 * Get the retry-after value from a rate limit error.
 *
 * @param err - The error to check
 * @returns Retry-after seconds, or null if not a rate limit error
 */
export function getRetryAfter(err: unknown): number | null {
  if (err instanceof RateLimitError) {
    return err.retryAfter;
  }
  return null;
}
