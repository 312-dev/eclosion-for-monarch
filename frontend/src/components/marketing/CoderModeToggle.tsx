/**
 * CoderModeToggle
 *
 * Accessible toggle switch for switching between "Not a coder" and "I'm a coder" modes.
 * Controls whether technical language and GitHub links are shown on the landing page.
 */

import { useCoderMode } from '../../context';
import { Icons } from '../icons';

export function CoderModeToggle() {
  const { isCoderMode, toggleCoderMode } = useCoderMode();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-(--monarch-bg-page)/50 border border-(--monarch-border)">
      {/* "Not a coder" option */}
      <button
        type="button"
        onClick={() => isCoderMode && toggleCoderMode()}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200 ${
          isCoderMode
            ? 'text-(--monarch-text-muted) hover:text-(--monarch-text)'
            : 'bg-(--monarch-border) text-(--monarch-text-dark)'
        }`}
        aria-pressed={!isCoderMode}
      >
        <Icons.Smile className="w-4 h-4" />
        <span>Not a coder</span>
      </button>

      {/* "I'm a coder" option */}
      <button
        type="button"
        onClick={() => !isCoderMode && toggleCoderMode()}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-200 ${
          isCoderMode
            ? 'bg-(--monarch-border) text-(--monarch-text-dark)'
            : 'text-(--monarch-text-muted) hover:text-(--monarch-text)'
        }`}
        aria-pressed={isCoderMode}
      >
        <Icons.GitHub className="w-4 h-4" />
        <span>I'm a coder</span>
      </button>
    </div>
  );
}
