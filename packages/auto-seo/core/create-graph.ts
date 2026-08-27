import type { JsonLdGraph, JsonLdSchema } from './schema-types.js';

/**
 * Combines two or more JSON-LD schemas into a single `@graph`. Each item's
 * own `@context` is dropped since the graph declares a single shared context.
 */
export function createGraph(...schemas: JsonLdSchema[]): JsonLdGraph {
  if (schemas.length === 0) {
    throw new Error('createGraph() requires at least one schema.');
  }

  return {
    '@context': 'https://schema.org',
    '@graph': schemas.map((schema) => {
      const { '@context': context, ...item } = schema;
      void context;
      return item as JsonLdSchema;
    }),
  };
}
