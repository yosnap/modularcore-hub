export { createRegistryClient } from './registry-client.js';
export type { RegistryClient } from './registry-client.js';

export { RegistryClientError } from './errors.js';

export { isTrackedWriteError, remapTarget, resolveTargetPath, writeFilesTracked } from './files.js';
export type { TrackedWriteError } from './files.js';

export type {
  RegistryEntry,
  RegistryFileWithContent,
  RegistryIndexEntry,
  WriteResult,
} from '@modularcore/registry';
