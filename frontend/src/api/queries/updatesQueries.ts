/**
 * Updates Queries
 *
 * React Query hook for fetching Reddit updates from the Cloudflare Worker.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys, getQueryKey } from './keys';
import { useDemo } from '../../context/DemoContext';
import { getSiteBaseUrl } from '../../utils/environment';

export interface UpdateEntry {
  id: string;
  title: string;
  /** Truncated preview of markdown content (without title line) */
  preview: string;
  date: string;
  edited: string | null;
  permalink: string;
}

interface UpdatesResponse {
  updates: UpdateEntry[];
  error?: string;
}

async function fetchUpdates(): Promise<UpdateEntry[]> {
  const response = await fetch(`${getSiteBaseUrl()}/api/updates`);

  if (!response.ok) {
    throw new Error(`Failed to fetch updates: ${response.status}`);
  }

  const data = (await response.json()) as UpdatesResponse;
  return data.updates;
}

// Demo mode mock data
function getDemoUpdates(): UpdateEntry[] {
  return [
    {
      id: 'demo-1',
      title: 'Welcome to Eclosion Demo',
      preview:
        "Try out all the features in **demo mode**. Your data is stored locally and won't sync to Monarch. Notes for categories, recurring expense tracking, stash savings goals...",
      date: new Date().toISOString(),
      edited: null,
      permalink: 'https://reddit.com/user/Ok-Quantity7501/comments/1qu70p7',
    },
    {
      id: 'demo-2',
      title: 'Stash Feature Released',
      preview:
        'Save for **irregular expenses** with the new Stash feature. Set goals and track progress, never be surprised by annual bills, visual progress indicators...',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      edited: null,
      permalink: 'https://reddit.com/user/Ok-Quantity7501/comments/1qu70p7',
    },
  ];
}

export function useUpdatesQuery() {
  const isDemo = useDemo();

  return useQuery({
    queryKey: getQueryKey(queryKeys.updates, isDemo),
    queryFn: isDemo ? () => Promise.resolve(getDemoUpdates()) : fetchUpdates,
    staleTime: 5 * 60 * 1000, // 5 minutes (match Worker cache)
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // One retry on failure
    refetchOnWindowFocus: false, // Don't spam on tab switch
  });
}
