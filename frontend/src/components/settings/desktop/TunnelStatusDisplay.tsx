/**
 * Tunnel Status Display
 *
 * Shows the connected/disconnected status, URL, QR code, and copy button
 * for an active named tunnel. Used in RemoteAccessSection when a subdomain
 * has been claimed.
 */

import { useState } from 'react';
import { Check, Copy, KeyRound, ShieldCheck, Unlink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import { Tooltip } from '../../ui/Tooltip';
import type { TunnelStatus } from '../../../types/electron';

interface TunnelStatusDisplayProps {
  status: TunnelStatus;
  onChangePassphrase: () => void;
  onReset: () => void;
  resetting?: boolean;
}

export function TunnelStatusDisplay({
  status,
  onChangePassphrase,
  onReset,
  resetting,
}: TunnelStatusDisplayProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const tunnelUrl = status.url ?? `https://${status.subdomain}.eclosion.me`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tunnelUrl);
      setCopied(true);
      toast.success('URL copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="px-4 pb-4 -mt-1">
      <div className="flex items-center gap-3">
        {/* Left side: URL + actions */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* URL bar */}
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg w-full"
            style={{
              backgroundColor: 'var(--monarch-bg-page)',
              border: '1px solid var(--monarch-border)',
            }}
          >
            <Tooltip content="Protected by email OTP + app passphrase">
              <ShieldCheck
                size={14}
                className="shrink-0"
                style={{ color: 'var(--monarch-green)' }}
              />
            </Tooltip>
            <code
              className="flex-1 text-xs break-all min-w-0 select-all"
              style={{ color: 'var(--monarch-text-dark)' }}
            >
              {tunnelUrl}
            </code>
            <Tooltip content="Copy URL">
              <button
                onClick={handleCopyUrl}
                className="p-1 rounded transition-colors shrink-0 hover:bg-black/5"
                aria-label="Copy URL to clipboard"
                type="button"
              >
                {copied ? (
                  <Check size={14} style={{ color: 'var(--monarch-green)' }} />
                ) : (
                  <Copy size={14} style={{ color: 'var(--monarch-text-muted)' }} />
                )}
              </button>
            </Tooltip>
            <Tooltip content="Release subdomain">
              <button
                onClick={onReset}
                disabled={resetting}
                className="p-1 rounded transition-colors shrink-0 hover:bg-black/5 disabled:opacity-50"
                aria-label="Release subdomain"
                type="button"
              >
                <Unlink size={14} style={{ color: 'var(--monarch-error)' }} />
              </button>
            </Tooltip>
          </div>

          {/* Change Passphrase Button - inline */}
          <button
            onClick={onChangePassphrase}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 w-fit"
            style={{ color: 'var(--monarch-text-muted)' }}
            type="button"
          >
            <KeyRound size={12} />
            Change Passphrase
          </button>
        </div>

        {/* Right side: QR Code - smaller */}
        <Tooltip content="Scan to access on your phone">
          <div className="p-1.5 rounded-md shrink-0" style={{ backgroundColor: 'white' }}>
            <QRCodeSVG value={tunnelUrl} size={56} level="M" />
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
