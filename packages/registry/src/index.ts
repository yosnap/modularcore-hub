export {
  AGNOSTIC_FRAMEWORK,
  KNOWN_FRAMEWORKS,
  frameworkOfFile,
  selectFilesForFramework,
} from './framework-files.js';

export type {
  ComponentType,
  EnvVariableDescriptor,
  FileEncoding,
  RegistryDescriptor,
  RegistryEntry,
  RegistryFileDescriptor,
  RegistryFileWithContent,
  RegistryIndexEntry,
  SupportedFramework,
  Visibility,
} from './schema.js';

export {
  envVariableSchema,
  fileEncodingSchema,
  registryDescriptorSchema,
  registryEntrySchema,
  registryFileSchema,
  registryFileWithContentSchema,
  registryIndexEntrySchema,
  visibilitySchema,
} from './schema.zod.js';
export type { RegistryDescriptorInput, RegistryDescriptorParsed } from './schema.zod.js';

export { buildRegistry } from './build-registry.js';
export type { BuildRegistryOptions, BuildRegistrySummary } from './build-registry.js';

export { buildTarball } from './tarball.js';

export { resolveWriteTargetPath, writeRegistryEntryFiles } from './resolve-write.js';
export type { WriteResult } from './resolve-write.js';
