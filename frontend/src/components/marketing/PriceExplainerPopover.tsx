/**
 * PriceExplainerPopover
 *
 * Clickable trigger that explains the ~$5/mo cost.
 * Opens a popover with friendly explanation of hosting costs.
 * Accepts children as the trigger text.
 */

import type { ReactNode } from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useLandingContent } from '../../hooks';

interface PriceExplainerPopoverProps {
  readonly children: ReactNode;
}

interface PopoverPosition {
  top: number;
  left: number;
  transform: string;
}

export function PriceExplainerPopover({ children }: Readonly<PriceExplainerPopoverProps>) {
  const { getContent } = useLandingContent();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0, transform: 'translateX(-50%)' });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate position when opening, keeping popover within viewport
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = 280; // Approximate width for mobile
      const padding = 16; // Padding from viewport edges
      const viewportWidth = window.innerWidth;

      // Calculate center position
      const centerX = rect.left + rect.width / 2;

      // Check if centering would overflow on mobile
      const wouldOverflowRight = centerX + popoverWidth / 2 > viewportWidth - padding;
      const wouldOverflowLeft = centerX - popoverWidth / 2 < padding;

      let left: number;
      let transform: string;

      if (wouldOverflowRight) {
        // Align to right edge of viewport with padding
        left = viewportWidth - padding;
        transform = 'translateX(-100%)';
      } else if (wouldOverflowLeft) {
        // Align to left edge of viewport with padding
        left = padding;
        transform = 'translateX(0)';
      } else {
        // Center under trigger
        left = centerX + window.scrollX;
        transform = 'translateX(-50%)';
      }

      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left,
        transform,
      });
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Update position on open and scroll/resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="price-explainer-trigger"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {children}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Pricing explanation"
            className="price-explainer-popover animate-scale-in"
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              transform: position.transform,
            }}
          >
          <h3>&ldquo;Wait, I thought this was free?&rdquo;</h3>

          <p>
            Eclosion is 100% free and open source. The ~$5/mo covers hosting
            your server (Railway, etc.) — not us.
          </p>

          <p>
            {getContent('priceExplainer', 'technicalOption')}
          </p>

          <p>
            <Link to="/demo" className="text-[var(--monarch-orange)] underline">
              Try the demo
            </Link>{' '}
            to see if it&apos;s worth it.
          </p>
        </div>,
          document.body
        )}
    </span>
  );
}
