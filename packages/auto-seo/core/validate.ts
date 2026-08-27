import {
  isSchemaType,
  schemaValidators,
  type JsonLdGraph,
  type JsonLdSchema,
} from './schema-types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateItem(item: unknown): string[] {
  if (typeof item !== 'object' || item === null || !('@type' in item)) {
    return ['Missing or invalid "@type" field.'];
  }

  const type = (item as Record<string, unknown>)['@type'];
  if (typeof type !== 'string' || !isSchemaType(type)) {
    return [`Unsupported Schema.org type: ${String(type)}`];
  }

  const result = schemaValidators[type].safeParse(item);
  if (result.success) {
    return [];
  }

  return result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${type}.${path}: ${issue.message}` : `${type}: ${issue.message}`;
  });
}

/**
 * Validates a JSON-LD schema (or `@graph` of schemas) against the Zod schema
 * for its declared `@type`, returning missing-required-field errors so
 * callers can catch incomplete structured data before serving it.
 */
function isGraph(jsonld: JsonLdSchema | JsonLdGraph): jsonld is JsonLdGraph {
  return Array.isArray((jsonld as JsonLdGraph)['@graph']);
}

export function validate(jsonld: JsonLdSchema | JsonLdGraph): ValidationResult {
  const items: unknown[] = isGraph(jsonld) ? jsonld['@graph'] : [jsonld];
  const errors = items.flatMap((item) => validateItem(item));
  return { valid: errors.length === 0, errors };
}
