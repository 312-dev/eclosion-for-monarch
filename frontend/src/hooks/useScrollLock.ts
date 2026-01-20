/**
 * useScrollLock Hook
 *
 * Prevents background scrolling when modals or overlays are open.
 * Handles nested modals via reference counting - scroll is only
 * restored when all modals close.
 *
 * Usage:
 *   useScrollLock(isOpen);
 */

import { useEffect, useRef } from 'react';

// Track how many components have requested a scroll lock
let lockCount = 0;

/**
 * Lock body scroll when a modal/overlay is open.
 * Safe for nested modals - uses reference counting.
 *
 * @param shouldLock - Whether to lock scrolling (typically the modal's isOpen state)
 */
export function useScrollLock(shouldLock: boolean): void {
  const isLocked = useRef(false);

  useEffect(() => {
    if (shouldLock && !isLocked.current) {
      // Acquire lock
      lockCount++;
      isLocked.current = true;

      if (lockCount === 1) {
        // First lock - disable scrolling
        document.body.style.overflow = 'hidden';
      }
    }

    return () => {
      if (isLocked.current) {
        // Release lock
        lockCount--;
        isLocked.current = false;

        if (lockCount === 0) {
          // Last lock released - restore scrolling
          document.body.style.overflow = '';
        }
      }
    };
  }, [shouldLock]);
}
