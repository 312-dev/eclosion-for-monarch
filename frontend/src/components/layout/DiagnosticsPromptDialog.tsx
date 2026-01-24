/**
 * Diagnostics Prompt Dialog
 *
 * Modal dialog asking user whether to include diagnostic logs in support email.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Z_INDEX } from '../../constants';

declare const __APP_VERSION__: string;

interface DiagnosticsPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticsPromptDialog({ isOpen, onClose }: DiagnosticsPromptDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const openEmailWithoutDiagnostics = useCallback(() => {
    const subject = `[Eclosion v${__APP_VERSION__}] Support request`;
    globalThis.location.href = `mailto:ope@312.dev?subject=${encodeURIComponent(subject)}`;
    onClose();
  }, [onClose]);

  const openEmailWithDiagnostics = useCallback(async () => {
    if (!globalThis.electron?.openEmailWithDiagnostics) {
      openEmailWithoutDiagnostics();
      return;
    }

    setIsLoading(true);
    try {
      const subject = `[Eclosion v${__APP_VERSION__}] Support request`;
      const recipient = 'ope@312.dev';
      const result = await globalThis.electron.openEmailWithDiagnostics(subject, recipient);

      if (result.method === 'native') {
        onClose();
      } else {
        const body = `[Please attach the diagnostics file that was just opened: ${result.filename}]\n\nDescribe your issue here:\n`;
        globalThis.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        onClose();
      }
    } catch (error) {
      console.error('Failed to open email with diagnostics:', error);
      openEmailWithoutDiagnostics();
    } finally {
      setIsLoading(false);
    }
  }, [onClose, openEmailWithoutDiagnostics]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        aria-hidden="true"
      />
      <dialog
        ref={dialogRef}
        onClose={onClose}
        className="fixed inset-0 flex items-center justify-center bg-transparent p-0 m-auto"
        style={{ zIndex: Z_INDEX.MODAL }}
        aria-labelledby="diagnostics-dialog-title"
      >
        <div
          className="rounded-lg p-6 max-w-md shadow-xl mx-4"
          style={{ backgroundColor: 'var(--monarch-bg-card)' }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3
              id="diagnostics-dialog-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              Include diagnostic logs?
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded transition-colors hover:bg-(--monarch-bg-page)"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" style={{ color: 'var(--monarch-text-muted)' }} />
            </button>
          </div>
          <p className="text-sm mb-5" style={{ color: 'var(--monarch-text-muted)' }}>
            We do our best to strip out any personally identifying information (PII), but you should
            review the logs yourself if you&apos;re worried about sending anything private.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={openEmailWithoutDiagnostics}
              className={`px-4 py-2 text-sm rounded-lg transition-colors hover:bg-(--monarch-bg-page) ${
                isLoading ? 'cursor-wait' : ''
              }`}
              style={{
                color: 'var(--monarch-text-dark)',
                border: '1px solid var(--monarch-border)',
              }}
              disabled={isLoading}
            >
              Don&apos;t attach
            </button>
            <button
              type="button"
              onClick={openEmailWithDiagnostics}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isLoading ? 'cursor-wait' : ''
              }`}
              style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Attach diagnostics'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
