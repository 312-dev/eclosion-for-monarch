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

interface PriceExplainerPopoverProps {
  readonly children: ReactNode;
}

interface PopoverPosition {
  top: number;
  left: number;
}

export function PriceExplainerPopover({ children }: Readonly<PriceExplainerPopoverProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Calculate position when opening
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + rect.width / 2 + window.scrollX,
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
              transform: 'translateX(-50%)',
            }}
          >
          <h3>&ldquo;Wait, I thought this was free?&rdquo;</h3>

          <p>
            Eclosion is 100% free and open source. The ~$5/mo covers hosting
            your server (Railway, etc.) — not us.
          </p>

          <p>
            <strong>Already technical?</strong> Self-host on your own hardware
            for $0.
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
