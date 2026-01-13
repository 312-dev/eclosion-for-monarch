/**
 * Rate Limit Tooltip
 *
 * Wrapper component that:
 * - Disables child button when rate limited
 * - Shows explanatory tooltip on hover
 *
 * Usage:
 *   <RateLimitTooltip>
 *     <button onClick={handleSync}>Sync</button>
 *   </RateLimitTooltip>
 */

import { cloneElement, isValidElement, type ReactElement } from 'react';
import { Tooltip } from './Tooltip';
import { useIsRateLimited } from '../../context/RateLimitContext';

interface RateLimitTooltipProps {
  /** The element to wrap (should be a button or similar interactive element) */
  children: ReactElement<{ disabled?: boolean }>;
  /** Custom message (defaults to standard rate limit message) */
  message?: string;
  /** Only wrap in tooltip if this is true (for conditional features) */
  requiresApi?: boolean;
}

export function RateLimitTooltip({
  children,
  message = 'Rate limited — please wait a few minutes',
  requiresApi = true,
}: RateLimitTooltipProps) {
  const isRateLimited = useIsRateLimited();

  // If not requiring API or not rate limited, return children as-is
  if (!requiresApi || !isRateLimited) {
    return children;
  }

  // Clone child with disabled prop
  const disabledChild = isValidElement(children)
    ? cloneElement(children, { disabled: true })
    : children;

  // Wrap disabled child in a span so tooltip works on disabled buttons
  // (disabled buttons don't fire mouse events)
  return (
    <Tooltip content={message}>
      <span className="inline-block">{disabledChild}</span>
    </Tooltip>
  );
}
