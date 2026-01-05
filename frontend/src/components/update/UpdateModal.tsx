/**
 * UpdateModal - Shows deployment-specific instructions for updating to a new version
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { getUpdateInfo, getAvailableReleases, type UpdateInfo, type Release } from '../../api/client';
import * as demoApi from '../../api/demoClient';
import { useDemo } from '../../context/DemoContext';
import { VersionBadge } from '../VersionBadge';
import { ReleaseSelector } from './ReleaseSelector';

interface UpdateModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetVersion?: string | undefined;
}

function DeploymentIcon({ deploymentType }: { readonly deploymentType: string | undefined }) {
  const iconClass = "w-5 h-5";

  if (deploymentType === 'railway') {
    return (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function BetaWarning() {
  return (
    <div
      className="p-4 rounded-lg border"
      style={{
        backgroundColor: 'var(--monarch-warning-bg)',
        borderColor: 'var(--monarch-warning)',
      }}
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 shrink-0 mt-0.5"
          style={{ color: 'var(--monarch-warning)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div className="font-medium" style={{ color: 'var(--monarch-warning)' }}>
            Beta Warning
          </div>
          <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>
            Beta releases may contain bugs and breaking changes.
            Your data will be backed up automatically before any migration.
          </div>
        </div>
      </div>
    </div>
  );
}

export function UpdateModal({ isOpen, onClose, targetVersion }: UpdateModalProps) {
  const isDemo = useDemo();
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [releases, setReleases] = useState<{ stable: Release[]; beta: Release[] }>({ stable: [], beta: [] });
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(targetVersion || null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Loading state for async fetch
      setLoading(true);
      const fetchUpdateInfo = isDemo ? demoApi.getUpdateInfo : getUpdateInfo;
      const fetchReleases = isDemo ? demoApi.getAvailableReleases : getAvailableReleases;
      Promise.all([fetchUpdateInfo(), fetchReleases()])
        .then(([info, releasesData]) => {
          setUpdateInfo(info);
          setReleases({
            stable: releasesData.stable_releases,
            beta: releasesData.beta_releases,
          });
          if (!selectedVersion && releasesData.stable_releases.length > 0) {
            const latest = releasesData.stable_releases.find(r => !r.is_current);
            if (latest) setSelectedVersion(latest.version);
          }
        })
        .catch(() => {
          // Silently fail
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, selectedVersion, isDemo]);

  const getDeploymentLabel = () => {
    switch (updateInfo?.deployment_type) {
      case 'railway': return 'Railway';
      case 'docker': return 'Docker';
      default: return 'Local';
    }
  };

  const deploymentIcon = useMemo(() => (
    <DeploymentIcon deploymentType={updateInfo?.deployment_type} />
  ), [updateInfo?.deployment_type]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Instructions"
      description={`How to update your ${getDeploymentLabel()} deployment`}
      maxWidth="lg"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
        >
          Done
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Version */}
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--monarch-bg-input)', borderColor: 'var(--monarch-border)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm" style={{ color: 'var(--monarch-text-muted)' }}>Current Version</div>
                <div className="text-lg font-medium flex items-center gap-2" style={{ color: 'var(--monarch-text-dark)' }}>
                  v{updateInfo?.current_version}
                  <VersionBadge version={updateInfo?.current_version || ''} channel={updateInfo?.current_channel} />
                </div>
              </div>
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--monarch-bg-card)', color: 'var(--monarch-text-muted)' }}
                title={getDeploymentLabel()}
              >
                {deploymentIcon}
              </div>
            </div>
          </div>

          <ReleaseSelector
            stableReleases={releases.stable}
            betaReleases={releases.beta}
            selectedVersion={selectedVersion}
            onSelectVersion={setSelectedVersion}
          />

          {selectedVersion?.includes('-beta') && <BetaWarning />}

          {/* Update Instructions */}
          <div>
            <h3 className="font-medium mb-3">
              Steps to update{selectedVersion ? ` to v${selectedVersion}` : ''}
            </h3>
            <ol className="space-y-3">
              {updateInfo?.instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{ backgroundColor: 'var(--monarch-orange)', color: 'white' }}
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5">
                    {step.replace('VERSION', selectedVersion || 'X.Y.Z')}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {updateInfo?.deployment_type === 'docker' && updateInfo?.instructions.example_compose && (
            <div>
              <h4 className="text-sm font-medium mb-2 opacity-70">docker-compose.yml</h4>
              <pre
                className="p-3 rounded-lg text-sm overflow-x-auto"
                style={{ backgroundColor: 'var(--monarch-bg-input)' }}
              >
                <code>
                  {updateInfo.instructions.example_compose.replace('VERSION', selectedVersion || 'X.Y.Z')}
                </code>
              </pre>
            </div>
          )}

          {updateInfo?.deployment_type === 'railway' && updateInfo?.instructions.project_url && (
            <a
              href={updateInfo.instructions.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full p-3 rounded-lg text-center font-medium transition-colors"
              style={{ backgroundColor: 'var(--monarch-accent)', color: 'white' }}
            >
              Open Railway Dashboard
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
