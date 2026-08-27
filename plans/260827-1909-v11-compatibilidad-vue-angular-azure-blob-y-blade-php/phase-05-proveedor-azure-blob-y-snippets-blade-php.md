---
phase: 5
title: "Snippets Blade/PHP, registry y release"
status: completed
priority: P1
effort: "3-4d"
dependencies: [2, 3, 4]
---

# Phase 5: Snippets Blade/PHP, registry y release

## Overview

Distribuir la integración Laravel/PHP como copy-code auditable y cerrar el registry, docs,
validación y versionado de los cuatro entregables.

## Requirements

- Snippets separados de vista Blade y endpoint PHP/Laravel; no Composer package.
- Blade escapa datos, usa CSRF en mutaciones y solo configura URLs públicas.
- Endpoint autentica/autoriza, valida input y firma credenciales cortas; claves solo server-side.
- Descriptores enumeran archivos/targets/manual+CLI sin vender PHP como peer npm.

## Related Code Files

- Create: `packages/media-picker/snippets/laravel/azure-blob-sas-controller.php`
- Create: `packages/media-picker/snippets/laravel/media-picker.blade.php`
- Create: `packages/ai-chat/snippets/laravel/ai-chat.blade.php`
- Create: `packages/ai-chat/snippets/laravel/chat-proxy-controller.php`
- Create: `packages/{media-picker,ai-chat}/docs/laravel-blade-integration.md`
- Modify: `packages/{media-picker,ai-chat}/{modularcore.json,README.md}`
- Modify: `apps/web/src/routes/c/[name]/+page.svelte`, registry fixtures/tests, `.changeset/*`

## Implementation Steps

1. Escribir snippets concretos: rutas, JSON, hook de policy, MIME/tamaño y env solo servidor.
2. Enlazar Media Picker al endpoint SAS; para Chat, proxy autenticado que inyecta key fuera de browser.
3. Evitar `{!! !!}` para datos no confiables; aplicar `@csrf` donde Laravel lo requiere.
4. Actualizar catálogo/descriptores con matriz por archivo, instalación manual/CLI y targets seguros.
5. Ejecutar tests de descriptor, `build:registry`, typecheck/build/test global y changesets públicos.

## Success Criteria

- [x] Laravel puede copiar snippets y usar provider/proxy sin exponer keys.
- [x] Registry valida y sirve archivos Vue/Angular/Azure/Blade declarados.
- [x] Docs delimitan que auth, rate limiting, validación y persistencia son del consumidor.

## Risk Assessment

Los snippets no son producción universal: cada uno declara sus ganchos de policy, rate limit,
validación y permisos que el consumidor debe adaptar.
