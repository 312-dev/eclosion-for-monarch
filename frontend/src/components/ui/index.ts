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
export { Card, type CardProps, type CardHeaderProps, type CardBodyProps, type CardFooterProps } from './Card';
export { CloseButton, type CloseButtonProps } from './CloseButton';
export { Modal, type ModalProps } from './Modal';
export { Tooltip, TooltipProvider, type TooltipProps } from './Tooltip';

// Feedback components
export { LoadingSpinner, LoadingOverlay, type LoadingSpinnerProps } from './LoadingSpinner';
export { EmptyState, EmptyStateIcon, type EmptyStateProps } from './EmptyState';
export { StatusBadge, type StatusBadgeProps } from './StatusBadge';
export { ProgressBar, type ProgressBarProps } from './ProgressBar';

// Form components
export { CurrencyInput, type CurrencyInputProps } from './CurrencyInput';

// Display components
export { MerchantIcon, type MerchantIconProps } from './MerchantIcon';

// Re-export icons from the centralized icons module for convenience
export * from '../icons';
