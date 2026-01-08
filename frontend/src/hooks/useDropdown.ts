/**
 * useDropdown Hook
 *
 * Manages dropdown state, positioning, and click-outside behavior.
 * Handles viewport boundary detection to keep dropdowns visible.
 *
 * Usage:
 *   const dropdown = useDropdown<HTMLDivElement, HTMLButtonElement>();
 *   <button ref={dropdown.triggerRef} onClick={dropdown.toggle}>Open</button>
 *   {dropdown.isOpen && <div ref={dropdown.dropdownRef} style={dropdown.position}>...</div>}
 */

import { useState, useRef, useCallback, useEffect, type RefObject } from 'react';

export interface DropdownPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export interface UseDropdownOptions {
  /** Alignment of dropdown relative to trigger */
  alignment?: 'left' | 'right';
  /** Offset from trigger element */
  offset?: { x?: number; y?: number };
  /** Initial open state */
  initialOpen?: boolean;
  /** Minimum margin from viewport edges */
  viewportMargin?: number;
  /** Open on hover instead of click */
  openOnHover?: boolean;
  /** Delay before closing when mouse leaves (ms) */
  hoverCloseDelay?: number;
}

export interface UseDropdownReturn<
  T extends HTMLElement = HTMLDivElement,
  B extends HTMLElement = HTMLButtonElement
> {
  /** Whether dropdown is currently open */
  isOpen: boolean;
  /** Set open state directly */
  setIsOpen: (open: boolean) => void;
  /** Toggle open state */
  toggle: () => void;
  /** Open the dropdown */
  open: () => void;
  /** Close the dropdown */
  close: () => void;
  /** Calculated position for the dropdown */
  position: DropdownPosition;
  /** Ref for the dropdown element */
  dropdownRef: RefObject<T | null>;
  /** Ref for the trigger element */
  triggerRef: RefObject<B | null>;
  /** Manually update position */
  updatePosition: () => void;
  /** Hover handlers for trigger element (only used when openOnHover is true) */
  hoverHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  /** Hover handlers for dropdown element (only used when openOnHover is true) */
  dropdownHoverHandlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

/**
 * Hook for managing dropdown state and positioning.
 *
 * @param options - Configuration options
 * @returns Dropdown state and controls
 */
export function useDropdown<
  T extends HTMLElement = HTMLDivElement,
  B extends HTMLElement = HTMLButtonElement
>(options: UseDropdownOptions = {}): UseDropdownReturn<T, B> {
  const {
    alignment = 'left',
    offset = {},
    initialOpen = false,
    viewportMargin = 8,
    openOnHover = false,
    hoverCloseDelay = 150,
  } = options;

  const [isOpen, setIsOpen] = useState(initialOpen);
  const [position, setPosition] = useState<DropdownPosition>({ top: 0, left: 0 });

  const dropdownRef = useRef<T | null>(null);
  const triggerRef = useRef<B | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const offsetX = offset.x ?? 0;
    const offsetY = offset.y ?? 4;

    // Get dropdown dimensions (use estimates if not yet rendered)
    const dropdownEl = dropdownRef.current;
    const dropdownWidth = dropdownEl?.offsetWidth ?? 180;
    const dropdownHeight = dropdownEl?.offsetHeight ?? 200;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate vertical position
    const spaceBelow = viewportHeight - triggerRect.bottom - viewportMargin;
    const spaceAbove = triggerRect.top - viewportMargin;
    const fitsBelow = spaceBelow >= dropdownHeight + offsetY;
    const fitsAbove = spaceAbove >= dropdownHeight + offsetY;

    const newPosition: DropdownPosition = {};

    // Prefer below, flip to above if needed
    if (fitsBelow || !fitsAbove) {
      newPosition.top = triggerRect.bottom + offsetY;
    } else {
      newPosition.bottom = viewportHeight - triggerRect.top + offsetY;
    }

    // Calculate horizontal position
    if (alignment === 'right') {
      // Align dropdown's right edge with trigger's right edge
      const rightPosition = viewportWidth - triggerRect.right + offsetX;
      // Check if it would overflow left side
      const leftEdge = viewportWidth - rightPosition - dropdownWidth;
      if (leftEdge < viewportMargin) {
        // Adjust to keep within viewport
        newPosition.right = viewportWidth - dropdownWidth - viewportMargin;
      } else {
        newPosition.right = rightPosition;
      }
    } else {
      // Align dropdown's left edge with trigger's left edge
      let leftPosition = triggerRect.left + offsetX;
      // Check if it would overflow right side
      if (leftPosition + dropdownWidth > viewportWidth - viewportMargin) {
        leftPosition = viewportWidth - dropdownWidth - viewportMargin;
      }
      // Check if it would overflow left side
      if (leftPosition < viewportMargin) {
        leftPosition = viewportMargin;
      }
      newPosition.left = leftPosition;
    }

    setPosition(newPosition);
  }, [alignment, offset.x, offset.y, viewportMargin]);

  const toggle = useCallback(() => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  }, [isOpen, updatePosition]);

  const open = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const isOutsideDropdown =
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
      const isOutsideTrigger =
        triggerRef.current && !triggerRef.current.contains(event.target as Node);

      if (isOutsideDropdown && isOutsideTrigger) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update position on scroll/resize and after dropdown renders
  useEffect(() => {
    if (!isOpen) return;

    // Recalculate position after render to get accurate dropdown dimensions
    requestAnimationFrame(updatePosition);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Clear hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Hover handlers for trigger element
  const handleTriggerMouseEnter = useCallback(() => {
    if (!openOnHover) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  }, [openOnHover, updatePosition]);

  const handleTriggerMouseLeave = useCallback(() => {
    if (!openOnHover) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, hoverCloseDelay);
  }, [openOnHover, hoverCloseDelay]);

  // Hover handlers for dropdown element
  const handleDropdownMouseEnter = useCallback(() => {
    if (!openOnHover) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, [openOnHover]);

  const handleDropdownMouseLeave = useCallback(() => {
    if (!openOnHover) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, hoverCloseDelay);
  }, [openOnHover, hoverCloseDelay]);

  return {
    isOpen,
    setIsOpen,
    toggle,
    open,
    close,
    position,
    dropdownRef,
    triggerRef,
    updatePosition,
    hoverHandlers: {
      onMouseEnter: handleTriggerMouseEnter,
      onMouseLeave: handleTriggerMouseLeave,
    },
    dropdownHoverHandlers: {
      onMouseEnter: handleDropdownMouseEnter,
      onMouseLeave: handleDropdownMouseLeave,
    },
  };
}
