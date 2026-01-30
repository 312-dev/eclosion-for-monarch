/* eslint-disable max-lines */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-nested-conditional */
/**
 * StashRow - Individual row component for stash items
 *
 * Displays a stash with progress, budget input, and actions.
 * Similar structure to RecurringRow but with stash-specific behavior.
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import type { StashItem, ItemStatus, RecurringItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { SavingsProgressBar } from '../shared';
import { MerchantIcon } from '../ui';
import { EmojiPicker } from '../EmojiPicker';
import { CategoryGroupDropdown } from '../recurring/CategoryGroupDropdown';
import { RecurringItemStatus } from '../recurring/RecurringItemStatus';
import { RecurringItemBudget } from '../recurring/RecurringItemBudget';
import { StashActionsDropdown } from './StashActionsDropdown';
import { StashTitleDropdown } from './StashTitleDropdown';
import { Icons } from '../icons';
import { UI } from '../../constants';
import { useAsyncAction } from '../../hooks';
import { decodeHtmlEntities } from '../../utils';
import { formatMonthsRemaining } from '../../utils/savingsCalculations';

interface StashRowProps {
  readonly item: StashItem;
  readonly onAllocate: (id: string, diff: number, newAmount: number) => Promise<void>;
  readonly onArchive: (id: string) => Promise<void>;
  readonly onDelete: (id: string) => Promise<void>;
  readonly onChangeGroup: (id: string, groupId: string, groupName: string) => Promise<void>;
  readonly onEmojiChange: (id: string, emoji: string) => Promise<void>;
  readonly onNameChange: (id: string, name: string) => Promise<void>;
  readonly onEdit: (item: StashItem) => void;
  readonly highlightId?: string | null;
  readonly onViewReport?: (stashId: string) => void;
}

// Column widths for consistent layout
const COLUMN_WIDTHS = {
  name: 'w-[40%]',
  date: 'w-[15%]',
  budget: 'w-[15%]',
  status: 'w-[15%]',
  actions: 'w-[15%]',
};

export const StashRow = memo(function StashRow({
  item,
  onAllocate,
  onArchive,
  onDelete,
  onChangeGroup,
  onEmojiChange,
  onNameChange,
  onEdit,
  highlightId,
  onViewReport,
}: StashRowProps) {
  const allocateAction = useAsyncAction();
  const archiveAction = useAsyncAction();

  const rowRef = useRef<HTMLTableRowElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle highlight animation
  useEffect(() => {
    if (highlightId === item.id && rowRef.current) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), UI.HIGHLIGHT.SHORT);
      return () => clearTimeout(timer);
    }
  }, [highlightId, item.id]);

  // Keep nameValue in sync with item.name
  useEffect(() => {
    setNameValue(item.name);
  }, [item.name]);

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const displayStatus: ItemStatus = item.status;

  // Calculate rollover for progress bar tooltip
  // Use actual rollover from Monarch, falling back to calculated value for backwards compatibility
  const rolloverAmount =
    item.rollover_amount ?? Math.max(0, item.current_balance - item.planned_budget);
  const budgetedThisMonth = item.planned_budget;
  const creditsThisMonth = item.credits_this_month ?? 0;

  // For flex categories, progress bar should be based on total contributions (saved),
  // not remaining balance. This matches purchase goal behavior where progress is immune to spending.
  const totalContributions = rolloverAmount + budgetedThisMonth + creditsThisMonth;
  const progressPercent = item.is_flexible_group
    ? Math.min(100, item.amount > 0 ? (totalContributions / item.amount) * 100 : 0)
    : Math.min(item.progress_percent, 100);

  const handleChangeGroup = useCallback(
    async (groupId: string, groupName: string) => {
      await onChangeGroup(item.id, groupId, groupName);
    },
    [item.id, onChangeGroup]
  );

  const handleEmojiChange = useCallback(
    async (emoji: string) => {
      await onEmojiChange(item.id, emoji);
    },
    [item.id, onEmojiChange]
  );

  const handleAllocate = useCallback(
    (diff: number, newAmount: number) =>
      allocateAction.execute(() => onAllocate(item.id, diff, newAmount)),
    [allocateAction, item.id, onAllocate]
  );

  const handleArchive = useCallback(
    () => archiveAction.execute(() => onArchive(item.id)),
    [archiveAction, item.id, onArchive]
  );

  const handleDelete = useCallback(async () => {
    await onDelete(item.id);
  }, [item.id, onDelete]);

  const handleNameSubmit = async () => {
    const trimmedName = nameValue.trim();
    if (trimmedName && trimmedName !== item.name) {
      setIsUpdatingName(true);
      try {
        await onNameChange(item.id, trimmedName);
      } catch {
        setNameValue(item.name);
      } finally {
        setIsUpdatingName(false);
        setIsEditingName(false);
      }
    } else {
      setNameValue(item.name);
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setNameValue(item.name);
      setIsEditingName(false);
    }
  };

  // Format target date for display
  const targetDate = new Date(item.target_date);
  const dateDisplay = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });

  // Create a compatible item for RecurringItemBudget
  const budgetItem = {
    ...item,
    frozen_monthly_target: item.monthly_target,
    ideal_monthly_rate: item.monthly_target,
    amount_needed_now: Math.max(0, item.monthly_target - item.planned_budget),
    is_enabled: true,
    category_missing: false,
    contributed_this_month: item.planned_budget,
  };

  return (
    <tr
      ref={rowRef}
      className={`group transition-all duration-300 border-b border-monarch-border ${
        isHighlighted
          ? 'animate-highlight bg-monarch-orange-light'
          : 'bg-monarch-bg-card hover:bg-monarch-bg-hover'
      }`}
    >
      {/* Name Column */}
      <td className={`py-4 pl-5 pr-2 ${COLUMN_WIDTHS.name}`}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <MerchantIcon logoUrl={item.logo_url ?? null} itemName={item.name} size="lg" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleNameKeyDown}
                  disabled={isUpdatingName}
                  className="font-medium px-1 py-0.5 rounded text-sm text-monarch-text-dark bg-monarch-bg-card border border-monarch-orange outline-none min-w-30"
                />
              ) : (
                <>
                  <EmojiPicker
                    currentEmoji={item.emoji || '🎯'}
                    onSelect={handleEmojiChange}
                    disabled={false}
                  />
                  {onViewReport ? (
                    <StashTitleDropdown
                      stashName={item.name}
                      categoryId={item.category_id}
                      onViewReport={() => onViewReport(item.id)}
                    >
                      {item.source_url ? (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium truncate hover:underline px-1 py-0.5 rounded text-monarch-text-dark"
                          title={decodeHtmlEntities(item.name)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {decodeHtmlEntities(item.name)}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="font-medium truncate cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded text-monarch-text-dark text-left"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsEditingName(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              setIsEditingName(true);
                            }
                          }}
                          title="Double-click to rename"
                        >
                          {decodeHtmlEntities(item.name)}
                        </button>
                      )}
                    </StashTitleDropdown>
                  ) : (
                    <>
                      {item.source_url ? (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium truncate hover:underline px-1 py-0.5 rounded text-monarch-text-dark"
                          title={decodeHtmlEntities(item.name)}
                        >
                          {decodeHtmlEntities(item.name)}
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="font-medium truncate cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded text-monarch-text-dark text-left"
                          onDoubleClick={() => setIsEditingName(true)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setIsEditingName(true);
                            }
                          }}
                          title="Double-click to rename"
                        >
                          {decodeHtmlEntities(item.name)}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
              {item.source_url && (
                <Tooltip content="Open source URL">
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-70! transition-opacity text-monarch-text-light"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open source URL"
                  >
                    <Icons.ExternalLink size={12} />
                  </a>
                </Tooltip>
              )}
            </div>
            {item.category_group_name && (
              <div className="text-sm truncate text-monarch-text-light pt-0.5">
                <CategoryGroupDropdown
                  currentGroupName={item.category_group_name}
                  onChangeGroup={handleChangeGroup}
                />
              </div>
            )}
            <div className="mt-2">
              <SavingsProgressBar
                totalSaved={item.current_balance}
                targetAmount={item.amount}
                progressPercent={progressPercent}
                displayStatus={displayStatus}
                isEnabled={true}
                rolloverAmount={rolloverAmount}
                budgetedThisMonth={budgetedThisMonth}
                creditsThisMonth={creditsThisMonth}
                savedLabel="committed"
                // Flex categories behave like savings_buffer (spending reduces balance)
                goalType={item.is_flexible_group ? 'savings_buffer' : item.goal_type}
                {...(item.available_to_spend !== undefined && {
                  availableToSpend: item.available_to_spend,
                })}
              />
            </div>
          </div>
        </div>
      </td>

      {/* Target Date Column */}
      <td className={`py-4 px-4 ${COLUMN_WIDTHS.date}`}>
        <div className="text-monarch-text-dark">{dateDisplay}</div>
        <div className="text-sm text-monarch-text-light">
          {formatMonthsRemaining(item.months_remaining)}
        </div>
      </td>

      {/* Budget Column */}
      <td className={`py-4 px-4 text-right ${COLUMN_WIDTHS.budget}`}>
        <RecurringItemBudget
          item={budgetItem as unknown as RecurringItem}
          onAllocate={handleAllocate}
          isAllocating={allocateAction.loading}
        />
      </td>

      {/* Status Column */}
      <td className={`py-4 px-5 ${COLUMN_WIDTHS.status}`}>
        <div className="flex justify-center">
          <RecurringItemStatus
            item={budgetItem as unknown as RecurringItem}
            displayStatus={displayStatus}
            onAllocate={async () => {
              if (item.shortfall > 0) {
                const diff = item.monthly_target - item.planned_budget;
                if (diff > 0) {
                  await handleAllocate(diff, item.planned_budget + diff);
                }
              }
            }}
            isAllocating={allocateAction.loading}
          />
        </div>
      </td>

      {/* Actions Column */}
      <td className={`py-4 px-3 ${COLUMN_WIDTHS.actions}`}>
        <StashActionsDropdown
          item={item}
          onEdit={() => onEdit(item)}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onChangeGroup={handleChangeGroup}
          isArchiving={archiveAction.loading}
        />
      </td>
    </tr>
  );
});
