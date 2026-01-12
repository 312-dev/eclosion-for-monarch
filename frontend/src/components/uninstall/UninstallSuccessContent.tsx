/**
 * UninstallSuccessContent - Success state content for UninstallModal
 */

import type { CancelSubscriptionResult } from '../../api/client';
import { CheckSimpleIcon } from '../icons';
import { isDesktopMode } from '../../utils/apiBase';

interface UninstallSuccessContentProps {
  readonly cancelResult: CancelSubscriptionResult;
}

export function UninstallSuccessContent({ cancelResult }: UninstallSuccessContentProps) {
  const isDesktop = isDesktopMode();

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--monarch-success-bg)' }}>
        <div className="flex items-center gap-2 mb-2">
          <CheckSimpleIcon size={20} color="var(--monarch-success)" />
          <span className="font-medium" style={{ color: 'var(--monarch-success)' }}>Uninstall Complete</span>
        </div>
        <ul className="text-sm space-y-1 ml-7" style={{ color: 'var(--monarch-text-dark)' }}>
          {cancelResult.instructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ul>
      </div>

      {isDesktop && (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
            Final Step: Uninstall the App
          </p>
          <p className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Your local data has been cleared. You can now uninstall Eclosion from your system
            using your operating system's normal app removal process.
          </p>
        </div>
      )}
    </div>
  );
}
