import { CheckIcon, CircleIcon, EyeIcon, EyeOffIcon, FingerprintIcon, InfoIcon, ShieldCheckIcon, SpinnerIcon } from '../icons';
import { isDesktopMode } from '../../utils/apiBase';
import type { RequirementCheck } from './PassphraseUtils';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  onToggleShow: () => void;
  placeholder: string;
  error?: string | null;
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleShow,
  placeholder,
  error,
}: Readonly<PasswordInputProps>) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: 'var(--monarch-text-dark)' }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full rounded-lg px-3 py-2 pr-10"
          style={{
            border: `1px solid ${error ? 'var(--monarch-error)' : 'var(--monarch-border)'}`,
            backgroundColor: 'var(--monarch-bg-card)',
          }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
          style={{ color: 'var(--monarch-text-muted)' }}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--monarch-error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

interface RequirementsListProps {
  requirements: RequirementCheck[];
}

export function RequirementsList({ requirements }: Readonly<RequirementsListProps>) {
  return (
    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Passphrase Requirements:
      </p>
      <ul className="space-y-1">
        {requirements.map((req, idx) => (
          <li key={idx} className="flex items-center gap-2 text-xs">
            {req.met ? (
              <CheckIcon size={16} color="var(--monarch-success)" />
            ) : (
              <CircleIcon size={16} color="var(--monarch-text-muted)" />
            )}
            <span style={{ color: req.met ? 'var(--monarch-success)' : 'var(--monarch-text-muted)' }}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BiometricUnlockButtonProps {
  displayName: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  /** If true, shows "or enter passphrase" divider below button. Default: true */
  showPassphraseDivider?: boolean;
}

export function BiometricUnlockButton({
  displayName,
  loading,
  disabled,
  onClick,
  showPassphraseDivider = true,
}: Readonly<BiometricUnlockButtonProps>) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-lg transition-colors disabled:cursor-not-allowed btn-hover-lift flex items-center justify-center gap-2"
        style={{
          backgroundColor: disabled ? 'var(--monarch-orange-disabled)' : 'var(--monarch-orange)',
          color: 'white',
        }}
        aria-label={`Unlock with ${displayName}`}
      >
        {loading ? (
          <>
            <SpinnerIcon size={20} />
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <FingerprintIcon size={20} />
            <span>Unlock with {displayName}</span>
          </>
        )}
      </button>

      {showPassphraseDivider && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--monarch-border)' }} />
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            or enter passphrase
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: 'var(--monarch-border)' }} />
        </div>
      )}
    </>
  );
}

interface BiometricResetBannerProps {
  displayName: string;
}

export function BiometricResetBanner({ displayName }: Readonly<BiometricResetBannerProps>) {
  return (
    <div
      className="mb-4 p-3 rounded-lg text-sm"
      style={{
        backgroundColor: 'var(--monarch-info-bg, var(--monarch-orange-bg))',
        color: 'var(--monarch-info, var(--monarch-orange))',
      }}
    >
      <div className="flex items-start gap-2">
        <InfoIcon size={16} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{displayName} was reset</p>
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            Enter your passphrase below, then you&apos;ll be prompted to re-enable {displayName}.
          </p>
        </div>
      </div>
    </div>
  );
}

export function SecurityNote() {
  const isDesktop = isDesktopMode();
  const description = isDesktop
    ? 'Using AES-256 encryption. Your credentials are stored locally and cannot be decrypted without your passphrase.'
    : 'Using AES-256 encryption. The server cannot decrypt your credentials without your passphrase.';

  return (
    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-elevated)' }}>
      <div className="flex items-start gap-2">
        <ShieldCheckIcon size={16} color="var(--monarch-orange)" className="mt-0.5 flex-shrink-0" />
        <div className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
          <p className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Your credentials are encrypted
          </p>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}
