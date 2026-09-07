// Subconjunto de `./index.js` seguro para el navegador: nada de aquí importa `node:*` ni
// `tar-stream`. `buildTarball`/`buildRegistry` (en el índice principal) sí lo hacen, así que una
// página cliente que importe del índice arrastra ese código a su bundle — es lo que rompía
// `/c/[name]` en producción con "Class extends value undefined" (streamx sin su entorno Node).
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
