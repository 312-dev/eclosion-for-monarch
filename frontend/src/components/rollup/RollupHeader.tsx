/**
 * RollupHeader - Header section of the RollupZone component
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { RollupData } from '../../types';
import { EmojiPicker } from '../EmojiPicker';
import { Tooltip } from '../Tooltip';
import { formatCurrency, calculateDisplayStatus } from '../../utils';
import { StatusBadge } from '../ui';
import { TrendUpIcon, TrendDownIcon, ExternalLinkIcon, ChevronRightIcon } from '../icons';

const DEFAULT_ROLLUP_NAME = 'Rollup Category';

interface RollupHeaderProps {
  readonly rollup: RollupData;
  readonly isCollapsed: boolean;
  readonly onToggleCollapsed: () => void;
  readonly onEmojiChange: (emoji: string) => Promise<void>;
  readonly onNameChange: (name: string) => Promise<void>;
  readonly onBudgetChange: (amount: number) => Promise<void>;
  readonly totalMonthly: number;
  readonly totalStable: number;
  readonly totalAmount: number;
  readonly anyCatchingUp: boolean;
  readonly anyAhead: boolean;
}

export function RollupHeader({
  rollup,
  isCollapsed,
  onToggleCollapsed,
  onEmojiChange,
  onNameChange,
  onBudgetChange,
  totalMonthly,
  totalStable,
  totalAmount,
  anyCatchingUp,
  anyAhead,
}: RollupHeaderProps) {
  const [budgetValue, setBudgetValue] = useState(rollup.budgeted.toString());
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(rollup.category_name || DEFAULT_ROLLUP_NAME);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showAlternateName, setShowAlternateName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Flip animation: toggle between category name and "Rollover Category" every 10 seconds
  // Pause when hovering or editing
  useEffect(() => {
    if (isHoveringName || isEditingName) {
      return;
    }
    const interval = setInterval(() => {
      setShowAlternateName(prev => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, [isHoveringName, isEditingName]);

  useEffect(() => {
    setBudgetValue(rollup.budgeted.toString());
  }, [rollup.budgeted]);

  useEffect(() => {
    setNameValue(rollup.category_name || DEFAULT_ROLLUP_NAME);
  }, [rollup.category_name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = useCallback(async () => {
    const trimmedName = nameValue.trim();
    const currentName = rollup.category_name || DEFAULT_ROLLUP_NAME;
    if (trimmedName && trimmedName !== currentName) {
      setIsUpdatingName(true);
      try {
        await onNameChange(trimmedName);
      } catch (err) {
        // Reset to current name on error, let parent handle toast
        setNameValue(currentName);
        throw err; // Re-throw so parent can show toast
      } finally {
        setIsUpdatingName(false);
        setIsEditingName(false);
      }
    } else {
      setNameValue(currentName);
      setIsEditingName(false);
    }
  }, [nameValue, rollup.category_name, onNameChange]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setNameValue(rollup.category_name || DEFAULT_ROLLUP_NAME);
      setIsEditingName(false);
    }
  }, [rollup.category_name]);

  const handleBudgetSubmit = useCallback(async () => {
    const newAmount = Number.parseFloat(budgetValue);
    if (!Number.isNaN(newAmount) && newAmount >= 0 && newAmount !== rollup.budgeted) {
      setIsUpdatingBudget(true);
      try {
        await onBudgetChange(newAmount);
      } finally {
        setIsUpdatingBudget(false);
      }
    } else {
      // Reset to current value if invalid or unchanged
      setBudgetValue(rollup.budgeted.toString());
    }
  }, [budgetValue, rollup.budgeted, onBudgetChange]);

  const handleBudgetKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetValue(rollup.budgeted.toString());
      (e.target as HTMLInputElement).blur();
    }
  }, [rollup.budgeted]);

  // Calculate rollup-level status based on budgeted vs total monthly need
  const rollupStatus = calculateDisplayStatus({
    frozen_monthly_target: totalMonthly,
    ideal_monthly_rate: totalStable,
    planned_budget: rollup.budgeted,
    status: 'on_track',
  });

  return (
    <div
      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none"
      style={{ backgroundColor: 'var(--monarch-orange-light)', borderBottom: isCollapsed ? 'none' : '1px solid var(--monarch-border)' }}
      onClick={onToggleCollapsed}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapsed(); }}
            className="p-0.5 rounded hover:bg-black/5 transition-colors"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronRightIcon
              size={16}
              color="var(--monarch-text-muted)"
              className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}
            />
          </button>
          <span onClick={(e) => e.stopPropagation()}>
            <EmojiPicker
              currentEmoji={rollup.emoji || '🔄'}
              onSelect={onEmojiChange}
            />
          </span>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              disabled={isUpdatingName}
              onClick={(e) => e.stopPropagation()}
              className="font-medium px-1 py-0.5 rounded text-sm"
              style={{
                color: 'var(--monarch-text-dark)',
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-orange)',
                outline: 'none',
                minWidth: '120px',
              }}
            />
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                className="font-medium cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded -mx-1 grid"
                style={{ color: 'var(--monarch-text-dark)', perspective: '400px' }}
                onClick={(e) => e.stopPropagation()}
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
                onMouseEnter={() => setIsHoveringName(true)}
                onMouseLeave={() => setIsHoveringName(false)}
                onTouchEnd={() => setIsHoveringName(false)}
                title="Double-click to rename"
              >
                <span
                  className="col-start-1 row-start-1 transition-all duration-500"
                  style={{
                    transform: showAlternateName && !isHoveringName ? 'rotateX(90deg)' : 'rotateX(0deg)',
                    opacity: showAlternateName && !isHoveringName ? 0 : 1,
                  }}
                >
                  {rollup.category_name || DEFAULT_ROLLUP_NAME}
                </span>
                <span
                  className="col-start-1 row-start-1 transition-all duration-500 whitespace-nowrap"
                  style={{
                    transform: showAlternateName && !isHoveringName ? 'rotateX(0deg)' : 'rotateX(-90deg)',
                    opacity: showAlternateName && !isHoveringName ? 1 : 0,
                  }}
                >
                  Rollup Category
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
                ({rollup.items.length})
              </span>
              {rollup.category_id && (
                <Tooltip content="View linked category in Monarch">
                  <a
                    href={`https://app.monarchmoney.com/categories/${rollup.category_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--monarch-text-light)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLinkIcon size={12} />
                  </a>
                </Tooltip>
              )}
            </>
          )}
        </div>
        {!isCollapsed && (
          <span className="text-xs ml-7" style={{ color: 'var(--monarch-text-muted)' }}>
            A shared bucket for smaller recurring expenses not worth a dedicated category
          </span>
        )}
      </div>

      {/* Stats in header */}
      <div className="flex items-start gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="text-center w-20 sm:w-24">
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>Monthly</span>
          <div className="h-8 font-medium flex items-center justify-center gap-1" style={{ color: 'var(--monarch-text-dark)' }}>
            {anyCatchingUp && (
              <Tooltip content={`Catching up: ${formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo now -> ${formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo steady rate as items complete their billing cycles`}>
                <span className="cursor-help" style={{ color: 'var(--monarch-error)' }}>
                  <TrendUpIcon size={12} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {!anyCatchingUp && anyAhead && (
              <Tooltip content={`Ahead: ${formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo now -> ${formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo steady rate as items complete their billing cycles`}>
                <span className="cursor-help" style={{ color: 'var(--monarch-success)' }}>
                  <TrendDownIcon size={12} strokeWidth={2.5} />
                </span>
              </Tooltip>
            )}
            {formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="text-center w-20 sm:w-24">
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>Budgeted</span>
          <div className="relative h-8 flex items-center">
            <span
              className="absolute left-2 font-medium"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              $
            </span>
            <input
              ref={inputRef}
              type="number"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              onBlur={handleBudgetSubmit}
              onKeyDown={handleBudgetKeyDown}
              onFocus={(e) => { e.target.select(); setIsHoveringName(false); }}
              disabled={isUpdatingBudget}
              className="w-20 sm:w-24 h-8 pl-5 pr-2 text-right rounded font-medium"
              style={{
                color: 'var(--monarch-text-dark)',
                border: `1px solid ${rollup.budgeted < totalMonthly ? 'var(--monarch-warning)' : 'var(--monarch-border)'}`,
                backgroundColor: 'var(--monarch-bg-card)',
                fontFamily: 'inherit',
              }}
              min="0"
              step="1"
            />
          </div>
          {rollup.budgeted < totalMonthly && (
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--monarch-warning)' }}>
              need {formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
        <div className="text-center w-20 sm:w-24">
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>Total Cost</span>
          <div className="h-8 font-medium flex items-center justify-center" style={{ color: 'var(--monarch-text-dark)' }}>
            {formatCurrency(totalAmount, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="text-center">
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>Status</span>
          <div className="h-8 flex items-center justify-center">
            <StatusBadge status={rollupStatus} size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
}
