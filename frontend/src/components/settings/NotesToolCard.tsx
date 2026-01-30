/**
 * Notes Tool Card
 *
 * Settings card wrapper for the Monthly Notes feature.
 * Displays as a separate card under Tool Settings on the settings page.
 */

import { forwardRef } from 'react';
import { NotesToolSettings } from './NotesToolSettings';

interface NotesToolCardProps {
  defaultExpanded?: boolean;
}

export const NotesToolCard = forwardRef<HTMLDivElement, NotesToolCardProps>(function NotesToolCard(
  { defaultExpanded = false },
  ref
) {
  return <NotesToolSettings ref={ref} defaultExpanded={defaultExpanded} variant="page" />;
});
