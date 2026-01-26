/* eslint-disable sonarjs/no-nested-conditional */
/* eslint-disable max-lines */
/**
 * EditStashForm Component
 *
 * Form content for editing a stash.
 * Uses the same layout pattern as NewStashForm for consistency.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useModalFooter } from '../ui/Modal';
import { useStashConfigQuery, useAvailableToStash } from '../../api/queries';
import { StashCategoryModal, type CategorySelection } from './StashCategoryModal';
import { useToast } from '../../context/ToastContext';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { calculateStashMonthlyTarget } from '../../utils/savingsCalculations';
import { StashImageUpload } from './StashImageUpload';
import { EditStashProgress } from './EditStashProgress';
import { DeleteStashConfirmModal } from './DeleteStashConfirmModal';
import {
  NameInputWithEmoji,
  UrlDisplay,
  AmountInput,
  TargetDateInput,
  GoalTypeSelector,
  CategoryInfoDisplay,
  StartingBalanceInput,
} from './StashFormFields';
import { DebtAccountSelectorModal } from './DebtAccountSelectorModal';
import { useEditStashHandlers } from './useEditStashHandlers';
import type { StashItem, StashGoalType } from '../../types';

/** Validate form and return first error message or null if valid */
function getFormValidationError(name: string, amount: string, targetDate: string): string | null {
  if (!name.trim()) return 'Please enter a name';
  const amountNum = Number.parseFloat(amount);
  if (!amountNum || amountNum <= 0) return 'Please enter a valid amount';
  if (!targetDate) return 'Please select a target date';
  return null;
}

/** Get the target date, adjusting for archived items with past dates */
function getInitialTargetDate(item: StashItem): string {
  const today = new Date().toISOString().split('T')[0] ?? '';
  return item.is_archived && item.target_date < today ? today : item.target_date;
}

interface EditStashFormProps {
  readonly item: StashItem;
  readonly onSuccess?: (() => void) | undefined;
  readonly onClose: () => void;
  readonly onNameChange?: (name: string) => void;
  readonly renderFooter: (props: {
    isArchived: boolean;
    isDisabled: boolean;
    isSubmitting: boolean;
    onArchive: () => void | Promise<void>;
    onDelete: () => void;
    onSaveAndRestore: () => void | Promise<void>;
    onSubmit: () => void | Promise<void>;
  }) => React.ReactNode;
}

export function EditStashForm({
  item,
  onSuccess,
  onClose,
  onNameChange,
  renderFooter,
}: EditStashFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const renderInFooter = useModalFooter();
  const { data: stashConfig } = useStashConfigQuery();

  // Initialize form state from item
  const [name, setName] = useState(item.name);
  const [url, setUrl] = useState(item.source_url || '');

  // Notify parent when name changes for live title updates
  useEffect(() => {
    onNameChange?.(name);
  }, [name, onNameChange]);
  const [amount, setAmount] = useState(item.amount.toString());
  const [targetDate, setTargetDate] = useState(getInitialTargetDate(item));
  const [emoji, setEmoji] = useState(item.emoji || '');
  const [customImagePath, setCustomImagePath] = useState<string | null>(
    item.custom_image_path || null
  );
  const [imageAttribution, setImageAttribution] = useState<string | null>(
    item.image_attribution || null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryMissingItemId, setCategoryMissingItemId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<StashGoalType>(item.goal_type ?? 'one_time');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [isDebtSelectorOpen, setIsDebtSelectorOpen] = useState(false);

  // Starting balance - pre-populate with existing rollover amount
  const initialStartingBalance = item.rollover_amount ?? 0;
  const [startingBalance, setStartingBalance] = useState(
    initialStartingBalance > 0 ? initialStartingBalance.toString() : ''
  );
  const [isStartingBalanceFocused, setIsStartingBalanceFocused] = useState(false);

  // Get available to stash amount for validation
  // Use the same options as the widget so the numbers match
  const { data: availableData, isLoading: isLoadingAvailable } = useAvailableToStash({
    includeExpectedIncome: stashConfig?.includeExpectedIncome ?? false,
    bufferAmount: stashConfig?.bufferAmount ?? 0,
  });
  const startingBalanceNum = Number.parseInt(startingBalance, 10) || 0;
  const startingBalanceDelta = startingBalanceNum - initialStartingBalance;
  const availableAmount = availableData?.available;

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    const isValid = amountNum > 0 && targetDate;
    // Use current_balance minus planned_budget so inflows reduce target but budget doesn't
    // Also account for starting balance changes (delta from original)
    const effectiveBalance = item.current_balance - item.planned_budget + startingBalanceDelta;
    return isValid ? calculateStashMonthlyTarget(amountNum, effectiveBalance, targetDate) : 0;
  }, [amount, targetDate, item.current_balance, item.planned_budget, startingBalanceDelta]);

  const handleImageUploaded = useCallback((imagePath: string) => setCustomImagePath(imagePath), []);
  const handleImageRemoved = useCallback(() => {
    setCustomImagePath(null);
    setImageAttribution(null);
  }, []);
  const handleAttributionChange = useCallback(
    (attribution: string | null) => setImageAttribution(attribution),
    []
  );

  const handleCategoryMissing = useCallback(
    (itemId: string) => {
      setCategoryMissingItemId(itemId);
      setShowCategoryModal(true);
      toast.info('The linked category was deleted. Please select a new category.');
    },
    [toast]
  );

  const validateForm = useCallback((): boolean => {
    const error = getFormValidationError(name, amount, targetDate);
    if (error) {
      toast.error(error);
      return false;
    }
    return true;
  }, [name, amount, targetDate, toast]);

  const buildUpdates = useCallback(
    () => ({
      name: name.trim(),
      amount: Number.parseFloat(amount),
      target_date: targetDate,
      emoji: emoji || '💰',
      source_url: url.trim() || null,
      custom_image_path: customImagePath || null,
      image_attribution: imageAttribution || null,
      goal_type: goalType,
      // Starting balance change (delta from original) - handled separately via rollover API
      starting_balance_delta: startingBalanceDelta,
    }),
    [
      name,
      amount,
      targetDate,
      emoji,
      url,
      customImagePath,
      imageAttribution,
      goalType,
      startingBalanceDelta,
    ]
  );

  const {
    handleSubmit,
    handleSaveAndRestore,
    handleArchive,
    handleCategorySelection,
    handleDelete,
    handleComplete,
    handleUncomplete,
    isSubmitting,
    isLinkingCategory,
    isDeletingItem,
    isCompletingItem,
  } = useEditStashHandlers({
    itemId: item.id,
    isArchived: item.is_archived,
    categoryId: item.is_flexible_group ? null : item.category_id,
    flexibleGroupId: item.is_flexible_group ? item.category_group_id : null,
    buildUpdates,
    validateForm,
    onCategoryMissing: handleCategoryMissing,
    onSuccess,
    onClose,
  });

  // Starting balance validation - only block if INCREASING beyond what's available
  // If delta <= 0 (same or reducing), always allow since funds are already committed
  const isStartingBalanceOverAvailable =
    availableAmount !== undefined &&
    startingBalanceDelta > 0 &&
    startingBalanceDelta > availableAmount;

  const isDisabled = isSubmitting || isRateLimited || isStartingBalanceOverAvailable;

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const amountNum = Number.parseFloat(amount) || 0;

  const onCategoryConfirm = (selection: CategorySelection) =>
    handleCategorySelection(selection, categoryMissingItemId);
  const onCategoryClose = () => {
    setShowCategoryModal(false);
    setCategoryMissingItemId(null);
  };

  return (
    <>
      <div className="space-y-3">
        <div>
          <StashImageUpload
            itemId={item.id}
            currentImagePath={customImagePath}
            onImageUploaded={handleImageUploaded}
            onImageRemoved={handleImageRemoved}
            onAttributionChange={handleAttributionChange}
          />
          {item.logo_url && !customImagePath && (
            <p className="text-xs mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
              Using logo from source URL. Upload a custom image to override.
            </p>
          )}
        </div>

        <div>
          <NameInputWithEmoji
            id="edit-stash-name"
            value={name}
            onChange={setName}
            emoji={emoji}
            onEmojiChange={setEmoji}
            onFocusChange={setIsNameFocused}
          />
          {/* Aligned with text input (after emoji picker w-12 + gap-2) */}
          <div
            className={`pl-14 transition-all duration-200 overflow-hidden ${
              isNameFocused || url || isUrlModalOpen
                ? 'opacity-100 translate-y-0 mt-1 h-auto'
                : 'opacity-0 -translate-y-1 pointer-events-none h-0'
            }`}
          >
            <UrlDisplay value={url} onChange={setUrl} onModalOpenChange={setIsUrlModalOpen} />
          </div>
        </div>

        {/* Goal container - intention inputs + progress */}
        <div
          className="p-4 rounded-lg space-y-4"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          {/* Sentence-style intention input: "Save $[amount] as a [goal type] by [date]" */}
          <div className="flex items-center gap-x-2 gap-y-1 flex-wrap justify-center">
            <span
              className="h-10 inline-flex items-center"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              I intend to save
            </span>
            <AmountInput
              id="edit-stash-amount"
              value={amount}
              onChange={setAmount}
              hideLabel
              showSearchButton={goalType === 'debt'}
              onSearchClick={() => setIsDebtSelectorOpen(true)}
            />
            <span
              className="h-10 inline-flex items-center"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              {goalType === 'one_time' ? 'for a' : goalType === 'debt' ? 'towards a' : 'as a'}
            </span>
            <div className="basis-full h-0" />
            <GoalTypeSelector value={goalType} onChange={setGoalType} hideLabel />
            <span
              className="h-10 inline-flex items-center"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              by
            </span>
            <TargetDateInput
              id="edit-stash-date"
              value={targetDate}
              onChange={setTargetDate}
              minDate={today}
              quickPickOptions={[]}
              hideLabel
            />
            <div className="basis-full h-0" />
            <span
              className="h-10 inline-flex items-center self-start"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              with a
            </span>
            <StartingBalanceInput
              value={startingBalance}
              onChange={setStartingBalance}
              availableAmount={availableAmount}
              isLoading={isLoadingAvailable}
              isFocused={isStartingBalanceFocused}
              onFocusChange={setIsStartingBalanceFocused}
              initialValue={initialStartingBalance}
            />
            <span
              className="h-10 inline-flex items-center self-start"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              starting balance.
            </span>
          </div>

          {/* Progress section - edit-specific */}
          {amount && amountNum > 0 && targetDate && (
            <>
              <div className="border-t" style={{ borderColor: 'var(--monarch-border)' }} />
              <EditStashProgress
                item={item}
                goalAmount={amountNum}
                monthlyTarget={monthlyTarget}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                isCompletingItem={isCompletingItem}
                startingBalanceDelta={startingBalanceDelta}
                currentGoalType={goalType}
                targetDate={targetDate}
              />
            </>
          )}
        </div>

        {/* Category info - edit-specific */}
        {item.category_name && item.category_id && (
          <CategoryInfoDisplay
            categoryName={item.category_name}
            categoryId={item.category_id}
            {...(item.category_group_name && { categoryGroupName: item.category_group_name })}
          />
        )}
      </div>

      {/* Footer portaled to Modal's sticky footer area */}
      {renderInFooter(
        <div className="p-4 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          {renderFooter({
            isArchived: item.is_archived,
            isDisabled,
            isSubmitting,
            onArchive: handleArchive,
            onDelete: () => setShowDeleteModal(true),
            onSaveAndRestore: handleSaveAndRestore,
            onSubmit: handleSubmit,
          })}
        </div>
      )}

      <DeleteStashConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        item={item}
        isDeleting={isDeletingItem}
      />

      <StashCategoryModal
        isOpen={showCategoryModal}
        onClose={onCategoryClose}
        onConfirm={onCategoryConfirm}
        {...(stashConfig?.defaultCategoryGroupId && {
          defaultCategoryGroupId: stashConfig.defaultCategoryGroupId,
        })}
        isSubmitting={isLinkingCategory}
      />

      <DebtAccountSelectorModal
        isOpen={isDebtSelectorOpen}
        onClose={() => setIsDebtSelectorOpen(false)}
        onSelect={(account) => {
          setAmount(Math.abs(account.balance).toString());
        }}
      />
    </>
  );
}
