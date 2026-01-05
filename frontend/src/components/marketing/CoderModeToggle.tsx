/**
 * CoderModeToggle
 *
 * Accessible toggle switch for switching between "Not a coder" and "I'm a coder" modes.
 * Controls whether technical language and GitHub links are shown on the landing page.
 */

import { useCoderMode } from '../../context';

export function CoderModeToggle() {
  const { isCoderMode, toggleCoderMode } = useCoderMode();

  return (
    <div className="flex items-center justify-center gap-4 py-6">
      {/* "Not a coder" label */}
      <span
        className={`text-sm font-medium transition-colors select-none ${
          !isCoderMode
            ? 'text-[var(--monarch-text-dark)]'
            : 'text-[var(--monarch-text-muted)]'
        }`}
      >
        Not a coder
      </span>

      {/* Toggle switch */}
      <button
        type="button"
        role="switch"
        aria-checked={isCoderMode}
        aria-label={`Switch to ${isCoderMode ? 'non-coder' : 'coder'} mode`}
        onClick={toggleCoderMode}
        className="relative inline-flex h-8 w-14 items-center rounded-full toggle-switch"
        style={{
          backgroundColor: isCoderMode
            ? 'var(--monarch-orange)'
            : 'var(--monarch-border)',
        }}
      >
        <span
          className="inline-block h-6 w-6 transform rounded-full bg-white shadow-sm toggle-knob"
          style={{
            transform: isCoderMode ? 'translateX(1.625rem)' : 'translateX(0.25rem)',
          }}
        />
      </button>

      {/* "I'm a coder" label */}
      <span
        className={`text-sm font-medium transition-colors select-none ${
          isCoderMode
            ? 'text-[var(--monarch-text-dark)]'
            : 'text-[var(--monarch-text-muted)]'
        }`}
      >
        I&apos;m a coder
      </span>
    </div>
  );
}
