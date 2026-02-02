import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for implementing an always-visible scrollbar in modals.
 * Uses a custom div-based scrollbar since CSS styling of native scrollbars
 * doesn't work reliably on macOS (system settings override it).
 *
 * @param isOpen - Whether the modal is currently open
 * @returns Object containing refs for content, thumb, and track elements, plus hasOverflow state
 *
 * @example
 * ```tsx
 * const { contentRef, thumbRef, trackRef, hasOverflow } = useModalScrollbar(isOpen);
 *
 * return (
 *   <div className="relative overflow-hidden">
 *     {hasOverflow && (
 *       <div ref={trackRef} className="scrollbar-track">
 *         <div ref={thumbRef} className="scrollbar-thumb" />
 *       </div>
 *     )}
 *     <div ref={contentRef} className="overflow-y-auto scrollbar-none">
 *       {children}
 *     </div>
 *   </div>
 * );
 * ```
 */
export function useModalScrollbar(isOpen: boolean) {
  const contentRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const rafRef = useRef<number | null>(null);

  const updateThumbPosition = useCallback(() => {
    const el = contentRef.current;
    const thumb = thumbRef.current;
    const track = trackRef.current;
    if (!el || !thumb || !track) return;

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max((el.clientHeight / el.scrollHeight) * trackHeight, 30);
    const scrollableHeight = el.scrollHeight - el.clientHeight;
    const scrollProgress = scrollableHeight > 0 ? el.scrollTop / scrollableHeight : 0;
    const thumbTop = scrollProgress * (trackHeight - thumbHeight);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  }, []);

  const checkOverflow = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const overflow = el.scrollHeight > el.clientHeight;
    setHasOverflow(overflow);

    if (overflow) {
      requestAnimationFrame(updateThumbPosition);
    }
  }, [updateThumbPosition]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(updateThumbPosition);
  }, [updateThumbPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const el = contentRef.current;
    if (!el) return;

    // Initial check after a small delay to ensure content is rendered
    const timeoutId = setTimeout(checkOverflow, 50);

    el.addEventListener('scroll', handleScroll, { passive: true });

    // Update on resize or content changes
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(el);

    // Also observe children for content changes
    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen, checkOverflow, handleScroll]);

  return { contentRef, thumbRef, trackRef, hasOverflow };
}
