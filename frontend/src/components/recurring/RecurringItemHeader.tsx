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
import { MerchantIcon } from '../ui';
import { StaleWarningPopover } from './StaleWarningPopover';
import { CategoryGroupDropdown } from './CategoryGroupDropdown';
import { RecurringItemProgress } from './RecurringItemProgress';
import {
  SpinnerIcon,
  WarningFilledIcon,
  CheckFilledIcon,
  BlockedIcon,
  ExternalLinkIcon,
} from '../icons';
import { decodeHtmlEntities } from '../../utils';
import { useIsRateLimited } from '../../context/RateLimitContext';

interface RecurringItemHeaderProps {
  readonly item: RecurringItem;
  readonly onToggle: () => Promise<void>;
  readonly onEmojiChange: (emoji: string) => Promise<void>;
  readonly onNameChange: (name: string) => Promise<void>;
  readonly onChangeGroup: (groupId: string, groupName: string) => Promise<void>;
  readonly isToggling: boolean;
  readonly contentOpacity: string;
  readonly displayStatus: ItemStatus;
  readonly progressPercent: number;
  readonly showCategoryGroup?: boolean;
  readonly showProgress?: boolean;
}

export function RecurringItemHeader({
  item,
  onToggle,
  onEmojiChange,
  onNameChange,
  onChangeGroup,
  isToggling,
  contentOpacity,
  displayStatus,
  progressPercent,
  showCategoryGroup = true,
  showProgress = true,
}: RecurringItemHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(item.name);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
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

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        <MerchantIcon
          logoUrl={item.logo_url}
          itemName={item.name}
          size={item.is_enabled ? 'lg' : 'md'}
        />
        <Tooltip
          content={(() => {
            if (!item.is_enabled) {
              return 'Click to enable tracking';
            }
            if (item.category_missing) {
              return 'Category missing - click to disable';
            }
            return 'Click to disable tracking';
          })()}
        >
          <button
            onClick={onToggle}
            disabled={isToggling || isRateLimited}
            className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:opacity-80 disabled:opacity-50 bg-monarch-bg-card border border-monarch-border shadow-sm"
          >
            {(() => {
              if (isToggling) {
                return <SpinnerIcon size={12} color="var(--monarch-orange)" strokeWidth={2.5} />;
              }
              if (!item.is_enabled) {
                return (
                  <BlockedIcon size={12} color="var(--monarch-text-muted)" strokeWidth={2.5} />
                );
              }
              if (item.category_missing) {
                return <WarningFilledIcon size={12} color="var(--monarch-warning)" />;
              }
              return <CheckFilledIcon size={12} color="var(--monarch-success)" />;
            })()}
          </button>
        </Tooltip>
      </div>
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
              {item.is_enabled && (
                <EmojiPicker
                  currentEmoji={item.emoji || '🔄'}
                  onSelect={onEmojiChange}
                  disabled={item.category_missing}
                />
              )}
              <span
                role="button"
                tabIndex={0}
                className="font-medium truncate cursor-pointer hover:bg-black/5 px-1 py-0.5 rounded text-monarch-text-dark"
                onDoubleClick={() =>
                  item.is_enabled && !item.category_missing && setIsEditingName(true)
                }
                onKeyDown={(e) => {
                  if (
                    (e.key === 'Enter' || e.key === ' ') &&
                    item.is_enabled &&
                    !item.category_missing
                  ) {
                    setIsEditingName(true);
                  }
                }}
                title={
                  item.is_enabled && !item.category_missing ? 'Double-click to rename' : undefined
                }
              >
                {decodeHtmlEntities(item.name)}
              </span>
            </>
          )}
          {item.is_enabled && item.category_id && !item.category_missing && (
            <Tooltip content="View linked category in Monarch">
              <a
                href={`https://app.monarch.com/categories/${item.category_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-70! transition-opacity text-monarch-text-light"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon size={12} />
              </a>
            </Tooltip>
          )}
          {item.is_stale && <StaleWarningPopover />}
        </div>
        {showCategoryGroup && item.category_group_name && (
          <div className="text-sm truncate text-monarch-text-light pt-0.5">
            {item.is_enabled && !item.category_missing ? (
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
    </div>
  );
}
