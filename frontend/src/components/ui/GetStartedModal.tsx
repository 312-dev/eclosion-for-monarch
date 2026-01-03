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

function DeploymentOption({
  title,
  subtitle,
  price,
  features,
  buttonText,
  buttonHref,
  isPrimary = false,
  badge,
}: {
  title: string;
  subtitle: string;
  price: string;
  features: string[];
  buttonText: string;
  buttonHref: string;
  isPrimary?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative flex flex-col p-6 rounded-xl border-2 ${
        isPrimary
          ? 'border-[var(--monarch-orange)] bg-[var(--monarch-orange)] bg-opacity-5'
          : 'border-[var(--monarch-border)] bg-[var(--monarch-bg-light)]'
      }`}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-3 left-4 px-3 py-1 text-xs font-semibold rounded-full bg-[var(--monarch-orange)] text-white">
          {badge}
        </div>
      )}

      {/* Title & Subtitle */}
      <h3 className="text-lg font-semibold text-[var(--monarch-text-dark)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--monarch-text)] mb-2">{subtitle}</p>

      {/* Price */}
      <p className="text-2xl font-bold text-[var(--monarch-text-dark)] mb-4">
        {price}
      </p>

      {/* Features */}
      <ul className="flex-1 space-y-2 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-[var(--monarch-text)]">
            <CheckIcon
              size={16}
              className="flex-shrink-0 mt-0.5"
              color="var(--monarch-green)"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button */}
      <a
        href={buttonHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg font-medium transition-colors ${
          isPrimary
            ? 'bg-[var(--monarch-orange)] text-white hover:opacity-90'
            : 'border-2 border-[var(--monarch-border)] text-[var(--monarch-text-dark)] hover:bg-[var(--monarch-bg-page)]'
        }`}
      >
        {buttonText}
        <ExternalLinkIcon size={16} />
      </a>
    </div>
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
              <TermsTableRow label="Storage" value="Credentials stored on YOUR server, not ours" />
              <TermsTableRow label="Encryption" value="AES-256 encryption with your passphrase" />
              <TermsTableRow label="Recovery" value="We cannot recover lost passphrases" isWarning />
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Easy Mode */}
        <div className="flex flex-col">
          <DeploymentOption
            title="Easy Mode"
            subtitle="Powered by Railway"
            price="$5-7/mo"
            features={[
              'One-click deployment',
              'Automatic updates',
              'Managed SSL certificates',
              'No technical setup required',
              'Persistent data storage',
            ]}
            buttonText="Deploy to Railway"
            buttonHref="https://railway.app/template/eclosion"
            isPrimary
            badge="Recommended"
          />
          <p className="text-xs text-[var(--monarch-text-muted)] text-center mt-3 px-2">
            Affiliate link — you get $20 in credits, and Eclosion earns a commission
          </p>
        </div>

        {/* Expert Mode */}
        <DeploymentOption
          title="Expert Mode"
          subtitle="Self-hosted"
          price="Free"
          features={[
            'Run on your own server',
            'Full control over your data',
            'Docker or local setup',
            'No recurring costs',
            'Requires technical knowledge',
          ]}
          buttonText="View Documentation"
          buttonHref="https://github.com/graysoncadams/eclosion#self-hosted"
        />
      </div>

      <p className="mt-6 text-xs text-center text-[var(--monarch-text-muted)]">
        Both options give you the same features. Railway is recommended for ease of use.
        <br />
        Your Monarch credentials are encrypted and never shared.
      </p>
    </>
  );
}

export function GetStartedModal({ isOpen, onClose }: GetStartedModalProps) {
  // Check if terms were already accepted
  const [termsAccepted, setTermsAcceptedState] = useState(() => hasAcceptedTerms());
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgment when modal opens
  useEffect(() => {
    if (isOpen && !termsAccepted) {
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
