/**
 * GetStartedDeploymentContent - Deployment options for the GetStarted modal
 */

import type { ReactNode } from 'react';
import { ExternalLinkIcon, ZapIcon, CheckIcon, GitHubIcon, GiftIcon } from '../icons';

/** Visual checkmark/cross for feature comparison */
function FeatureValue({ positive, children }: Readonly<{ positive: boolean; children: ReactNode }>) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm"
      style={{ color: positive ? 'var(--monarch-green)' : 'var(--monarch-text-muted)' }}
    >
      {positive && <CheckIcon size={14} />}
      {children}
    </span>
  );
}

/** Feature row for deployment comparison */
function FeatureRow({
  label,
  quickSetup,
  quickSetupPositive = true,
  selfHosted,
  selfHostedPositive = true
}: Readonly<{
  label: string;
  quickSetup: string;
  quickSetupPositive?: boolean;
  selfHosted: string;
  selfHostedPositive?: boolean;
}>) {
  return (
    <tr className="border-b border-(--monarch-border)">
      <td className="py-2 pr-4 text-sm font-medium text-(--monarch-text-dark)">
        {label}
      </td>
      <td className="py-2 px-4 text-center">
        <FeatureValue positive={quickSetupPositive}>{quickSetup}</FeatureValue>
      </td>
      <td className="py-2 pl-4 text-center">
        <FeatureValue positive={selfHostedPositive}>{selfHosted}</FeatureValue>
      </td>
    </tr>
  );
}

export function GetStartedDeploymentContent() {
  return (
    <div className="space-y-4">
      {/* Promo Banner - Inline */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{ backgroundColor: 'var(--monarch-orange-bg, rgba(255, 107, 0, 0.08))' }}
      >
        <GiftIcon size={16} color="var(--monarch-orange)" className="shrink-0" />
        <span style={{ color: 'var(--monarch-text-dark)' }}>
          <strong>$20 free credits</strong>
          <span style={{ color: 'var(--monarch-text-muted)' }}> — covers ~4 months of hosting</span>
        </span>
      </div>

      {/* Comparison Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-(--monarch-border)">
            <th className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-(--monarch-text-muted)">
              &nbsp;
            </th>
            <th className="py-2 px-4 text-center">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}>
                <ZapIcon size={10} />
                Recommended
              </div>
              <div className="mt-1 text-sm font-semibold text-(--monarch-text-dark)">Quick Setup</div>
              <div className="text-xs text-(--monarch-text-muted)">~$5-7/mo on Railway</div>
            </th>
            <th className="py-2 pl-4 text-center">
              <div className="h-5" /> {/* Spacer to align with badge */}
              <div className="mt-1 text-sm font-semibold text-(--monarch-text-dark)">Self-Hosted</div>
              <div className="text-xs text-(--monarch-text-muted)">Free</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <FeatureRow label="Getting started" quickSetup="One click" selfHosted="Multiple steps" selfHostedPositive={false} />
          <FeatureRow label="Updates" quickSetup="Automatic" selfHosted="Manual" selfHostedPositive={false} />
          <FeatureRow label="HTTPS included" quickSetup="Yes" selfHosted="You configure" selfHostedPositive={false} />
          <FeatureRow label="Technical knowledge" quickSetup="None needed" selfHosted="Required" selfHostedPositive={false} />
          <FeatureRow label="Customization" quickSetup="Standard" quickSetupPositive={false} selfHosted="Full control" />
        </tbody>
      </table>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="https://railway.app/template/eclosion"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg text-white transition-all hover:scale-[1.01] hover:shadow-md"
          style={{ backgroundColor: 'var(--monarch-orange)' }}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <ZapIcon size={16} />
            Deploy to Railway
            <ExternalLinkIcon size={14} className="opacity-70" />
          </span>
          <span className="text-xs opacity-80">One-click setup</span>
        </a>
        <a
          href="https://github.com/312-dev/eclosion/wiki"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg border transition-all hover:scale-[1.01]"
          style={{
            borderColor: 'var(--monarch-border)',
            color: 'var(--monarch-text-dark)',
            backgroundColor: 'transparent',
          }}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <GitHubIcon size={16} />
            Self-Host Guide
            <ExternalLinkIcon size={14} className="opacity-50" />
          </span>
          <span className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>Docker setup</span>
        </a>
      </div>
    </div>
  );
}
