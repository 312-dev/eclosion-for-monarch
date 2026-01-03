/**
 * Modal Component
 *
 * A reusable modal/dialog component with full accessibility support.
 * Features:
 * - Portal-based rendering
 * - Focus trapping
 * - Escape to close
 * - Click outside to close
 * - ARIA attributes for screen readers
 */

import { useEffect, useRef, useCallback, useId } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CloseButton } from './CloseButton';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Modal title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content (buttons, etc.) */
  footer?: ReactNode;
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean;
  /** Maximum width of modal */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional ID for aria-labelledby */
  id?: string;
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Initial element to focus when modal opens (selector or ref) */
  initialFocus?: RefObject<HTMLElement>;
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

/** Query selector for focusable elements */
const FOCUSABLE_ELEMENTS =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A reusable modal component with focus trapping and full accessibility.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  closeOnBackdrop = true,
  closeOnEscape = true,
  maxWidth = 'md',
  id,
  showCloseButton = true,
  initialFocus,
}: ModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const modalId = id || `modal-${generatedId}`;
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;

  // Get all focusable elements in the modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // Handle focus trapping
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      // Shift+Tab on first element -> focus last element
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        // Tab on last element -> focus first element
        e.preventDefault();
        firstElement?.focus();
      }
    },
    [closeOnEscape, onClose, getFocusableElements]
  );

  // Store previous active element and set up focus trap
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus initial element or first focusable element
      const focusTarget = initialFocus?.current;
      if (focusTarget) {
        focusTarget.focus();
      } else {
        const focusableElements = getFocusableElements();
        const firstFocusable = focusableElements[0];
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }

      // Add keydown listener
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown, initialFocus, getFocusableElements]);

  // Restore focus when modal closes
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click - must be defined before early return
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close if clicking directly on the backdrop, not its children
      if (closeOnBackdrop && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose]
  );

  if (!isOpen) return null;

  const modalContent = (
    // Backdrop overlay - click to close is handled via onClick
    // Keyboard closing is handled via Escape key in handleKeyDown
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className="fixed inset-0 z-(--z-index-modal) flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      {/* Dialog */}
      <dialog
        ref={modalRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`relative w-full ${MAX_WIDTH_CLASSES[maxWidth]} rounded-lg shadow-xl p-0 m-0`}
        style={{ backgroundColor: 'var(--monarch-bg-card)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--monarch-border)' }}
        >
          <div>
            <h2
              id={titleId}
              className="text-lg font-semibold"
              style={{ color: 'var(--monarch-text)' }}
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1 text-sm"
                style={{ color: 'var(--monarch-text-muted)' }}
              >
                {description}
              </p>
            )}
          </div>
          {showCloseButton && (
            <CloseButton
              onClick={onClose}
              size="md"
              aria-label="Close modal"
            />
          )}
        </div>

        {/* Body */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2 p-4 border-t"
            style={{ borderColor: 'var(--monarch-border)' }}
          >
            {footer}
          </div>
        )}
      </dialog>
    </div>
  );

  return createPortal(modalContent, document.body);
}
