---
title: "ModularCore Hub v1.1 (parte B): Vue, Angular, Azure Blob y Blade/PHP"
description: "Completa la compatibilidad pendiente de Media Picker y AI Chat: Vue 3, Angular standalone, Azure Blob seguro y snippets Laravel/Blade/PHP."
status: completed
priority: P1
effort: "3-4 semanas"
branch: release/v0.9.0
tags: [feature, frontend, adapters, storage, laravel, registry, copy-code]
blockedBy: []
blocks: []
created: 2026-08-27
---

# ModularCore Hub v1.1 (parte B): Vue, Angular, Azure Blob y Blade/PHP

## Overview

Completa los cuatro entregables diferidos del roadmap v1.1: adaptadores Vue 3 y Angular,
proveedor Azure Blob y snippets Blade/PHP. El alcance aplica a los dos componentes que existían
al definir aquel roadmap — `@modularcore/media-picker` y `@modularcore/ai-chat`; Modals es
posterior y mantiene su planificación propia.

Se conserva la arquitectura: core TypeScript headless, adaptadores delgados copy-code,
descriptores del registry y backend del consumidor. No habrá SaaS, DB, Composer ni secretos
Azure/OpenAI en browser.

## Scope challenge

- **Existe:** MediaPicker y Chat ya exponen estado/suscripción; CLI ya detecta Vue/Angular y
  registry valida framework y peer antes de escribir.
- **Mínimo:** bindings nativos + ejemplos reales. UI completa con variantes visuales se difiere;
  duplicar 6+ componentes por framework no es requisito para usar los cores.
- **Complejidad:** cuatro integraciones, sin capa de negocio nueva. Se aísla por contrato,
  framework y proveedor.
- **Modo:** mantener alcance. Fuera: Modals, Vue 2, Angular NgModule, Nuxt/SSR específico,
  Composer y administración Azure.

## Goals

| # | Objetivo | Prioridad |
|---|----------|-----------|
| 1 | Adaptadores Vue 3 y Angular standalone para Media Picker y AI Chat sin tocar cores | P1 |
| 2 | Azure Blob por SAS limitada, nunca account keys en cliente | P1 |
| 3 | Snippets Laravel/Blade/PHP instalables y auditables desde registry | P1 |
| 4 | Descriptores, CLI y release consistentes | P1 |

## Decisions

1. Vue `>=3.3` (Composition API) y Angular `>=17` standalone. No Vue 2 ni NgModule legacy.
2. Solo adaptadores headless: Vue ofrece composables; Angular, servicios por instancia y signals.
3. Azure usa SAS por recurso, permisos mínimos y TTL corto emitida por backend propio.
4. Blade/PHP son archivos copy-code, no Web Components ni paquete Composer.
5. `frameworks` solo anuncia `vue`, `angular` o `blade` cuando hay archivos utilizables; PHP de
   servidor no es peer npm.

## Phases

| # | Fase | Depende de | Ownership | Estado |
|---|------|------------|-----------|--------|
| 1 | [Contrato y descriptores](./phase-01-start.md) | — | manifests, exports, descriptor, fixtures | Completed |
| 2 | [Adaptadores Vue 3](./phase-02-base-de-compatibilidad-y-descriptores.md) | 1 | `adapters/vue/**`, tests y docs Vue | Completed |
| 3 | [Angular standalone](./phase-03-adaptadores-vue-3.md) | 1 | `adapters/angular/**`, tests y docs Angular | Completed |
| 4 | [Azure Blob seguro](./phase-04-adaptadores-angular-standalone.md) | 1 | provider Azure, contrato SAS, tests | Completed |
| 5 | [Blade/PHP, registry y release](./phase-05-proveedor-azure-blob-y-snippets-blade-php.md) | 2,3,4 | snippets, website, CI/release | Completed |

**Ruta crítica:** 1 → {2 ∥ 3 ∥ 4} → 5. Fases paralelas no comparten adaptadores/providers.

## Architecture

```text
MediaPicker / Chat core (sin cambio semántico)
    ├─ Vue: composable + refs + onUnmounted
    ├─ Angular: servicio por componente + signals + DestroyRef
    └─ Azure: StorageProvider → endpoint propio → SAS limitada → Blob Storage

Laravel/Blade: endpoint autentica/autoriza y firma; vista integra copy-code y CSRF.
```

## Non-goals

- UI Vue/Angular completa o variantes Tailwind/Shadcn/vanilla.
- Auto-SEO, Modals, Vue 2, Angular NgModule legacy, Nuxt/Angular Universal SSR.
- Listado/borrado Azure con SAS amplia, hosting del hub, Composer, auth o DB.

## Success criteria

- [x] Los entrypoints nuevos compilan y se copian desde registry sin React/Svelte.
- [x] Vue/Angular actualizan estado y limpian suscripciones al desmontar/destruir.
- [x] Azure pasa contrato StorageProvider sin aceptar secretos duraderos.
- [x] Snippets Laravel validan auth/input, emiten SAS acotada e incorporan CSRF; no imprimen secretos.
- [x] `pnpm -w typecheck`, `test`, `build` y `build:registry` verdes.

## Research references

- Vue: https://vuejs.org/guide/reusability/composables
- Angular: https://angular.dev/guide/components
- Azure SAS: https://learn.microsoft.com/en-us/azure/developer/javascript/tutorial/browser-file-upload-azure-storage-blob
- Laravel Blade: https://laravel.com/docs/11.x/blade

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Subscription leaks | Teardown explícito y tests lifecycle Vue/Angular. |
| SAS demasiado amplia | Recurso/permiso/TTL mínimos; no serializarla en errores. |
| SDK Azure en cliente | Provider browser con Fetch; SDK solo en snippet server-side. |
| Soporte declarado sin artefacto | Fixtures + build de registry validan archivos y targets. |

## Open questions

Ninguna bloqueante. La UI estilizada se difiere intencionadamente.

<!-- slug: v11-compatibilidad-vue-angular-azure-blob-y-blade-php -->
