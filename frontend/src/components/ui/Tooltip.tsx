/**
 * Tooltip - Custom tooltip component using Radix UI
 *
 * Replaces native browser tooltips with styled, accessible tooltips.
 *
 * Usage:
 *   <Tooltip content="Helpful text">
 *     <button>Hover me</button>
 *   </Tooltip>
 */

import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export interface TooltipProps {
  /** The content to display in the tooltip */
  content: ReactNode;
  /** The element that triggers the tooltip */
  children: ReactNode;
  /** Side of the trigger to show the tooltip */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment relative to the trigger */
  align?: 'start' | 'center' | 'end';
  /** Delay before showing (ms) */
  delayDuration?: number;
  /** Whether the tooltip is disabled */
  disabled?: boolean;
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
          className="z-tooltip max-w-xs rounded-md bg-monarch-tooltip-bg px-3 py-2 text-sm leading-relaxed text-monarch-tooltip-text shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        >
          {content}
          <RadixTooltip.Arrow style={{ fill: 'var(--monarch-tooltip-bg)' }} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
