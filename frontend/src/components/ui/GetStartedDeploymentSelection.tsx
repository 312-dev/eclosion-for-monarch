/**
 * GetStartedDeploymentSelection
 *
 * Step 1 of the Get Started wizard - choose deployment type.
 * Shows different descriptions based on coder mode.
 */

import {
  MonitorIcon,
  ServerIcon,
  ZapIcon,
  GiftIcon,
  SyncIcon,
  ShieldIcon,
  RocketIcon,
  CheckIcon,
  type IconProps,
} from '../icons';
import { useCoderModeSafe } from '../../context/CoderModeContext';

export type DeploymentType = 'desktop' | 'selfhosted';

interface Feature {
  text: string;
  icon: React.ComponentType<IconProps>;
}

interface DeploymentOption {
  id: DeploymentType;
  icon: typeof MonitorIcon;
  title: string;
  titleCoder: string;
  description: string;
  descriptionCoder: string;
  badge?: string;
  features: Feature[];
  featuresCoder: Feature[];
}

const DEPLOYMENT_OPTIONS: DeploymentOption[] = [
  {
    id: 'desktop',
    icon: MonitorIcon,
    title: 'Desktop App',
    titleCoder: 'Desktop App',
    description: 'Download for your computer. Syncs while the app is open.',
    descriptionCoder: 'Electron app with embedded backend. Local SQLite database.',
    badge: 'Simplest',
    features: [
      { text: 'Free forever', icon: GiftIcon },
      { text: 'No server to manage', icon: RocketIcon },
      { text: 'Syncs to Monarch', icon: SyncIcon },
    ],
    featuresCoder: [
      { text: 'Local data storage', icon: ServerIcon },
      { text: 'Sync on-demand', icon: SyncIcon },
      { text: 'Auto-updates', icon: RocketIcon },
    ],
  },
  {
    id: 'selfhosted',
    icon: ServerIcon,
    title: 'Self-Hosted',
    titleCoder: 'Self-Hosted',
    description: 'You manage everything yourself. Requires technical knowledge.',
    descriptionCoder: 'Docker Compose or Kubernetes. Full infrastructure control.',
    features: [
      { text: 'Free (your hardware)', icon: GiftIcon },
      { text: 'Complete control', icon: ShieldIcon },
    ],
    featuresCoder: [
      { text: 'Custom domains', icon: ServerIcon },
      { text: 'Full customization', icon: ShieldIcon },
      { text: 'No vendor lock-in', icon: GiftIcon },
    ],
  },
];

interface DeploymentCardProps {
  option: DeploymentOption;
  selected: boolean;
  recommended: boolean;
  isCoderMode: boolean;
  onClick: () => void;
}

function DeploymentCard({
  option,
  selected,
  recommended,
  isCoderMode,
  onClick,
}: DeploymentCardProps) {
  const Icon = option.icon;
  const title = isCoderMode ? option.titleCoder : option.title;
  const description = isCoderMode ? option.descriptionCoder : option.description;
  const features = isCoderMode ? option.featuresCoder : option.features;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all w-full
        hover:scale-[1.01] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          selected
            ? 'border-(--monarch-orange) bg-(--monarch-orange-bg,rgba(255,107,0,0.08))'
            : 'border-(--monarch-border) bg-(--monarch-bg-card) hover:border-(--monarch-orange-light,#ff8533)'
        }
      `}
      style={{
        // @ts-expect-error CSS custom property
        '--tw-ring-color': 'var(--monarch-text-muted)',
      }}
      aria-pressed={selected}
    >
      {/* Badges */}
      <div className="absolute -top-2.5 right-3 flex gap-1.5">
        {recommended && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--monarch-orange)' }}
          >
            <ZapIcon size={10} />
            Recommended
          </span>
        )}
        {option.badge && !recommended && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--monarch-bg-hover)',
              color: 'var(--monarch-text)',
            }}
          >
            {option.badge}
          </span>
        )}
      </div>

      {/* Icon and Title */}
      <div className="flex items-center gap-2.5 mt-1">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-hover)' }}>
          <Icon size={20} color="var(--monarch-orange)" />
        </div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
          {title}
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--monarch-text)' }}>
        {description}
      </p>

      {/* Features - inline */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {features.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <span
              key={feature.text}
              className="inline-flex items-center gap-1 text-xs"
              style={{ color: 'var(--monarch-text-muted)' }}
            >
              <FeatureIcon size={10} color="var(--monarch-orange)" />
              {feature.text}
            </span>
          );
        })}
      </div>

      {/* Selection indicator */}
      {selected && (
        <div
          className="absolute top-3 right-3 p-1 rounded-full"
          style={{ backgroundColor: 'var(--monarch-orange)' }}
        >
          <CheckIcon size={12} color="white" />
        </div>
      )}
    </button>
  );
}

interface GetStartedDeploymentSelectionProps {
  selected: DeploymentType | null;
  onSelect: (type: DeploymentType) => void;
}

export function GetStartedDeploymentSelection({
  selected,
  onSelect,
}: GetStartedDeploymentSelectionProps) {
  const coderMode = useCoderModeSafe();
  const isCoderMode = coderMode?.isCoderMode ?? false;

  const desktopOption = DEPLOYMENT_OPTIONS.find((o) => o.id === 'desktop')!;
  const selfhostedOption = DEPLOYMENT_OPTIONS.find((o) => o.id === 'selfhosted')!;

  return (
    <div className="space-y-3">
      <p className="text-sm text-center" style={{ color: 'var(--monarch-text-muted)' }}>
        {isCoderMode
          ? 'Choose your deployment strategy based on your infrastructure preferences.'
          : 'Pick how you want to run Eclosion. Not sure? Desktop is the easiest way to get started.'}
      </p>

      {/* Desktop - Full width row */}
      <DeploymentCard
        option={desktopOption}
        selected={selected === 'desktop'}
        recommended={!isCoderMode}
        isCoderMode={isCoderMode}
        onClick={() => onSelect('desktop')}
      />

      {/* Self-hosted option */}
      <DeploymentCard
        option={selfhostedOption}
        selected={selected === 'selfhosted'}
        recommended={false}
        isCoderMode={isCoderMode}
        onClick={() => onSelect('selfhosted')}
      />
    </div>
  );
}
