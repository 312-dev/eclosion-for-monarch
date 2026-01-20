/**
 * Browser Setup Modal
 *
 * Modal wrapper for the browser bookmarks setup wizard.
 */

import { Portal } from '../Portal';
import { BrowserBookmarksSetupWizard } from '../wizards/wishlist';
import { Z_INDEX } from '../../constants';

interface BrowserSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BrowserSetupModal({ isOpen, onClose, onComplete }: BrowserSetupModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      >
        <div
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
          role="button"
          tabIndex={0}
          aria-label="Close modal"
        />
        <div className="relative" style={{ zIndex: Z_INDEX.MODAL }}>
          <BrowserBookmarksSetupWizard onComplete={onComplete} onCancel={onClose} />
        </div>
      </div>
    </Portal>
  );
}
