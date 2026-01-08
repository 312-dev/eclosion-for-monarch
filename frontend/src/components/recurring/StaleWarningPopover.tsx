/**
 * StaleWarningPopover - Clickable warning icon with dismissable explanation
 *
 * Shows a warning icon button that, when clicked, displays a popover
 * explaining why the item is marked as stale.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { WarningFilledIcon, XIcon } from '../icons';
import { Z_INDEX } from '../../constants';

export function StaleWarningPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const triggerId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [close]
  );

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        id={triggerId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View stale item warning"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-monarch-orange"
      >
        <WarningFilledIcon size={16} color="var(--monarch-warning)" />
      </button>

      {isOpen && (
        <div
          id={popoverId}
          role="dialog"
          aria-labelledby={triggerId}
          onKeyDown={handleKeyDown}
          className="absolute left-0 top-full mt-1 py-2 px-3 rounded-lg shadow-lg text-sm min-w-52 bg-monarch-bg-card border border-monarch-border"
          style={{ zIndex: Z_INDEX.POPOVER }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-monarch-text-dark">Possibly Stale</div>
              <div className="text-monarch-text-muted text-xs mt-1">
                Last charge was missed or off from expected date
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Dismiss"
              className="shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors text-monarch-text-muted"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
