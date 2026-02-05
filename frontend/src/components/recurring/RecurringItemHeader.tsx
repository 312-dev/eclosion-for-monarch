/**
 * RecurringItemHeader - Header section with icon, name, and category
 *
 * Displays merchant icon with status toggle, emoji picker, editable name,
 * category link, and stale warning indicator.
 */

import React, { useState, useRef, useEffect } from 'react';
import type { RecurringItem, ItemStatus } from '../../types';
import { EmojiPicker } from '../EmojiPicker';
import { Tooltip } from '../ui/Tooltip';
import { Modal } from '../ui/Modal';
import { ModalFooter } from '../ui/ModalButtons';
import { MerchantIcon } from '../ui';
import { StaleWarningPopover } from './StaleWarningPopover';
import { CategoryGroupDropdown } from './CategoryGroupDropdown';
import { RecurringItemProgress } from './RecurringItemProgress';
import { EnableTrackingMenu } from './EnableTrackingMenu';
import { SpinnerIcon, BlockedIcon, RotateIcon } from '../icons';
import { decodeHtmlEntities, stripNameSuffix } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';

/** Avatar button that shows a disable icon on hover for tracked items. */
function DisableTrackingAvatar({
  item,
  isToggling,
  isDisabled,
  onDisable,
}: {
  item: RecurringItem;
  isToggling: boolean;
  isDisabled: boolean;
  onDisable: () => void;
}) {
  const tooltipText = item.category_missing
    ? 'Category missing - click to disable'
    : 'Click to disable tracking';

  return (
    <Tooltip content={tooltipText}>
      <button
        onClick={onDisable}
        disabled={isDisabled}
        aria-label="Disable tracking"
        className="group/avatar relative shrink-0 w-12 h-12 rounded-full cursor-pointer disabled:opacity-50"
      >
        <div className="group-hover/avatar:opacity-30 transition-opacity">
          <MerchantIcon logoUrl={item.logo_url} itemName={item.name} size="lg" />
        </div>
        {isToggling ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <SpinnerIcon size={20} color="var(--monarch-orange)" strokeWidth={2} />
          </div>
        ) : (
          <div className="absolute inset-0 hidden group-hover/avatar:flex items-center justify-center">
            <BlockedIcon size={22} color="var(--monarch-text-muted)" strokeWidth={2} />
          </div>
        )}
      </button>
    </Tooltip>
  );
}

/** Renders the inline action icon (recreate, emoji picker, or nothing) next to the name. */
function InlineActionIcon({
  showRecreate,
  isEditable,
  isRecreating,
  isRateLimited,
  onRecreate,
  onEmojiChange,
  currentEmoji,
}: {
  showRecreate: boolean;
  isEditable: boolean;
  isRecreating: boolean;
  isRateLimited: boolean;
  onRecreate?: () => Promise<void>;
  onEmojiChange: (emoji: string) => Promise<void>;
  currentEmoji: string;
}) {
  if (showRecreate) {
    return (
      <Tooltip content="Recreate category">
        <button
          onClick={onRecreate}
          disabled={isRecreating || isRateLimited}
          aria-label="Recreate category"
          className="p-1 rounded text-monarch-warning hover:bg-black/5 transition-colors disabled:opacity-50"
        >
          {isRecreating ? (
            <SpinnerIcon size={16} color="var(--monarch-orange)" />
          ) : (
            <RotateIcon size={16} />
          )}
        </button>
      </Tooltip>
    );
  }
  if (isEditable) {
    return <EmojiPicker currentEmoji={currentEmoji} onSelect={onEmojiChange} />;
  }
  return null;
}

interface RecurringItemHeaderProps {
  readonly item: RecurringItem;
  readonly onToggle: () => Promise<void>;
  readonly onRecreate?: () => Promise<void>;
  readonly onLinkCategory: () => void;
  readonly onAddToRollup: (() => void) | undefined;
  readonly onEmojiChange: (emoji: string) => Promise<void>;
  readonly onNameChange: (name: string) => Promise<void>;
  readonly onChangeGroup: (groupId: string, groupName: string) => Promise<void>;
  readonly isToggling: boolean;
  readonly isRecreating?: boolean;
  readonly contentOpacity: string;
  readonly displayStatus: ItemStatus;
  readonly progressPercent: number;
  readonly showCategoryGroup?: boolean;
  readonly showProgress?: boolean;
}

export function RecurringItemHeader({
  item,
  onToggle,
  onRecreate,
  onLinkCategory,
  onAddToRollup,
  onEmojiChange,
  onNameChange,
  onChangeGroup,
  isToggling,
  isRecreating = false,
  contentOpacity,
  displayStatus,
  progressPercent,
  showCategoryGroup = true,
  showProgress = true,
}: RecurringItemHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isRateLimited = useIsRateLimited();

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
        await onNameChange(trimmedName);
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

  const isEditable = item.is_enabled && !item.category_missing;
  const showRecreate = item.is_enabled && item.category_missing && onRecreate;
  const alignItems =
    !item.is_enabled && showCategoryGroup && item.category_group_name
      ? 'items-start'
      : 'items-center';

  return (
    <div className={`flex gap-3 ${alignItems}`}>
      {item.is_enabled ? (
        <DisableTrackingAvatar
          item={item}
          isToggling={isToggling}
          isDisabled={isToggling || isRateLimited}
          onDisable={() => setShowDisableConfirm(true)}
        />
      ) : (
        <EnableTrackingMenu
          onCreateCategory={onToggle}
          onLinkCategory={onLinkCategory}
          onAddToRollup={onAddToRollup}
          isToggling={isToggling}
          isDisabled={isToggling || isRateLimited}
        />
      )}
      <div className={`flex flex-col flex-1 min-w-0 ${contentOpacity}`}>
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
              <InlineActionIcon
                showRecreate={!!showRecreate}
                isEditable={isEditable}
                isRecreating={isRecreating}
                isRateLimited={isRateLimited}
                onRecreate={onRecreate}
                onEmojiChange={onEmojiChange}
                currentEmoji={item.emoji || '🔄'}
              />
              <span
                role="button"
                tabIndex={0}
                className="font-medium truncate cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded text-monarch-text-dark"
                onDoubleClick={() => isEditable && setIsEditingName(true)}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isEditable) {
                    setIsEditingName(true);
                  }
                }}
                title={isEditable ? 'Double-click to rename' : undefined}
              >
                {decodeHtmlEntities(stripNameSuffix(item.name))}
              </span>
            </>
          )}
          {item.is_stale && <StaleWarningPopover />}
        </div>
        {showCategoryGroup && item.category_group_name && (
          <div className="text-sm truncate text-monarch-text-light pt-0.5">
            {isEditable ? (
              <CategoryGroupDropdown
                currentGroupName={item.category_group_name}
                onChangeGroup={onChangeGroup}
              />
            ) : (
              decodeHtmlEntities(item.category_group_name)
            )}
          </div>
        )}
        {showProgress && (
          <div className="mt-2">
            <RecurringItemProgress
              item={item}
              displayStatus={displayStatus}
              progressPercent={progressPercent}
            />
          </div>
        )}
      </div>
      <Modal
        isOpen={showDisableConfirm}
        onClose={() => setShowDisableConfirm(false)}
        title="Disable Tracking"
        maxWidth="sm"
        footer={
          <ModalFooter
            onCancel={() => setShowDisableConfirm(false)}
            onSubmit={async () => {
              await onToggle();
              setShowDisableConfirm(false);
            }}
            submitLabel="Disable"
            submitLoadingLabel="Disabling..."
            isSubmitting={isToggling}
            variant="warning"
          />
        }
      >
        <p className="text-sm" style={{ color: 'var(--monarch-text)' }}>
          Stop tracking <span className="font-medium">{decodeHtmlEntities(item.name)}</span>? It
          will move to the disabled section and won&apos;t affect your budget.
        </p>
      </Modal>
    </div>
  );
}
