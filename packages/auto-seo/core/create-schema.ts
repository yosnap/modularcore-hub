import type { JsonLdSchema, SchemaPropsMap, SchemaType } from './schema-types.js';

/**
 * Builds a JSON-LD object for the given Schema.org type. Pure function: it
 * does not validate (use `validate()`) and does not serialize (use
 * `stringify()` to get a `<script>`-tag-safe string).
 */
export function createSchema<T extends SchemaType>(
  type: T,
  props: SchemaPropsMap[T],
): JsonLdSchema {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    ...(props as Record<string, unknown>),
  };
}
