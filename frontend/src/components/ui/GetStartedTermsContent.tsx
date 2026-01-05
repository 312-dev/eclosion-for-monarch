/**
 * GetStartedTermsContent - Terms of service content for the GetStarted modal
 */

import { ExternalLinkIcon, CheckIcon, WarningIcon, ShieldIcon } from '../icons';

interface TermsContentProps {
  readonly acknowledged: boolean;
  readonly onAcknowledgeChange: (value: boolean) => void;
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

export function GetStartedTermsContent({ acknowledged, onAcknowledgeChange }: TermsContentProps) {
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
