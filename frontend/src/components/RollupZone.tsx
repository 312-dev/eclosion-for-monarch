import React, { memo, useState, useRef, useEffect, useCallback, useMemo, type KeyboardEvent } from 'react';
import type { RollupData, RollupItem } from '../types';
import { EmojiPicker } from './EmojiPicker';
import { Tooltip } from './ui/Tooltip';
import {
  formatCurrency,
  formatFrequency,
  formatDateRelative,
  calculateDisplayStatus,
} from '../utils';
import { MerchantIcon, StatusBadge, LoadingSpinner } from './ui';
import { TrendUpIcon, TrendDownIcon, XIcon, ExternalLinkIcon, ChevronRightIcon, PlusIcon } from './icons';
import { UI } from '../constants';

interface RollupZoneProps {
  readonly rollup: RollupData;
  readonly onRemoveItem: (id: string) => Promise<void>;
  readonly onBudgetChange: (amount: number) => Promise<void>;
  readonly onEmojiChange: (emoji: string) => Promise<void>;
  readonly onNameChange: (name: string) => Promise<void>;
}

const RollupItemRow = memo(function RollupItemRow({
  item,
  onRemove,
}: {
  readonly item: RollupItem;
  readonly onRemove: () => Promise<void>;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const isCatchingUp = item.frozen_monthly_target > item.ideal_monthly_rate;
  const isAhead = item.frozen_monthly_target < item.ideal_monthly_rate && item.frozen_monthly_target > 0;
  const { date, relative } = formatDateRelative(item.next_due_date);

  const handleRemove = useCallback(async () => {
    setIsRemoving(true);
    try {
      await onRemove();
    } finally {
      setIsRemoving(false);
    }
  }, [onRemove]);

  return (
    <tr className="group border-t border-monarch-border transition-colors">
      {/* Subscription name with logo */}
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <MerchantIcon logoUrl={item.logo_url} itemName={item.name} size="sm" />
          <a
            href={`https://app.monarchmoney.com/merchants/${item.merchant_id}?date=${new Date().toISOString().slice(0, 8)}01`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm truncate no-underline text-monarch-text-dark"
          >
            {item.name}
          </a>
        </div>
      </td>
      {/* Date column */}
      <td className="py-2 px-3 text-sm">
        <div className="text-monarch-text-dark">{date}</div>
        {relative && (
          <div className="text-xs text-monarch-text-light">
            {relative}
          </div>
        )}
      </td>
      {/* Amount */}
      <td className="py-2 px-3 text-right text-sm">
        <span className="text-monarch-text-dark">{formatCurrency(item.amount, { maximumFractionDigits: 0 })}</span>
      </td>
      {/* Monthly target with catch-up/ahead indicator */}
      <td className="py-2 px-3 text-right text-sm">
        <div className="flex items-center justify-end gap-1">
          {/* Catch-up indicator: red up arrow if frozen target > ideal rate */}
          {isCatchingUp && (
            <Tooltip content={
              <>
                <div className="font-medium">Catching Up</div>
                <div className="text-zinc-300">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-zinc-400 text-xs mt-1">After {date} payment</div>
              </>
            }>
              <span className="cursor-help text-monarch-error">
                <TrendUpIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          {/* Ahead indicator: green down arrow if frozen target < ideal rate */}
          {isAhead && (
            <Tooltip content={
              <>
                <div className="font-medium">Ahead of Schedule</div>
                <div className="text-zinc-300">{formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo → {formatCurrency(item.ideal_monthly_rate, { maximumFractionDigits: 0 })}/mo</div>
                <div className="text-zinc-400 text-xs mt-1">After {date} payment</div>
              </>
            }>
              <span className="cursor-help text-monarch-success">
                <TrendDownIcon size={10} strokeWidth={2.5} />
              </span>
            </Tooltip>
          )}
          <span className="text-monarch-text-dark">
            {formatCurrency(item.frozen_monthly_target, { maximumFractionDigits: 0 })}/mo
          </span>
        </div>
      </td>
      {/* Remove button */}
      <td className="py-2 px-3 text-center">
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label={`Remove ${item.name} from rollup`}
          aria-busy={isRemoving}
          className={`p-1 rounded transition-all disabled:opacity-50 hover-bg-transparent-to-hover ${isRemoving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
        >
          {isRemoving ? (
            <LoadingSpinner size="sm" color="var(--monarch-text-muted)" />
          ) : (
            <XIcon size={16} color="var(--monarch-text-muted)" aria-hidden="true" />
          )}
        </button>
      </td>
    </tr>
  );
});

const ROLLUP_COLLAPSED_KEY = 'rollup-collapsed';

const DEFAULT_ROLLUP_NAME = 'Rollup Category';

export function RollupZone({ rollup, onRemoveItem, onBudgetChange, onEmojiChange, onNameChange }: RollupZoneProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem(ROLLUP_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [budgetValue, setBudgetValue] = useState(Math.ceil(rollup.budgeted).toString());
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(rollup.category_name || DEFAULT_ROLLUP_NAME);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showAlternateName, setShowAlternateName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Flip animation: toggle between category name and "Rollover Category"
  // Pause when hovering or editing
  useEffect(() => {
    if (isHoveringName || isEditingName) {
      return;
    }
    const interval = setInterval(() => {
      setShowAlternateName(prev => !prev);
    }, UI.INTERVAL.FLIP_ANIMATION);
    return () => clearInterval(interval);
  }, [isHoveringName, isEditingName]);

  useEffect(() => {
    setBudgetValue(Math.ceil(rollup.budgeted).toString());
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

  const handleNameKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setNameValue(rollup.category_name || DEFAULT_ROLLUP_NAME);
      setIsEditingName(false);
    }
  }, [rollup.category_name]);

  const handleBudgetSubmit = useCallback(async () => {
    const parsedAmount = Number.parseFloat(budgetValue);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      // Reset to current value if invalid
      setBudgetValue(Math.ceil(rollup.budgeted).toString());
      return;
    }
    // Round up to nearest dollar
    const newAmount = Math.ceil(parsedAmount);
    setBudgetValue(newAmount.toString());
    if (newAmount !== rollup.budgeted) {
      setIsUpdatingBudget(true);
      try {
        await onBudgetChange(newAmount);
      } finally {
        setIsUpdatingBudget(false);
      }
    }
  }, [budgetValue, rollup.budgeted, onBudgetChange]);

  const handleBudgetKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setBudgetValue(Math.ceil(rollup.budgeted).toString());
      (e.target as HTMLInputElement).blur();
    }
  }, [rollup.budgeted]);

  const toggleCollapsed = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    sessionStorage.setItem(ROLLUP_COLLAPSED_KEY, String(newState));
  }, [isCollapsed]);

  // Use backend-calculated totals for consistency with per-item catch-up logic
  const totalAmount = rollup.total_target;
  const totalMonthly = rollup.total_frozen_monthly;
  const totalStable = rollup.total_ideal_rate;

  // Check if ANY item is catching up or ahead
  const anyCatchingUp = rollup.items.some(item => item.frozen_monthly_target > item.ideal_monthly_rate);
  const anyAhead = rollup.items.some(item => item.frozen_monthly_target < item.ideal_monthly_rate && item.frozen_monthly_target > 0);

  // Calculate rollup-level status based on budgeted vs total monthly need
  const rollupStatus = calculateDisplayStatus({
    frozen_monthly_target: totalMonthly,
    ideal_monthly_rate: totalStable,
    planned_budget: rollup.budgeted,
    status: 'on_track',
  });

  // Memoize frequency order constant
  const invertedFrequencyOrder = useMemo<Record<string, number>>(() => ({
    yearly: 1,
    semiyearly: 2,
    quarterly: 3,
    monthly: 4,
    twice_a_month: 5,
    every_two_weeks: 6,
    weekly: 7,
  }), []);

  // Memoize grouped items by frequency
  const groupedItems = useMemo(() => {
    return rollup.items.reduce((acc, item) => {
      const freq = item.frequency;
      if (!acc[freq]) acc[freq] = [];
      acc[freq].push(item);
      return acc;
    }, {} as Record<string, RollupItem[]>);
  }, [rollup.items]);

  // Memoize sorted frequency keys
  const sortedFrequencies = useMemo(() => {
    return Object.keys(groupedItems).sort(
      (a, b) => (invertedFrequencyOrder[a] || 99) - (invertedFrequencyOrder[b] || 99)
    );
  }, [groupedItems, invertedFrequencyOrder]);

  // Memoize sorted items per frequency group
  const sortedGroupedItems = useMemo(() => {
    const result: Record<string, RollupItem[]> = {};
    for (const freq of sortedFrequencies) {
      const items = groupedItems[freq];
      if (items) {
        result[freq] = [...items].sort((a, b) =>
          new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime()
        );
      }
    }
    return result;
  }, [groupedItems, sortedFrequencies]);

  // Memoize remove handler creator to maintain stable references
  const handleRemoveItem = useCallback((itemId: string) => {
    return () => onRemoveItem(itemId);
  }, [onRemoveItem]);

  return (
    <div className="mb-6 rounded-xl shadow-sm overflow-hidden bg-monarch-bg-card border border-monarch-border">
      {/* Header with stats */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={`Rollup category section. ${isCollapsed ? 'Click to expand' : 'Click to collapse'}`}
        className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none bg-monarch-orange-light ${isCollapsed ? '' : 'border-b border-monarch-border'}`}
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
      >
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleCollapsed(); }}
              className="p-0.5 rounded hover:bg-black/5 transition-colors"
              aria-label={isCollapsed ? 'Expand rollup items' : 'Collapse rollup items'}
              aria-expanded={!isCollapsed}
            >
              <ChevronRightIcon
                size={16}
                color="var(--monarch-text-muted)"
                className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}
                aria-hidden="true"
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
                aria-label="Rollup category name"
                className="font-medium px-1 py-0.5 rounded text-sm text-monarch-text-dark bg-monarch-bg-card border border-monarch-orange outline-none min-w-30"
              />
            ) : (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Rollup category name: ${rollup.category_name || DEFAULT_ROLLUP_NAME}. Press Enter to edit`}
                  className="font-medium cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded -mx-1 grid text-monarch-text-dark"
                  style={{ perspective: '400px' }}
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
                <span className="text-xs text-monarch-text-muted">
                  ({rollup.items.length})
                </span>
                {rollup.category_id && (
                  <Tooltip content="View linked category in Monarch">
                    <a
                      href={`https://app.monarchmoney.com/categories/${rollup.category_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View linked category in Monarch (opens in new tab)"
                      className="shrink-0 hover:opacity-70 transition-opacity text-monarch-text-light"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLinkIcon size={12} aria-hidden="true" />
                    </a>
                  </Tooltip>
                )}
              </>
            )}
          </div>
          {!isCollapsed && (
            <span className="text-xs ml-7 text-monarch-text-muted">
              A shared bucket for smaller recurring expenses not worth a dedicated category
            </span>
          )}
        </div>

        {/* Stats in header */}
        <div className="flex items-start gap-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          <div className="text-center w-20 sm:w-24">
            <span className="text-xs text-monarch-text-muted">Monthly</span>
            <div className="h-8 font-medium flex items-center justify-center gap-1 text-monarch-text-dark">
              {anyCatchingUp && (
                <Tooltip content={
                  <>
                    <div className="font-medium">Catching Up</div>
                    <div className="text-zinc-300">{formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo → {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo</div>
                    <div className="text-zinc-400 text-xs mt-1">Rate normalizes as billing cycles complete</div>
                  </>
                }>
                  <span className="cursor-help text-monarch-error">
                    <TrendUpIcon size={12} strokeWidth={2.5} />
                  </span>
                </Tooltip>
              )}
              {!anyCatchingUp && anyAhead && (
                <Tooltip content={
                  <>
                    <div className="font-medium">Ahead of Schedule</div>
                    <div className="text-zinc-300">{formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}/mo → {formatCurrency(totalStable, { maximumFractionDigits: 0 })}/mo</div>
                    <div className="text-zinc-400 text-xs mt-1">Rate normalizes as billing cycles complete</div>
                  </>
                }>
                  <span className="cursor-help text-monarch-success">
                    <TrendDownIcon size={12} strokeWidth={2.5} />
                  </span>
                </Tooltip>
              )}
              {formatCurrency(totalMonthly, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center w-20 sm:w-24">
            <span className="text-xs text-monarch-text-muted">Budgeted</span>
            <div className="relative h-8 flex items-center">
              <span className="absolute left-2 font-medium text-monarch-text-dark">
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
                aria-label="Monthly budget amount for rollup category"
                aria-describedby={rollup.budgeted < Math.ceil(totalMonthly) ? 'rollup-budget-warning' : undefined}
                className={`w-20 sm:w-24 h-8 pl-5 pr-2 text-right rounded font-medium text-monarch-text-dark bg-monarch-bg-card font-inherit border ${rollup.budgeted < Math.ceil(totalMonthly) ? 'border-monarch-warning' : 'border-monarch-border'}`}
                min="0"
                step="1"
              />
            </div>
            {rollup.budgeted < Math.ceil(totalMonthly) && (
              <div id="rollup-budget-warning" className="text-[10px] mt-0.5 text-monarch-warning" role="alert">
                need {formatCurrency(Math.ceil(totalMonthly), { maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
          <div className="text-center w-20 sm:w-24">
            <span className="text-xs text-monarch-text-muted">Total Cost</span>
            <div className="h-8 font-medium flex items-center justify-center text-monarch-text-dark">
              {formatCurrency(totalAmount, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="text-center">
            <span className="text-xs text-monarch-text-muted">Status</span>
            <div className="h-8 flex items-center justify-center">
              <StatusBadge status={rollupStatus} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible content - Items Table */}
      {!isCollapsed && (
        <div className="animate-expand">
          {rollup.items.length > 0 ? (
            <table className="w-full animate-fade-in">
              <thead>
                <tr className="bg-monarch-bg-page border-b border-monarch-border">
                  <th className="py-2 px-3 text-left text-xs font-medium text-monarch-text-muted">
                    Recurring
                  </th>
                  <th className="py-2 px-3 text-left text-xs font-medium text-monarch-text-muted">
                    Date
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-monarch-text-muted">
                    Total Cost
                  </th>
                  <th className="py-2 px-3 text-right text-xs font-medium text-monarch-text-muted">
                    Monthly Set-aside
                  </th>
                  <th className="py-2 px-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {sortedFrequencies.map((frequency) => {
                  const frequencyItems = sortedGroupedItems[frequency];
                  if (!frequencyItems) return null;
                  return (
                    <React.Fragment key={frequency}>
                      <tr>
                        <td
                          colSpan={5}
                          className="py-1 px-3 text-[10px] font-medium uppercase tracking-wide bg-monarch-bg-hover text-monarch-text-muted"
                        >
                          {formatFrequency(frequency)}
                        </td>
                      </tr>
                      {frequencyItems.map((item) => (
                        <RollupItemRow
                          key={item.id}
                          item={item}
                          onRemove={handleRemoveItem(item.id)}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-8 text-center text-monarch-text-muted">
              <PlusIcon size={32} strokeWidth={1.5} className="mx-auto mb-2" />
              <p className="text-sm">Use the "Add to rollup" action on recurring items to add them here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
