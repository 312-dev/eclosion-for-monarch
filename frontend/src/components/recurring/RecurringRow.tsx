/**
 * RecurringRow - Individual row component for recurring items
 *
 * Memoized to prevent unnecessary re-renders when parent list updates.
 */

import { memo, useState, useRef, useEffect } from 'react';
import type { RecurringItem } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { formatDateRelative, getStatusStyles } from '../../utils';
import { RecurringItemHeader } from './RecurringItemHeader';
import { RecurringItemBudget } from './RecurringItemBudget';
import { RecurringItemStatus } from './RecurringItemStatus';
import { COLUMN_WIDTHS } from './RecurringListHeader';
import { UI } from '../../constants';
import { useAsyncAction, useItemDisplayStatus } from '../../hooks';

interface RecurringRowProps {
  readonly item: RecurringItem;
  readonly onToggle: (id: string, enabled: boolean) => Promise<void>;
  readonly onAllocate: (id: string, diff: number, newAmount: number) => Promise<void>;
  readonly onRecreate: (id: string) => Promise<void>;
  readonly onChangeGroup: (id: string, groupId: string, groupName: string) => Promise<void>;
  readonly onAddToRollup: ((id: string) => Promise<void>) | undefined;
  readonly onEmojiChange: (id: string, emoji: string) => Promise<void>;
  readonly onNameChange: (id: string, name: string) => Promise<void>;
  readonly onLinkCategory: (item: RecurringItem) => void;
  readonly highlightId?: string | null;
  /** Optional data-tour attribute for guided tour targeting */
  readonly dataTourId?: string;
  readonly showCategoryGroup?: boolean;
}

export const RecurringRow = memo(function RecurringRow({
  item,
  onToggle,
  onAllocate,
  onRecreate,
  onChangeGroup,
  onAddToRollup,
  onEmojiChange,
  onNameChange,
  onLinkCategory,
  highlightId,
  dataTourId,
  showCategoryGroup = true,
}: RecurringRowProps) {
  // Async action hooks for loading states
  const toggleAction = useAsyncAction();
  const allocateAction = useAsyncAction();
  const recreateAction = useAsyncAction();
  const addToRollupAction = useAsyncAction();

  const rowRef = useRef<HTMLTableRowElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  // Handle highlight when this row becomes the highlighted one
  // The synchronous setState is intentional - we need immediate visual feedback
  useEffect(() => {
    if (highlightId === item.id && rowRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: highlight animation requires immediate state update
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), UI.HIGHLIGHT.SHORT);
      return () => clearTimeout(timer);
    }
  }, [highlightId, item.id]);

  const progressPercent = Math.min(item.progress_percent, 100);
  const displayStatus = useItemDisplayStatus(item);
  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleToggle = () => toggleAction.execute(() => onToggle(item.id, !item.is_enabled));

  const handleRecreate = () => recreateAction.execute(() => onRecreate(item.id));

  const handleChangeGroup = async (groupId: string, groupName: string) => {
    await onChangeGroup(item.id, groupId, groupName);
  };

  const handleEmojiChange = async (emoji: string) => {
    await onEmojiChange(item.id, emoji);
  };

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
  const rowPadding = item.is_enabled ? 'py-4' : 'py-1.5';

  return (
    <tr
      ref={rowRef}
      className={`group relative transition-all duration-300 border-b border-monarch-border ${isHighlighted ? 'animate-highlight bg-monarch-orange-light' : 'bg-monarch-bg-card hover:bg-monarch-bg-hover'}`}
      data-tour={dataTourId}
    >
      <td className={`${rowPadding} pl-4 pr-2 ${COLUMN_WIDTHS.name}`}>
        <RecurringItemHeader
          item={item}
          onToggle={handleToggle}
          onRecreate={handleRecreate}
          onLinkCategory={() => onLinkCategory(item)}
          onAddToRollup={onAddToRollup ? handleAddToRollup : undefined}
          onEmojiChange={handleEmojiChange}
          onNameChange={handleNameChange}
          onChangeGroup={handleChangeGroup}
          isToggling={toggleAction.loading}
          isRecreating={recreateAction.loading}
          contentOpacity={contentOpacity}
          displayStatus={displayStatus}
          progressPercent={progressPercent}
          showCategoryGroup={showCategoryGroup}
          showProgress={false}
        />
        {item.is_enabled && (
          <div className="absolute bottom-0 left-0 right-0 z-2 h-0.75" aria-hidden="true">
            <div
              className="h-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: getStatusStyles(displayStatus, item.is_enabled).color,
              }}
            />
          </div>
        )}
      </td>
      <td className={`${rowPadding} px-3 ${COLUMN_WIDTHS.date} ${contentOpacity}`}>
        {relative ? (
          <Tooltip content={relative}>
            <span className="text-monarch-text-dark cursor-help decoration-dotted underline-offset-4 opacity-100 group-hover:underline">
              {date}
            </span>
          </Tooltip>
        ) : (
          <div className="text-monarch-text-dark">{date}</div>
        )}
      </td>
      <td className={`${rowPadding} px-3 text-right ${COLUMN_WIDTHS.budget} ${contentOpacity}`}>
        <RecurringItemBudget
          item={item}
          onAllocate={handleAllocate}
          isAllocating={allocateAction.loading}
        />
      </td>
      <td className={`${rowPadding} px-3 ${COLUMN_WIDTHS.status}`}>
        <div className="flex justify-center">
          <RecurringItemStatus
            item={item}
            displayStatus={displayStatus}
            onAllocate={handleAllocateNeeded}
            isAllocating={allocateAction.loading}
          />
        </div>
      </td>
    </tr>
  );
});
