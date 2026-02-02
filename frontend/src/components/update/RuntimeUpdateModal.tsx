/**
 * RuntimeUpdateModal Component
 *
 * Non-dismissible modal shown when an update is downloaded while the app is running.
 * Users must restart to install the update - they cannot continue working.
 *
 * This modal only appears at runtime (after boot completes). During boot,
 * updates are handled by StartupLoadingScreen which auto-restarts.
 */

import { useState, useRef, useCallback } from 'react';
import { Download, RotateCcw, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useUpdate } from '../../context/UpdateContext';

// Timeout for install operation (if app doesn't quit within this time, show error)
const INSTALL_TIMEOUT_MS = 10000;

export function RuntimeUpdateModal() {
  const {
    isDesktop,
    updateDownloaded,
    updateInfo,
    quitAndInstall,
    isBootPhase,
    error: updateError,
  } = useUpdate();

  const [isRestarting, setIsRestarting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Combine errors
  const installError = isRestarting ? updateError || localError : localError;
  const hasError = !!installError;

  // Clear any pending timeout
  const clearInstallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleRestart = useCallback(() => {
    setIsRestarting(true);
    setLocalError(null);
    clearInstallTimeout();

    // Set timeout - if app doesn't quit, installation likely failed
    timeoutRef.current = setTimeout(() => {
      setIsRestarting(false);
      setLocalError('Installation timed out. Please try again or restart the app manually.');
    }, INSTALL_TIMEOUT_MS);

    // Small delay to show loading state
    setTimeout(() => {
      quitAndInstall();
    }, 200);
  }, [quitAndInstall, clearInstallTimeout]);

  // Only show at runtime (not during boot) when update is downloaded
  if (!isDesktop || !updateDownloaded || isBootPhase) {
    return null;
  }

  const version = updateInfo?.version || 'new version';
  const isBeta = version.includes('-beta');

  // Determine accent color
  const getAccentColor = () => {
    if (hasError) return 'var(--monarch-error)';
    if (isBeta) return 'var(--monarch-accent, #a78bfa)';
    return 'var(--monarch-success)';
  };
  const accentColor = getAccentColor();

  const Icon = hasError ? AlertCircle : Download;

  // Determine button text based on state
  const getButtonText = () => {
    if (isRestarting && !hasError) return 'Restarting...';
    if (hasError) return 'Try Again';
    return 'Restart Now';
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // No-op - cannot be dismissed
      title="Update Required"
      closeOnBackdrop={false}
      closeOnEscape={false}
      showCloseButton={false}
      maxWidth="sm"
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRestart}
            disabled={isRestarting && !hasError}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-70 hover:opacity-90"
            style={{ backgroundColor: accentColor, color: '#1a1918' }}
            aria-label={isRestarting ? 'Restarting application' : 'Restart to install update'}
          >
            <RotateCcw size={16} className={isRestarting && !hasError ? 'animate-spin' : ''} />
            {getButtonText()}
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: hasError ? 'var(--monarch-error-bg)' : 'var(--monarch-bg-page)',
          }}
        >
          <Icon size={24} style={{ color: accentColor }} />
        </div>

        <div className="space-y-2">
          <p style={{ color: 'var(--monarch-text-dark)' }}>
            {hasError
              ? installError
              : 'A new version of Eclosion is available. Please restart to install the update.'}
          </p>

          {!hasError && (
            <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
              Version {version}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
