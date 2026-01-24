/**
 * UI Components
 *
 * Reusable UI components for consistent styling across the app.
 *
 * Usage:
 *   import { Button, StatusBadge, MerchantIcon } from '../components/ui';
 */

// Core components
export { Button, type ButtonProps } from './Button';
export {
  Card,
  type CardProps,
  type CardHeaderProps,
  type CardBodyProps,
  type CardFooterProps,
} from './Card';
export { CloseButton, type CloseButtonProps } from './CloseButton';
export { Modal, type ModalProps } from './Modal';
export {
  ModalButton,
  CancelButton,
  PrimaryButton,
  WarningButton,
  DestructiveButton,
  ModalFooter,
  SingleButtonFooter,
  type ModalButtonVariant,
} from './ModalButtons';
export { Tooltip, TooltipProvider, type TooltipProps } from './Tooltip';
export { HoverCard, type HoverCardProps } from './HoverCard';

// Feedback components
export { LoadingSpinner, LoadingOverlay, type LoadingSpinnerProps } from './LoadingSpinner';
export { EmptyState, EmptyStateIcon, type EmptyStateProps } from './EmptyState';
export { StatusBadge, type StatusBadgeProps } from './StatusBadge';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';

// Form components
export { CurrencyInput, type CurrencyInputProps } from './CurrencyInput';

// Display components
export { MerchantIcon, type MerchantIconProps } from './MerchantIcon';
export { ToolPageHeader } from './ToolPageHeader';
export { ToolSettingsModal, type ToolType } from './ToolSettingsModal';

// Re-export icons from the centralized icons module for convenience
export * from '../icons';
