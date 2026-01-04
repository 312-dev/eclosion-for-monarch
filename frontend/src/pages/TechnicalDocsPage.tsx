/**
 * TechnicalDocsPage - Displays bundled technical documentation
 *
 * Protected route that renders bundled MDX technical docs.
 * Opens in new tab from help dropdown.
 */

import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, FileText, Home } from 'lucide-react';
import { MDXProvider } from '../components/docs/MDXProvider';

// Import all technical doc MDX files
// These will be synced from docusaurus or manually written
const docModules = import.meta.glob('../docs/technical/*.mdx', { eager: true }) as Record<
  string,
  { default: React.ComponentType; frontmatter?: { title?: string; description?: string } }
>;

interface DocInfo {
  slug: string;
  title: string;
  description: string | undefined;
  Component: React.ComponentType;
}

// Parse doc modules into a structured list
function getDocs(): DocInfo[] {
  return Object.entries(docModules)
    .map(([path, module]) => {
      const slug = path.replace('../docs/technical/', '').replace('.mdx', '');
      return {
        slug,
        title: module.frontmatter?.title ?? formatTitle(slug),
        description: module.frontmatter?.description,
        Component: module.default,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function formatTitle(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function DocsIndex({ docs }: { docs: DocInfo[] }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8" style={{ color: 'var(--monarch-orange)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--monarch-text-dark)' }}>
          Technical Documentation
        </h1>
      </div>

      <p className="mb-8" style={{ color: 'var(--monarch-text-muted)' }}>
        Technical guides for self-hosting, troubleshooting, and advanced configuration.
      </p>

      {docs.length === 0 ? (
        <div
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: 'var(--monarch-bg-card)', border: '1px solid var(--monarch-border)' }}
        >
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            Technical documentation is being generated. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <Link
              key={doc.slug}
              to={`/docs/${doc.slug}`}
              className="block p-4 rounded-lg transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--monarch-bg-card)',
                border: '1px solid var(--monarch-border)',
              }}
            >
              <div className="font-medium" style={{ color: 'var(--monarch-text-dark)' }}>
                {doc.title}
              </div>
              {doc.description && (
                <div className="text-sm mt-1" style={{ color: 'var(--monarch-text-muted)' }}>
                  {doc.description}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--monarch-border)' }}>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm hover:opacity-80"
          style={{ color: 'var(--monarch-orange)' }}
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function DocContent({ doc }: { doc: DocInfo }) {
  const { Component } = doc;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/docs"
        className="inline-flex items-center gap-1 text-sm mb-6 hover:opacity-80"
        style={{ color: 'var(--monarch-orange)' }}
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Documentation
      </Link>

      <MDXProvider>
        <Component />
      </MDXProvider>
    </div>
  );
}

export function TechnicalDocsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const docs = getDocs();

  // Find the requested doc
  const doc = slug ? docs.find(d => d.slug === slug) : null;

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: 'var(--monarch-bg-page)' }}
    >
      {slug && doc ? (
        <DocContent doc={doc} />
      ) : slug ? (
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--monarch-text-dark)' }}>
            Document Not Found
          </h1>
          <p style={{ color: 'var(--monarch-text-muted)' }}>
            The requested document could not be found.
          </p>
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-sm mt-4 hover:opacity-80"
            style={{ color: 'var(--monarch-orange)' }}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Documentation
          </Link>
        </div>
      ) : (
        <DocsIndex docs={docs} />
      )}
    </div>
  );
}
