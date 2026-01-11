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
  PrimaryDownload,
  ReleaseNotesSectionWrapper,
  InstallationSection,
  OtherPlatformsSection,
  PreviousVersionsSection,
  FooterLinks,
  type DownloadStatus,
  type DownloadInfo,
} from './DownloadSections';

/** Platform architecture labels */
const PLATFORM_ARCHITECTURES: Record<Exclude<Platform, 'unknown'>, string> = {
  macos: 'Universal',
  windows: 'x64',
  linux: 'x64',
};

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
    if (!loading && release && activePlatform !== 'unknown' && !downloadStarted.current) {
      const downloadUrl = getDownloadUrl(release, activePlatform);
      if (downloadUrl) {
        downloadStarted.current = true;
        /* eslint-disable react-hooks/set-state-in-effect -- Syncing download status with download timer */
        setDownloadStatus('starting');

        const timer = setTimeout(() => {
          setDownloadStatus('started');
          /* eslint-enable react-hooks/set-state-in-effect */
          window.location.href = downloadUrl;
        }, 1500);

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

  return (
    <DocsLayout>
      <HeroSection activePlatform={activePlatform} {...(version && { version })} />

      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-xl mx-auto">
          <LoadingState loading={loading} error={error} />

          {!loading && !error && version && (
            <PrimaryDownload
              platform={activePlatform}
              version={version}
              downloadInfo={primaryDownload}
              downloadStatus={downloadStatus}
            />
          )}
        </div>
      </section>

      {!loading && !error && release && version && (
        <ReleaseNotesSectionWrapper release={release} version={version} />
      )}

      {!loading && !error && <InstallationSection platform={activePlatform} />}

      {!loading && !error && release && version && (
        <OtherPlatformsSection
          activePlatform={activePlatform}
          version={version}
          getDownloadInfo={getDownloadInfo}
        />
      )}

      <PreviousVersionsSection />
      <FooterLinks />
    </DocsLayout>
  );
}
