/**
 * useKeyboardShortcut Hook
 *
 * Registers global keyboard shortcuts with modifier key support.
 * Automatically cleans up event listeners on unmount.
 *
 * Usage:
 *   useKeyboardShortcut('k', () => openSearch(), { ctrl: true });
 *   useKeyboardShortcut('Escape', () => closeModal());
 */

import { useEffect, useCallback } from 'react';

/**
 * Options for keyboard shortcut behavior
 */
export interface UseKeyboardShortcutOptions {
  /** Require Ctrl key (Cmd on Mac) to be pressed */
  ctrl?: boolean;
  /** Require Shift key to be pressed */
  shift?: boolean;
  /** Require Alt key (Option on Mac) to be pressed */
  alt?: boolean;
  /** Require Meta key (Cmd on Mac, Win on Windows) to be pressed */
  meta?: boolean;
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean;
  /** Prevent default browser behavior (default: true when modifiers are used) */
  preventDefault?: boolean;
}

/**
 * Hook for registering global keyboard shortcuts.
 *
 * @param key - The key to listen for (e.g., 'k', 'Escape', 'Enter')
 * @param callback - Function to execute when shortcut is triggered
 * @param options - Configuration options for modifier keys and behavior
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: UseKeyboardShortcutOptions = {}
): void {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    enabled = true,
    preventDefault = ctrl || shift || alt || meta,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if the pressed key matches (case-insensitive for letters)
      const keyMatches =
        event.key.toLowerCase() === key.toLowerCase() ||
        event.code === key ||
        event.code === `Key${key.toUpperCase()}`;

      if (!keyMatches) return;

      // Check modifier keys
      // Use metaKey || ctrlKey for cross-platform Ctrl/Cmd support
      const ctrlMatches = ctrl ? event.metaKey || event.ctrlKey : true;
      const shiftMatches = shift ? event.shiftKey : true;
      const altMatches = alt ? event.altKey : true;
      const metaMatches = meta ? event.metaKey : true;

      // If no modifiers required, make sure none are pressed (except for special keys)
      const noModifiersRequired = !ctrl && !shift && !alt && !meta;
      const specialKeys = ['Escape', 'Enter', 'Tab', 'Backspace', 'Delete'];
      const isSpecialKey = specialKeys.includes(key);

      if (noModifiersRequired && !isSpecialKey) {
        // For regular keys without modifiers, don't trigger if modifiers are pressed
        if (event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }
      }

      if (ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback();
      }
    },
    [key, callback, ctrl, shift, alt, meta, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    // SSR-safe: check if window is defined
    if (typeof globalThis.window === 'undefined') return;

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}
