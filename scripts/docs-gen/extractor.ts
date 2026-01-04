/**
 * Content extractor - parses TSX files to extract help content
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import type { ExtractedContent, ContentType, DocMapping, DOC_MAPPINGS } from './types.js';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');

/**
 * Generate SHA256 hash of content for diff detection
 */
function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Parse a TSX file into an AST
 */
function parseFile(filePath: string): TSESTree.Program | null {
  try {
    const absolutePath = path.resolve(PROJECT_ROOT, filePath);
    const code = fs.readFileSync(absolutePath, 'utf-8');
    return parse(code, {
      jsx: true,
      loc: true,
      range: true,
    });
  } catch (error) {
    console.error(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

/**
 * Find all variable declarations matching a pattern
 */
function findVariableDeclarations(
  ast: TSESTree.Program,
  pattern: RegExp
): Array<{ name: string; node: TSESTree.VariableDeclarator; line: number }> {
  const results: Array<{ name: string; node: TSESTree.VariableDeclarator; line: number }> = [];

  function visit(node: TSESTree.Node) {
    if (node.type === 'VariableDeclaration') {
      for (const declarator of node.declarations) {
        if (
          declarator.id.type === 'Identifier' &&
          pattern.test(declarator.id.name) &&
          declarator.init
        ) {
          results.push({
            name: declarator.id.name,
            node: declarator,
            line: declarator.loc?.start.line ?? 0,
          });
        }
      }
    }

    // Recursively visit children
    for (const key of Object.keys(node)) {
      const child = (node as Record<string, unknown>)[key];
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === 'object' && 'type' in item) {
              visit(item as TSESTree.Node);
            }
          }
        } else if ('type' in child) {
          visit(child as TSESTree.Node);
        }
      }
    }
  }

  visit(ast);
  return results;
}

/**
 * Extract string value from various AST node types
 */
function extractStringValue(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  if (node.type === 'TemplateLiteral' && node.quasis.length === 1) {
    return node.quasis[0].value.cooked ?? null;
  }

  if (node.type === 'JSXText') {
    return node.value.trim();
  }

  return null;
}

/**
 * Extract text content from JSX elements recursively
 */
function extractJsxText(node: TSESTree.Node): string {
  const parts: string[] = [];

  function visit(n: TSESTree.Node) {
    if (n.type === 'JSXText') {
      const text = n.value.trim();
      if (text) parts.push(text);
    } else if (n.type === 'Literal' && typeof n.value === 'string') {
      parts.push(n.value);
    } else if (n.type === 'JSXElement' || n.type === 'JSXFragment') {
      const children = 'children' in n ? n.children : [];
      for (const child of children) {
        visit(child);
      }
    } else if (n.type === 'JSXExpressionContainer' && n.expression.type !== 'JSXEmptyExpression') {
      const val = extractStringValue(n.expression);
      if (val) parts.push(val);
    }
  }

  visit(node);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract TOUR_STEPS array content
 */
function extractTourSteps(
  ast: TSESTree.Program,
  filePath: string
): ExtractedContent[] {
  const results: ExtractedContent[] = [];
  const declarations = findVariableDeclarations(ast, /TOUR_STEPS/);

  for (const { name, node, line } of declarations) {
    if (node.init?.type !== 'ArrayExpression') continue;

    const steps: Array<{ title: string; content: string; selector?: string }> = [];

    for (const element of node.init.elements) {
      if (element?.type !== 'ObjectExpression') continue;

      let title = '';
      let content = '';
      let selector = '';

      for (const prop of element.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.key.type === 'Identifier' ? prop.key.name : null;

        if (key === 'selector') {
          selector = extractStringValue(prop.value) ?? '';
        } else if (key === 'content') {
          // Content is often a function returning JSX
          if (prop.value.type === 'ArrowFunctionExpression') {
            const body = prop.value.body;
            // Look for title and description in the JSX
            if (body.type === 'JSXElement' || body.type === 'ParenthesizedExpression') {
              const jsx = body.type === 'ParenthesizedExpression' ? body.expression : body;
              content = extractJsxText(jsx as TSESTree.Node);
              // Try to extract title from first div with fontWeight
              // For now just use the full text
            }
          }
        }
      }

      // Parse title and content from extracted text
      const textParts = content.split(/(?<=\S)\s{2,}|\n/);
      if (textParts.length >= 2) {
        title = textParts[0];
        content = textParts.slice(1).join(' ');
      }

      if (content) {
        steps.push({ title, content, selector });
      }
    }

    if (steps.length > 0) {
      const contentHash = hashContent(JSON.stringify(steps));
      results.push({
        id: `${filePath}:tour:${name}`,
        type: 'tour',
        source: {
          file: filePath,
          line,
          component: name,
        },
        content: { steps },
        context: {
          feature: filePath.includes('wizard') ? 'setup' : 'recurring',
          userFlow: 'guided-tour',
          relatedComponents: [],
        },
        hash: contentHash,
      });
    }
  }

  return results;
}

/**
 * Extract component descriptions from wizard steps
 */
function extractWizardStepContent(
  ast: TSESTree.Program,
  filePath: string
): ExtractedContent[] {
  const results: ExtractedContent[] = [];
  const code = fs.readFileSync(path.resolve(PROJECT_ROOT, filePath), 'utf-8');

  // Extract title and description using regex for simplicity
  // These are typically in the component's JSX
  const titleMatch = code.match(/<h2[^>]*>([^<]+)<\/h2>/);
  const descMatches = code.matchAll(/<p[^>]*style=\{[^}]*monarch-text-muted[^}]*\}[^>]*>([^<]+)<\/p>/g);

  const descriptions: string[] = [];
  for (const match of descMatches) {
    descriptions.push(match[1].trim());
  }

  // Extract FeatureCard content
  const featureCardMatches = code.matchAll(/<FeatureCard[\s\S]*?title="([^"]+)"[\s\S]*?description="([^"]+)"/g);
  const features: Array<{ title: string; description: string }> = [];
  for (const match of featureCardMatches) {
    features.push({ title: match[1], description: match[2] });
  }

  // Extract component name from file
  const componentMatch = code.match(/export\s+function\s+(\w+)/);
  const componentName = componentMatch?.[1] ?? path.basename(filePath, '.tsx');

  const contentData = {
    title: titleMatch?.[1]?.trim(),
    description: descriptions.join(' '),
    sections: features.length > 0 ? [{ heading: 'Features', items: features.map(f => `${f.title}: ${f.description}`) }] : undefined,
  };

  if (contentData.title || contentData.description || features.length > 0) {
    results.push({
      id: `${filePath}:wizard:${componentName}`,
      type: 'wizard',
      source: {
        file: filePath,
        line: 1,
        component: componentName,
      },
      content: contentData,
      context: {
        feature: 'setup',
        userFlow: 'onboarding',
        relatedComponents: [],
      },
      hash: hashContent(JSON.stringify(contentData)),
    });
  }

  return results;
}

/**
 * Extract modal section content
 */
function extractModalContent(
  ast: TSESTree.Program,
  filePath: string
): ExtractedContent[] {
  const results: ExtractedContent[] = [];
  const code = fs.readFileSync(path.resolve(PROJECT_ROOT, filePath), 'utf-8');

  // Extract section headings and content
  const sectionMatches = code.matchAll(/<(?:h[23]|div[^>]*font-weight[^>]*)>([^<]+)<\/(?:h[23]|div)>/g);
  const sections: Array<{ heading: string; items: string[] }> = [];

  for (const match of sectionMatches) {
    const heading = match[1].trim();
    if (heading && heading.length > 2 && heading.length < 100) {
      sections.push({ heading, items: [] });
    }
  }

  // Extract paragraph content
  const paragraphMatches = code.matchAll(/<p[^>]*>([^<]{10,})<\/p>/g);
  for (const match of paragraphMatches) {
    const text = match[1].trim();
    if (text && sections.length > 0) {
      sections[sections.length - 1].items.push(text);
    }
  }

  const componentMatch = code.match(/export\s+function\s+(\w+)/);
  const componentName = componentMatch?.[1] ?? path.basename(filePath, '.tsx');

  if (sections.length > 0) {
    results.push({
      id: `${filePath}:modal:${componentName}`,
      type: 'modal',
      source: {
        file: filePath,
        line: 1,
        component: componentName,
      },
      content: { sections },
      context: {
        feature: filePath.includes('Security') ? 'security' : 'general',
        userFlow: 'information',
        relatedComponents: [],
      },
      hash: hashContent(JSON.stringify(sections)),
    });
  }

  return results;
}

/**
 * Extract all content from a file based on its type
 */
export function extractFromFile(filePath: string): ExtractedContent[] {
  const ast = parseFile(filePath);
  if (!ast) return [];

  const results: ExtractedContent[] = [];

  // Extract tour steps
  results.push(...extractTourSteps(ast, filePath));

  // Extract wizard step content
  if (filePath.includes('/steps/')) {
    results.push(...extractWizardStepContent(ast, filePath));
  }

  // Extract modal content
  if (filePath.includes('Modal') || filePath.includes('SecurityInfo')) {
    results.push(...extractModalContent(ast, filePath));
  }

  return results;
}

/**
 * Extract content from all source files defined in mappings
 */
export function extractAllContent(mappings: DocMapping[]): Map<string, ExtractedContent[]> {
  const contentByTopic = new Map<string, ExtractedContent[]>();

  for (const mapping of mappings) {
    const topicContent: ExtractedContent[] = [];

    for (const sourceFile of mapping.sourceFiles) {
      const content = extractFromFile(sourceFile);
      // Add context from mapping
      for (const item of content) {
        item.context.feature = mapping.feature;
        item.context.userFlow = mapping.userFlow;
        item.context.relatedComponents = mapping.sourceFiles.filter(f => f !== sourceFile);
      }
      topicContent.push(...content);
    }

    contentByTopic.set(mapping.topic, topicContent);
  }

  return contentByTopic;
}

/**
 * Generate a combined hash for a topic's content
 */
export function generateTopicHash(contents: ExtractedContent[]): string {
  const combined = contents.map(c => c.hash).sort().join(':');
  return hashContent(combined);
}
