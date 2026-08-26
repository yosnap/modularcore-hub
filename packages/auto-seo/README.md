# @modularcore/auto-seo

Headless, framework-agnostic core to generate [Schema.org](https://schema.org)
structured data as JSON-LD.

**Scope (MVP, v1): JSON-LD only.** OpenGraph tags, keyword extraction and
social card previews are explicitly out of scope for this package and are
left for a future iteration.

## Install

Copy-code component (like Media Picker / AI Chat): copy `core/` into your
project via the ModularCore CLI, or import directly from this workspace
package during development.

```bash
pnpm add zod
pnpm add -D schema-dts # types only, not a runtime dependency
```

## API

All functions are pure — no classes, no builder chaining, no framework
dependency.

```ts
import { createSchema, createGraph, stringify, validate } from '@modularcore/auto-seo';

const article = createSchema('Article', {
  headline: 'Modular components for the modern web',
  datePublished: '2026-08-25',
  author: { '@type': 'Person', name: 'Jane Doe' },
});

const { valid, errors } = validate(article);
// { valid: true, errors: [] }

const graph = createGraph(article, /* ...more schemas */);

const jsonLd = stringify(graph, { absolute: 'https://example.com' });
// safe to embed: <script type="application/ld+json">{jsonLd}</script>
```

### `createSchema(type, props)`

Builds a JSON-LD object (`{ '@context', '@type', ...props }`) for one of the
7 supported Schema.org types: `Article`, `Product`, `Organization`,
`BreadcrumbList`, `WebSite`, `LocalBusiness`, `FAQPage`. `props` is typed
from Google's [`schema-dts`](https://github.com/google/schema-dts) for
editor autocomplete (types-only devDependency, no runtime cost).

### `createGraph(...schemas)`

Combines 2+ schemas into a single `{ '@context', '@graph': [...] }` object.

### `stringify(schema, { absolute? })`

Serializes a schema/graph to a string safe to embed inside a
`<script type="application/ld+json">` tag.

- **Security (hard requirement):** `JSON.stringify()` does not escape `<` by
  default, so a field value containing `</script><script>...</script>` could
  close the containing `<script>` tag. `stringify()` always replaces every
  `<` in its output with `<` before returning it — this cannot be
  disabled.
- `absolute`: optional base URL. When set, any string field starting with
  `/` is resolved to an absolute URL against that base; already-absolute
  values are left untouched.

### `validate(jsonld)`

Validates a schema (or graph) against a Zod schema for its declared
`@type`, returning `{ valid: boolean, errors: string[] }`. Detects missing
required fields (e.g. `Article.headline`, `Product.offers`,
`Organization.logo`) — it is not a full Schema.org structural validator.

## Design notes

- No classes, no chained builders: keeps the API trivially portable to any
  framework or server-rendering context.
- `schema-dts` is a **devDependency only** (types, no runtime code) so that
  installing this package via the CLI's `add` command never pulls in an
  extra production dependency.
- `zod` is a regular `dependency`, matching the rest of the monorepo
  (`packages/cli`, `packages/ai-chat`, `packages/registry-client`).
