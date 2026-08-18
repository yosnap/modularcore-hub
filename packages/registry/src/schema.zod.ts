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

export const registryEntrySchema = registryDescriptorSchema
  .omit({ files: true })
  .extend({ files: z.array(registryFileWithContentSchema).min(1) });

export const registryIndexEntrySchema = z.object({
  name: z.string(),
  title: z.string(),
  category: z.string(),
  version: z.string(),
  frameworks: z.array(z.string()),
  description: z.string().optional(),
});
