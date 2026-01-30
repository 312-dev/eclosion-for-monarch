/**
 * Distribution Mode Banner
 *
 * A fixed banner that appears below the app header when in Distribute or Hypothesize mode.
 * Shows mode indicator, action buttons, and dismiss functionality.
 */

import { useEffect } from 'react';
import { Icons } from '../icons';
import { useIsRateLimited } from '../../context/RateLimitContext';
import { useDistributionBannerActions } from '../../hooks/useDistributionBannerActions';
import { Tooltip } from '../ui/Tooltip';
import { ConfirmDialog, SaveNameDialog } from './DistributionModeDialogs';

export function DistributionModeBanner() {
  const {
    mode,
    loadedScenarioName,
    loadedScenarioId,
    isApplying,
    isSaving,
    showConfirmDialog,
    showSaveNameDialog,
    handleDismiss,
    handleApply,
    handleOpenScenarios,
    handleSave,
    handleSaveAndExit,
    handleSaveWithName,
    handleCancelSave,
    handleConfirmExit,
    handleCancelExit,
  } = useDistributionBannerActions();

  const isRateLimited = useIsRateLimited();

  // Handle Escape key to exit mode
  useEffect(() => {
    if (!mode) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !showConfirmDialog) {
        handleDismiss();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mode, showConfirmDialog, handleDismiss]);

  if (!mode) return null;

  const isDistribute = mode === 'distribute';
  const isHypothesize = mode === 'hypothesize';

  // Banner colors - use theme-appropriate text colors for readability
  const bannerBg = isDistribute ? 'var(--monarch-success-bg)' : 'rgba(147, 51, 234, 0.15)';
  const bannerBorder = isDistribute ? 'var(--monarch-success)' : '#9333ea';
  const iconColor = isDistribute ? 'var(--monarch-success)' : '#9333ea';
  const textColor = isDistribute ? 'var(--monarch-success)' : '#7c3aed';
  const descriptionColor = 'var(--monarch-text-muted)';

  return (
    <>
      <div
        className="distribution-mode-banner w-full px-4 py-2 flex items-center justify-between gap-4 animate-slide-down"
        style={{
          backgroundColor: bannerBg,
          borderBottom: `1px solid ${bannerBorder}`,
        }}
      >
        {/* Left: Mode indicator */}
        <div className="flex items-center gap-3">
          {isDistribute ? (
            <Icons.Split size={18} style={{ color: iconColor }} />
          ) : (
            <Icons.FlaskConical size={18} style={{ color: iconColor }} />
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: textColor }}>
              {isDistribute ? 'Distribute' : 'Hypothesize'}
            </span>
            <span className="text-sm" style={{ color: descriptionColor }}>
              {isDistribute
                ? 'Allocate available funds across your stash items'
                : 'Plan future contributions and events to see projected balances'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {isDistribute && (
            <button
              onClick={handleApply}
              disabled={isApplying || isRateLimited}
              className="px-3 py-1.5 text-sm font-medium rounded-lg btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--monarch-success)',
                color: '#fff',
              }}
            >
              {isApplying ? 'Applying...' : 'Apply'}
            </button>
          )}
          {isHypothesize && (
            <>
              <button
                onClick={handleOpenScenarios}
                className="px-3 py-1.5 text-sm font-medium rounded-lg btn-press flex items-center gap-1.5"
                style={{
                  backgroundColor: '#9333ea',
                  color: '#fff',
                }}
              >
                <Icons.FolderOpen size={14} />
                Scenarios
              </button>
              <Tooltip
                content={
                  loadedScenarioName ? `Save "${loadedScenarioName}"` : 'Save as new scenario'
                }
                side="bottom"
              >
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  aria-label={loadedScenarioName ? `Save ${loadedScenarioName}` : 'Save scenario'}
                >
                  <Icons.Save size={18} style={{ color: textColor }} />
                </button>
              </Tooltip>
              <Tooltip
                content={
                  loadedScenarioId
                    ? `Save "${loadedScenarioName}" and exit`
                    : 'Save as new scenario and exit'
                }
                side="bottom"
              >
                <button
                  onClick={handleSaveAndExit}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  aria-label={
                    loadedScenarioId
                      ? `Save ${loadedScenarioName} and exit`
                      : 'Save scenario and exit'
                  }
                >
                  <Icons.Check size={18} style={{ color: textColor }} />
                </button>
              </Tooltip>
            </>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
            aria-label="Exit mode"
          >
            <Icons.X size={18} style={{ color: textColor }} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />

      <SaveNameDialog
        isOpen={showSaveNameDialog}
        onSave={handleSaveWithName}
        onCancel={handleCancelSave}
      />
    </>
  );
}
