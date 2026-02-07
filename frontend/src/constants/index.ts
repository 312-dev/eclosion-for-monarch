/**
 * Application Constants
 *
 * Centralized configuration values to avoid magic numbers.
 */

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  LANDING_PAGE: 'eclosion-landing-page',
  THEME: 'eclosion-theme',
  FUNDS_BAR_POSITION: 'eclosion-funds-bar-position',
  NOTES_UI_STATE: 'eclosion-notes-ui-state',
  HYPOTHESIZE_SCENARIOS: 'eclosion-hypothesize-scenarios',
  NOTIFICATIONS: 'eclosion-notifications',
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const UI = {
  /** Animation durations */
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  /** Debounce delays */
  DEBOUNCE: {
    SEARCH: 300,
    RESIZE: 150,
  },
  /** Polling/update intervals */
  INTERVAL: {
    SYNC_STATUS: 30000, // 30 seconds - for last sync time display
    TOUR_CLOSE_CHECK: 100, // Quick check for tour close state
    COOLDOWN_TICK: 1000, // 1 second - for countdown timers
    FLIP_ANIMATION: 10000, // 10 seconds - for alternating text display
  },
  /** Scroll behavior delays */
  SCROLL: {
    AFTER_MOUNT: 100, // Delay before scroll after component mount
  },
  /** Layout dimensions */
  LAYOUT: {
    HEADER_HEIGHT: 48, // App header height in pixels (matches --header-height CSS var)
    SCROLL_PADDING: 16, // Extra padding when scrolling to elements
  },
  /** Highlight/feedback durations */
  HIGHLIGHT: {
    ROW: 2000, // Duration for row highlight feedback
    SHORT: 1500, // Shorter highlight for quick feedback
  },
  /** Modal/action delays */
  DELAY: {
    TOAST_BEFORE_RELOAD: 1500, // Show toast before page reload
    TOAST_WITH_PARTIAL_SUCCESS: 2000, // Longer delay when showing partial success
    TOOLTIP_AUTO_HIDE: 10000, // Auto-hide tooltip after this duration
    FOCUS_AFTER_OPEN: 0, // Immediate focus on next tick after opening
  },
} as const;

// ============================================================================
// Z-Index Hierarchy
// ============================================================================
// This creates a clear stacking order for all UI elements.
// Lower values are below higher values.
//
// Hierarchy (lowest to highest):
// 1. DROPDOWN (10)      - Dropdown menus, select menus
// 2. STICKY (20)        - Sticky headers, navigation
// 3. POPOVER (30)       - Popovers, config panels
// 4. MODAL_BACKDROP (40) - Modal/dialog backdrops (semi-transparent overlay)
// 5. MODAL (50)         - Modal/dialog content
// 6. TOAST (60)         - Toast notifications (should appear above modals)
// 7. TOOLTIP (70)       - Tooltips (should appear above everything)
// ============================================================================

export const Z_INDEX = {
  /** Dropdown menus, select menus, action menus */
  DROPDOWN: 10,
  /** Sticky headers, navigation bars */
  STICKY: 20,
  /** Popovers, config panels, info panels */
  POPOVER: 30,
  /** Semi-transparent backdrop behind modals */
  MODAL_BACKDROP: 40,
  /** Modal/dialog content */
  MODAL: 50,
  /** Toast notifications - above modals */
  TOAST: 60,
  /** Tooltips - highest layer, always visible */
  TOOLTIP: 70,
} as const;

// ============================================================================
// Ideas Board Animation Timings
// ============================================================================

export const IDEAS_BOARD = {
  /** Interval between showing new ideas (ms) */
  IDEA_CYCLE: 4000,
  /** Duration of idea pop-in animation (ms) */
  IDEA_POP_IN: 400,
  /** Duration of upvote animation sequence (ms) */
  UPVOTE_DURATION: 1500,
  /** Duration of each dev cycle stage (ms) */
  DEV_STAGE_DURATION: 2000,
  /** Typewriter typing speed (ms per character) */
  TYPEWRITER_SPEED: 50,
  /** Typewriter backspace speed (ms per character) */
  BACKSPACE_SPEED: 30,
  /** Pause before backspacing placeholder (ms) */
  PROMPT_PAUSE: 2000,
  /** Number of ideas to cycle before showing dev cycle */
  IDEAS_BEFORE_DEV_CYCLE: 3,
} as const;
