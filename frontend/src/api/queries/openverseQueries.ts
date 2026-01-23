/**
 * Openverse Queries
 *
 * React Query hooks for Openverse image search.
 * Handles credential registration automatically and routes to demo/production APIs.
 */

import { useQuery } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type { OpenverseSearchRequest, OpenverseSearchResult } from '../../types';

/**
 * Search for images on Openverse.
 *
 * Features:
 * - Auto-registers for credentials on first use (production only)
 * - Debounce should be handled by the component (not here)
 * - Returns empty results for empty queries
 *
 * @param query - Search query text
 * @param page - Page number (1-indexed)
 * @param options - Additional query options
 */
export function useOpenverseSearch(
  query: string,
  page: number = 1,
  options?: {
    enabled?: boolean;
    pageSize?: number;
  }
) {
  const isDemo = useDemo();
  const pageSize = options?.pageSize ?? 20;

  // Don't fetch for empty queries
  const isEnabled = (options?.enabled ?? true) && query.trim().length > 0;

  return useQuery({
    queryKey: [...getQueryKey(queryKeys.openverseSearch, isDemo), query, page, pageSize],
    queryFn: async (): Promise<OpenverseSearchResult> => {
      const request: OpenverseSearchRequest = {
        query: query.trim(),
        page,
        pageSize,
      };

      return isDemo
        ? demoApi.searchOpenverseImages(request)
        : api.searchOpenverseImages(request);
    },
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000, // Results are fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    placeholderData: (previousData) => previousData, // Keep showing previous results while loading
  });
}

/**
 * Get a single image by ID.
 *
 * @param id - Openverse image ID
 * @param options - Additional query options
 */
export function useOpenverseImage(
  id: string | null,
  options?: { enabled?: boolean }
) {
  const isDemo = useDemo();
  const isEnabled = (options?.enabled ?? true) && !!id;

  return useQuery({
    queryKey: [...getQueryKey(queryKeys.openverseSearch, isDemo), 'image', id],
    queryFn: async () => {
      if (!id) return null;
      return isDemo ? demoApi.getOpenverseImage(id) : api.getOpenverseImage(id);
    },
    enabled: isEnabled,
    staleTime: 60 * 60 * 1000, // Image details are fresh for 1 hour
  });
}

/**
 * Generate attribution text for an Openverse image.
 * This is a sync function, not a hook - just re-exports for convenience.
 */
export { generateOpenverseAttribution } from '../client';
