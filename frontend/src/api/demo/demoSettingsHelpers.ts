/**
 * Demo Settings Helpers
 *
 * Shared utility functions for demo settings export/import.
 */

import type { CategoryReference, StashExportItem, StashItem } from '../../types';

/** Build CategoryReference without undefined values (required for exactOptionalPropertyTypes) */
export function buildCategoryRef(
  type: 'group' | 'category',
  id: string,
  name: string,
  groupId: string | null,
  groupName: string | null
): CategoryReference {
  const ref: CategoryReference = { type, id, name };
  if (type === 'category' && groupId) ref.groupId = groupId;
  if (type === 'category' && groupName) ref.groupName = groupName;
  return ref;
}

/** Build StashItem with optional properties conditionally set */
export function buildStashItem(
  item: StashExportItem,
  index: number,
  baseOrder: number,
  isArchived: boolean,
  knownCategoryIds?: Set<string>
): StashItem {
  const canLink =
    item.monarch_category_id != null && knownCategoryIds?.has(item.monarch_category_id) === true;

  const stashItem: StashItem = {
    type: 'stash',
    id: `imported-${item.id}`,
    name: item.name,
    amount: item.amount,
    target_date: item.target_date,
    emoji: item.emoji,
    category_id: canLink ? item.monarch_category_id : null,
    category_name: canLink ? item.name : 'Unlinked',
    category_group_id: canLink ? (item.category_group_id ?? null) : null,
    category_group_name: item.category_group_name ?? null,
    is_archived: isArchived,
    is_enabled: !isArchived,
    status: 'behind',
    progress_percent: 0,
    months_remaining: isArchived ? 0 : 12,
    current_balance: 0,
    planned_budget: 0,
    rollover_amount: 0,
    credits_this_month: 0,
    monthly_target: isArchived || item.amount === null ? null : Math.ceil(item.amount / 12),
    shortfall: item.amount, // Can be null for open-ended goals
    sort_order: baseOrder + index,
    grid_x: item.grid_x,
    grid_y: item.grid_y,
    col_span: item.col_span,
    row_span: item.row_span,
    goal_type: 'one_time',
    created_at: new Date().toISOString(),
  };
  if (item.source_url) stashItem.source_url = item.source_url;
  if (item.logo_url) stashItem.logo_url = item.logo_url;
  if (isArchived) stashItem.archived_at = item.archived_at ?? new Date().toISOString();
  return stashItem;
}
