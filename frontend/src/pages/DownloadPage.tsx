/**
 * Download Page
 *
 * Platform-aware download page for the Eclosion desktop app.
 * - Auto-detects user's platform
 * - Shows primary download for detected platform
 * - Auto-starts download after brief delay
 * - Shows all platform options
 * - Platform-specific installation instructions
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DocsLayout } from '../components/marketing';
import { PlatformDownloadCard } from '../components/marketing/PlatformDownloadCard';
import { InstallationInstructions } from '../components/marketing/InstallationInstructions';
import { TrustBadges } from '../components/marketing/TrustBadges';
import { PrivacyNote } from '../components/marketing/PrivacyNote';
import { UnsignedAppNotice } from '../components/marketing/UnsignedAppNotice';
import { ReleaseNotesSection } from '../components/marketing/ReleaseNotesSection';
import { ChecksumDisplay } from '../components/marketing/ChecksumDisplay';
import {
  SpinnerIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
} from '../components/icons';
import {
  detectPlatform,
  PLATFORM_LABELS,
  type Platform,
} from '../utils/platformDetection';
import {
  fetchLatestRelease,
  fetchChecksums,
  getDownloadUrl,
  getVersionFromTag,
  getAssetForPlatform,
  getChecksumForPlatform,
  formatFileSize,
  type GithubRelease,
  type Checksums,
} from '../utils/githubRelease';

/** Platform architecture labels */
const PLATFORM_ARCHITECTURES: Record<Exclude<Platform, 'unknown'>, string> = {
  macos: 'Universal',
  windows: 'x64',
  linux: 'x64',
};

type DownloadStatus = 'idle' | 'starting' | 'started' | 'error';

export function DownloadPage() {
  const [searchParams] = useSearchParams();
  const [detectedPlatform, setDetectedPlatform] = useState<Platform>('unknown');
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [checksums, setChecksums] = useState<Checksums | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const downloadStarted = useRef(false);

  // Get platform from URL or detect automatically
  const urlPlatform = searchParams.get('platform') as Platform | null;
  const activePlatform =
    urlPlatform && ['windows', 'macos', 'linux'].includes(urlPlatform)
      ? urlPlatform
      : detectedPlatform;

  // Detect platform on mount - browser API not available during SSR
  useEffect(() => {
    const platform = detectPlatform();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync with browser API
    setDetectedPlatform(platform);
  }, []);

  // Fetch latest release and checksums - async data fetching
  useEffect(() => {
    let cancelled = false;

    async function loadRelease() {
      if (cancelled) return;
      const releaseData = await fetchLatestRelease();
      if (cancelled) return;
      if (releaseData) {
        setRelease(releaseData);
        // Fetch checksums in parallel (non-blocking)
        fetchChecksums(releaseData).then((checksumData) => {
          if (!cancelled) {
            setChecksums(checksumData);
          }
        });
      } else {
        setError('Unable to fetch release information. Please try again later.');
      }
      setLoading(false);
    }

    loadRelease();

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-start download after brief delay
  useEffect(() => {
    if (
      !loading &&
      release &&
      activePlatform !== 'unknown' &&
      !downloadStarted.current
    ) {
      const downloadUrl = getDownloadUrl(release, activePlatform);
      if (downloadUrl) {
        downloadStarted.current = true;
        /* eslint-disable react-hooks/set-state-in-effect -- Syncing download status with download timer */
        setDownloadStatus('starting');

        const timer = setTimeout(() => {
          setDownloadStatus('started');
          /* eslint-enable react-hooks/set-state-in-effect */
          // Trigger download by navigating to URL
          window.location.href = downloadUrl;
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [loading, release, activePlatform]);

  // Get download info for each platform
  const getDownloadInfo = (platform: Platform) => {
    if (!release) return { url: null, size: undefined, checksum: null, architecture: undefined };
    const url = getDownloadUrl(release, platform);
    const asset = getAssetForPlatform(release, platform);
    const size = asset ? formatFileSize(asset.size) : undefined;
    const checksum = getChecksumForPlatform(checksums, release, platform);
    const architecture = platform === 'unknown' ? undefined : PLATFORM_ARCHITECTURES[platform];
    return { url, size, checksum, architecture };
  };

  const version = release ? getVersionFromTag(release.tag_name) : undefined;
  const primaryDownload = getDownloadInfo(activePlatform);

  return (
    <DocsLayout>
      {/* Hero Section */}
      <section className="px-4 sm:px-6 py-12 text-center">
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-4xl sm:text-5xl font-bold text-[var(--monarch-text-dark)] mb-4"
            style={{ fontFamily: "'Unbounded', sans-serif" }}
          >
            Download Eclosion
          </h1>
          <p className="text-lg text-[var(--monarch-text)] mb-2">
            {activePlatform === 'unknown'
              ? 'Desktop App'
              : `For ${PLATFORM_LABELS[activePlatform]}`}
          </p>
          {version && (
            <p className="text-sm text-[var(--monarch-text-muted)] mb-6">
              Version {version}
            </p>
          )}

          {/* Trust Badges */}
          <div className="mb-4">
            <TrustBadges />
          </div>

          {/* Privacy Note */}
          <div className="flex justify-center">
            <PrivacyNote />
          </div>
        </div>
      </section>

      {/* Download Status / Primary Download */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <SpinnerIcon size={32} color="var(--monarch-orange)" />
              <p className="text-[var(--monarch-text-muted)]">
                Loading download information...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircleIcon size={32} color="var(--monarch-warning)" />
              <p className="text-[var(--monarch-text)]">{error}</p>
              <a
                href="https://github.com/312-dev/eclosion/releases"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--monarch-orange)] hover:underline"
              >
                View releases on GitHub
                <ExternalLinkIcon size={14} />
              </a>
            </div>
          ) : (
            <>
              {/* Unsigned App Notice */}
              {activePlatform !== 'unknown' && (
                <div className="mb-4">
                  <UnsignedAppNotice platform={activePlatform} />
                </div>
              )}

              {/* Primary Download Card */}
              {activePlatform !== 'unknown' && version && (
                <PlatformDownloadCard
                  platform={activePlatform}
                  downloadUrl={primaryDownload.url}
                  version={version}
                  fileSize={primaryDownload.size}
                  checksum={primaryDownload.checksum}
                  architecture={primaryDownload.architecture}
                  primary
                />
              )}

              {/* Checksum Display */}
              {activePlatform !== 'unknown' && primaryDownload.checksum && (
                <div className="mt-2 flex justify-center">
                  <ChecksumDisplay
                    checksum={primaryDownload.checksum}
                    filename={`Eclosion-${version}`}
                  />
                </div>
              )}

              {/* Download Status Message */}
              {downloadStatus !== 'idle' && primaryDownload.url && (
                <div className="mt-4 text-center">
                  {downloadStatus === 'starting' && (
                    <p className="text-[var(--monarch-text-muted)] flex items-center justify-center gap-2">
                      <SpinnerIcon size={16} />
                      Starting download...
                    </p>
                  )}
                  {downloadStatus === 'started' && (
                    <p className="text-[var(--monarch-green)] flex items-center justify-center gap-2">
                      <CheckCircleIcon size={16} color="var(--monarch-green)" />
                      Download started!
                    </p>
                  )}
                </div>
              )}

              {/* Manual Download Link */}
              {primaryDownload.url && (
                <p className="mt-4 text-center text-sm text-[var(--monarch-text-muted)]">
                  Download not starting?{' '}
                  <a
                    href={primaryDownload.url}
                    className="text-[var(--monarch-orange)] hover:underline"
                  >
                    Click here to download
                  </a>
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Release Notes */}
      {!loading && !error && release?.body && (
        <section className="px-4 sm:px-6 py-8">
          <div className="max-w-xl mx-auto">
            <ReleaseNotesSection
              body={release.body}
              version={version ?? ''}
              htmlUrl={release.html_url}
              publishedAt={release.published_at}
            />
          </div>
        </section>
      )}

      {/* Installation Instructions (platform-specific) */}
      {!loading && !error && activePlatform !== 'unknown' && (
        <section className="px-4 sm:px-6 py-8 border-t border-[var(--monarch-border)]">
          <div className="max-w-xl mx-auto">
            <h2 className="text-xl font-semibold text-[var(--monarch-text-dark)] mb-4 text-center">
              Installation
            </h2>
            <InstallationInstructions platform={activePlatform} hideHeader />
          </div>
        </section>
      )}

      {/* All Platforms */}
      {!loading && !error && release && (
        <section className="px-4 sm:px-6 py-8 border-t border-[var(--monarch-border)]">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-[var(--monarch-text-dark)] mb-6 text-center">
              Other Platforms
            </h2>
            <div className="grid gap-4">
              {(['windows', 'macos', 'linux'] as const)
                .filter((p) => p !== activePlatform)
                .map((platform) => {
                  const info = getDownloadInfo(platform);
                  return (
                    <PlatformDownloadCard
                      key={platform}
                      platform={platform}
                      downloadUrl={info.url}
                      version={version ?? ''}
                      fileSize={info.size}
                      checksum={info.checksum}
                      architecture={info.architecture}
                    />
                  );
                })}
            </div>
          </div>
        </section>
      )}

      {/* Previous Versions */}
      <section className="px-4 sm:px-6 py-8 border-t border-[var(--monarch-border)]">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-lg font-semibold text-[var(--monarch-text-dark)] mb-2">
            Need an older version?
          </h2>
          <p className="text-sm text-[var(--monarch-text-muted)] mb-4">
            Previous releases are available for compatibility or rollback purposes.
          </p>
          <a
            href="https://github.com/312-dev/eclosion/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--monarch-border)] text-[var(--monarch-text)] hover:border-[var(--monarch-orange)] hover:text-[var(--monarch-orange)] transition-colors"
          >
            View all releases
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </section>

      {/* Footer Links */}
      <section className="px-4 sm:px-6 py-6 text-center border-t border-[var(--monarch-border)]">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <a
            href="https://github.com/312-dev/eclosion"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)]"
          >
            Source code
            <ExternalLinkIcon size={14} />
          </a>
          <span className="text-[var(--monarch-border)]">·</span>
          <a
            href="/"
            className="text-[var(--monarch-text-muted)] hover:text-[var(--monarch-orange)]"
          >
            Back to home
          </a>
        </div>
      </section>
    </DocsLayout>
  );
}
