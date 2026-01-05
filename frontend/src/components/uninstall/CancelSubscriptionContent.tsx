/**
 * CancelSubscriptionContent - Content for the cancel subscription tab in UninstallModal
 */

import type { CancelSubscriptionResult, DeploymentInfo } from '../../api/client';
import { CheckSimpleIcon } from '../icons';

interface CancelSubscriptionContentProps {
  readonly cancelResult: CancelSubscriptionResult | null;
  readonly deploymentInfo: DeploymentInfo | null;
  readonly cancelConfirm: boolean;
  readonly cancelling: boolean;
  readonly onCancelConfirmChange: (confirmed: boolean) => void;
}

export function CancelSubscriptionContent({
  cancelResult,
  deploymentInfo,
  cancelConfirm,
  cancelling,
  onCancelConfirmChange,
}: CancelSubscriptionContentProps) {
  if (cancelResult) {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-success-bg)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CheckSimpleIcon size={20} color="var(--monarch-success)" />
            <span className="font-medium" style={{ color: 'var(--monarch-success)' }}>Data Cleared Successfully</span>
          </div>
          <ul className="text-sm space-y-1 ml-7" style={{ color: 'var(--monarch-text-dark)' }}>
            {cancelResult.instructions.map((instruction, i) => (
              <li key={i}>{instruction}</li>
            ))}
          </ul>
        </div>

        {cancelResult.railway_deletion_url && (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
              Final Step: Delete Your Railway Project
            </p>
            <a
              href={cancelResult.railway_deletion_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 text-center text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--monarch-error)' }}
            >
              Open Railway Project Settings
            </a>
            <p className="text-xs" style={{ color: 'var(--monarch-text-muted)' }}>
              Click the button above, then scroll down and click "Delete Project" to stop all future charges.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-error-bg)' }}>
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--monarch-error)' }}>
          This will permanently:
        </p>
        <ul className="text-sm space-y-1 ml-4 list-disc" style={{ color: 'var(--monarch-text-dark)' }}>
          <li>Delete all budget categories created by this tool from Monarch</li>
          <li>Clear your stored credentials and app data</li>
          <li>Log you out of the app</li>
        </ul>
      </div>

      {deploymentInfo?.is_railway && (
        <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-bg-page)' }}>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            After clearing your data, you'll get a direct link to delete your Railway project and stop all future charges.
          </p>
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={cancelConfirm}
          onChange={(e) => onCancelConfirmChange(e.target.checked)}
          disabled={cancelling}
          className="mt-1"
        />
        <span className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
          I understand this action is irreversible and want to tear down this instance
        </span>
      </label>
    </div>
  );
}
