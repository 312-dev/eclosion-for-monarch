/**
 * ThresholdInput - Input component for auto-add threshold setting
 */

interface ThresholdInputProps {
  readonly defaultValue: number | null | undefined;
  readonly disabled: boolean;
  readonly onChange: (value: number | null) => void;
}

export function ThresholdInput({ defaultValue, disabled, onChange }: ThresholdInputProps) {
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value ? Number.parseFloat(e.target.value) : null;
    if (value !== defaultValue) {
      onChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>$</span>
      <input
        type="number"
        defaultValue={defaultValue ?? ''}
        placeholder="any"
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className="w-16 px-2 py-1 text-right rounded text-sm"
        style={{
          border: '1px solid var(--monarch-border)',
          backgroundColor: 'var(--monarch-bg-card)',
          color: 'var(--monarch-text-dark)',
        }}
      />
      <span className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>/mo</span>
    </div>
  );
}
