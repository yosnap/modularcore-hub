---
title: "Auto SEO"
description: "Core headless y agnóstico de framework para generar datos estructurados Schema.org como JSON-LD."
---

`@modularcore/auto-seo` es un core headless y agnóstico de framework para generar datos
estructurados de [Schema.org](https://schema.org) en formato JSON-LD.

## Alcance (MVP, v1): solo JSON-LD

Las etiquetas OpenGraph, la extracción de palabras clave y las vistas previas de tarjetas sociales
quedan explícitamente fuera de alcance de este paquete y se dejan para una futura iteración.

## Instalación

Es un componente copy-code (como Media Picker o AI Chat): copia `core/` a tu proyecto a través de
la CLI de ModularCore, o impórtalo directamente desde este workspace durante el desarrollo.

```bash
pnpm add zod
pnpm add -D schema-dts # solo tipos, no es una dependencia en tiempo de ejecución
```

## API

Todas las funciones son puras — sin clases, sin encadenado de builders, sin dependencia de
framework.

```ts
import { createSchema, createGraph, stringify, validate } from '@modularcore/auto-seo';

const article = createSchema('Article', {
  headline: 'Componentes modulares para la web moderna',
  datePublished: '2026-08-25',
  author: { '@type': 'Person', name: 'Jane Doe' },
});

const { valid, errors } = validate(article);
// { valid: true, errors: [] }

const graph = createGraph(article, /* ...más schemas */);

const jsonLd = stringify(graph, { absolute: 'https://example.com' });
// seguro para incrustar: <script type="application/ld+json">{jsonLd}</script>
```

### `createSchema(type, props)`

Construye un objeto JSON-LD (`{ '@context', '@type', ...props }`) para uno de los 7 tipos de
Schema.org soportados: `Article`, `Product`, `Organization`, `BreadcrumbList`, `WebSite`,
`LocalBusiness`, `FAQPage`. `props` está tipado a partir de
[`schema-dts`](https://github.com/google/schema-dts) de Google, para autocompletado en el editor
(devDependency solo de tipos, sin coste en runtime).

### `createGraph(...schemas)`

Combina 2 o más schemas en un único objeto `{ '@context', '@graph': [...] }`.

### `stringify(schema, { absolute? })`

Serializa un schema/graph a una cadena segura para incrustar dentro de una etiqueta
`<script type="application/ld+json">`.

- **Seguridad (requisito obligatorio):** `JSON.stringify()` no escapa `<` por defecto, así que un
  valor de campo que contenga `</script><script>...</script>` podría cerrar la etiqueta
  `<script>` que lo contiene. `stringify()` siempre sustituye cada `<` de su salida por `<`
  antes de devolverla — esto no se puede desactivar.
- `absolute`: URL base opcional. Cuando se indica, cualquier campo de tipo string que empiece por
  `/` se resuelve como una URL absoluta contra esa base; los valores ya absolutos se dejan tal
  cual.

### `validate(jsonld)`

Valida un schema (o graph) contra un schema Zod para su `@type` declarado, devolviendo
`{ valid: boolean, errors: string[] }`. Detecta campos obligatorios ausentes (p. ej.
`Article.headline`, `Product.offers`, `Organization.logo`) — no es un validador estructural
completo de Schema.org.

## Notas de diseño

- Sin clases, sin builders encadenados: mantiene la API trivialmente portable a cualquier
  framework o contexto de renderizado en servidor.
- `schema-dts` es una **devDependency únicamente** (tipos, sin código en runtime), de modo que
  instalar este paquete a través del comando `add` de la CLI nunca añade una dependencia extra de
  producción.
- `zod` es una `dependency` normal, en línea con el resto del monorepo (`packages/cli`,
  `packages/ai-chat`, `packages/registry-client`).

Prueba este componente en vivo en el [Playground de Auto SEO](/referencia/playground/auto-seo/).
