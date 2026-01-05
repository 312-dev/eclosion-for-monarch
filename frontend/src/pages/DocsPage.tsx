/**
 * Docs Page
 *
 * Context-aware documentation page:
 * - Marketing site (GitHub Pages): Getting started, feature overview, FAQ
 * - Self-hosted: Help docs, version info, changelog, support
 */

import { DocsLayout } from '../components/marketing';
import { useIsMarketingSite } from '../hooks/useIsMarketingSite';
import { MarketingDocsContent, HelpDocsContent } from './docs';

export function DocsPage() {
  const isMarketingSite = useIsMarketingSite();

  return (
    <DocsLayout>
      {isMarketingSite ? <MarketingDocsContent /> : <HelpDocsContent />}
    </DocsLayout>
  );
}
