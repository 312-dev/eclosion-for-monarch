/**
 * Wizard Components
 *
 * Re-exports shared reusable components for setup wizards.
 * Components are split into focused files for maintainability.
 */

// Re-export utilities from centralized location
export {
  formatCurrency,
  formatFrequency,
  formatDueDate,
  FREQUENCY_ORDER,
} from '../../utils';

// Re-export icons from SetupWizardIcons
export {
  AppIcon,
  RecurringIcon,
  EmptyInboxIcon,
  PackageIcon,
  CheckCircleIcon,
  LinkIcon,
  FrequencyIcon,
} from './SetupWizardIcons';

// Re-export wizard UI components
export { StepIndicator, SETUP_WIZARD_STEPS } from './StepIndicator';
export { FeatureCard } from './FeatureCard';
export { WizardNavigation } from './WizardNavigation';
export type { WizardNavigationProps } from './WizardNavigation';
export { TourController, wizardTourStyles } from './TourComponents';

// Re-export item selection components from steps folder
export { MerchantLogo } from './steps/MerchantLogo';
export { ItemCard } from './steps/ItemCard';
export type { ItemCardProps } from './steps/ItemCard';
export { FrequencyGroup } from './steps/FrequencyGroup';
export type { FrequencyGroupProps } from './steps/FrequencyGroup';
