/**
 * RecurringRow - Individual row component for recurring items
 */

import React, { useState, useRef, useEffect } from 'react';
import type { RecurringItem, ItemStatus } from '../../types';
import { EmojiPicker } from '../EmojiPicker';
import { Tooltip } from '../Tooltip';
import { MerchantIcon } from '../ui';
import {
  formatCurrency,
  formatFrequencyShort,
  formatDateRelative,
  getStatusLabel,
  getStatusStyles,
} from '../../utils';
import { WarningIcon, LinkedCategoryIcon } from './RecurringListIcons';
import { CategoryGroupDropdown } from './CategoryGroupDropdown';
import { ActionsDropdown } from './ActionsDropdown';
import { UI } from '../../constants';

interface RecurringRowProps {
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

export function RecurringRow({ item, onToggle, onAllocate, onRecreate, onChangeGroup, onAddToRollup, onEmojiChange, onRefreshItem, onNameChange, onLinkCategory, highlightId }: RecurringRowProps) {
  const [isToggling, setIsToggling] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle highlight when this row is the highlighted one
  useEffect(() => {
    if (highlightId === item.id && rowRef.current) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), UI.HIGHLIGHT.SHORT);
      return () => clearTimeout(timer);
    }
  }, [highlightId, item.id]);

  const [isAllocating, setIsAllocating] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);
  const [isAddingToRollup, setIsAddingToRollup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllocateConfirm, setShowAllocateConfirm] = useState(false);
  const [budgetInput, setBudgetInput] = useState(item.planned_budget.toString());

  // Keep budgetInput in sync with item.planned_budget
  useEffect(() => {
    setBudgetInput(item.planned_budget.toString());
  }, [item.planned_budget]);

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

  const progressPercent = Math.min(item.progress_percent, 100);

  // Override status based on what user has budgeted vs what's needed
  let displayStatus: ItemStatus = item.status;
  if (item.is_enabled && item.frozen_monthly_target > 0) {
    if (item.planned_budget > item.frozen_monthly_target) {
      displayStatus = 'ahead';
    } else if (item.planned_budget >= item.frozen_monthly_target) {
      displayStatus = item.current_balance >= item.amount ? 'funded' : 'on_track';
    } else {
      displayStatus = 'behind';
    }
  } else if (item.is_enabled && item.current_balance >= item.amount) {
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

  const handleAddToRollup = async () => {
    if (!onAddToRollup) return;
    setIsAddingToRollup(true);
    try {
      await onAddToRollup(item.id);
    } finally {
      setIsAddingToRollup(false);
    }
  };

  const handleAllocate = async () => {
    if (item.amount_needed_now <= 0) return;
    setIsAllocating(true);
    try {
      await onAllocate(item.id, item.amount_needed_now);
      setShowAllocateConfirm(false);
    } finally {
      setIsAllocating(false);
    }
  };

  const handleBudgetSubmit = async () => {
    const newAmount = parseFloat(budgetInput);
    if (isNaN(newAmount) || newAmount < 0) {
      setBudgetInput(item.planned_budget.toString());
      return;
    }
    const diff = newAmount - item.planned_budget;
    if (Math.abs(diff) > 0.01) {
      setIsAllocating(true);
      try {
        await onAllocate(item.id, diff);
      } finally {
        setIsAllocating(false);
      }
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetInput(item.planned_budget.toString());
      (e.target as HTMLInputElement).blur();
    }
  };

  const contentOpacity = item.is_enabled ? '' : 'opacity-50';
  const rowPadding = item.is_enabled ? 'py-4' : 'py-1.5';
  const isCritical = item.is_enabled && item.status === 'critical' && item.amount_needed_now > 0;

  return (
    <tr
      ref={rowRef}
      className={`group transition-all duration-300 border-b border-monarch-border ${isHighlighted ? 'animate-highlight bg-monarch-orange-light' : 'bg-monarch-bg-card hover:bg-monarch-bg-hover'}`}
    >
      <td className={`${rowPadding} pl-5 pr-2 max-w-40`}>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <MerchantIcon logoUrl={item.logo_url} size="md" />
            <Tooltip
              content={
                item.is_enabled
                  ? item.category_missing
                    ? 'Category missing - click to disable'
                    : 'Click to disable tracking'
                  : 'Click to enable tracking'
              }
            >
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:opacity-80 disabled:opacity-50 bg-monarch-bg-card border border-monarch-border shadow-sm"
              >
                {isToggling ? (
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2.5">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                ) : item.is_enabled ? (
                  item.category_missing ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--monarch-warning)">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--monarch-success)">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-text-muted)" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="4" y1="4" x2="20" y2="20" />
                  </svg>
                )}
              </button>
            </Tooltip>
          </div>
          <div className={`flex flex-col min-w-0 ${contentOpacity}`}>
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
                  {item.is_enabled && (
                    <EmojiPicker
                      currentEmoji={item.emoji || '🔄'}
                      onSelect={handleEmojiChange}
                      disabled={item.category_missing}
                    />
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    className="font-medium truncate cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded text-monarch-text-dark"
                    onDoubleClick={() => item.is_enabled && !item.category_missing && setIsEditingName(true)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && item.is_enabled && !item.category_missing) {
                        setIsEditingName(true);
                      }
                    }}
                    title={item.is_enabled && !item.category_missing ? "Double-click to rename" : undefined}
                  >
                    {item.name}
                  </span>
                </>
              )}
              {item.is_enabled && item.category_id && !item.category_missing && (
                <Tooltip content="View linked category in Monarch">
                  <a
                    href={`https://app.monarchmoney.com/categories/${item.category_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 hover:opacity-70 transition-opacity text-monarch-text-light"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkedCategoryIcon />
                  </a>
                </Tooltip>
              )}
              {item.is_stale && (
                <Tooltip content="This recurring item may be stale - last charge was missed or off from expected date">
                  <span className="cursor-help">
                    <WarningIcon />
                  </span>
                </Tooltip>
              )}
            </div>
            {item.category_group_name && (
              <div className="text-sm truncate text-monarch-text-light">
                {item.is_enabled && !item.category_missing ? (
                  <CategoryGroupDropdown
                    currentGroupName={item.category_group_name}
                    onChangeGroup={handleChangeGroup}
                  />
                ) : (
                  item.category_group_name
                )}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className={`${rowPadding} px-4 w-28 ${contentOpacity}`}>
        <div className="text-monarch-text-dark">{date}</div>
        {relative && (
          <div className="text-sm text-monarch-text-light">
            {relative}
          </div>
        )}
      </td>
      <td className={`${rowPadding} px-4 text-right w-40 ${contentOpacity}`}>
        <div className="flex items-center justify-end gap-1">
          {item.frozen_monthly_target > item.ideal_monthly_rate && (item.is_enabled || item.frozen_monthly_target > 0) && (
            <Tooltip content={
              item.is_enabled
                ? `Catching up: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
                : `Higher than usual: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo needed to catch up → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
            }>
              <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-error)' : 'var(--monarch-text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="2 7 10.5 15.5 15.5 10.5 22 17"></polyline>
                  <polyline points="8 7 2 7 2 13"></polyline>
                </svg>
              </span>
            </Tooltip>
          )}
          {item.frozen_monthly_target < item.ideal_monthly_rate && (item.is_enabled || item.frozen_monthly_target > 0) && (
            <Tooltip content={
              item.is_enabled
                ? `Ahead: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
                : `Lower than usual: ${formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo needed → ${formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo after ${date} payment`
            }>
              <span className={item.is_enabled ? 'cursor-pointer hover:opacity-70' : 'cursor-help'} style={{ color: item.is_enabled ? 'var(--monarch-success)' : 'var(--monarch-text-muted)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                  <polyline points="16 17 22 17 22 11"></polyline>
                </svg>
              </span>
            </Tooltip>
          )}
          <span className="font-medium text-monarch-text-dark">
            {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
        <div className="text-xs mt-0.5 text-monarch-text-light">
          {formatCurrency(item.amount, { maximumFractionDigits: 0 })} {formatFrequencyShort(item.frequency)}
        </div>
        {item.is_enabled && (
          <>
            <Tooltip content={`${formatCurrency(item.current_balance, { maximumFractionDigits: 0 })} of ${formatCurrency(item.amount, { maximumFractionDigits: 0 })} • Resets ${formatFrequencyShort(item.frequency)} after payment`}>
              <div className="w-full rounded-full h-1.5 mt-1.5 cursor-help bg-monarch-border">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${progressPercent}%`, backgroundColor: getStatusStyles(displayStatus, item.is_enabled).color }}
                />
              </div>
            </Tooltip>
            <div className="text-xs mt-0.5 text-monarch-text-light">
              {formatCurrency(Math.max(0, item.amount - item.current_balance), { maximumFractionDigits: 0 })} to go
            </div>
          </>
        )}
      </td>
      <td className={`${rowPadding} px-4 text-right w-28 ${contentOpacity}`}>
        {item.is_enabled ? (
          <div className="flex justify-end">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 font-medium text-monarch-text-dark">
                $
              </span>
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={handleBudgetKeyDown}
                onBlur={handleBudgetSubmit}
                onFocus={(e) => e.target.select()}
                className="w-24 pl-6 pr-2 py-1 text-right rounded font-medium text-monarch-text-dark bg-monarch-bg-card border border-monarch-border font-inherit"
              />
            </div>
          </div>
        ) : (
          <span className="font-medium text-monarch-text-muted">
            {formatCurrency(item.planned_budget, { maximumFractionDigits: 0 })}
          </span>
        )}
      </td>
      <td className={`${rowPadding} px-5 text-center w-24`}>
        {isCritical && !showAllocateConfirm ? (
          <Tooltip content="Click to allocate funds">
            <button
              onClick={() => setShowAllocateConfirm(true)}
              className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer bg-monarch-error-bg text-monarch-error"
            >
              Off Track
            </button>
          </Tooltip>
        ) : isCritical && showAllocateConfirm ? (
          <div className="flex items-center gap-1 justify-center">
            <button
              onClick={handleAllocate}
              disabled={isAllocating}
              className="px-2 py-1 text-xs font-medium rounded text-white disabled:opacity-50 transition-colors bg-monarch-success"
            >
              {isAllocating ? '...' : 'Allocate'}
            </button>
            <button
              onClick={() => setShowAllocateConfirm(false)}
              className="px-2 py-1 text-xs font-medium rounded transition-colors bg-monarch-bg-page text-monarch-text-dark"
            >
              ✕
            </button>
          </div>
        ) : (
          <span
            className="inline-flex px-2.5 py-1 text-xs font-medium rounded-full"
            style={{
              backgroundColor: getStatusStyles(displayStatus, item.is_enabled).bg,
              color: getStatusStyles(displayStatus, item.is_enabled).color,
            }}
          >
            {getStatusLabel(displayStatus, item.is_enabled)}
          </span>
        )}
      </td>
      <td className={`${rowPadding} px-3 w-12`}>
        {item.is_enabled ? (
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
        ) : (
          onAddToRollup && (
            <Tooltip content="Add to rollover">
              <button
                onClick={handleAddToRollup}
                disabled={isAddingToRollup}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all opacity-0 group-hover:opacity-100 hover:bg-black/10 disabled:opacity-50"
              >
                {isAddingToRollup ? (
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--monarch-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                )}
              </button>
            </Tooltip>
          )
        )}
      </td>
    </tr>
  );
}
