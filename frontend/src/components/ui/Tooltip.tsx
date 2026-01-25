/**
 * Tooltip - Custom tooltip component using Radix UI
 *
 * Replaces native browser tooltips with styled, accessible tooltips.
 * For non-interactive content only (text hints, labels).
 *
 * Usage:
 *   <Tooltip content="Helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 *
 * For interactive content (scrollable lists, buttons), use HoverCard instead.
 */

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

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
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  disabled = false,
}: TooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={5}
          collisionPadding={10}
          className="z-tooltip max-w-xs rounded-md px-3 py-2 text-sm leading-relaxed shadow-tooltip animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          style={{
            backgroundColor: 'var(--monarch-tooltip-bg)',
            color: 'var(--monarch-tooltip-text)',
          }}
        >
          {content}
          <RadixTooltip.Arrow style={{ fill: 'var(--monarch-tooltip-bg)' }} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
