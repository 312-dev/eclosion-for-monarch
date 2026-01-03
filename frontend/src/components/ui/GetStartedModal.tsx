/**
 * Get Started Modal
 *
 * Presents deployment options for the user:
 * - Easy Mode: One-click Railway deployment
 * - Expert Mode: Self-hosted Docker setup
 *
 * Shows terms of service on first visit that must be accepted before
 * displaying deployment options.
 */

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { ExternalLinkIcon, CheckIcon, WarningIcon, ShieldIcon } from '../icons';
import { hasAcceptedTerms, setTermsAccepted } from './TermsModal';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

/** Table row component for terms display */
function TermsTableRow({ label, value, isWarning = false }: Readonly<{ label: string; value: string; isWarning?: boolean }>) {
  return (
    <tr className="border-b" style={{ borderColor: 'var(--monarch-border)' }}>
      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
        {label}
      </td>
      <td className="py-2 flex items-center gap-1.5" style={{ color: 'var(--monarch-text)' }}>
        {isWarning && <WarningIcon size={14} color="var(--monarch-warning)" />}
        {value}
      </td>
    </tr>
  );
}

/** Status indicator for terms compliance table */
function StatusIndicator({ status, text }: Readonly<{ status: 'ok' | 'warning'; text: string }>) {
  const Icon = status === 'ok' ? CheckIcon : WarningIcon;
  const color = status === 'ok' ? 'var(--monarch-green)' : 'var(--monarch-warning)';

  return (
    <span className="flex items-center gap-1.5">
      <Icon size={14} color={color} />
      <span>{text}</span>
    </span>
  );
}

/** Terms content component */
function TermsContent({ acknowledged, onAcknowledgeChange }: Readonly<{ acknowledged: boolean; onAcknowledgeChange: (v: boolean) => void }>) {
  return (
    <div className="space-y-6">
      {/* Scrollable terms content */}
      <div className="max-h-[45vh] overflow-y-auto pr-2 space-y-6">
        {/* Summary table */}
        <section>
          <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--monarch-text-dark)' }}>
            What You're Accepting
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <TermsTableRow label="Hosting" value="You manage your own Railway/Docker instance" />
              <TermsTableRow label="Support" value="No customer support — this is a self-hosted tool" />
              <TermsTableRow label="Credentials" value="You secure and maintain your Monarch login" />
              <TermsTableRow label="Compliance" value="You accept risks of using Monarch's API" isWarning />
            </tbody>
          </table>
        </section>

        {/* Self-Managed Instance */}
        <section>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Self-Managed Instance
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--monarch-text)' }}>
            <strong>Eclosion is not a paid service with customer support.</strong> When you deploy
            Eclosion, you're creating your own personal instance.
          </p>
          <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color: 'var(--monarch-text)' }}>
            <li>You're responsible for keeping your instance running</li>
            <li>There's no support team to call if something breaks</li>
            <li>Railway or Docker issues should be directed to those providers</li>
            <li>Data backups and maintenance are your responsibility</li>
          </ul>
        </section>

        {/* Credential Security */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <ShieldIcon size={18} color="var(--monarch-orange)" />
            <h3 className="text-base font-semibold" style={{ color: 'var(--monarch-text-dark)' }}>
              Credential Security
            </h3>
          </div>
          <p className="text-sm mb-3" style={{ color: 'var(--monarch-text)' }}>
            Your Monarch Money credentials are stored <strong>on your own server</strong>,
            encrypted with a passphrase only you know.
          </p>
          <table className="w-full text-sm">
            <tbody>
              <TermsTableRow label="Storage" value="Credentials stored only on YOUR server" />
              <TermsTableRow label="Encryption" value="AES-256 encryption with your passphrase" />
              <TermsTableRow label="Recovery" value="Lost passphrases cannot be recovered" isWarning />
              <TermsTableRow label="Responsibility" value="You accept full responsibility for security" />
            </tbody>
          </table>
        </section>

        {/* Monarch Money Integration */}
        <section>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Monarch Money Integration
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--monarch-text)' }}>
            <strong>Eclosion is an unofficial third-party tool.</strong> Not affiliated with or
            endorsed by Monarch Money.
          </p>

          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            Compliance Considerations
          </h4>
          <div className="text-sm space-y-2 mb-3" style={{ color: 'var(--monarch-text)' }}>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
              <span>Uses Monarch API with YOUR credentials</span>
              <StatusIndicator status="ok" text="Your own data" />
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
              <span>Programmatic access</span>
              <StatusIndicator status="warning" text="Technically prohibited" />
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
              <span>Rate limiting implemented</span>
              <StatusIndicator status="ok" text="Responsible usage" />
            </div>
            <div className="flex justify-between py-1.5 border-b" style={{ borderColor: 'var(--monarch-border)' }}>
              <span>Account restriction risk</span>
              <StatusIndicator status="warning" text="Theoretically possible" />
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--monarch-text)' }}>
            By using Eclosion, you acknowledge and accept these risks.
          </p>
          <a
            href="https://www.monarchmoney.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm mt-2 hover:underline"
            style={{ color: 'var(--monarch-orange)' }}
          >
            Monarch Terms of Service
            <ExternalLinkIcon size={14} />
          </a>
        </section>

        {/* No Warranty */}
        <section>
          <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--monarch-text-dark)' }}>
            No Warranty
          </h3>
          <p className="text-sm mb-2" style={{ color: 'var(--monarch-text)' }}>
            Eclosion is open source software provided "as-is" without any warranty.
          </p>
          <ul className="text-sm space-y-1.5 list-disc list-inside" style={{ color: 'var(--monarch-text)' }}>
            <li>Not liable for data loss, service interruptions, or API changes</li>
            <li>Features may break if Monarch changes their API</li>
            <li>You use this tool at your own risk</li>
          </ul>
        </section>
      </div>

      {/* Acknowledgment checkbox */}
      <label className="flex items-start gap-3 cursor-pointer pt-4 border-t" style={{ borderColor: 'var(--monarch-border)' }}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => onAcknowledgeChange(e.target.checked)}
          className="mt-1 w-4 h-4 accent-(--monarch-orange)"
        />
        <span className="text-sm" style={{ color: 'var(--monarch-text)' }}>
          I understand this is a self-hosted tool with no support, I accept responsibility for my
          credentials and usage, and I acknowledge that using Monarch's API may not comply with
          their Terms of Service.
        </span>
      </label>
    </div>
  );
}

/** Deployment options content */
function DeploymentContent() {
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
          href="https://docs.eclosion.app/self-hosting"
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

export function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  // Check if terms were already accepted
  const [termsAccepted, setTermsAcceptedState] = useState(() => hasAcceptedTerms());
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgment when modal opens
  useEffect(() => {
    if (isOpen && !termsAccepted) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset form state on modal open
      setAcknowledged(false);
    }
  }, [isOpen, termsAccepted]);

  const handleAcceptTerms = () => {
    setTermsAccepted();
    setTermsAcceptedState(true);
  };

  // Show terms view if not yet accepted
  if (!termsAccepted) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Before You Get Started"
        description="Please read and acknowledge the following"
        maxWidth="lg"
        closeOnBackdrop={false}
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--monarch-bg-page)',
                color: 'var(--monarch-text)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAcceptTerms}
              disabled={!acknowledged}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: acknowledged ? 'var(--monarch-orange)' : 'var(--monarch-orange-disabled)',
              }}
            >
              I Accept
            </button>
          </div>
        }
      >
        <TermsContent acknowledged={acknowledged} onAcknowledgeChange={setAcknowledged} />
      </Modal>
    );
  }

  // Show deployment options after terms accepted
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Get Started with Eclosion"
      description="Choose how you want to deploy your instance"
      maxWidth="lg"
    >
      <DeploymentContent />
    </Modal>
  );
}
