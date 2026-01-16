/**
 * Notes Tool Settings Header
 *
 * Header section for the Monthly Notes feature within Tool Settings.
 * Displays the tool name with accordion expand/collapse for sub-settings.
 */

import { NotesIcon } from '../wizards/SetupWizardIcons';
import { ToolSettingsHeader } from './ToolSettingsHeader';

interface NotesToolSettingsProps {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
}

export function NotesToolSettings({ isExpanded, onToggle }: NotesToolSettingsProps) {
  return (
    <ToolSettingsHeader
      icon={<NotesIcon size={20} />}
      title="Monthly Notes"
      description="Add notes to categories and months"
      isActive={true}
      isExpanded={isExpanded}
      onToggle={onToggle}
    />
  );
}
