/**
 * Tooltip - Custom tooltip component using Radix UI
 *
 * Replaces native browser tooltips with styled, accessible tooltips.
 * For non-interactive content only (text hints, labels).
 *
 * On touch devices, the tooltip opens/closes on tap instead of hover.
 *
 * Usage:
 *   <Tooltip content="Helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 *
 * For interactive content (scrollable lists, buttons), use HoverCard instead.
 */

import { useState, useEffect, useRef } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, TIMING } from '../motion';
import { useMediaQuery, breakpoints } from '../../hooks/useMediaQuery';

export interface TooltipProps {
  /** The content to display in the tooltip */
  readonly content: ReactNode;
  /** The element that triggers the tooltip */
  readonly children: ReactNode;
  /** Side of the trigger to show the tooltip */
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to the trigger */
  readonly align?: 'start' | 'center' | 'end';
  /** Delay before showing (ms) */
  readonly delayDuration?: number;
  /** Whether the tooltip is disabled */
  readonly disabled?: boolean;
  /** Additional className for the trigger wrapper span */
  readonly triggerClassName?: string;
}

/** Get slide offset based on tooltip side */
function getSlideOffset(side: 'top' | 'right' | 'bottom' | 'left') {
  switch (side) {
    case 'top':
      return { y: 4 };
    case 'bottom':
      return { y: -4 };
    case 'left':
      return { x: 4 };
    case 'right':
      return { x: -4 };
  }
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  disabled = false,
  triggerClassName,
}: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isTouchDevice = useMediaQuery(breakpoints.isTouchDevice);
  const triggerRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle tap-to-toggle on touch devices via click event
  useEffect(() => {
    if (!isTouchDevice) return;

    const trigger = triggerRef.current;
    if (!trigger) return;

    const handleClick = (e: MouseEvent) => {
      // Toggle open state on tap
      setIsOpen((prev) => !prev);
      // Prevent the click from bubbling to avoid unwanted side effects
      e.stopPropagation();
    };

    trigger.addEventListener('click', handleClick);
    return () => trigger.removeEventListener('click', handleClick);
  }, [isTouchDevice]);

  // Close on tap outside for touch devices
  useEffect(() => {
    if (!isTouchDevice || !isOpen) return;

    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const isOutsideContent = contentRef.current && !contentRef.current.contains(target);

      if (isOutsideTrigger && isOutsideContent) {
        setIsOpen(false);
      }
    };

    // Use pointerdown for immediate response on touch
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isTouchDevice, isOpen]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const slideOffset = getSlideOffset(side);

  // On touch devices, use a no-op for onOpenChange to prevent hover from controlling state
  const handleOpenChange = isTouchDevice ? () => {} : setIsOpen;

  return (
    <RadixTooltip.Root
      delayDuration={isTouchDevice ? 999999 : delayDuration}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <RadixTooltip.Trigger asChild>
        <span
          ref={triggerRef as React.RefObject<HTMLSpanElement>}
          className={`inline-flex ${triggerClassName ?? ''}`}
        >
          {children}
        </span>
      </RadixTooltip.Trigger>
      <AnimatePresence>
        {isOpen && (
          <RadixTooltip.Portal forceMount>
            <RadixTooltip.Content
              side={side}
              align={align}
              sideOffset={5}
              collisionPadding={10}
              asChild
            >
              <motion.div
                ref={contentRef}
                initial={{ opacity: 0, scale: 0.96, ...slideOffset }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, ...slideOffset }}
                transition={{ duration: TIMING.fast }}
                className="z-tooltip max-w-xs rounded-md px-3 py-2 text-sm leading-relaxed shadow-tooltip"
                style={{
                  backgroundColor: 'var(--monarch-tooltip-bg)',
                  color: 'var(--monarch-tooltip-text)',
                }}
              >
                {content}
                <RadixTooltip.Arrow style={{ fill: 'var(--monarch-tooltip-bg)' }} />
              </motion.div>
            </RadixTooltip.Content>
          </RadixTooltip.Portal>
        )}
      </AnimatePresence>
    </RadixTooltip.Root>
  );
}

export { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
