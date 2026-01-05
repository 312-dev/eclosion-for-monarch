/**
 * FrustrationCard
 *
 * Individual scenario card for the "Sound familiar?" section.
 * Displays a relatable frustration that Eclosion solves.
 */

interface FrustrationCardProps {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ComponentType<{ size?: number; className?: string }>;
  readonly iconColor: string;
  readonly iconBg: string;
}

export function FrustrationCard({
  title,
  description,
  icon: Icon,
  iconColor,
  iconBg,
}: FrustrationCardProps) {
  return (
    <article className="frustration-card">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={24} className={iconColor} aria-hidden="true" />
      </div>
      <h3 className="font-semibold text-[var(--monarch-text-dark)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--monarch-text-muted)] leading-relaxed">
        {description}
      </p>
    </article>
  );
}
