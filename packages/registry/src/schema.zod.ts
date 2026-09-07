import { z } from 'zod';

/**
 * SA1 (red-team, Critical): a malicious/misconfigured `files[].path` (e.g. `../../.env`
 * or an absolute path) must never be accepted at the schema level, so the builder can
 * trust `path` before doing its own filesystem-level clamp (defense in depth).
 */
function isSafeRelativePath(value: string): boolean {
  if (value.length === 0) return false;
  if (value.startsWith('/') || value.startsWith('\\')) return false;
  // Windows drive letter, e.g. "C:\\..."
  if (/^[a-zA-Z]:/.test(value)) return false;
  const segments = value.split(/[\\/]/);
  return !segments.includes('..');
}

const safeRelativePathSchema = z.string().refine(isSafeRelativePath, {
  message: 'Path must be relative and must not contain ".." or an absolute prefix',
});

export const envVariableSchema = z.object({
  key: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean(),
});

export const fileEncodingSchema = z.enum(['utf8', 'base64']);

export const registryFileSchema = z.object({
  path: safeRelativePathSchema,
  target: safeRelativePathSchema,
  type: z.string().min(1),
  encoding: fileEncodingSchema,
});

export const componentTypeSchema = z.union([
  z.enum(['frontend-component', 'headless-core', 'snippet']),
  z.string().min(1),
]);

export const visibilitySchema = z.enum(['public', 'internal']).default('public');

/**
 * Las reglas de una definición de framework, compartidas por el descriptor y por el catálogo que
 * el registry sirve. Tenerlas por duplicado dejaba el segundo mucho más laxo: aceptaba rutas
 * vacías, y `init` acababa escribiendo `paths.components: ""`, con lo que todo `add` posterior
 * remapeaba los ficheros a la raíz del proyecto.
 */
const frameworkDefinitionSchema = z.object({
  title: z.string().min(1),
  // Una extensión de verdad: uno o más tramos `.algo`, admitiendo dígitos y guiones
  // (`.component.ts`, `.vue`). El patrón anterior aceptaba `..` y rechazaba `.mjs2`.
  uiExtension: z
    .string()
    .regex(/^(?:\.[a-z0-9-]+)+$/i, {
      message: 'uiExtension debe ser como ".tsx" o ".component.ts"',
    })
    .optional(),
  // Con al menos una forma de reconocerlo: un `detect` vacío, o con cadenas vacías, no
  // detecta nada y deja al framework inservible para `init`.
  detect: z
    .object({ npm: z.string().min(1).optional(), composer: z.string().min(1).optional() })
    .refine((value) => value.npm !== undefined || value.composer !== undefined, {
      message: 'detect debe declarar npm o composer',
    })
    .optional(),
  peer: z.string().min(1).optional(),
  paths: z.object({ components: z.string().min(1), lib: z.string().min(1) }).optional(),
  basedOn: z.string().min(1).optional(),
  snippetDirectory: z.string().min(1).optional(),
});

export const registryDescriptorSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'name must be kebab-case'),
  version: z.string().min(1),
  title: z.string().min(1),
  type: componentTypeSchema,
  category: z.string().min(1),
  frameworks: z.array(z.string().min(1)).min(1),
  preview: z
    .object({
      image: safeRelativePathSchema,
      alt: z.string().min(1),
    })
    .optional(),
  frameworkDefs: z.record(z.string().min(1), frameworkDefinitionSchema).optional(),
  ui: z
    .record(
      z.string().min(1),
      z.object({
        presentations: z.array(z.enum(['headless', 'tailwind', 'shadcn', 'vanilla'])),
        missing: z.array(z.string().min(1)).optional(),
      }),
    )
    .optional(),
  visibility: visibilitySchema,
  peerDependencies: z.record(z.string(), z.string()).default({}),
  dependencies: z.array(z.string()).default([]),
  registryDependencies: z.array(z.string()).default([]),
  envVariables: z.array(envVariableSchema).default([]),
  files: z.array(registryFileSchema).min(1),
  description: z.string().optional(),
});

export type RegistryDescriptorInput = z.input<typeof registryDescriptorSchema>;
export type RegistryDescriptorParsed = z.output<typeof registryDescriptorSchema>;

export const registryFileWithContentSchema = registryFileSchema.extend({
  content: z.string(),
});

/**
 * `preview.image` tiene dos formas según dónde se lea, y por eso hay dos esquemas.
 *
 * En el descriptor es una ruta dentro del paquete (`preview/rating.png`), validada como cualquier
 * otra ruta. En lo que sirve el registry es ya la URL servible, porque `buildRegistry` copia el
 * fichero y reescribe el campo. Validar la segunda con las reglas de la primera rechazaba la
 * salida del propio build: en cuanto un componente declarase una captura, el cliente del registry
 * habría dejado de poder leer el índice entero.
 */
const servedPreviewSchema = z.object({
  image: z.string().regex(/^\/registry\/[a-z0-9-]+\.(?:png|jpg|jpeg|webp)$/i, {
    message: 'Served preview must be a /registry/{name}-preview.{ext} URL',
  }),
  alt: z.string().min(1),
});

export const registryEntrySchema = registryDescriptorSchema
  .omit({ files: true, preview: true })
  .extend({
    files: z.array(registryFileWithContentSchema).min(1),
    preview: servedPreviewSchema.optional(),
  });

export const registryIndexEntrySchema = z.object({
  name: z.string(),
  title: z.string(),
  category: z.string(),
  version: z.string(),
  frameworks: z.array(z.string()),
  preview: servedPreviewSchema.optional(),
  ui: z
    .record(
      z.string().min(1),
      z.object({
        presentations: z.array(z.enum(['headless', 'tailwind', 'shadcn', 'vanilla'])),
        missing: z.array(z.string().min(1)).optional(),
      }),
    )
    .optional(),
  description: z.string().optional(),
});

/** Catálogo de frameworks servido en `frameworks.json`, con las mismas reglas que el descriptor. */
export const frameworkCatalogSchema = z.record(z.string().min(1), frameworkDefinitionSchema);
