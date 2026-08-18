/**
 * Descriptor types for a ModularCore registry component (`modularcore.json`).
 * Runtime validation lives in `schema.zod.ts`; keep both in sync.
 */

/** Extensible component kind. New kinds (e.g. `agent-tool`) can be added without breaking existing descriptors. */
export type ComponentType = 'frontend-component' | 'headless-core' | 'snippet' | (string & {});

export type SupportedFramework = 'react' | 'svelte' | (string & {});

/** `internal` components are built and locally resolvable but excluded from the public `index.json`. */
export type Visibility = 'public' | 'internal';

export type FileEncoding = 'utf8' | 'base64';

export interface EnvVariableDescriptor {
  key: string;
  description: string;
  required: boolean;
}

export interface RegistryFileDescriptor {
  /** Path to the source file, relative to the component's package root (e.g. `packages/{name}/`). */
  path: string;
  /** Path (relative to the consumer project root) where the file should be written when injected. */
  target: string;
  /** File kind, informational for consumers (e.g. `component`, `hook`, `style`). */
  type: string;
  encoding: FileEncoding;
}

export interface RegistryDescriptor {
  name: string;
  version: string;
  title: string;
  type: ComponentType;
  category: string;
  frameworks: SupportedFramework[];
  visibility: Visibility;
  /** Semver ranges keyed by peer framework, e.g. `{ "react": ">=18" }`. Gates `add` (Phase 3) before writing runes/hooks. */
  peerDependencies: Record<string, string>;
  dependencies: string[];
  registryDependencies: string[];
  envVariables: EnvVariableDescriptor[];
  files: RegistryFileDescriptor[];
  description?: string;
}

/** A file descriptor plus its resolved content, as embedded inline into `{name}.json`. */
export interface RegistryFileWithContent extends RegistryFileDescriptor {
  content: string;
}

/** Full descriptor as served at `/registry/{name}.json`. */
export interface RegistryEntry extends Omit<RegistryDescriptor, 'files'> {
  files: RegistryFileWithContent[];
}

/** Summarized entry as served at `/registry/index.json`. Excludes `visibility: internal` entries. */
export interface RegistryIndexEntry {
  name: string;
  title: string;
  category: string;
  version: string;
  frameworks: SupportedFramework[];
  description?: string;
}
