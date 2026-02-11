/**
 * Refundables Queries
 *
 * React Query hooks for the Refundables feature.
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDemo } from '../../context/DemoContext';
import { useSmartInvalidate } from '../../hooks/useSmartInvalidate';
import * as api from '../client';
import * as demoApi from '../demoClient';
import { queryKeys, getQueryKey } from './keys';
import type {
  RefundablesConfig,
  RefundablesSavedView,
  RefundablesMatch,
  Transaction,
  TransactionTag,
  CreateMatchRequest,
} from '../../types/refundables';

// ---- Config ----

export function useRefundablesConfigQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundablesConfig, isDemo),
    queryFn: async (): Promise<RefundablesConfig> => {
      if (isDemo) {
        return await demoApi.getRefundablesConfig();
      }
      return await api.getRefundablesConfig();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateRefundablesConfigMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (updates: Partial<RefundablesConfig>) =>
      isDemo ? demoApi.updateRefundablesConfig(updates) : api.updateRefundablesConfig(updates),
    onSuccess: () => {
      smartInvalidate('updateRefundablesConfig');
    },
  });
}

// ---- Tags ----

export function useRefundablesTagsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundablesTags, isDemo),
    queryFn: async (): Promise<TransactionTag[]> => {
      if (isDemo) {
        return await demoApi.getRefundablesTags();
      }
      return await api.getRefundablesTags();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ---- Saved Views ----

export function useRefundablesViewsQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundablesViews, isDemo),
    queryFn: async (): Promise<RefundablesSavedView[]> => {
      if (isDemo) {
        return await demoApi.getRefundablesViews();
      }
      return await api.getRefundablesViews();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRefundablesViewMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: ({
      name,
      tagIds,
      categoryIds,
    }: {
      name: string;
      tagIds: string[];
      categoryIds: string[] | null;
    }) =>
      isDemo
        ? demoApi.createRefundablesView(name, tagIds, categoryIds)
        : api.createRefundablesView(name, tagIds, categoryIds),
    onSuccess: () => {
      smartInvalidate('createRefundablesView');
    },
  });
}

export function useUpdateRefundablesViewMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: ({
      viewId,
      updates,
    }: {
      viewId: string;
      updates: Partial<Pick<RefundablesSavedView, 'name' | 'tagIds' | 'categoryIds' | 'sortOrder'>>;
    }) =>
      isDemo
        ? demoApi.updateRefundablesView(viewId, updates)
        : api.updateRefundablesView(viewId, updates),
    onSuccess: () => {
      smartInvalidate('updateRefundablesView');
    },
  });
}

export function useReorderRefundablesViewsMutation() {
  const isDemo = useDemo();
  const queryClient = useQueryClient();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (viewIds: string[]) =>
      isDemo ? demoApi.reorderRefundablesViews(viewIds) : api.reorderRefundablesViews(viewIds),
    onMutate: async (viewIds: string[]) => {
      await queryClient.cancelQueries({
        queryKey: getQueryKey(queryKeys.refundablesViews, isDemo),
      });
      const previous = queryClient.getQueryData<RefundablesSavedView[]>(
        getQueryKey(queryKeys.refundablesViews, isDemo)
      );
      if (previous) {
        const reordered = viewIds
          .map((id, i) => {
            const view = previous.find((v) => v.id === id);
            return view ? { ...view, sortOrder: i } : null;
          })
          .filter((v): v is RefundablesSavedView => v !== null);
        queryClient.setQueryData(getQueryKey(queryKeys.refundablesViews, isDemo), reordered);
      }
      return { previous };
    },
    onError: (_err, _viewIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(getQueryKey(queryKeys.refundablesViews, isDemo), context.previous);
      }
    },
    onSettled: () => {
      smartInvalidate('reorderRefundablesViews');
    },
  });
}

export function useDeleteRefundablesViewMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (viewId: string) =>
      isDemo ? demoApi.deleteRefundablesView(viewId) : api.deleteRefundablesView(viewId),
    onSuccess: () => {
      smartInvalidate('deleteRefundablesView');
    },
  });
}

// ---- Transactions ----

export function useRefundablesTransactionsQuery(
  tagIds: string[],
  startDate: string | null,
  endDate: string | null,
  categoryIds?: string[] | null
) {
  const isDemo = useDemo();
  return useQuery({
    queryKey: [
      ...getQueryKey(queryKeys.refundablesTransactions, isDemo),
      tagIds,
      startDate,
      endDate,
      categoryIds,
    ],
    queryFn: async (): Promise<Transaction[]> => {
      if (isDemo) {
        return await demoApi.getRefundablesTransactions(tagIds, startDate, endDate, categoryIds);
      }
      return await api.getRefundablesTransactions(tagIds, startDate, endDate, categoryIds);
    },
    enabled: tagIds.length > 0 || (categoryIds != null && categoryIds.length > 0),
    staleTime: 2 * 60 * 1000,
  });
}

const SEARCH_PAGE_SIZE = 10;

interface SearchPage {
  transactions: Transaction[];
  nextCursor: number | null;
}

export function useSearchRefundablesTransactionsQuery(
  search: string,
  startDate?: string | null,
  endDate?: string | null
) {
  const isDemo = useDemo();
  return useInfiniteQuery<SearchPage, Error, { pages: SearchPage[] }, unknown[], number>({
    queryKey: [
      ...getQueryKey(queryKeys.refundablesTransactions, isDemo),
      'search',
      search,
      startDate,
      endDate,
    ],
    queryFn: async ({ pageParam }): Promise<SearchPage> => {
      if (isDemo) {
        return await demoApi.searchRefundablesTransactions(
          search,
          startDate,
          endDate,
          SEARCH_PAGE_SIZE,
          pageParam
        );
      }
      return await api.searchRefundablesTransactions(
        search,
        startDate,
        endDate,
        SEARCH_PAGE_SIZE,
        pageParam
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  });
}

// ---- Pending Count ----

interface PendingCountData {
  count: number;
  viewCounts: Record<string, number>;
}

export function useRefundablesPendingCountQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundablesPendingCount, isDemo),
    queryFn: async (): Promise<PendingCountData> => {
      return isDemo
        ? await demoApi.getRefundablesPendingCount()
        : await api.getRefundablesPendingCount();
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ---- Matches ----

export function useRefundablesMatchesQuery() {
  const isDemo = useDemo();
  return useQuery({
    queryKey: getQueryKey(queryKeys.refundablesMatches, isDemo),
    queryFn: async (): Promise<RefundablesMatch[]> => {
      if (isDemo) {
        return await demoApi.getRefundablesMatches();
      }
      return await api.getRefundablesMatches();
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateRefundablesMatchMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (request: CreateMatchRequest) =>
      isDemo ? demoApi.createRefundablesMatch(request) : api.createRefundablesMatch(request),
    onSuccess: () => {
      smartInvalidate('createRefundablesMatch');
    },
  });
}

export function useDeleteRefundablesMatchMutation() {
  const isDemo = useDemo();
  const smartInvalidate = useSmartInvalidate();
  return useMutation({
    mutationFn: (matchId: string) =>
      isDemo ? demoApi.deleteRefundablesMatch(matchId) : api.deleteRefundablesMatch(matchId),
    onSuccess: () => {
      smartInvalidate('deleteRefundablesMatch');
    },
  });
}
