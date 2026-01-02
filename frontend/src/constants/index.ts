/**
 * Application Constants
 *
 * Centralized configuration values to avoid magic numbers.
 */

// ============================================================================
// Toast Durations (milliseconds)
// ============================================================================

export const TOAST_DURATION = {
  DEFAULT: 3000,
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;

// ============================================================================
// Query Cache Times (milliseconds)
// ============================================================================

export const CACHE_TIME = {
  /** Short-lived data like unmapped categories */
  SHORT: 1 * 60 * 1000, // 1 minute
  /** Standard data like dashboard */
  STANDARD: 2 * 60 * 1000, // 2 minutes
  /** Stable data like category groups */
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  /** Rarely changing data like deployment info */
  LONG: 10 * 60 * 1000, // 10 minutes
  /** Changelog polling interval */
  VERSION_CHECK: 30 * 60 * 1000, // 30 minutes
} as const;

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  /** Default retry count for failed requests */
  RETRY_COUNT: 1,
  /** Default rate limit retry delay (seconds) */
  RATE_LIMIT_DEFAULT_DELAY: 60,
} as const;

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  LANDING_PAGE: 'eclosion-landing-page',
  THEME: 'eclosion-theme',
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
// Layout Dimensions
// ============================================================================

export const LAYOUT = {
  /** Dropdown menu widths */
  DROPDOWN: {
    CATEGORY_GROUP: 180,
    ACTIONS: 180,
    EMOJI_PICKER: 200,
    FILTER: 120,
  },
  /** Modal/popover widths */
  MODAL: {
    TOUR_POPOVER: 300,
    WIZARD_CARD: 340,
  },
  /** Sidebar dimensions */
  SIDEBAR: {
    WIDTH: 220,
    STATS_WIDTH: 280,
  },
  /** Spacing */
  SPACING: {
    DROPDOWN_OFFSET: 4,
    POPOVER_OFFSET: 8,
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
