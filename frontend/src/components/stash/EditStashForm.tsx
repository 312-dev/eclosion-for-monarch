/**
 * EditStashForm Component
 *
 * Form content for editing a stash.
 * Uses the same layout pattern as NewStashForm for consistency.
 */

import { useState, useMemo, useCallback } from 'react';
import { useStashConfigQuery } from '../../api/queries';
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
} from './StashFormFields';
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
  readonly renderFooter: (props: {
    isArchived: boolean;
    isDisabled: boolean;
    isSubmitting: boolean;
    onArchive: () => void;
    onDelete: () => void;
    onSaveAndRestore: () => void;
    onSubmit: () => void;
  }) => React.ReactNode;
}

export function EditStashForm({ item, onSuccess, onClose, renderFooter }: EditStashFormProps) {
  const toast = useToast();
  const isRateLimited = useIsRateLimited();
  const { data: stashConfig } = useStashConfigQuery();

  // Initialize form state from item
  const [name, setName] = useState(item.name);
  const [url, setUrl] = useState(item.source_url || '');
  const [amount, setAmount] = useState(item.amount.toString());
  const [targetDate, setTargetDate] = useState(getInitialTargetDate(item));
  const [emoji, setEmoji] = useState(item.emoji || '');
  const [customImagePath, setCustomImagePath] = useState<string | null>(
    item.custom_image_path || null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryMissingItemId, setCategoryMissingItemId] = useState<string | null>(null);
  const [goalType, setGoalType] = useState<StashGoalType>(item.goal_type ?? 'one_time');
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);

  const monthlyTarget = useMemo(() => {
    const amountNum = Number.parseFloat(amount) || 0;
    const isValid = amountNum > 0 && targetDate;
    // Use current_balance minus planned_budget so inflows reduce target but budget doesn't
    const effectiveBalance = item.current_balance - item.planned_budget;
    return isValid ? calculateStashMonthlyTarget(amountNum, effectiveBalance, targetDate) : 0;
  }, [amount, targetDate, item.current_balance, item.planned_budget]);

  const handleImageUploaded = useCallback((imagePath: string) => setCustomImagePath(imagePath), []);
  const handleImageRemoved = useCallback(() => setCustomImagePath(null), []);

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
      goal_type: goalType,
    }),
    [name, amount, targetDate, emoji, url, customImagePath, goalType]
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
    buildUpdates,
    validateForm,
    onCategoryMissing: handleCategoryMissing,
    onSuccess,
    onClose,
  });

  const isDisabled = isSubmitting || isRateLimited;

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
            <span className="py-2" style={{ color: 'var(--monarch-text-muted)' }}>
              I intend to save
            </span>
            <AmountInput id="edit-stash-amount" value={amount} onChange={setAmount} hideLabel />
            <span className="py-2" style={{ color: 'var(--monarch-text-muted)' }}>
              {goalType === 'one_time' ? 'for a' : 'as a'}
            </span>
            <div className="basis-full h-0" />
            <GoalTypeSelector value={goalType} onChange={setGoalType} hideLabel />
            <span className="py-2" style={{ color: 'var(--monarch-text-muted)' }}>
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

      <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-(--monarch-border)">
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
    </>
  );
}
