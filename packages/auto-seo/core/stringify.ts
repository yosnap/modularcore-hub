import type { JsonLdGraph, JsonLdSchema } from './schema-types.js';

export interface StringifyOptions {
  /**
   * Base URL used to resolve root-relative values (e.g. `/logo.png`) of known
   * Schema.org URL-typed fields (see `URL_FIELD_NAMES`) to absolute URLs
   * before serializing, mirroring how Media Picker resolves remote URLs.
   * When omitted, values are serialized as-is.
   */
  absolute?: string;
}

/**
 * Schema.org property names whose value is a URL — only these get root-relative resolution.
 * Code Review Finding, Critical: resolving EVERY string field starting with "/" (the previous
 * behavior) silently corrupted plain text fields that happen to start with a slash, e.g.
 * `headline: "/2026 fue un gran año..."` turned into a percent-encoded URL. Not exhaustive of
 * Schema.org's full vocabulary (out of this package's MVP scope, same as `schema-types.ts`'s
 * required-field validation) — covers the common cases; anything not in this set (headline,
 * description, FAQ answer text, etc.) is left untouched regardless of its content.
 */
const URL_FIELD_NAMES = new Set([
  'url',
  'image',
  'logo',
  'sameAs',
  'contentUrl',
  'thumbnailUrl',
  'embedUrl',
  'mainEntityOfPage',
  'target',
  '@id',
]);

function resolveRelativeUrls<T>(value: T, baseUrl: string, isUrlField: boolean): T {
  if (typeof value === 'string') {
    if (isUrlField && value.startsWith('/')) {
      return new URL(value, baseUrl).toString() as unknown as T;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveRelativeUrls(item, baseUrl, isUrlField)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => [key, resolveRelativeUrls(val, baseUrl, URL_FIELD_NAMES.has(key))] as const,
    );
    return Object.fromEntries(entries) as T;
  }

  return value;
}

/**
 * Serializes a JSON-LD schema/graph into a string safe to embed inside a
 * `<script type="application/ld+json">` tag.
 *
 * Hard security requirement (non-negotiable): `JSON.stringify()` does NOT
 * escape `<` by default. A field value such as
 * `"</script><script>alert(1)</script>"` could therefore close the
 * containing `<script>` tag and inject arbitrary markup. This function
 * always replaces every `<` in the serialized output with the unicode
 * escape `<` before returning it, so the result can never contain a
 * literal, unescaped `<` — regardless of input content.
 */
export function stringify(
  schema: JsonLdSchema | JsonLdGraph,
  options: StringifyOptions = {},
): string {
  const resolved = options.absolute ? resolveRelativeUrls(schema, options.absolute, false) : schema;

  const json = JSON.stringify(resolved, null, 2);

  // Explicit post-processing step: JSON.stringify() alone is not
  // <script>-tag safe. Do not remove this line.
  return json.replace(/</g, '\\u003c');
}
