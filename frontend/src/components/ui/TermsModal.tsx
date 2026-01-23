/* eslint-disable max-lines -- Terms modal with all legal sections and acknowledgment */
/**
 * Terms Modal
 *
 * Displays terms of service and disclaimers that users must acknowledge
 * before using the app. Shown on "Get Started" and before login.
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { CheckIcon, WarningIcon, ExternalLinkIcon, ShieldIcon } from '../icons';
import { isDesktopMode } from '../../utils/apiBase';

const TERMS_ACCEPTED_KEY = 'eclosion-terms-accepted';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

/** Check if terms have been accepted (stored in localStorage) */
export function hasAcceptedTerms(): boolean {
  try {
    return localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Mark terms as accepted */
export function setTermsAccepted(): void {
  try {
    localStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/** Table row component for consistent styling */
function TableRow({
  label,
  value,
  isWarning = false,
}: {
  label: string;
  value: string;
  isWarning?: boolean;
}) {
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

/** Status indicator component */
function StatusIndicator({ status, text }: { status: 'ok' | 'warning'; text: string }) {
  const Icon = status === 'ok' ? CheckIcon : WarningIcon;
  const color = status === 'ok' ? 'var(--monarch-green)' : 'var(--monarch-warning)';

  return (
    <span className="flex items-center gap-1.5">
      <Icon size={14} color={color} />
      <span>{text}</span>
    </span>
  );
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const isDesktop = isDesktopMode();

  const handleAccept = () => {
    setTermsAccepted();
    onAccept();
  };

  const footer = (
    <div className="flex flex-col w-full gap-4">
      {/* Acknowledgment checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1 w-4 h-4 accent-(--monarch-orange)"
        />
        <span className="text-sm" style={{ color: 'var(--monarch-text)' }}>
          {isDesktop
            ? "I understand this is an open-source tool with no support, I accept responsibility for my credentials and usage, and I acknowledge that using Monarch's API may not comply with their Terms of Service."
            : "I understand this is a self-hosted tool with no support, I accept responsibility for my credentials and usage, and I acknowledge that using Monarch's API may not comply with their Terms of Service."}
        </span>
      </label>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
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
          onClick={handleAccept}
          disabled={!acknowledged}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: acknowledged
              ? 'var(--monarch-orange)'
              : 'var(--monarch-orange-disabled)',
          }}
        >
          I Accept
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Before You Get Started"
      description="Please read and acknowledge the following"
      maxWidth="lg"
      footer={footer}
      closeOnBackdrop={false}
    >
      {/* Scrollable content area */}
      <div
        className="max-h-[50vh] overflow-y-auto pr-2 space-y-6"
        role="region"
        aria-label="Terms and conditions"
        tabIndex={0}
      >
        {/* Summary table */}
        <section>
          <h3
            className="text-base font-semibold mb-3"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            What You're Accepting
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <TableRow
                label={isDesktop ? 'Storage' : 'Hosting'}
                value={
                  isDesktop
                    ? 'Data stored locally on your computer'
                    : 'You manage your own Docker instance'
                }
              />
              <TableRow
                label="Support"
                value={
                  isDesktop
                    ? 'No customer support — this is open-source software'
                    : 'No customer support — this is a self-hosted tool'
                }
              />
              <TableRow label="Credentials" value="You secure and maintain your Monarch login" />
              <TableRow
                label="Compliance"
                value="You accept risks of using Monarch's API"
                isWarning
              />
            </tbody>
          </table>
        </section>

        {/* Self-Managed / Desktop App */}
        <section>
          <h3
            className="text-base font-semibold mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            {isDesktop ? 'Desktop Application' : 'Self-Managed Instance'}
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--monarch-text)' }}>
            <strong>Eclosion is not a paid service with customer support.</strong>{' '}
            {isDesktop
              ? 'This is an open-source desktop application that runs entirely on your computer.'
              : "When you deploy Eclosion, you're creating your own personal instance."}
          </p>
          <ul
            className="text-sm space-y-1.5 list-disc list-inside"
            style={{ color: 'var(--monarch-text)' }}
          >
            {isDesktop ? (
              <>
                <li>All data is stored locally on your computer</li>
                <li>There's no support team to call if something breaks</li>
                <li>Updates are your responsibility</li>
                <li>Data backups are your responsibility</li>
              </>
            ) : (
              <>
                <li>You're responsible for keeping your instance running</li>
                <li>There's no support team to call if something breaks</li>
                <li>Docker or hosting issues should be directed to your provider</li>
                <li>Data backups and maintenance are your responsibility</li>
              </>
            )}
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
            Your Monarch Money credentials are stored{' '}
            <strong>{isDesktop ? 'locally on your computer' : 'on your own server'}</strong>,
            encrypted with a passphrase only you know.
          </p>
          <table className="w-full text-sm">
            <tbody>
              <TableRow
                label="Storage"
                value={
                  isDesktop
                    ? 'Credentials stored only on YOUR computer'
                    : 'Credentials stored only on YOUR server'
                }
              />
              <TableRow label="Encryption" value="AES-256 encryption with your passphrase" />
              <TableRow label="Recovery" value="Lost passphrases cannot be recovered" isWarning />
              <TableRow
                label="Responsibility"
                value="You accept full responsibility for security"
              />
            </tbody>
          </table>
        </section>

        {/* Monarch Money Integration */}
        <section>
          <h3
            className="text-base font-semibold mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
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
            <div
              className="flex justify-between py-1.5 border-b"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
              <span>Uses Monarch API with YOUR credentials</span>
              <StatusIndicator status="ok" text="Your own data" />
            </div>
            <div
              className="flex justify-between py-1.5 border-b"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
              <span>Programmatic access</span>
              <StatusIndicator status="warning" text="Technically prohibited" />
            </div>
            <div
              className="flex justify-between py-1.5 border-b"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
              <span>Rate limiting implemented</span>
              <StatusIndicator status="ok" text="Responsible usage" />
            </div>
            <div
              className="flex justify-between py-1.5 border-b"
              style={{ borderColor: 'var(--monarch-border)' }}
            >
              <span>Account restriction risk</span>
              <StatusIndicator status="warning" text="Theoretically possible" />
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--monarch-text)' }}>
            By using Eclosion, you acknowledge and accept these risks.
          </p>
          <a
            href="https://www.monarch.com/terms"
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
          <h3
            className="text-base font-semibold mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            No Warranty
          </h3>
          <p className="text-sm mb-2" style={{ color: 'var(--monarch-text)' }}>
            Eclosion is open source software provided "as-is" without any warranty.
          </p>
          <ul
            className="text-sm space-y-1.5 list-disc list-inside"
            style={{ color: 'var(--monarch-text)' }}
          >
            <li>Not liable for data loss, service interruptions, or API changes</li>
            <li>Features may break if Monarch changes their API</li>
            <li>You use this tool at your own risk</li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
