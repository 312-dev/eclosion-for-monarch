/**
 * Tunnel Status Display
 *
 * Shows the connected/disconnected status, URL, QR code, and copy button
 * for an active named tunnel. Used in RemoteAccessSection when a subdomain
 * has been claimed.
 */

import { useState } from 'react';
import { Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../../context/ToastContext';
import type { TunnelStatus } from '../../../types/electron';

interface TunnelStatusDisplayProps {
  status: TunnelStatus;
  onChangePassphrase: () => void;
}

export function TunnelStatusDisplay({ status, onChangePassphrase }: TunnelStatusDisplayProps) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const tunnelUrl = status.url ?? `https://${status.subdomain}.eclosion.me`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tunnelUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  return (
    <div className="px-4 pb-4">
      {/* Security Warning Banner */}
      <div
        className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3"
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid var(--monarch-orange)',
        }}
      >
        <AlertTriangle
          size={16}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--monarch-orange)' }}
        />
        <div className="text-sm" style={{ color: 'var(--monarch-text-dark)' }}>
          <span className="font-medium">Remote access is active.</span> Anyone with your URL
          will be prompted for your app passphrase. Keep your URL private.
        </div>
      </div>

      <div
        className="rounded-lg p-3"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
        }}
      >
        <div className="flex items-start gap-4">
          {/* Left side: explanation and URL */}
          <div className="flex-1 min-w-0">
            <p className="text-sm mb-2" style={{ color: 'var(--monarch-text-muted)' }}>
              Scan the QR code with your phone or copy the URL to access Eclosion remotely.
              You&apos;ll need your app passphrase to connect.
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg w-full"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <code
                className="flex-1 text-xs break-all min-w-0"
                style={{ color: 'var(--monarch-text-dark)' }}
              >
                {tunnelUrl}
              </code>
              <button
                onClick={handleCopyUrl}
                className="p-1.5 rounded transition-colors shrink-0 hover:bg-black/5"
                title="Copy URL"
                aria-label="Copy URL to clipboard"
                type="button"
              >
                {copied ? (
                  <Check size={14} style={{ color: 'var(--monarch-green)' }} />
                ) : (
                  <Copy size={14} style={{ color: 'var(--monarch-text-muted)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Right side: QR Code */}
          <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'white' }}>
            <QRCodeSVG value={tunnelUrl} size={100} level="M" />
          </div>
        </div>
      </div>

      {/* Change Passphrase Button */}
      <button
        onClick={onChangePassphrase}
        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/5 w-full sm:w-auto"
        style={{
          backgroundColor: 'var(--monarch-bg-page)',
          border: '1px solid var(--monarch-border)',
          color: 'var(--monarch-text-dark)',
        }}
        type="button"
      >
        <KeyRound size={16} style={{ color: 'var(--monarch-orange)' }} />
        Change Passphrase
      </button>
    </div>
  );
}
