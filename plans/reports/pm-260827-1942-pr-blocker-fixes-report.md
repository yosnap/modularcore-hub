---
title: "Corrección de bloqueantes de la PR v1.1"
date: 2026-08-27
status: completed
scope: "release/v0.9.0 -> develop"
---

# Corrección de bloqueantes de la PR v1.1

## Resumen

Se corrigieron los bloqueantes de Blade/Vite, CLI Blade y function calling Laravel identificados
en la revisión previa al merge. Revisión independiente: APPROVE.

## Cambios

| Área | Corrección |
|---|---|
| Blade/Vite | Entradas copiables y montaje por `resources/js/app.js`; sin imports inline a `/resources`. |
| CLI | Detección Laravel mediante `composer.json` y paths `resources/**` por defecto. |
| Laravel | Controladores heredan `Controller`; proxy valida y reenvía tools/tool messages y limita payload a 64 KB. |
| Dependencias | `zod@^4.4.3` es instalable mediante el CLI. |

## Evidencia

- `pnpm -w test`: 61 archivos, 421 pruebas ✓
- `pnpm -w lint`, `typecheck`, `build`, `build:registry` ✓
- `git diff --check` ✓
- Revisión independiente ✓

## Preguntas sin resolver

- El repositorio no incluye runtime Laravel/PHP; el consumidor debe ejecutar `php -l` y pruebas de
  integración en su aplicación.
