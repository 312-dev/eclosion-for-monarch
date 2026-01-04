/**
 * RecurringCard - Mobile card component for recurring items
 *
 * Displays recurring item information in a card layout optimized
 * for narrow viewports. Uses the same sub-components as RecurringRow.
 */

import { useState, useRef, useEffect } from 'react';
import type { RecurringItem, ItemStatus } from '../../types';
import { formatDateRelative } from '../../utils';
import { RecurringItemHeader } from './RecurringItemHeader';
import { RecurringItemCost } from './RecurringItemCost';
import { RecurringItemBudget } from './RecurringItemBudget';
import { RecurringItemStatus } from './RecurringItemStatus';
import { ActionsDropdown } from './ActionsDropdown';
import { UI } from '../../constants';

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

export function RecurringCard({
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
  const [isToggling, setIsToggling] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);
  const [isAddingToRollup, setIsAddingToRollup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (highlightId === item.id && cardRef.current) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), UI.HIGHLIGHT.SHORT);
      return () => clearTimeout(timer);
    }
  }, [highlightId, item.id]);

  const progressPercent = Math.min(item.progress_percent, 100);

  // Calculate display status
  let displayStatus: ItemStatus = item.status;
  const targetRounded = Math.ceil(item.frozen_monthly_target);
  const budgetRounded = Math.ceil(item.planned_budget);
  const balanceRounded = Math.round(item.current_balance);
  const amountRounded = Math.round(item.amount);

  if (item.is_enabled && item.frozen_monthly_target > 0) {
    if (budgetRounded > targetRounded) {
      displayStatus = 'ahead';
    } else if (budgetRounded >= targetRounded) {
      displayStatus = balanceRounded >= amountRounded ? 'funded' : 'on_track';
    } else {
      displayStatus = 'behind';
    }
  } else if (item.is_enabled && balanceRounded >= amountRounded) {
    displayStatus = 'funded';
  }

  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(item.id, !item.is_enabled);
    } finally {
      setIsToggling(false);
    }
  };

  const handleRecreate = async () => {
    setIsRecreating(true);
    try {
      await onRecreate(item.id);
    } finally {
      setIsRecreating(false);
    }
  };

  const handleChangeGroup = async (groupId: string, groupName: string) => {
    await onChangeGroup(item.id, groupId, groupName);
  };

  const handleEmojiChange = async (emoji: string) => {
    await onEmojiChange(item.id, emoji);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshItem(item.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNameChange = async (name: string) => {
    await onNameChange(item.id, name);
  };

  const handleAddToRollup = async () => {
    if (!onAddToRollup) return;
    setIsAddingToRollup(true);
    try {
      await onAddToRollup(item.id);
    } finally {
      setIsAddingToRollup(false);
    }
  };

  const handleAllocate = async (amount: number) => {
    setIsAllocating(true);
    try {
      await onAllocate(item.id, amount);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleAllocateNeeded = async () => {
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
            isToggling={isToggling}
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
            isToggling={isToggling}
            isRecreating={isRecreating}
            isAddingToRollup={isAddingToRollup}
            isRefreshing={isRefreshing}
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
          isAllocating={isAllocating}
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
            isAllocating={isAllocating}
          />
        </div>
      </div>
    </article>
  );
}
