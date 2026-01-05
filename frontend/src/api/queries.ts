/**
 * TanStack Query hooks for API data fetching and caching
 *
 * All tabs share the same cached data through these hooks.
 * Mutations automatically invalidate relevant caches.
 *
 * In demo mode, these hooks route to localStorage-based demoClient
 * instead of the production API.
 */

export * from './queries/index';
