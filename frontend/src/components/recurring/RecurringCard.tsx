/**
 * RecurringCard - Mobile card component for recurring items
 *
 * Displays recurring item information in a card layout optimized
 * for narrow viewports. Uses the same sub-components as RecurringRow.
 * Memoized to prevent unnecessary re-renders when parent list updates.
 */

import { memo, useState, useRef, useEffect } from 'react';
import type { RecurringItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { formatDateRelative } from '../../utils';
import { RecurringItemHeader } from './RecurringItemHeader';
import { RecurringItemBudget } from './RecurringItemBudget';
import { RecurringItemStatus } from './RecurringItemStatus';
import { RecurringItemProgress } from './RecurringItemProgress';
import { ActionsDropdown } from './ActionsDropdown';
import { UI } from '../../constants';
import { SpinnerIcon, ArrowUpIcon } from '../icons';
import { useAsyncAction, useItemDisplayStatus } from '../../hooks';
import { useIsRateLimited } from '../../context/RateLimitContext';

interface RecurringCardProps {
  readonly item: RecurringItem;
  readonly onToggle: (id: string, enabled: boolean) => Promise<void>;
  readonly onAllocate: (id: string, diff: number, newAmount: number) => Promise<void>;
  readonly onRecreate: (id: string) => Promise<void>;
  readonly onChangeGroup: (id: string, groupId: string, groupName: string) => Promise<void>;
  readonly onAddToRollup: ((id: string) => Promise<void>) | undefined;
  readonly onEmojiChange: (id: string, emoji: string) => Promise<void>;
  readonly onRefreshItem: (id: string) => Promise<void>;
  readonly onNameChange: (id: string, name: string) => Promise<void>;
  readonly onLinkCategory: (item: RecurringItem) => void;
  readonly highlightId?: string | null;
  /** Optional data-tour attribute for guided tour targeting */
  readonly dataTourId?: string;
  readonly showCategoryGroup?: boolean;
}

export const RecurringCard = memo(function RecurringCard({
  item,
  onToggle,
  onAllocate,
  onRecreate,
  onChangeGroup,
  onAddToRollup,
  onEmojiChange,
  onRefreshItem,
  onNameChange,
  onLinkCategory,
  highlightId,
  dataTourId,
  showCategoryGroup = true,
}: RecurringCardProps) {
  // Async action hooks for loading states
  const toggleAction = useAsyncAction();
  const allocateAction = useAsyncAction();
  const recreateAction = useAsyncAction();
  const addToRollupAction = useAsyncAction();
  const refreshAction = useAsyncAction();
  const isRateLimited = useIsRateLimited();

  const cardRef = useRef<HTMLElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Handle highlight when this card becomes the highlighted one
  // The synchronous setState is intentional - we need immediate visual feedback
  useEffect(() => {
    if (highlightId === item.id && cardRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: highlight animation requires immediate state update
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), UI.HIGHLIGHT.SHORT);
      return () => clearTimeout(timer);
    }
  }, [highlightId, item.id]);

  const progressPercent = Math.min(item.progress_percent, 100);
  const displayStatus = useItemDisplayStatus(item);
  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleToggle = () =>
    toggleAction.execute(() => onToggle(item.id, !item.is_enabled));

  const handleRecreate = () =>
    recreateAction.execute(() => onRecreate(item.id));

  const handleChangeGroup = async (groupId: string, groupName: string) => {
    await onChangeGroup(item.id, groupId, groupName);
  };

  const handleEmojiChange = async (emoji: string) => {
    await onEmojiChange(item.id, emoji);
  };

  const handleRefresh = () =>
    refreshAction.execute(() => onRefreshItem(item.id));

  const handleNameChange = async (name: string) => {
    await onNameChange(item.id, name);
  };

  const handleAddToRollup = () => {
    if (!onAddToRollup) return;
    return addToRollupAction.execute(() => onAddToRollup(item.id));
  };

  const handleAllocate = (diff: number, newAmount: number) =>
    allocateAction.execute(() => onAllocate(item.id, diff, newAmount));

  const handleAllocateNeeded = async (): Promise<void> => {
    if (item.amount_needed_now <= 0) return;
    const diff = item.amount_needed_now;
    const newAmount = Math.round(item.planned_budget + diff);
    await handleAllocate(diff, newAmount);
  };

  const contentOpacity = item.is_enabled ? '' : 'opacity-50';

  return (
    <article
      ref={cardRef}
      aria-label={`${item.name} recurring expense`}
      className={`rounded-lg border p-4 transition-all duration-300 ${
        isHighlighted
          ? 'animate-highlight bg-monarch-orange-light border-monarch-orange'
          : 'bg-monarch-bg-card border-monarch-border'
      } ${!item.is_enabled ? 'opacity-75' : ''}`}
      data-tour={dataTourId}
    >
      {/* Row 1: Header + Status + Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <RecurringItemHeader
            item={item}
            onToggle={handleToggle}
            onEmojiChange={handleEmojiChange}
            onNameChange={handleNameChange}
            onChangeGroup={handleChangeGroup}
            isToggling={toggleAction.loading}
            contentOpacity={contentOpacity}
            displayStatus={displayStatus}
            progressPercent={progressPercent}
            showCategoryGroup={showCategoryGroup}
            showProgress={false}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className={contentOpacity}>
            <RecurringItemStatus
              item={item}
              displayStatus={displayStatus}
              onAllocate={handleAllocateNeeded}
              isAllocating={allocateAction.loading}
            />
          </div>
          {item.is_enabled ? (
            <ActionsDropdown
              item={item}
              onToggle={handleToggle}
              onLinkCategory={() => onLinkCategory(item)}
              onRecreate={handleRecreate}
              onAddToRollup={onAddToRollup ? handleAddToRollup : undefined}
              onRefresh={handleRefresh}
              onChangeGroup={handleChangeGroup}
              isToggling={toggleAction.loading}
              isRecreating={recreateAction.loading}
              isAddingToRollup={addToRollupAction.loading}
              isRefreshing={refreshAction.loading}
              showCategoryGroup={showCategoryGroup}
            />
          ) : (
            onAddToRollup && (
              <Tooltip content="Add to rollup">
                <button
                  onClick={handleAddToRollup}
                  disabled={addToRollupAction.loading || isRateLimited}
                  aria-label="Add to rollup"
                  className="w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-black/10 disabled:opacity-50"
                >
                  {addToRollupAction.loading ? (
                    <SpinnerIcon size={16} color="var(--monarch-orange)" />
                  ) : (
                    <ArrowUpIcon size={16} color="var(--monarch-orange)" strokeWidth={2.5} />
                  )}
                </button>
              </Tooltip>
            )
          )}
        </div>
      </div>

      {/* Progress bar - aligned with text content (after icon + gap) */}
      <div className={`mt-2 mb-3 pl-15 ${contentOpacity}`}>
        <RecurringItemProgress
          item={item}
          displayStatus={displayStatus}
          progressPercent={progressPercent}
        />
      </div>

      {/* Bottom section with darker background */}
      <div className="bg-monarch-bg-page -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
        {/* Row 2: Date + Budget */}
        <div className={`flex items-start justify-between ${contentOpacity}`}>
          <div>
            <span className="text-xs text-monarch-text-light">Due</span>
            <div className="text-monarch-text-dark">{date}</div>
            {relative && (
              <div className="text-sm text-monarch-text-light">{relative}</div>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-monarch-text-light mb-1">
              {new Date().toLocaleDateString('en-US', { month: 'short' })}. Budget
            </span>
            <RecurringItemBudget
              item={item}
              onAllocate={handleAllocate}
              isAllocating={allocateAction.loading}
            />
          </div>
        </div>
      </div>
    </article>
  );
});
