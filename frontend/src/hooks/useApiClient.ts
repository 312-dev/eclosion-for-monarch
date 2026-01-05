/**
 * useApiClient Hook
 *
 * Returns the appropriate API client based on demo mode.
 * Eliminates the repetitive `const client = isDemo ? demoApi : api` pattern.
 *
 * Usage:
 *   const client = useApiClient();
 *   const data = await client.getDashboard();
 */

import { useMemo } from 'react';
import { useDemo } from '../context/DemoContext';
import * as api from '../api/client';
import * as demoApi from '../api/demoClient';

// Create a type that represents the shared API interface
type ApiClient = typeof api;

/**
 * Returns the API client appropriate for the current mode (demo or production).
 *
 * @returns The API client object with all available methods
 */
export function useApiClient(): ApiClient {
  const isDemo = useDemo();

  // Memoize to maintain stable reference
  return useMemo(() => (isDemo ? demoApi : api) as ApiClient, [isDemo]);
}
