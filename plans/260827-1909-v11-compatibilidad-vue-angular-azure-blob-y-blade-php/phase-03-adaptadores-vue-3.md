---
phase: 3
title: "Adaptadores Angular standalone"
status: completed
priority: P1
effort: "5-6d"
dependencies: [1]
---

# Phase 3: Adaptadores Angular standalone

## Overview

Integrar Media Picker y AI Chat en Angular moderno con servicios por instancia y signals. El API
objetivo es standalone Angular >=17; no se añade compatibilidad NgModule legacy.

## Requirements

- Factorías/servicios reciben core u opciones; prohibidos singletons que compartan chats/media.
- Snapshots como signals readonly; toda mutación se delega al core.
- `DestroyRef` limpia subscriptions y AbortControllers; no depender de Zone.js.
- TestBed prueba destroy, cambios async, error y aislamiento.

## Related Code Files

- Create: `packages/media-picker/adapters/angular/media-picker.service.ts`
- Create: `packages/ai-chat/adapters/angular/chat.service.ts`
- Create: `packages/{media-picker,ai-chat}/test/angular/*.test.ts`
- Modify: `packages/{media-picker,ai-chat}/{package.json,README.md,modularcore.json}`

## Implementation Steps

1. Crear servicios/factorías standalone con provider local y `signal` readonly.
2. Conectar `subscribe` a `DestroyRef.onDestroy`; no escribir tras destroy.
3. Exponer comandos async sin alterar errores ni reglas del core.
4. Añadir export `./angular`, peer `@angular/core >=17` y ejemplo OnPush.
5. Verificar TestBed y fixture sin peers React/Svelte.

## Success Criteria

- [x] Angular standalone usa ambos paquetes sin NgModule ni Zone.js.
- [x] Destroy limpia recursos y el descriptor valida la versión Angular antes de escribir.

## Risk Assessment

Signals reflejan snapshots, no reemplazan ownership del core. Lifecycle/cancelación permanece en el
core y se prueba explícitamente.
