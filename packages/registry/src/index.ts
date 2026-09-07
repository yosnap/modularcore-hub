export {
  AGNOSTIC_FRAMEWORK,
  BUILTIN_FRAMEWORKS,
  FrameworkConflictError,
  buildFrameworkCatalog,
  frameworksKnownTo,
  isDefined,
  undefinedFrameworks,
} from './framework-catalog.js';
export type { FrameworkDefinition } from './framework-catalog.js';

export { dependenciesForFiles, dependencyNameOf, npmImportsOf } from './dependency-usage.js';
export type { FileWithContent } from './dependency-usage.js';

export {
  PRESENTATIONS,
  findCoverageMismatches,
  locateUiFile,
  readActualCoverage,
} from './ui-coverage.js';
export type { Presentation, UiCoverage } from './ui-coverage.js';

export { frameworkOfFile, selectFilesForFramework } from './framework-files.js';

export type {
  ComponentType,
  PreviewImage,
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

export { frameworkCatalogSchema } from './schema.zod.js';

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
