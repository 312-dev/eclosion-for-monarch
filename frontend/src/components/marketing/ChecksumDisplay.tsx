/**
 * ChecksumDisplay
 *
 * Displays a SHA256 checksum with copy-to-clipboard functionality.
 * Shows a truncated view by default with the full checksum on hover/focus.
 */

import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { CopyIcon, CheckCircleIcon } from '../icons';

interface ChecksumDisplayProps {
  readonly checksum: string | null;
  readonly filename: string;
  readonly algorithm?: string;
}

/**
 * Truncates a checksum string to show first and last N characters.
 */
function truncateChecksum(checksum: string, chars: number = 8): string {
  if (checksum.length <= chars * 2 + 3) return checksum;
  return `${checksum.slice(0, chars)}...${checksum.slice(-chars)}`;
}

export function ChecksumDisplay({
  checksum,
  filename,
  algorithm = 'SHA256',
}: ChecksumDisplayProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  if (!checksum) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checksum);
      setCopied(true);
      toast.success('Checksum copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = checksum;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
      setCopied(true);
      toast.success('Checksum copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const displayChecksum = showFull ? checksum : truncateChecksum(checksum);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--monarch-text-muted)] font-medium">
          {algorithm}:
        </span>
        <button
          type="button"
          onClick={() => setShowFull(!showFull)}
          onMouseEnter={() => setShowFull(true)}
          onMouseLeave={() => setShowFull(false)}
          className="font-mono text-[var(--monarch-text-muted)] hover:text-[var(--monarch-text)] transition-colors cursor-pointer bg-transparent border-none p-0"
          title={showFull ? checksum : 'Click to show full checksum'}
          aria-label={`${algorithm} checksum for ${filename}: ${checksum}`}
        >
          {displayChecksum}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded transition-colors hover:bg-[var(--monarch-bg-hover)]"
          title={copied ? 'Copied!' : 'Copy checksum'}
          aria-label={copied ? 'Checksum copied to clipboard' : `Copy ${algorithm} checksum to clipboard`}
        >
          {copied ? (
            <CheckCircleIcon size={14} className="text-[var(--monarch-success)]" />
          ) : (
            <CopyIcon size={14} className="text-[var(--monarch-text-muted)]" />
          )}
        </button>
      </div>
    </div>
  );
}
