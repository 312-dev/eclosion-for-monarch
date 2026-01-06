import { useState } from 'react';

/**
 * FrustrationCard
 *
 * Individual scenario card for the "Sound familiar?" section.
 * Displays a relatable frustration that Eclosion solves.
 * Supports dramatic stacking animation via animationClass.
 */

interface FrustrationCardProps {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ComponentType<{ size?: number; className?: string }>;
  readonly iconColor: string;
  readonly iconBg: string;
  readonly animationClass?: string;
  readonly yesText?: string;
  readonly noText?: string;
  readonly solutionMessage?: string;
  readonly onDismiss?: () => void;
}

export function FrustrationCard({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  animationClass = '',
  yesText = 'Yes',
  noText = 'Not really',
  solutionMessage = 'We got you covered.',
  onDismiss,
}: FrustrationCardProps) {
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = () => {
    setSelected('no');
    setIsDismissing(true);
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  return (
    <article
      className={`frustration-card frustration-card-single ${animationClass} ${isDismissing ? 'frustration-swipe-away' : ''}`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={20} className={iconColor} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--monarch-text-dark)]">{title}</h3>
      </div>
      <p className="text-sm text-[var(--monarch-text-muted)] leading-relaxed mb-4">{description}</p>
      <div className="flex gap-2 items-center">
        {selected === 'yes' ? (
          <span className="px-4 py-1.5 text-sm font-medium rounded-full bg-teal-500 text-white cursor-default">
            {yesText}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setSelected('yes')}
            className="px-4 py-1.5 text-sm font-medium rounded-full transition-colors bg-teal-500/10 text-teal-300/80 hover:bg-teal-500/20 hover:text-teal-200"
          >
            {yesText}
          </button>
        )}
        {selected === 'yes' ? (
          <span className="text-sm text-teal-500 animate-fade-in">
            {solutionMessage}
          </span>
        ) : (
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-1.5 text-sm font-medium rounded-full transition-colors bg-rose-500/10 text-rose-300/80 hover:bg-rose-500/20 hover:text-rose-200"
          >
            {noText}
          </button>
        )}
      </div>
    </article>
  );
}
