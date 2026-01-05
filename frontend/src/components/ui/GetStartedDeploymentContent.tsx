/**
 * GetStartedDeploymentContent - Deployment options for the GetStarted modal
 */

import { ExternalLinkIcon } from '../icons';

/** Feature row for deployment comparison */
function FeatureRow({
  label,
  quickSetup,
  selfHosted
}: Readonly<{
  label: string;
  quickSetup: string;
  selfHosted: string;
}>) {
  return (
    <tr className="border-b border-(--monarch-border)">
      <td className="py-3 pr-4 text-sm font-medium text-(--monarch-text-dark)">
        {label}
      </td>
      <td className="py-3 px-4 text-sm text-(--monarch-text) text-center">
        {quickSetup}
      </td>
      <td className="py-3 pl-4 text-sm text-(--monarch-text) text-center">
        {selfHosted}
      </td>
    </tr>
  );
}

export function GetStartedDeploymentContent() {
  return (
    <div className="space-y-6">
      {/* Comparison Table */}
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-(--monarch-border)">
            <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-wide text-(--monarch-text-muted)">
              &nbsp;
            </th>
            <th className="py-3 px-4 text-center">
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-(--monarch-orange)/10 text-(--monarch-orange) text-xs font-semibold">
                Recommended
              </div>
              <div className="mt-1 text-base font-semibold text-(--monarch-text-dark)">Quick Setup</div>
              <div className="text-lg font-bold text-(--monarch-text-dark)">~$5/mo</div>
            </th>
            <th className="py-3 pl-4 text-center">
              <div className="h-6" /> {/* Spacer to align with badge */}
              <div className="mt-1 text-base font-semibold text-(--monarch-text-dark)">Advanced</div>
              <div className="text-lg font-bold text-(--monarch-text-dark)">Free</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <FeatureRow label="Getting started" quickSetup="One click" selfHosted="Multiple steps" />
          <FeatureRow label="Updates" quickSetup="One click" selfHosted="Manual" />
          <FeatureRow label="Secure connection" quickSetup="Included" selfHosted="You set it up" />
          <FeatureRow label="Technical knowledge" quickSetup="None" selfHosted="Required" />
          <FeatureRow label="Your data" quickSetup="Always saved" selfHosted="You manage it" />
          <FeatureRow label="Customization" quickSetup="Standard" selfHosted="Full control" />
        </tbody>
      </table>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="https://railway.app/template/eclosion"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-lg bg-(--monarch-orange) text-white hover:opacity-90 transition-colors"
        >
          <span className="flex items-center gap-2 font-semibold">
            Set Up Eclosion
            <ExternalLinkIcon size={16} />
          </span>
          <span className="text-xs opacity-80">Hosted on Railway</span>
        </a>
        <a
          href="https://github.com/GraysonCAdams/eclosion-for-monarch/wiki"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 px-4 py-4 rounded-lg border-2 border-(--monarch-border) text-(--monarch-text-dark) hover:bg-(--monarch-bg-page) transition-colors"
        >
          <span className="flex items-center gap-2 font-semibold">
            I&apos;ll Set It Up Myself
            <ExternalLinkIcon size={16} />
          </span>
          <span className="text-xs text-(--monarch-text-muted)">For technical users</span>
        </a>
      </div>

      {/* Footer note */}
      <p className="text-xs text-center text-(--monarch-text-muted)">
        Both options have the same features. Railway offers $5 in free credits to get started.
        <br />
        Your login is encrypted and stored only on your server — no one else can access it.
      </p>
    </div>
  );
}
