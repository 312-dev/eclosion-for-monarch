import { PlatformDownloadCard } from '../../components/marketing/PlatformDownloadCard';
import { InstallationInstructions } from '../../components/marketing/InstallationInstructions';
import { TrustBadges } from '../../components/marketing/TrustBadges';
import { PrivacyNote } from '../../components/marketing/PrivacyNote';
import { UnsignedAppNotice } from '../../components/marketing/UnsignedAppNotice';
import { ReleaseNotesSection } from '../../components/marketing/ReleaseNotesSection';
import { ChecksumDisplay } from '../../components/marketing/ChecksumDisplay';
import {
  SpinnerIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  AlertCircleIcon,
} from '../../components/icons';
import { PLATFORM_LABELS, type Platform } from '../../utils/platformDetection';
import type { GithubRelease } from '../../utils/githubRelease';

type DownloadStatus = 'idle' | 'starting' | 'started' | 'error';

interface DownloadInfo {
  url: string | null;
  size?: string;
  checksum: string | null;
  architecture?: string;
}

interface HeroSectionProps {
  activePlatform: Platform;
  version?: string;
}

export function HeroSection({ activePlatform, version }: Readonly<HeroSectionProps>) {
  return (
    <section className="px-4 sm:px-6 py-12 text-center">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-4xl sm:text-5xl font-bold text-[var(--monarch-text-dark)] mb-4"
          style={{ fontFamily: "'Unbounded', sans-serif" }}
        >
          Download Eclosion
        </h1>
        <p className="text-lg text-[var(--monarch-text)] mb-2">
          {activePlatform === 'unknown' ? 'Desktop App' : `For ${PLATFORM_LABELS[activePlatform]}`}
        </p>
        {version && (
          <p className="text-sm text-[var(--monarch-text-muted)] mb-6">Version {version}</p>
        )}
        <div className="mb-4">
          <TrustBadges />
        </div>
        <div className="flex justify-center">
          <PrivacyNote />
        </div>
      </div>
    </section>
  );
}

interface LoadingStateProps {
  loading: boolean;
  error: string | null;
}

export function LoadingState({ loading, error }: Readonly<LoadingStateProps>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <SpinnerIcon size={32} color="var(--monarch-orange)" />
        <p className="text-[var(--monarch-text-muted)]">Loading download information...</p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  return null;
}

interface PrimaryDownloadProps {
  platform: Platform;
  version: string;
  downloadInfo: DownloadInfo;
  downloadStatus: DownloadStatus;
}

export function PrimaryDownload({
  platform,
  version,
  downloadInfo,
  downloadStatus,
}: Readonly<PrimaryDownloadProps>) {
  if (platform === 'unknown') return null;

  return (
    <>
      <div className="mb-4">
        <UnsignedAppNotice platform={platform} />
      </div>

      <PlatformDownloadCard
        platform={platform}
        downloadUrl={downloadInfo.url}
        version={version}
        fileSize={downloadInfo.size}
        checksum={downloadInfo.checksum}
        architecture={downloadInfo.architecture}
        primary
      />

      {downloadInfo.checksum && (
        <div className="mt-2 flex justify-center">
          <ChecksumDisplay checksum={downloadInfo.checksum} filename={`Eclosion-${version}`} />
        </div>
      )}

      {downloadStatus !== 'idle' && downloadInfo.url && (
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

      {downloadInfo.url && (
        <p className="mt-4 text-center text-sm text-[var(--monarch-text-muted)]">
          Download not starting?{' '}
          <a href={downloadInfo.url} className="text-[var(--monarch-orange)] hover:underline">
            Click here to download
          </a>
        </p>
      )}
    </>
  );
}

interface ReleaseNotesSectionWrapperProps {
  release: GithubRelease;
  version: string;
}

export function ReleaseNotesSectionWrapper({
  release,
  version,
}: Readonly<ReleaseNotesSectionWrapperProps>) {
  if (!release.body) return null;

  return (
    <section className="px-4 sm:px-6 py-8">
      <div className="max-w-xl mx-auto">
        <ReleaseNotesSection
          body={release.body}
          version={version}
          htmlUrl={release.html_url}
          publishedAt={release.published_at}
        />
      </div>
    </section>
  );
}

interface InstallationSectionProps {
  platform: Platform;
}

export function InstallationSection({ platform }: Readonly<InstallationSectionProps>) {
  if (platform === 'unknown') return null;

  return (
    <section className="px-4 sm:px-6 py-8 border-t border-[var(--monarch-border)]">
      <div className="max-w-xl mx-auto">
        <h2 className="text-xl font-semibold text-[var(--monarch-text-dark)] mb-4 text-center">
          Installation
        </h2>
        <InstallationInstructions platform={platform} hideHeader />
      </div>
    </section>
  );
}

interface OtherPlatformsSectionProps {
  activePlatform: Platform;
  version: string;
  getDownloadInfo: (platform: Platform) => DownloadInfo;
}

export function OtherPlatformsSection({
  activePlatform,
  version,
  getDownloadInfo,
}: Readonly<OtherPlatformsSectionProps>) {
  const platforms = (['windows', 'macos', 'linux'] as const).filter((p) => p !== activePlatform);

  return (
    <section className="px-4 sm:px-6 py-8 border-t border-[var(--monarch-border)]">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-[var(--monarch-text-dark)] mb-6 text-center">
          Other Platforms
        </h2>
        <div className="grid gap-4">
          {platforms.map((platform) => {
            const info = getDownloadInfo(platform);
            return (
              <PlatformDownloadCard
                key={platform}
                platform={platform}
                downloadUrl={info.url}
                version={version}
                fileSize={info.size}
                checksum={info.checksum}
                architecture={info.architecture}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PreviousVersionsSection() {
  return (
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
  );
}

export function FooterLinks() {
  return (
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
  );
}

export type { DownloadStatus, DownloadInfo };
