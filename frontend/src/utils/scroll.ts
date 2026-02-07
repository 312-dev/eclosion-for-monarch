/**
 * Scroll Utilities
 *
 * Centralized scroll functions that account for fixed header height and padding.
 * Use these instead of raw scrollIntoView/scrollTo to ensure content isn't hidden behind the header.
 */

import { UI } from '../constants';

/** Options for scroll behavior */
interface ScrollOptions {
  /** Scroll behavior: 'smooth' for animated, 'instant' for immediate */
  behavior?: ScrollBehavior;
  /** Additional offset in pixels (added to header + padding) */
  extraOffset?: number;
}

/**
 * Get the total scroll offset (header height + padding)
 */
export function getScrollOffset(extraOffset = 0): number {
  return UI.LAYOUT.HEADER_HEIGHT + UI.LAYOUT.SCROLL_PADDING + extraOffset;
}

/**
 * Get the app scroll container element
 * Falls back to window for pages without app layout (marketing, login)
 */
function getScrollContainer(): Element | Window {
  return document.querySelector('.app-scroll-area') ?? (globalThis as unknown as Window);
}

/**
 * Scroll an element into view, accounting for the fixed header
 *
 * @param element - The element to scroll to
 * @param options - Scroll options
 *
 * @example
 * ```ts
 * scrollToElement(sectionRef.current, { behavior: 'smooth' });
 * ```
 */
export function scrollToElement(
  element: Element | null | undefined,
  options: ScrollOptions = {}
): void {
  if (!element) return;

  const { behavior = 'smooth', extraOffset = 0 } = options;
  const offset = getScrollOffset(extraOffset);

  const scrollContainer = getScrollContainer();
  const elementRect = element.getBoundingClientRect();

  if (scrollContainer instanceof Window) {
    // For globalThis scroll, calculate absolute position
    const absoluteTop = elementRect.top + globalThis.scrollY - offset;
    globalThis.scrollTo({ top: absoluteTop, behavior });
  } else {
    // For container scroll, calculate relative to container
    const containerRect = scrollContainer.getBoundingClientRect();
    const relativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop - offset;
    scrollContainer.scrollTo({ top: relativeTop, behavior });
  }
}

/**
 * Scroll to an element by its ID, accounting for the fixed header
 *
 * @param elementId - The ID of the element (without #)
 * @param options - Scroll options
 *
 * @example
 * ```ts
 * scrollToId('remote-access', { behavior: 'smooth' });
 * ```
 */
export function scrollToId(elementId: string, options: ScrollOptions = {}): void {
  const element = document.getElementById(elementId);
  scrollToElement(element, options);
}

/**
 * Scroll to top of the page/container
 *
 * @param options - Scroll options
 *
 * @example
 * ```ts
 * scrollToTop({ behavior: 'instant' });
 * ```
 */
export function scrollToTop(options: Pick<ScrollOptions, 'behavior'> = {}): void {
  const { behavior = 'instant' } = options;
  const scrollContainer = getScrollContainer();

  if (scrollContainer instanceof Window) {
    globalThis.scrollTo({ top: 0, behavior });
  } else {
    scrollContainer.scrollTo({ top: 0, behavior });
  }
}

/**
 * Scroll within a specific container (for internal scrollable areas)
 *
 * @param container - The scrollable container element
 * @param top - The scroll position (0 for top)
 * @param behavior - Scroll behavior
 *
 * @example
 * ```ts
 * scrollContainer(contentRef.current, 0, 'instant');
 * ```
 */
export function scrollContainerTo(
  container: Element | null | undefined,
  top: number,
  behavior: ScrollBehavior = 'instant'
): void {
  if (!container) return;
  container.scrollTo({ top, behavior });
}

/**
 * Scroll an element into view within its nearest scrollable ancestor
 * Use for elements within internal scroll containers (not the main app scroll)
 *
 * @param element - The element to scroll into view
 * @param options - ScrollIntoView options (block defaults to 'nearest')
 *
 * @example
 * ```ts
 * scrollIntoViewLocal(buttonRef.current, { block: 'nearest', behavior: 'instant' });
 * ```
 */
export function scrollIntoViewLocal(
  element: Element | null | undefined,
  options: ScrollIntoViewOptions = {}
): void {
  if (!element) return;
  element.scrollIntoView({ block: 'nearest', ...options });
}

/**
 * Get the current scroll position of the app scroll container
 *
 * @returns The current scrollTop value
 *
 * @example
 * ```ts
 * const position = getScrollPosition();
 * // Later...
 * scrollToPosition(position);
 * ```
 */
export function getScrollPosition(): number {
  const scrollContainer = document.querySelector('.app-scroll-area');
  if (scrollContainer) {
    return scrollContainer.scrollTop;
  }
  return globalThis.scrollY;
}

/**
 * Scroll to a specific position in the app scroll container
 *
 * @param top - The scroll position in pixels
 * @param behavior - Scroll behavior (default: 'instant')
 *
 * @example
 * ```ts
 * scrollToPosition(savedPosition, 'smooth');
 * ```
 */
export function scrollToPosition(top: number, behavior: ScrollBehavior = 'instant'): void {
  const scrollContainer = getScrollContainer();

  if (scrollContainer instanceof Window) {
    globalThis.scrollTo({ top, behavior });
  } else {
    scrollContainer.scrollTo({ top, behavior });
  }
}
