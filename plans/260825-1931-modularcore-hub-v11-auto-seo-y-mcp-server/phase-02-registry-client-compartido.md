---
phase: 2
title: "Auto-SEO JSON-LD Core"
status: done
priority: P1
effort: "3-4d"
dependencies: []
---

# Phase 2: Auto-SEO JSON-LD Core

## Overview

Nuevo paquete `@modularcore/auto-seo`: core headless framework-agnóstico para generar structured data JSON-LD (Schema.org). Alcance MVP = **solo JSON-LD**; keywords y Social Card preview quedan para una iteración posterior del mismo componente (fuera de este plan). Sigue el mismo patrón copy-code + registry descriptor que Media Picker/AI Chat, pero sin adapters React/Svelte obligatorios en esta fase (son funciones puras, usables directamente en cualquier framework).

No depende de la Fase 1 — puede ejecutarse en paralelo con la Fase 3 una vez cerrada la Fase 1 (o incluso antes, ya que no toca `registry-client`).

## Key Insights (del research)

- API mínima recomendada: `createSchema(type, props)`, `createGraph(...schemas)`, `stringify(schema, opts)`, `validate(jsonld)`. Funciones puras, no builder encadenable (mantiene agnosticismo de framework).
- Usar tipos de `schema-dts` (Google) como `devDependency`/`dependency` de solo-tipos (sin runtime) para los 7 tipos Schema.org acordados: `Article`, `Product`, `Organization`, `BreadcrumbList`, `WebSite`, `LocalBusiness`, `FAQPage`.
- Validación runtime con Zod (ya es dependencia estándar del proyecto, ver `packages/cli`), no reinventar un validador propio.
- `@graph` para agrupar múltiples items (ej. varios `Product`).
- Escapado: **corrección post red-team** — `JSON.stringify()` nativo NO escapa `<`, por lo que `stringify()` debe aplicar un post-procesado explícito (reemplazar `<` por `<` o equivalente) antes de retornar. No delegar ciegamente al nativo para este caso específico (ver Requirement obligatorio abajo).
- URLs deben poder resolverse a absolutas (opción `absolute` en `stringify`), igual que Media Picker ya maneja URLs remotas.

## Requirements

- Funcional:
  - [x] `createSchema(type, props)` construye un objeto JSON-LD válido para cada uno de los 7 tipos Schema.org soportados.
  - [x] `createGraph(...schemas)` produce un `@graph` válido para múltiples items.
  - [x] **[Red-team #5, Medium — requisito obligatorio, no opcional]** `stringify(schema, { absolute? })` DEBE reemplazar toda ocurrencia de `<` por `<` (o equivalente) en el output de `JSON.stringify()` antes de devolverlo, para que sea seguro embeber en `<script type="application/ld+json">` sin que un valor de campo como `"</script><script>alert(1)</script>"` pueda cerrar el tag contenedor. `JSON.stringify()` nativo NO escapa `<` por defecto — esto no es un detalle a "descubrir con un test", es una transformación explícita que la función debe implementar.
  - [x] `validate(jsonld)` usa un schema Zod para detectar campos requeridos faltantes por tipo antes de servir el JSON-LD.
- No-funcional:
  - [x] Sin dependencias de ningún framework (React/Svelte/Next) en el core.
  - [x] Tests unitarios cubren los 7 tipos + `createGraph` + casos de error de `validate` (sin llamar servicios externos como Google Rich Results Test).

## Architecture

```
packages/auto-seo/
├── core/
│   ├── schema-types.ts     # tipos + Zod schemas por tipo Schema.org soportado
│   ├── create-schema.ts    # createSchema()
│   ├── create-graph.ts     # createGraph()
│   ├── stringify.ts        # stringify()
│   └── validate.ts         # validate()
├── test/
│   └── *.test.ts
├── modularcore.json        # descriptor del registry (type: headless-core)
├── package.json
├── tsconfig.json
├── vitest.config.ts        # environment: node
└── README.md
```

## Related Code Files

- Create: `packages/auto-seo/package.json`
- Create: `packages/auto-seo/tsconfig.json`
- Create: `packages/auto-seo/vitest.config.ts`
- Create: `packages/auto-seo/core/schema-types.ts`
- Create: `packages/auto-seo/core/create-schema.ts`
- Create: `packages/auto-seo/core/create-graph.ts`
- Create: `packages/auto-seo/core/stringify.ts`
- Create: `packages/auto-seo/core/validate.ts`
- Create: `packages/auto-seo/test/create-schema.test.ts`
- Create: `packages/auto-seo/test/create-graph.test.ts`
- Create: `packages/auto-seo/test/stringify.test.ts`
- Create: `packages/auto-seo/README.md`
- (descriptor `modularcore.json` se crea en Fase 4, junto al de MCP server, para mantener esa fase como el único punto de "publicación al registry")

## Implementation Steps

1. Confirmar en `package.json` raíz/`pnpm-workspace.yaml` que `packages/*` ya cubre el nuevo paquete (sin cambios esperados, solo verificar).
2. Copiar `package.json`/`tsconfig.json`/`vitest.config.ts` de `packages/media-picker` (o `ai-chat`) como plantilla — mismo patrón de `scripts` (`build`, `typecheck`, `test`).
3. Añadir `schema-dts` como **`devDependency`** (solo tipos, sin runtime — `/* Updated: Validation Session 1 */` así el CLI no lo instala como dependencia de producción al hacer `add`) y `zod` como `dependency` (ya usado en el monorepo).
4. Implementar `schema-types.ts`: por cada uno de los 7 tipos, un Zod schema con los campos requeridos mínimos (ej. `Article.headline`/`datePublished`, `Product.offers`, `Organization.logo`) y un tipo TS derivado de `schema-dts` para autocompletado.
5. Implementar `createSchema`, `createGraph`, `stringify`, `validate` como funciones puras (sin clases, sin estado).
6. Tests: por cada tipo, un caso válido + un caso con campo requerido faltante (debe fallar `validate`); un test de `createGraph` con 2+ items; un test de `stringify` verificando que caracteres especiales (`/`, `"`, unicode) se serializan correctamente sin romper el `<script>` tag.
7. `pnpm --filter @modularcore/auto-seo build && test`.

## Success Criteria

- [x] Los 7 tipos Schema.org generan JSON-LD que pasa `JSON.parse()` sin errores y valida contra su Zod schema.
- [x] **[Red-team #5, Medium — hard gate]** `stringify()` NUNCA produce un `<` sin escapar en su output cuando el input contiene `</script>` u otra secuencia `<...>` — test explícito con un valor de campo malicioso (`"</script><script>alert(1)</script>"`) que verifica el output escapado, no solo que `JSON.parse()` no falle.
- [x] Cobertura de test incluye al menos un caso de fallo de validación por tipo.
- [x] `pnpm --filter @modularcore/auto-seo build && pnpm --filter @modularcore/auto-seo test` verdes.

## Risk Assessment

- **Riesgo:** sobre-alcance hacia OpenGraph/keywords (mencionados en el PRD pero explícitamente fuera de este plan). **Mitigación:** el nombre de las funciones y el README dejan claro que es "JSON-LD only, v1"; cualquier función de OG se pospone a un plan futuro.
- **Riesgo:** `schema-dts` como dependencia de tipos podría requerir `skipLibCheck` o configuración especial de `tsconfig`. **Mitigación:** copiar `tsconfig.json` base del monorepo (`ai-chat`/`media-picker` ya definen esto) en vez de crear uno desde cero.
- **Riesgo (Red-team #5, Medium, ya no es riesgo abierto):** el escapado de `<` en `stringify()` es un Requirement y Success Criterion obligatorios (ver arriba), no un ítem a verificar oportunistamente con un test — si el test del hard gate falla, la fase no se da por cerrada.
