import { useState, useEffect, useRef, useId } from 'react';
import { getErrorMessage } from '../utils';

interface ResetFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureDescription: string;
  itemsToDelete: string[];
  itemsToDisable: number;
  isLinked?: boolean;
  onReset: () => Promise<void>;
}

export function ResetFeatureModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  itemsToDelete,
  itemsToDisable,
  isLinked = false,
  onReset,
}: ResetFeatureModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Focus management and keyboard handling
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Focus the modal
      modalRef.current?.focus();
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !resetting) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, resetting, onClose]);

  const handleReset = async () => {
    if (!confirmed) return;

    setResetting(true);
    setError(null);
    try {
      await onReset();
      // Modal will be closed by parent on success (typically triggers page reload)
    } catch (err) {
      setError(getErrorMessage(err));
      setResetting(false);
    }
  };

  const handleClose = () => {
    if (resetting) return;
    setConfirmed(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const hasCategoriesToDelete = itemsToDelete.length > 0 && !isLinked;
  const hasItemsToDisable = itemsToDisable > 0;
  const hasAnythingToReset = hasCategoriesToDelete || hasItemsToDisable;

  return (
    <div className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center" role="presentation">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 modal-backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md mx-4 rounded-xl shadow-xl modal-content"
        style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--monarch-orange)' }} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h2 id={titleId} className="text-lg font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
                Reset {featureName}
              </h2>
            </div>
            {!resetting && (
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: 'var(--monarch-text-muted)' }}
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            {featureDescription}
          </p>

          {!hasAnythingToReset ? (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
              <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
                Nothing to reset. This feature has no active categories or tracked items.
              </p>
            </div>
          ) : (
            <>
              {/* What will happen */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  This will:
                </p>
                <ul className="text-sm space-y-1" style={{ color: 'var(--monarch-text-muted)' }}>
                  {hasCategoriesToDelete && (
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete {itemsToDelete.length} {itemsToDelete.length === 1 ? 'category' : 'categories'} from Monarch</span>
                    </li>
                  )}
                  {isLinked && itemsToDelete.length > 0 && (
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Keep linked category (it was not created by this app)</span>
                    </li>
                  )}
                  {hasItemsToDisable && (
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--monarch-orange)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span>Disable tracking for {itemsToDisable} {itemsToDisable === 1 ? 'item' : 'items'}</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Categories to delete */}
              {hasCategoriesToDelete && (
                <div>
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
                    Categories to delete:
                  </p>
                  <div
                    className="rounded-lg p-3 max-h-32 overflow-y-auto space-y-1"
                    style={{ backgroundColor: 'var(--monarch-bg-page)' }}
                  >
                    {itemsToDelete.map((name, i) => (
                      <div
                        key={i}
                        className="text-sm py-0.5"
                        style={{ color: 'var(--monarch-text-dark)' }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={resetting}
                  className="mt-1"
                />
                <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
                  I understand this will reset the {featureName.toLowerCase()} feature
                </span>
              </label>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)', color: 'var(--monarch-error)' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              disabled={resetting}
              className="flex-1 px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-elevated)',
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              Cancel
            </button>
            {hasAnythingToReset && (
              <button
                onClick={handleReset}
                disabled={!confirmed || resetting}
                className="flex-1 px-4 py-2 rounded-lg transition-colors text-white flex items-center justify-center gap-2"
                style={{
                  backgroundColor: resetting ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
                  opacity: !confirmed && !resetting ? 0.5 : 1,
                }}
              >
                {resetting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Resetting...
                  </>
                ) : (
                  'Reset Feature'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
