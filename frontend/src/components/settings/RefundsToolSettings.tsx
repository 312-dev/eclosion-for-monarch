/**
 * Refunds Tool Settings
 *
 * Settings component for the Refunds feature.
 * Includes tag replacement, aging warning, and badge visibility settings.
 * Used by ToolSettingsModal from both the sidebar cog and the tool page header.
 */

import { useState, forwardRef, useCallback, useMemo } from 'react';
import { Undo2 } from 'lucide-react';
import { ToolSettingsHeader } from './ToolSettingsHeader';
import { SettingsRow } from './SettingsRow';
import { ToggleSwitch } from './ToggleSwitch';
import { SearchableSelect } from '../SearchableSelect';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import {
  useRefundsConfigQuery,
  useRefundsTagsQuery,
  useUpdateRefundsConfigMutation,
} from '../../api/queries';

interface RefundsToolSettingsProps {
  defaultExpanded?: boolean;
  variant?: 'page' | 'modal';
}

export const RefundsToolSettings = forwardRef<HTMLDivElement, RefundsToolSettingsProps>(
  function RefundsToolSettings({ defaultExpanded = false, variant = 'page' }, ref) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const toggleExpanded = useCallback(() => setIsExpanded((prev) => !prev), []);

    const { data: config } = useRefundsConfigQuery();
    const { data: tags = [], isLoading: tagsLoading } = useRefundsTagsQuery();
    const updateConfig = useUpdateRefundsConfigMutation();

    const showBadge = config?.showBadge ?? true;
    const replacementTagId = config?.replacementTagId ?? '';
    const replaceByDefault = config?.replaceTagByDefault ?? true;
    const agingWarningDays = config?.agingWarningDays ?? 30;
    const hideMatched = config?.hideMatchedTransactions ?? false;
    const hideExpected = config?.hideExpectedTransactions ?? false;

    const handleToggleBadge = useCallback(() => {
      updateConfig.mutate({ showBadge: !showBadge });
    }, [showBadge, updateConfig]);

    const handleReplacementTagChange = useCallback(
      (value: string) => {
        updateConfig.mutate({ replacementTagId: value || null });
      },
      [updateConfig]
    );

    const handleReplaceByDefaultChange = useCallback(() => {
      updateConfig.mutate({ replaceTagByDefault: !replaceByDefault });
    }, [replaceByDefault, updateConfig]);

    const handleAgingWarningChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const days = Math.max(0, Math.min(365, Number(e.target.value) || 0));
        updateConfig.mutate({ agingWarningDays: days });
      },
      [updateConfig]
    );

    const handleToggleHideMatched = useCallback(() => {
      updateConfig.mutate({ hideMatchedTransactions: !hideMatched });
    }, [hideMatched, updateConfig]);

    const handleToggleHideExpected = useCallback(() => {
      updateConfig.mutate({ hideExpectedTransactions: !hideExpected });
    }, [hideExpected, updateConfig]);

    const tagOptions = useMemo(
      () => [
        { value: '', label: 'None (remove tag)', icon: undefined },
        ...tags.map((tag) => ({
          value: tag.id,
          label: tag.name,
          icon: (
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: tag.color }}
            />
          ),
        })),
      ],
      [tags]
    );

    const containerClass =
      variant === 'modal' ? 'overflow-hidden' : 'sm:rounded-xl overflow-hidden';
    const containerStyle =
      variant === 'modal'
        ? {}
        : {
            backgroundColor: 'var(--monarch-bg-card)',
            border: '1px solid var(--monarch-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          };

    const showSettings = variant === 'modal' || isExpanded;

    return (
      <div ref={ref} className={containerClass} style={containerStyle}>
        {variant === 'page' && (
          <ToolSettingsHeader
            icon={<Undo2 size={20} />}
            title="Refunds"
            description="Track purchases awaiting refunds or reimbursements"
            isActive={true}
            isExpanded={isExpanded}
            onToggle={toggleExpanded}
          />
        )}

        {showSettings && (
          <div
            style={
              variant === 'page'
                ? { borderTop: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }
                : {}
            }
          >
            {/* Tag replacement */}
            <div
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
            >
              <div className="text-sm mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
                Tag replacement
              </div>
              <div className="text-xs mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
                When a refund is matched, replace or remove the original tag
              </div>
              {tagsLoading ? (
                <div className="flex items-center gap-2 py-1">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-(--monarch-text-muted)">Loading tags...</span>
                </div>
              ) : (
                <SearchableSelect
                  value={replacementTagId}
                  onChange={handleReplacementTagChange}
                  options={tagOptions}
                  placeholder="Select a tag..."
                  aria-label="Replacement tag"
                  insideModal={variant === 'modal'}
                />
              )}
            </div>

            {/* Replace by default */}
            <SettingsRow
              label={`${replacementTagId ? 'Replace' : 'Remove'} tag by default`}
              description={`The tag ${replacementTagId ? 'replacement' : 'removal'} checkbox in the refund modal will be pre-checked`}
            >
              <ToggleSwitch
                checked={replaceByDefault}
                onChange={handleReplaceByDefaultChange}
                ariaLabel="Toggle replace tag by default"
              />
            </SettingsRow>

            {/* Aging warning */}
            <div
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--monarch-border-light, rgba(0,0,0,0.06))' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                    Aging warning
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--monarch-text-muted)' }}>
                    Highlight old unmatched transactions. Set to 0 to disable.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={agingWarningDays}
                    onChange={handleAgingWarningChange}
                    className="w-16 px-2 py-1 text-sm rounded border border-(--monarch-border) bg-(--monarch-bg-page) text-(--monarch-text-dark) text-center"
                    aria-label="Aging warning days"
                  />
                  <span className="text-xs text-(--monarch-text-muted)">days</span>
                </div>
              </div>
            </div>

            {/* Badge visibility */}
            <SettingsRow
              label="Show pending badge"
              description="Display unmatched transaction count in the sidebar"
            >
              <ToggleSwitch
                checked={showBadge}
                onChange={handleToggleBadge}
                ariaLabel="Toggle pending badge visibility"
              />
            </SettingsRow>

            {/* Transaction visibility */}
            <SettingsRow
              label="Hide refunded transactions"
              description="Hide transactions that have been matched with a refund"
            >
              <ToggleSwitch
                checked={hideMatched}
                onChange={handleToggleHideMatched}
                ariaLabel="Toggle hide refunded transactions"
              />
            </SettingsRow>
            <SettingsRow
              label="Hide expected refund transactions"
              description="Hide transactions that are awaiting an expected refund"
              isLast
            >
              <ToggleSwitch
                checked={hideExpected}
                onChange={handleToggleHideExpected}
                ariaLabel="Toggle hide expected refund transactions"
              />
            </SettingsRow>
          </div>
        )}
      </div>
    );
  }
);
