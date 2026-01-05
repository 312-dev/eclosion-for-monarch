/**
 * Category API Functions
 *
 * Category groups, linking, and customization.
 */

import type { CategoryGroup, UnmappedCategory, LinkCategoryResult } from '../../types';
import { fetchApi } from './fetchApi';

export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const response = await fetchApi<{ groups: CategoryGroup[] }>('/recurring/groups');
  return response.groups;
}

export async function setConfig(groupId: string, groupName: string): Promise<void> {
  await fetchApi('/recurring/config', {
    method: 'POST',
    body: JSON.stringify({ group_id: groupId, group_name: groupName }),
  });
}

export async function getUnmappedCategories(): Promise<UnmappedCategory[]> {
  const response = await fetchApi<{ categories: UnmappedCategory[] }>(
    '/recurring/unmapped-categories'
  );
  return response.categories;
}

export async function linkToCategory(
  recurringId: string,
  categoryId: string,
  syncName: boolean
): Promise<LinkCategoryResult> {
  return fetchApi<LinkCategoryResult>('/recurring/link-category', {
    method: 'POST',
    body: JSON.stringify({
      recurring_id: recurringId,
      category_id: categoryId,
      sync_name: syncName,
    }),
  });
}

export async function updateCategoryEmoji(
  recurringId: string,
  emoji: string
): Promise<{ success: boolean; emoji?: string; new_name?: string; error?: string }> {
  return fetchApi('/recurring/emoji', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId, emoji }),
  });
}

export async function updateCategoryName(
  recurringId: string,
  name: string
): Promise<{ success: boolean; category_name?: string; error?: string }> {
  return fetchApi('/recurring/category-name', {
    method: 'POST',
    body: JSON.stringify({ recurring_id: recurringId, name }),
  });
}

export async function clearCategoryCache(): Promise<{ success: boolean; message?: string }> {
  return fetchApi('/recurring/clear-category-cache', {
    method: 'POST',
  });
}
