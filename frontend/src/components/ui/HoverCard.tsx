/**
 * HoverCard - Interactive hover content using Radix UI
 *
 * Unlike Tooltip, HoverCard is designed for interactive content that
 * users might want to hover into, click on, or scroll through.
 *
 * Usage:
 *   <HoverCard content={<InteractiveContent />}>
 *     <button>Hover me</button>
 *   </HoverCard>
 */

import * as RadixHoverCard from '@radix-ui/react-hover-card';
import type { ReactNode } from 'react';

export interface HoverCardProps {
  /** The content to display in the hover card */
  readonly content: ReactNode;
  /** The element that triggers the hover card */
  readonly children: ReactNode;
  /** Side of the trigger to show the card */
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to the trigger */
  readonly align?: 'start' | 'center' | 'end';
  /** Delay before opening (ms) */
  readonly openDelay?: number;
  /** Delay before closing (ms) */
  readonly closeDelay?: number;
}

export function HoverCard({
  content,
  children,
  side = 'bottom',
  align = 'center',
  openDelay = 200,
  closeDelay = 300,
}: HoverCardProps) {
  return (
    <RadixHoverCard.Root openDelay={openDelay} closeDelay={closeDelay}>
      <RadixHoverCard.Trigger asChild>{children}</RadixHoverCard.Trigger>
      <RadixHoverCard.Portal>
        <RadixHoverCard.Content
          side={side}
          align={align}
          sideOffset={5}
          collisionPadding={10}
          className="z-tooltip max-w-sm rounded-md px-3 py-2 text-sm leading-relaxed shadow-tooltip animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          style={{
            backgroundColor: 'var(--monarch-tooltip-bg)',
            color: 'var(--monarch-tooltip-text)',
          }}
        >
          {content}
          <RadixHoverCard.Arrow style={{ fill: 'var(--monarch-tooltip-bg)' }} />
        </RadixHoverCard.Content>
      </RadixHoverCard.Portal>
    </RadixHoverCard.Root>
  );
}
