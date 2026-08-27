---
phase: 2
title: "Adaptadores Vue 3"
status: completed
priority: P1
effort: "4-5d"
dependencies: [1]
---

# Phase 2: Adaptadores Vue 3

## Overview

Crear bindings Vue 3 Composition API para Media Picker y AI Chat; delegan toda lógica al core.

## Requirements

- `useMediaPicker` y `useChat` devuelven objetos planos de refs y acciones estables.
- Efectos DOM solo tras mount; `onUnmounted` limpia subscription/abort.
- SSR no accede a `window`, storage ni custom elements durante `setup`.
- Tests Vue reales validan lifecycle, stream, abort, error y dos instancias aisladas.

## Related Code Files

- Create: `packages/media-picker/adapters/vue/use-media-picker.ts`
- Create: `packages/ai-chat/adapters/vue/use-chat.ts`
- Create: `packages/{media-picker,ai-chat}/test/vue/*.test.ts`
- Modify: `packages/{media-picker,ai-chat}/{package.json,README.md,modularcore.json}`

## Implementation Steps

1. Crear factorías por instancia; suscribir snapshots en setup y reflejarlos en `shallowRef`/`ref`.
2. Exponer comandos delgados: carga/edición/subida; send/cancel/confirm tool.
3. Proteger browser APIs y documentar inicialización en mounted para SSR.
4. Probar unmount previo a promesas, streams, errores y aislamiento concurrente.
5. Documentar `script setup` con provider seguro/proxy de chat, sin keys.

## Success Criteria

- [x] Imports `@modularcore/*/vue` son funcionales sin React/Svelte.
- [x] El disposer se llama una vez y actualizaciones tardías no tocan refs.

## Risk Assessment

Evitar `reactive()` compartido: cada llamada devuelve refs propias y las pruebas ejercitan dos
consumidores simultáneos.
