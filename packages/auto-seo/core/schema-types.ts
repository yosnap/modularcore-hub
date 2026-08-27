import { z, type ZodTypeAny } from 'zod';
import type {
  Article as ArticleDts,
  BreadcrumbList as BreadcrumbListDts,
  FAQPage as FAQPageDts,
  LocalBusiness as LocalBusinessDts,
  Organization as OrganizationDts,
  Product as ProductDts,
  WebSite as WebSiteDts,
} from 'schema-dts';

/** Schema.org types supported by this package's MVP (JSON-LD only, v1). */
export const SCHEMA_TYPES = [
  'Article',
  'Product',
  'Organization',
  'BreadcrumbList',
  'WebSite',
  'LocalBusiness',
  'FAQPage',
] as const;

export type SchemaType = (typeof SCHEMA_TYPES)[number];

/** Removes the JSON-LD framing keys so callers only supply domain fields. */
type SchemaProps<T> = Omit<T, '@context' | '@type'>;

/**
 * Maps each supported Schema.org type to its `schema-dts` shape (minus the
 * `@context`/`@type` framing keys), giving `createSchema()` callers editor
 * autocomplete without shipping `schema-dts` as a runtime dependency (it is
 * a types-only devDependency — see package.json).
 */
export interface SchemaPropsMap {
  Article: SchemaProps<ArticleDts>;
  Product: SchemaProps<ProductDts>;
  Organization: SchemaProps<OrganizationDts>;
  BreadcrumbList: SchemaProps<BreadcrumbListDts>;
  WebSite: SchemaProps<WebSiteDts>;
  LocalBusiness: SchemaProps<LocalBusinessDts>;
  FAQPage: SchemaProps<FAQPageDts>;
}

/** A single JSON-LD Schema.org object, already framed with `@context`/`@type`. */
export interface JsonLdSchema {
  '@context': 'https://schema.org';
  '@type': SchemaType;
  [key: string]: unknown;
}

/** Multiple JSON-LD schemas grouped under a single `@graph`. */
export interface JsonLdGraph {
  '@context': 'https://schema.org';
  '@graph': JsonLdSchema[];
}

/**
 * Marks a field as required for `validate()` purposes without re-deriving
 * the full `schema-dts` structural shape in Zod. MVP scope is "detect
 * missing required fields", not full Schema.org structural validation of
 * every optional field (out of scope, see phase-02 Requirements).
 */
function required(fieldName: string): ZodTypeAny {
  return z.custom<unknown>((value) => value !== undefined && value !== null && value !== '', {
    message: `"${fieldName}" is required`,
  });
}

/** Minimal required-field set per type, per phase-02 Implementation Steps §4. */
const requiredFieldsByType: Record<SchemaType, Record<string, ZodTypeAny>> = {
  Article: {
    headline: required('headline'),
    datePublished: required('datePublished'),
  },
  Product: {
    name: required('name'),
    offers: required('offers'),
  },
  Organization: {
    name: required('name'),
    logo: required('logo'),
  },
  BreadcrumbList: {
    itemListElement: required('itemListElement'),
  },
  WebSite: {
    name: required('name'),
    url: required('url'),
  },
  LocalBusiness: {
    name: required('name'),
    address: required('address'),
  },
  FAQPage: {
    mainEntity: required('mainEntity'),
  },
};

/**
 * Per-type Zod schema used by `validate()`. Checks `@type` plus the required
 * fields above; all other Schema.org fields are passed through unvalidated.
 */
export const schemaValidators: Record<SchemaType, ZodTypeAny> = Object.fromEntries(
  SCHEMA_TYPES.map((type) => [
    type,
    z
      .object({
        '@type': z.literal(type),
        ...requiredFieldsByType[type],
      })
      .passthrough(),
  ]),
) as unknown as Record<SchemaType, ZodTypeAny>;

export function isSchemaType(value: string): value is SchemaType {
  return (SCHEMA_TYPES as readonly string[]).includes(value);
}
