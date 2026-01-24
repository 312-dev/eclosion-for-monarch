/**
 * ToggleSwitch - Reusable toggle switch component for settings
 */

interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: () => void;
  readonly disabled?: boolean;
  readonly ariaLabel: string;
}

export function ToggleSwitch({ checked, onChange, disabled, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full toggle-switch ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        backgroundColor: checked ? 'var(--monarch-orange)' : 'var(--monarch-border)',
      }}
      aria-label={ariaLabel}
    >
      <span
        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm toggle-knob"
        style={{
          transform: checked ? 'translateX(1.225rem)' : 'translateX(0.15rem)',
        }}
      />
    </button>
  );
}
