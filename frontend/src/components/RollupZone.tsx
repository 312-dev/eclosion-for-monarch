/**
 * Rollup Zone
 *
 * Collapsible section for the rollup category containing multiple
 * smaller recurring items combined into a single budget category.
 */

import { useState, useEffect, useCallback } from 'react';
import type { RollupData } from '../types';
import { EmojiPicker } from './EmojiPicker';
import { Tooltip } from './ui/Tooltip';
import { calculateDisplayStatus } from '../utils';
import { ChevronRightIcon, HelpIcon } from './icons';
import { UI } from '../constants';
import { RollupStats, RollupNameEditor, RollupItemsTable } from './rollup';

interface RollupZoneProps {
  readonly rollup: RollupData;
  readonly onRemoveItem: (id: string) => Promise<void>;
  readonly onBudgetChange: (amount: number) => Promise<void>;
  readonly onEmojiChange: (emoji: string) => Promise<void>;
  readonly onNameChange: (name: string) => Promise<void>;
}

const ROLLUP_COLLAPSED_KEY = 'rollup-collapsed';
const DEFAULT_ROLLUP_NAME = 'Rollup Category';

/**
 * Format a number with commas for display. Returns empty string for 0.
 */
function formatWithCommas(value: number): string {
  if (value === 0) return '';
  return Math.ceil(value).toLocaleString('en-US');
}

/**
 * Parse a formatted string (with commas) back to a number.
 */
function parseFormatted(value: string): number {
  const digitsOnly = value.replaceAll(/\D/g, '');
  if (digitsOnly === '') return 0;
  return Number.parseInt(digitsOnly, 10);
}

export function RollupZone({
  rollup,
  onRemoveItem,
  onBudgetChange,
  onEmojiChange,
  onNameChange,
}: RollupZoneProps) {
  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = sessionStorage.getItem(ROLLUP_COLLAPSED_KEY);
    return saved === 'true';
  });

  // Budget state
  const [budgetValue, setBudgetValue] = useState(formatWithCommas(rollup.budgeted));
  const [isUpdatingBudget, setIsUpdatingBudget] = useState(false);

  // Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(rollup.category_name || DEFAULT_ROLLUP_NAME);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Flip animation state
  const [showAlternateName, setShowAlternateName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);

  // Flip animation effect
  useEffect(() => {
    if (isHoveringName || isEditingName) return;
    const interval = setInterval(() => {
      setShowAlternateName((prev) => !prev);
    }, UI.INTERVAL.FLIP_ANIMATION);
    return () => clearInterval(interval);
  }, [isHoveringName, isEditingName]);

  // Sync budget value with prop
  useEffect(() => {
    setBudgetValue(formatWithCommas(rollup.budgeted));
  }, [rollup.budgeted]);

  // Sync name value with prop
  useEffect(() => {
    setNameValue(rollup.category_name || DEFAULT_ROLLUP_NAME);
  }, [rollup.category_name]);

  // Budget handlers
  const handleBudgetSubmit = useCallback(async () => {
    const parsedAmount = parseFormatted(budgetValue);
    const newAmount = Math.ceil(parsedAmount);
    setBudgetValue(formatWithCommas(newAmount));
    if (newAmount !== rollup.budgeted) {
      setIsUpdatingBudget(true);
      try {
        await onBudgetChange(newAmount);
      } finally {
        setIsUpdatingBudget(false);
      }
    }
  }, [budgetValue, rollup.budgeted, onBudgetChange]);

  const handleBudgetReset = useCallback(() => {
    setBudgetValue(formatWithCommas(rollup.budgeted));
  }, [rollup.budgeted]);

  // Name handlers
  const handleNameSubmit = useCallback(async () => {
    const trimmedName = nameValue.trim();
    const currentName = rollup.category_name || DEFAULT_ROLLUP_NAME;
    if (trimmedName && trimmedName !== currentName) {
      setIsUpdatingName(true);
      try {
        await onNameChange(trimmedName);
      } catch (err) {
        setNameValue(currentName);
        throw err;
      } finally {
        setIsUpdatingName(false);
        setIsEditingName(false);
      }
    } else {
      setNameValue(currentName);
      setIsEditingName(false);
    }
  }, [nameValue, rollup.category_name, onNameChange]);

  const handleNameCancel = useCallback(() => {
    setNameValue(rollup.category_name || DEFAULT_ROLLUP_NAME);
    setIsEditingName(false);
  }, [rollup.category_name]);

  // Collapse toggle
  const toggleCollapsed = useCallback(() => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    sessionStorage.setItem(ROLLUP_COLLAPSED_KEY, String(newState));
  }, [isCollapsed]);

  // Calculated values
  const totalMonthly = rollup.total_frozen_monthly;
  const totalStable = rollup.total_ideal_rate;

  const anyCatchingUp = rollup.items.some(
    (item) => item.frozen_monthly_target > item.ideal_monthly_rate
  );
  const anyAhead = rollup.items.some(
    (item) => item.frozen_monthly_target < item.ideal_monthly_rate && item.frozen_monthly_target > 0
  );

  const rollupStatus = calculateDisplayStatus({
    frozen_monthly_target: totalMonthly,
    ideal_monthly_rate: totalStable,
    planned_budget: rollup.budgeted,
    total_saved: rollup.total_saved,
    total_target: rollup.total_target,
    status: 'on_track',
  });

  return (
    <div className="mb-6 rounded-xl shadow-sm overflow-hidden bg-monarch-bg-card border border-monarch-border">
      {/* Header with stats */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!isCollapsed}
        aria-label={`Rollup category section. ${isCollapsed ? 'Click to expand' : 'Click to collapse'}`}
        className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none ${rollupStatus === 'funded' || rollupStatus === 'on_track' ? 'bg-(--monarch-success-bg)' : 'bg-monarch-orange-light'} ${isCollapsed ? '' : 'border-b border-monarch-border'} relative`}
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
      >
        <Tooltip content="A shared bucket for smaller recurring expenses not worth a dedicated category">
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 p-0.5 rounded hover:bg-black/5 transition-colors cursor-help flex items-center justify-center"
            aria-label="Rollup category info"
          >
            <HelpIcon size={14} color="var(--monarch-text-muted)" aria-hidden="true" />
          </button>
        </Tooltip>
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapsed();
            }}
            className="p-0.5 rounded hover:bg-black/5 transition-colors self-start mt-1"
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
          <span onClick={(e) => e.stopPropagation()} className="self-start mt-0.5">
            <EmojiPicker currentEmoji={rollup.emoji || '🔄'} onSelect={onEmojiChange} />
          </span>
          <RollupNameEditor
            isEditing={isEditingName}
            nameValue={nameValue}
            currentName={rollup.category_name || DEFAULT_ROLLUP_NAME}
            isUpdating={isUpdatingName}
            showAlternateName={showAlternateName}
            isHovering={isHoveringName}
            onStartEdit={() => setIsEditingName(true)}
            onNameChange={setNameValue}
            onSubmit={handleNameSubmit}
            onCancel={handleNameCancel}
            onHoverStart={() => setIsHoveringName(true)}
            onHoverEnd={() => setIsHoveringName(false)}
          />
        </div>

        <RollupStats
          totalMonthly={totalMonthly}
          totalStable={totalStable}
          budgetValue={budgetValue}
          isUpdatingBudget={isUpdatingBudget}
          rollupStatus={rollupStatus}
          anyCatchingUp={anyCatchingUp}
          anyAhead={anyAhead}
          onBudgetValueChange={setBudgetValue}
          onBudgetSubmit={handleBudgetSubmit}
          onBudgetReset={handleBudgetReset}
          onFocus={() => setIsHoveringName(false)}
        />
      </div>

      {/* Collapsible content - Items Table */}
      {!isCollapsed && (
        <div className="animate-expand">
          <RollupItemsTable items={rollup.items} onRemoveItem={onRemoveItem} />
        </div>
      )}
    </div>
  );
}
