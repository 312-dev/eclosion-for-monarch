/**
 * Beta Warning Modal
 *
 * A final confirmation shown to users on pre-release (beta) builds.
 * Warns about the risks of using beta software with their actual Monarch account
 * and requires explicit acknowledgment before proceeding.
 */

import { useState } from 'react';
import { Modal } from './Modal';
import { WarningIcon } from '../icons';

const BETA_WARNING_ACCEPTED_KEY = 'eclosion-beta-warning-accepted';
const STABLE_DOWNLOAD_URL = 'https://eclosion.app/download';

interface BetaWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

/** Check if beta warning has been acknowledged (stored in localStorage) */
export function hasAcknowledgedBetaWarning(): boolean {
  try {
    return localStorage.getItem(BETA_WARNING_ACCEPTED_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Mark beta warning as acknowledged */
export function setBetaWarningAcknowledged(): void {
  try {
    localStorage.setItem(BETA_WARNING_ACCEPTED_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/** Warning item component for consistent styling */
function WarningItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <WarningIcon size={16} color="var(--monarch-warning)" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

export function BetaWarningModal({ isOpen, onClose, onAccept }: BetaWarningModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAccept = () => {
    setBetaWarningAcknowledged();
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
          className="mt-1 w-4 h-4 accent-(--monarch-warning)"
        />
        <span className="text-sm" style={{ color: 'var(--monarch-text)' }}>
          I understand this is a pre-release build, that switching between beta and stable versions
          is not supported, and I accept full responsibility for any issues that may occur with my
          Monarch Money account.
        </span>
      </label>

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <a
          href={STABLE_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium hover:underline"
          style={{ color: 'var(--monarch-orange)' }}
        >
          Download stable version instead
        </a>
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
            onClick={handleAccept}
            disabled={!acknowledged}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: acknowledged
                ? 'var(--monarch-orange)'
                : 'var(--monarch-orange-disabled)',
            }}
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stop! You are on a pre-release build"
      description="Please read this important warning before continuing"
      maxWidth="lg"
      footer={footer}
      closeOnBackdrop={false}
    >
      {/* Content area */}
      <div className="space-y-6" role="alertdialog" aria-label="Beta version warning">
        {/* Main warning banner */}
        <div
          className="p-4 rounded-lg flex items-start gap-3"
          style={{
            backgroundColor: 'var(--monarch-warning-bg)',
            border: '1px solid var(--monarch-warning)',
          }}
        >
          <WarningIcon size={24} color="var(--monarch-warning)" className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1" style={{ color: 'var(--monarch-text-dark)' }}>
              This is a beta version of Eclosion
            </p>
            <p className="text-sm" style={{ color: 'var(--monarch-text)' }}>
              Beta builds contain experimental features that are still being tested. They may have
              bugs that could affect your Monarch Money data.
            </p>
          </div>
        </div>

        {/* Version switching warning */}
        <section>
          <h3
            className="text-base font-semibold mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            No Support for Switching Versions
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--monarch-text)' }}>
            <strong>We do not support switching between beta and stable versions.</strong> If you
            start with beta and later want to switch to stable (or vice versa), be aware:
          </p>
          <ul className="text-sm space-y-2 list-none" style={{ color: 'var(--monarch-text)' }}>
            <WarningItem>
              You can export your settings from beta and attempt to import them into a stable build,
              but <strong>we cannot guarantee it will work</strong>
            </WarningItem>
            <WarningItem>
              You may need to set up everything from scratch if data formats are incompatible
            </WarningItem>
            <WarningItem>
              Beta and stable versions use separate data directories to prevent conflicts
            </WarningItem>
          </ul>
        </section>

        {/* Risk warning */}
        <section>
          <h3
            className="text-base font-semibold mb-2"
            style={{ color: 'var(--monarch-text-dark)' }}
          >
            Proceed with Caution
          </h3>
          <p className="text-sm mb-3" style={{ color: 'var(--monarch-text)' }}>
            <strong>You are interfacing with your actual Monarch Money account.</strong> Unlike a
            sandbox or demo environment, any changes made through Eclosion affect your real
            financial data.
          </p>
          <ul className="text-sm space-y-2 list-none" style={{ color: 'var(--monarch-text)' }}>
            <WarningItem>
              Bugs in beta versions could potentially cause unintended changes to your budget,
              categories, or transactions
            </WarningItem>
            <WarningItem>
              If something goes wrong, you may need to contact Monarch Money support to request a
              rollback of your account — <strong>they may or may not be able to help</strong>
            </WarningItem>
            <WarningItem>There is no undo button for changes synced to Monarch</WarningItem>
          </ul>
        </section>

        {/* Recommendation */}
        <section
          className="p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--monarch-bg-page)',
            border: '1px solid var(--monarch-border)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--monarch-text)' }}>
            <strong>Recommendation:</strong> If you rely on Eclosion for managing your finances and
            want a stable experience, we strongly recommend using the stable release instead.
          </p>
        </section>
      </div>
    </Modal>
  );
}
