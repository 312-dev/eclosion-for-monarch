/**
 * Modal Button Components
 *
 * Standardized button components for modal footers.
 * - Primary (teal): Create, Save, Link, Enable, Confirm, Continue
 * - Warning (orange): Accept terms, Reset (with impact), Important confirmations
 * - Destructive (error): Delete, Uninstall, Remove
 * - Secondary (transparent): Cancel, Close
 */

import type { ReactNode, MouseEventHandler } from 'react';

function ButtonSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export type ModalButtonVariant = 'primary' | 'warning' | 'destructive' | 'secondary';

interface BaseButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean | undefined;
  isLoading?: boolean | undefined;
  icon?: ReactNode | undefined;
  className?: string | undefined;
  fullWidth?: boolean | undefined;
  'aria-label'?: string | undefined;
}

interface ModalButtonProps extends BaseButtonProps {
  children: ReactNode;
  loadingText?: string | undefined;
  variant: ModalButtonVariant;
}

const VARIANT_STYLES: Record<
  ModalButtonVariant,
  { bg: string; bgDisabled: string; text: string; textDisabled: string; border?: string }
> = {
  primary: {
    bg: 'var(--monarch-teal)',
    bgDisabled: 'var(--monarch-border)',
    text: 'white',
    textDisabled: 'var(--monarch-text-muted)',
  },
  warning: {
    bg: 'var(--monarch-orange)',
    bgDisabled: 'var(--monarch-border)',
    text: 'white',
    textDisabled: 'var(--monarch-text-muted)',
  },
  destructive: {
    bg: 'var(--monarch-error)',
    bgDisabled: 'var(--monarch-border)',
    text: 'white',
    textDisabled: 'var(--monarch-text-muted)',
  },
  secondary: {
    bg: 'transparent',
    bgDisabled: 'transparent',
    text: 'var(--monarch-text)',
    textDisabled: 'var(--monarch-text-muted)',
    border: '1px solid var(--monarch-border)',
  },
};

/** Base modal button component. Use the specialized exports for most cases. */
export function ModalButton({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  loadingText,
  icon,
  variant,
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
}: ModalButtonProps) {
  const styles = VARIANT_STYLES[variant];
  const isDisabled = disabled || isLoading;
  let cursorClass = '';
  if (isLoading) cursorClass = 'cursor-wait';
  else if (disabled) cursorClass = 'cursor-not-allowed';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isLoading}
      className={`
        px-4 py-2 text-sm font-medium rounded-lg btn-press
        inline-flex items-center justify-center gap-2
        transition-colors
        ${variant === 'secondary' ? 'hover:bg-(--monarch-bg-page)' : ''}
        ${fullWidth ? 'flex-1' : ''}
        ${cursorClass}
        ${className}
      `.trim()}
      style={{
        backgroundColor: isDisabled ? styles.bgDisabled : styles.bg,
        color: isDisabled ? styles.textDisabled : styles.text,
        border: styles.border,
      }}
    >
      {isLoading ? (
        <>
          <ButtonSpinner />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

interface CancelButtonProps extends Omit<BaseButtonProps, 'variant'> {
  children?: ReactNode;
}

/** Cancel/Close button (secondary variant). */
export function CancelButton({
  children = 'Cancel',
  onClick,
  disabled = false,
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
}: CancelButtonProps) {
  return (
    <ModalButton
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={className}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
    >
      {children}
    </ModalButton>
  );
}

interface ActionButtonProps extends Omit<BaseButtonProps, 'variant'> {
  children: ReactNode;
  loadingText?: string | undefined;
}

/** Primary action button (teal). Use for: Create, Save, Link, Enable, Confirm. */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  loadingText,
  icon,
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
}: ActionButtonProps) {
  return (
    <ModalButton
      variant="primary"
      onClick={onClick}
      disabled={disabled}
      isLoading={isLoading}
      loadingText={loadingText}
      icon={icon}
      className={className}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
    >
      {children}
    </ModalButton>
  );
}

/** Warning action button (orange). Use for: Accept terms, Reset, Confirmations. */
export function WarningButton({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  loadingText,
  icon,
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
}: ActionButtonProps) {
  return (
    <ModalButton
      variant="warning"
      onClick={onClick}
      disabled={disabled}
      isLoading={isLoading}
      loadingText={loadingText}
      icon={icon}
      className={className}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
    >
      {children}
    </ModalButton>
  );
}

/** Destructive action button (red). Use for: Delete, Uninstall, Remove. */
export function DestructiveButton({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  loadingText,
  icon,
  className = '',
  fullWidth = false,
  'aria-label': ariaLabel,
}: ActionButtonProps) {
  return (
    <ModalButton
      variant="destructive"
      onClick={onClick}
      disabled={disabled}
      isLoading={isLoading}
      loadingText={loadingText}
      icon={icon}
      className={className}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
    >
      {children}
    </ModalButton>
  );
}

interface StandardFooterProps {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitLoadingLabel?: string;
  isDisabled?: boolean;
  isSubmitting?: boolean;
  variant?: 'primary' | 'warning' | 'destructive';
  cancelLabel?: string;
  fullWidth?: boolean;
  submitIcon?: ReactNode;
}

/** Standard two-button footer: Cancel | Submit */
export function ModalFooter({
  onCancel,
  onSubmit,
  submitLabel,
  submitLoadingLabel,
  isDisabled = false,
  isSubmitting = false,
  variant = 'primary',
  cancelLabel = 'Cancel',
  fullWidth = false,
  submitIcon,
}: StandardFooterProps) {
  const SUBMIT_BUTTON_MAP = {
    destructive: DestructiveButton,
    warning: WarningButton,
    primary: PrimaryButton,
  };
  const SubmitButton = SUBMIT_BUTTON_MAP[variant];

  return (
    <div className="flex items-center justify-end gap-2 w-full">
      <CancelButton onClick={onCancel} fullWidth={fullWidth} disabled={isSubmitting}>
        {cancelLabel}
      </CancelButton>
      <SubmitButton
        onClick={onSubmit}
        disabled={isDisabled}
        isLoading={isSubmitting}
        loadingText={submitLoadingLabel}
        fullWidth={fullWidth}
        icon={submitIcon}
      >
        {submitLabel}
      </SubmitButton>
    </div>
  );
}

interface SingleButtonFooterProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'warning' | 'secondary';
  fullWidth?: boolean;
}

/** Single-button footer for informational modals. */
export function SingleButtonFooter({
  onClick,
  children,
  variant = 'warning',
  fullWidth = true,
}: SingleButtonFooterProps) {
  const SINGLE_BUTTON_MAP = {
    secondary: CancelButton,
    warning: WarningButton,
    primary: PrimaryButton,
  };
  const Button = SINGLE_BUTTON_MAP[variant];

  return (
    <Button onClick={onClick} fullWidth={fullWidth}>
      {children}
    </Button>
  );
}
