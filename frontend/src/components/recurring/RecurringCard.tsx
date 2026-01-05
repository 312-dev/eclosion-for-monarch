/**
 * RecurringCard - Mobile card component for recurring items
 *
 * Displays recurring item information in a card layout optimized
 * for narrow viewports. Uses the same sub-components as RecurringRow.
 * Memoized to prevent unnecessary re-renders when parent list updates.
 */

import { memo, useState, useRef, useEffect } from 'react';
import type { RecurringItem } from '../../types';
import { formatDateRelative } from '../../utils';
import { RecurringItemHeader } from './RecurringItemHeader';
import { RecurringItemCost } from './RecurringItemCost';
import { RecurringItemBudget } from './RecurringItemBudget';
import { RecurringItemStatus } from './RecurringItemStatus';
import { ActionsDropdown } from './ActionsDropdown';
import { UI } from '../../constants';
import { useAsyncAction, useItemDisplayStatus } from '../../hooks';

interface RecurringCardProps {
  readonly item: RecurringItem;
  readonly onToggle: (id: string, enabled: boolean) => Promise<void>;
  readonly onAllocate: (id: string, amount: number) => Promise<void>;
  readonly onRecreate: (id: string) => Promise<void>;
  readonly onChangeGroup: (id: string, groupId: string, groupName: string) => Promise<void>;
  readonly onAddToRollup: ((id: string) => Promise<void>) | undefined;
  readonly onEmojiChange: (id: string, emoji: string) => Promise<void>;
  readonly onRefreshItem: (id: string) => Promise<void>;
  readonly onNameChange: (id: string, name: string) => Promise<void>;
  readonly onLinkCategory: (item: RecurringItem) => void;
  readonly highlightId?: string | null;
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
}: RecurringCardProps) {
  // Async action hooks for loading states
  const toggleAction = useAsyncAction();
  const allocateAction = useAsyncAction();
  const recreateAction = useAsyncAction();
  const addToRollupAction = useAsyncAction();
  const refreshAction = useAsyncAction();

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

  const handleAllocate = (amount: number) =>
    allocateAction.execute(() => onAllocate(item.id, amount));

  const handleAllocateNeeded = async (): Promise<void> => {
    if (item.amount_needed_now <= 0) return;
    await handleAllocate(item.amount_needed_now);
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
    >
      {/* Row 1: Header + Actions */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <RecurringItemHeader
            item={item}
            onToggle={handleToggle}
            onEmojiChange={handleEmojiChange}
            onNameChange={handleNameChange}
            onChangeGroup={handleChangeGroup}
            isToggling={toggleAction.loading}
            contentOpacity={contentOpacity}
          />
        </div>
        {item.is_enabled && (
          <ActionsDropdown
            item={item}
            onToggle={handleToggle}
            onLinkCategory={() => onLinkCategory(item)}
            onRecreate={handleRecreate}
            onAddToRollup={onAddToRollup ? handleAddToRollup : undefined}
            onRefresh={handleRefresh}
            isToggling={toggleAction.loading}
            isRecreating={recreateAction.loading}
            isAddingToRollup={addToRollupAction.loading}
            isRefreshing={refreshAction.loading}
          />
        )}
      </div>

      {/* Row 2: Date + Status */}
      <div className={`flex items-center justify-between mb-3 ${contentOpacity}`}>
        <div className="text-sm">
          <span className="text-monarch-text-dark">{date}</span>
          {relative && (
            <span className="text-monarch-text-light ml-2">{relative}</span>
          )}
        </div>
        <RecurringItemStatus
          item={item}
          displayStatus={displayStatus}
          onAllocate={handleAllocateNeeded}
          isAllocating={allocateAction.loading}
        />
      </div>

      {/* Row 3: Cost + Budget */}
      <div className={`grid grid-cols-2 gap-4 ${contentOpacity}`}>
        <RecurringItemCost
          item={item}
          displayStatus={displayStatus}
          progressPercent={progressPercent}
          date={date}
          compact
        />
        <div className="flex flex-col items-end justify-start">
          <span className="text-xs text-monarch-text-light mb-1">Budgeted</span>
          <RecurringItemBudget
            item={item}
            onAllocate={handleAllocate}
            isAllocating={allocateAction.loading}
          />
        </div>
      </div>
    </article>
  );
});
