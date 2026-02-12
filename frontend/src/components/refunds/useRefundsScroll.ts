/**
 * useRefundsScroll
 *
 * Scroll-to-row logic for the Refunds tab. Scrolls to transaction or credit
 * group rows by data attribute, clearing filters and retrying if the target
 * isn't visible in the DOM.
 */

import { useCallback } from 'react';
import { scrollToElement } from '../../utils/scroll';
import { UI } from '../../constants';
import type { DateRangeFilter } from '../../types/refunds';

interface UseRefundsScrollInput {
  readonly setSearchQuery: (q: string) => void;
  readonly setSelectedCategoryIds: (ids: string[] | null) => void;
  readonly setDateRange: (r: DateRangeFilter) => void;
  readonly defaultDateRange: DateRangeFilter;
}

function scrollAndHighlight(el: Element): void {
  scrollToElement(el);
  el.classList.add('list-item-highlight');
  setTimeout(() => el.classList.remove('list-item-highlight'), UI.HIGHLIGHT.ROW);
}

/** Expand a credit group row if it is currently collapsed. */
function expandIfCollapsed(el: Element): void {
  const toggle = el.querySelector('[aria-expanded="false"]');
  if (toggle instanceof HTMLElement) toggle.click();
}

export function useRefundsScroll({
  setSearchQuery,
  setSelectedCategoryIds,
  setDateRange,
  defaultDateRange,
}: UseRefundsScrollInput): {
  handleScrollToTransaction: (id: string) => void;
  handleScrollToCredit: (id: string) => void;
} {
  const scrollToRow = useCallback(
    (type: 'transaction' | 'credit', id: string) => {
      const attr = type === 'transaction' ? 'data-transaction-id' : 'data-credit-id';
      const el = document.querySelector(`[${attr}="${CSS.escape(id)}"]`);
      if (el) {
        scrollAndHighlight(el);
        if (type === 'credit') expandIfCollapsed(el);
      } else {
        // Clear filters and retry after re-render
        setSearchQuery('');
        setSelectedCategoryIds(null);
        setDateRange(defaultDateRange);
        requestAnimationFrame(() => {
          setTimeout(() => {
            const retryEl = document.querySelector(`[${attr}="${CSS.escape(id)}"]`);
            if (retryEl) {
              scrollAndHighlight(retryEl);
              if (type === 'credit') expandIfCollapsed(retryEl);
            }
          }, UI.ANIMATION.NORMAL);
        });
      }
    },
    [setSearchQuery, setSelectedCategoryIds, setDateRange, defaultDateRange]
  );

  const handleScrollToTransaction = useCallback(
    (id: string) => scrollToRow('transaction', id),
    [scrollToRow]
  );
  const handleScrollToCredit = useCallback(
    (id: string) => scrollToRow('credit', id),
    [scrollToRow]
  );

  return { handleScrollToTransaction, handleScrollToCredit };
}
