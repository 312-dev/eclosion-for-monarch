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
 * - Footer portal for children to render sticky footer content
 */

import { useEffect, useRef, useCallback, useId, createContext, useContext, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CloseButton } from './CloseButton';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useModalStack } from '../../hooks/useModalStack';
import { Z_INDEX } from '../../constants';

/**
 * Context for modal footer portal.
 * Children can use useModalFooter() to render content into the modal's sticky footer area.
 */
const ModalFooterContext = createContext<HTMLDivElement | null>(null);

/**
 * Hook for children to render content into the modal's sticky footer.
 * Returns a function that creates a portal to the footer area.
 *
 * @example
 * function MyForm() {
 *   const renderInFooter = useModalFooter();
 *   return (
 *     <>
 *       <div>Form content...</div>
 *       {renderInFooter(<button>Save</button>)}
 *     </>
 *   );
 * }
 */
export function useModalFooter() {
  const footerContainer = useContext(ModalFooterContext);
  return useCallback(
    (content: ReactNode) => {
      if (!footerContainer) return null;
      return createPortal(content, footerContainer);
    },
    [footerContainer]
  );
}

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Handler to close the modal */
  onClose: () => void;
  /** Modal title */
  title: ReactNode;
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
  initialFocus?: RefObject<HTMLElement | null>;
  /** Optional actions to render in the header, left of the close button */
  headerActions?: ReactNode;
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
  headerActions,
}: ModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  // Use state for footer container so children re-render when it's available
  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const generatedId = useId();
  const modalId = id || `modal-${generatedId}`;
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;

  // Track modal stacking for proper z-index
  const stackOffset = useModalStack(isOpen);

  // Get all focusable elements in the modal
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    return Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)).filter(
      (el) => el.offsetParent !== null
    );
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
  useScrollLock(isOpen);

  // Track where pointerdown started to prevent closing when dragging from inside modal to backdrop
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const handleBackdropPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  // Handle backdrop click - only close if both mousedown and mouseup occurred on the backdrop
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only close if:
      // 1. closeOnBackdrop is enabled
      // 2. The click target is the backdrop itself (not children)
      // 3. The pointerdown also started on the backdrop (prevents drag-release closes)
      if (
        closeOnBackdrop &&
        e.target === e.currentTarget &&
        mouseDownTargetRef.current === e.currentTarget
      ) {
        onClose();
      }
      mouseDownTargetRef.current = null;
    },
    [closeOnBackdrop, onClose]
  );

  if (!isOpen) return null;

  // Calculate z-index for backdrop and modal content
  const backdropZIndex = Z_INDEX.MODAL_BACKDROP + stackOffset;
  const modalZIndex = Z_INDEX.MODAL + stackOffset;

  const modalContent = (
    // Backdrop overlay - click to close is handled via onClick
    // Keyboard closing is handled via Escape key in handleKeyDown
    <div
      className="fixed inset-0 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: backdropZIndex,
      }}
      onPointerDown={handleBackdropPointerDown}
      onClick={handleBackdropClick}
    >
      {/* Dialog */}
      <dialog
        ref={modalRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`relative w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex flex-col rounded-lg p-0 m-0`}
        style={{
          backgroundColor: 'var(--monarch-bg-card)',
          boxShadow:
            '0 0 0 1px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.5), 0 20px 50px -10px rgba(0, 0, 0, 0.4)',
          maxHeight: 'var(--modal-max-height)',
          zIndex: modalZIndex,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b rounded-t-lg"
          style={{
            borderColor: 'var(--monarch-border)',
            backgroundColor: 'var(--monarch-bg-page)',
          }}
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
          <div className="flex items-center gap-2">
            {headerActions}
            {showCloseButton && (
              <CloseButton onClick={onClose} size="md" aria-label="Close modal" />
            )}
          </div>
        </div>

        {/* Body - wrapped in context provider for footer portal */}
        <ModalFooterContext.Provider value={footerContainer}>
          <div
            className="modal-body-scroll p-4 flex-1 min-h-0 overflow-y-scroll"
            style={{
              boxShadow:
                'inset 0 8px 8px -8px rgba(0,0,0,0.15), inset 0 -8px 8px -8px rgba(0,0,0,0.15)',
            }}
          >
            {children}
          </div>
        </ModalFooterContext.Provider>

        {/* Footer - sticky at bottom, never scrolls with content */}
        {/* Renders both explicit footer prop and portal content from children */}
        <div
          ref={setFooterContainer}
          className="shrink-0 empty:hidden rounded-b-lg"
          style={{
            borderColor: 'var(--monarch-border)',
            backgroundColor: 'var(--monarch-bg-page)',
          }}
        >
          {/* Portal content from children renders here via useModalFooter() */}
          {/* Explicit footer prop also renders here */}
          {footer && <div className="p-4 border-t" style={{ borderColor: 'var(--monarch-border)' }}>{footer}</div>}
        </div>
      </dialog>
    </div>
  );

  return createPortal(modalContent, document.body);
}
