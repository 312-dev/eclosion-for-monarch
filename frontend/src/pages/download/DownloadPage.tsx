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
import { DocsLayout } from '../../components/marketing';
import { WindowsIcon, AppleIcon, LinuxIcon } from '../../components/icons';
import { detectPlatform, type Platform } from '../../utils/platformDetection';
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
} from '../../utils/githubRelease';
import {
  HeroSection,
  LoadingState,
  ReleaseNotesSectionWrapper,
  InstallationSection,
  FeaturesSection,
  FAQSection,
  PreviousVersionsSection,
  FooterLinks,
  type DownloadInfo,
  type DownloadStatus,
} from './DownloadSections';

/** Platform architecture labels */
const PLATFORM_ARCHITECTURES: Record<Exclude<Platform, 'unknown'>, string> = {
  macos: 'Universal',
  windows: 'x64',
  linux: 'x64',
};

/** Helper to render platform-specific icon */
function PlatformIcon({ platform, size = 24 }: Readonly<{ platform: Platform; size?: number }>) {
  switch (platform) {
    case 'windows':
      return <WindowsIcon size={size} />;
    case 'macos':
      return <AppleIcon size={size} />;
    case 'linux':
      return <LinuxIcon size={size} />;
    default:
      return null;
  }
}

const DOWNLOAD_STORAGE_KEY = 'eclosion-download-timestamps';
const MAX_AUTO_DOWNLOADS = 2;
const AUTO_DOWNLOAD_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/** Check if we should auto-download based on recent download history */
function shouldAutoDownload(): boolean {
  try {
    const stored = localStorage.getItem(DOWNLOAD_STORAGE_KEY);
    if (!stored) return true;

    const timestamps: number[] = JSON.parse(stored);
    const now = Date.now();
    const recentDownloads = timestamps.filter((t) => now - t < AUTO_DOWNLOAD_WINDOW_MS);

    return recentDownloads.length < MAX_AUTO_DOWNLOADS;
  } catch {
    return true;
  }
}

/** Record a download timestamp */
function recordDownload(): void {
  try {
    const stored = localStorage.getItem(DOWNLOAD_STORAGE_KEY);
    const timestamps: number[] = stored ? JSON.parse(stored) : [];
    const now = Date.now();

    // Keep only recent timestamps + new one
    const recentTimestamps = timestamps.filter((t) => now - t < AUTO_DOWNLOAD_WINDOW_MS);
    recentTimestamps.push(now);

    localStorage.setItem(DOWNLOAD_STORAGE_KEY, JSON.stringify(recentTimestamps));
  } catch {
    // Ignore storage errors
  }
}

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

  // Auto-start download after brief delay (rate-limited)
  useEffect(() => {
    if (!loading && release && activePlatform !== 'unknown' && !downloadStarted.current) {
      const downloadUrl = getDownloadUrl(release, activePlatform);
      if (downloadUrl) {
        downloadStarted.current = true;
        const canAutoDownload = shouldAutoDownload();

        /* eslint-disable react-hooks/set-state-in-effect -- Syncing download status with download timer */
        setDownloadStatus('starting');

        const timer = setTimeout(() => {
          setDownloadStatus('started');
          /* eslint-enable react-hooks/set-state-in-effect */
          // Only actually download if under rate limit
          if (canAutoDownload) {
            recordDownload();
            globalThis.location.href = downloadUrl;
          }
        }, 5000);

        return () => clearTimeout(timer);
      }
    }
  }, [loading, release, activePlatform]);

  // Get download info for each platform
  const getDownloadInfo = (platform: Platform): DownloadInfo => {
    if (!release) return { url: null, checksum: null };
    const url = getDownloadUrl(release, platform);
    const asset = getAssetForPlatform(release, platform);
    const checksum = getChecksumForPlatform(checksums, release, platform);
    const info: DownloadInfo = { url, checksum };
    if (asset) info.size = formatFileSize(asset.size);
    if (platform !== 'unknown') info.architecture = PLATFORM_ARCHITECTURES[platform];
    return info;
  };

  const version = release ? getVersionFromTag(release.tag_name) : undefined;
  const primaryDownload = getDownloadInfo(activePlatform);

  // Construct screenshot URL from the fetched release tag
  const screenshotUrl = release
    ? `https://github.com/312-dev/eclosion/releases/download/${release.tag_name}/screenshot-recurring.png`
    : null;

  // Construct checksums URL from the fetched release tag
  const checksumsUrl = release
    ? `https://github.com/312-dev/eclosion/releases/download/${release.tag_name}/SHA256SUMS.txt`
    : null;

  return (
    <DocsLayout>
      <HeroSection
        activePlatform={activePlatform}
        {...(version !== undefined && { version })}
        downloadUrl={primaryDownload.url}
        {...(primaryDownload.size !== undefined && { fileSize: primaryDownload.size })}
        {...(primaryDownload.architecture !== undefined && {
          architecture: primaryDownload.architecture,
        })}
        loading={loading}
        downloadStatus={downloadStatus}
        screenshotUrl={screenshotUrl}
        checksumsUrl={checksumsUrl}
      />

      {/* Loading/Error State */}
      {(loading || error) && (
        <section className="px-4 sm:px-6 pb-8">
          <div className="max-w-4xl mx-auto">
            <LoadingState loading={loading} error={error} />
          </div>
        </section>
      )}

      {/* Other platforms link */}
      {!loading && !error && (
        <section className="px-4 sm:px-6 py-6 text-center">
          <div className="max-w-4xl mx-auto">
            <p className="text-(--monarch-text-muted) mb-4">
              Looking for downloads for other operating systems?
            </p>
            <div className="flex items-center justify-center gap-4">
              {(['windows', 'macos', 'linux'] as const)
                .filter((p) => p !== activePlatform)
                .map((platform) => (
                  <a
                    key={platform}
                    href={`/download?platform=${platform}`}
                    className="flex flex-col items-center justify-center gap-2 w-24 h-24 rounded-xl border border-(--monarch-border) bg-(--monarch-bg-card) hover:border-(--monarch-orange) hover:text-(--monarch-orange) transition-colors text-(--monarch-text-muted)"
                    aria-label={`Download for ${platform === 'macos' ? 'macOS' : platform.charAt(0).toUpperCase() + platform.slice(1)}`}
                  >
                    <PlatformIcon platform={platform} size={28} />
                    <span className="text-sm font-medium">
                      {platform === 'macos'
                        ? 'macOS'
                        : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </span>
                  </a>
                ))}
            </div>
          </div>
        </section>
      )}

      {!loading && !error && release && version && (
        <ReleaseNotesSectionWrapper release={release} version={version} />
      )}

      {!loading && !error && <InstallationSection platform={activePlatform} />}

      <FeaturesSection />
      <FAQSection />
      <PreviousVersionsSection />
      <FooterLinks />
    </DocsLayout>
  );
}
