/**
 * WelcomeStep - Initial welcome screen for the setup wizard
 */

import { Upload } from 'lucide-react';
import { RecurringIcon } from '../WizardComponents';
import { AppIcon } from '../SetupWizardIcons';

interface FeatureCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
          {description}
        </div>
      </div>
    </div>
  );
}

interface WelcomeStepProps {
  readonly onRestoreFromBackup?: () => void;
}

export function WelcomeStep({ onRestoreFromBackup }: WelcomeStepProps) {
  return (
    <div className="text-center animate-fade-in">
      <div className="mb-4 flex justify-center">
        <AppIcon size={64} />
      </div>
      <h2 className="text-xl mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
        Welcome to <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 600 }}>Eclosion</span>
      </h2>
      <p className="mb-4" style={{ color: 'var(--monarch-orange)', fontStyle: 'italic' }}>
        A toolkit to evolve your Monarch experience
      </p>
      <p className="mb-6" style={{ color: 'var(--monarch-text-muted)' }}>
        Eclosion extends Monarch Money with additional features and automation. Here's what's available:
      </p>

      <div className="space-y-3 text-left">
        <div
          className="text-xs font-medium uppercase tracking-wide px-3 pt-2"
          style={{ color: 'var(--monarch-text-muted)' }}
        >
          Available Modules
        </div>
        <FeatureCard
          icon={<RecurringIcon />}
          title="Recurring Expenses"
          description="Track subscriptions and bills with smart budgeting, automatic catch-up calculations, and rollup categories."
        />
      </div>

      {onRestoreFromBackup && (
        <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
          <button
            type="button"
            onClick={onRestoreFromBackup}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--monarch-text-muted)' }}
          >
            <Upload size={16} />
            <span>Restore from backup</span>
          </button>
          <p className="mt-1 text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
            Have a backup from another instance? Import it to restore your settings.
          </p>
        </div>
      )}
    </div>
  );
}
