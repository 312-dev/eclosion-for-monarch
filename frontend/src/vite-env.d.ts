/// <reference types="vite/client" />

import type { ChangelogEntry } from './types';

declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __DEMO_MODE__: boolean;
declare const __CHANGELOG__: ChangelogEntry[];

// MDX module declarations
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const MDXComponent: ComponentType;
  export default MDXComponent;
  export const frontmatter: Record<string, unknown>;
}
