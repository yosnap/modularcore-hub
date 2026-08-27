---
phase: 1
title: "Registry Client Compartido"
status: done
priority: P1
effort: "3-5d"
dependencies: []
---

# Phase 1: Registry Client Compartido

## Overview

Extrae la lógica de `packages/cli/src/registry-client.ts` (fetch al registry HTTP, parsing/validación de descriptores) a un paquete propio `@modularcore/registry-client`. El CLI pasa a consumirlo como dependencia. Es la base que la Fase 3 (MCP Server) reutiliza en vez de duplicar código — evita dos implementaciones divergentes del mismo cliente HTTP (DRY).

## Requirements

- Funcional:
  - [x] `@modularcore/registry-client` expone la misma superficie pública que hoy vive en `packages/cli/src/registry-client.ts`: interfaz `RegistryClient` (`getIndex()`, `getDescriptor(name)`, `getTarball(name)`), función `createRegistryClient(registryUrl: string): RegistryClient`, y `RegistryClientError`.
  - [x] **[Red-team #3, High]** `@modularcore/registry-client` también incluye `resolveTargetPath` (clamp anti path-traversal) y `writeFilesTracked` (escritura por-archivo con reporte de `filesWritten` en fallo parcial), extraídos tal cual desde `packages/cli/src/files.ts:19-70`. Esto es lo que la Fase 3 (MCP Server) reutiliza para `install_component` — **no queda como "evaluar durante implementación"**, es un entregable obligatorio de esta fase.
  - [x] `packages/cli` importa desde `@modularcore/registry-client` en vez de su archivo local; los archivos locales (`registry-client.ts`, y las funciones movidas de `files.ts`) se eliminan.
  - [x] Comportamiento observable del CLI (`init`, `add`, `list`, `search`, `update`, `diff`) sin cambios — mismos mensajes de error, mismas validaciones.
- No-funcional:
  - [x] Cero dependencias circulares entre `@modularcore/cli`, `@modularcore/registry-client` y `@modularcore/registry`.
  - [x] Paquete sigue la misma convención de build (`tsc`), test (`vitest run`) y `exports` que `@modularcore/registry`.
  - [x] **[Red-team #10]** `@modularcore/registry-client` SE PUBLICA en npm (igual que `@modularcore/registry`) — NO se añade a `ignore` en `.changeset/config.json`. Decisión firme, ya no es pregunta abierta (ver plan.md).
  - [x] **[Red-team #1, Critical]** `RegistryClientError` en el nuevo paquete **NO** extiende `CliError` (esa clase es un concepto exclusivo del CLI, definida junto a `CompatibilityError`/`DependencyCycleError`/`PromptCancelledError` en `packages/cli/src/errors.ts:19-38`, y debe permanecer ahí). `RegistryClientError` extiende `Error` directamente en `@modularcore/registry-client`. El handler top-level del CLI (`packages/cli/src/index.ts:121`, hoy `if (error instanceof CliError)`) se actualiza para también capturar `instanceof RegistryClientError` (importado desde `@modularcore/registry-client`) y aplicar el mismo formato de mensaje limpio — sin esto, cualquier error del registry (404, red, JSON inválido) cae al branch de "Unexpected error" y imprime un stack trace crudo al usuario.

## Architecture

```
packages/registry-client/        (NUEVO)
├── src/
│   ├── index.ts                 # re-exports públicos
│   ├── registry-client.ts       # movido desde packages/cli/src/registry-client.ts
│   ├── errors.ts                # RegistryClientError extends Error (NO CliError, ver Requirement Critical #1)
│   └── files.ts                 # resolveTargetPath + writeFilesTracked, movidos desde
│                                 # packages/cli/src/files.ts:19-70 (Red-team #3)
├── package.json                 # deps: zod, @modularcore/registry (workspace:*)
├── tsconfig.json
└── vitest.config.ts             # environment: node (igual que packages/registry)

packages/cli/
├── src/
│   ├── registry-client.ts       # ELIMINAR
│   ├── errors.ts                # CliError y sus subclases CLI-only permanecen aquí
│   ├── index.ts                 # catch top-level: OR de instanceof CliError | instanceof
│   │                             # RegistryClientError (importado del nuevo paquete)
│   └── ...                      # todo lo que importaba registry-client.ts o las funciones
│                                 # de files.ts movidas pasa a importar de '@modularcore/registry-client'
└── package.json                 # + dependency "@modularcore/registry-client": "workspace:*"
```

Extracción mecánica del fetch/parsing + clamp/escritura (move + re-wire imports), NO una reescritura de lógica HTTP/schema. El único cambio de comportamiento intencional es el manejo de errores (Requirement Critical #1), que se cubre con un test de regresión explícito.

## Related Code Files

- Create: `packages/registry-client/package.json`
- Create: `packages/registry-client/tsconfig.json`
- Create: `packages/registry-client/vitest.config.ts`
- Create: `packages/registry-client/src/index.ts`
- Create: `packages/registry-client/src/registry-client.ts` (contenido movido desde CLI)
- Create: `packages/registry-client/src/errors.ts` (`RegistryClientError extends Error`, ver Requirement Critical #1 — NO copiar `CliError`)
- Create: `packages/registry-client/src/files.ts` (`resolveTargetPath` + `writeFilesTracked`, movidos desde `packages/cli/src/files.ts:19-70`, Red-team #3)
- Create: `packages/registry-client/test/registry-client.test.ts` (mover/adaptar tests existentes del CLI que cubren esta lógica, si existen)
- Create: `packages/registry-client/test/files.test.ts` (mover/adaptar tests de `resolveTargetPath`/`writeFilesTracked`, incluyendo el caso de fallo parcial que hoy consume `packages/cli/src/commands/add.ts:66-76`)
- Modify: `packages/cli/package.json` (añadir dependencia workspace)
- Modify: `packages/cli/src/index.ts:121` (catch top-level: además de `instanceof CliError`, capturar `instanceof RegistryClientError` importado de `@modularcore/registry-client`, mismo formato de mensaje)
- Modify: `packages/cli/src/*.ts` (todo archivo que hace `import ... from './registry-client.js'` o usa `resolveTargetPath`/`writeFilesTracked` de `./files.js`)
- Delete: `packages/cli/src/registry-client.ts`
- Modify: `packages/cli/src/files.ts` (eliminar las funciones movidas; conservar `remapTarget`/`appendEnvExample` si son específicas del CLI — verificar durante el grep del paso 1)
- Modify: `.changeset/config.json` — **NO** añadir `@modularcore/registry-client` a `ignore` (decisión firme, ver Requirement no-funcional #10 arriba)

## Implementation Steps

1. `grep -rn "registry-client\|resolveTargetPath\|writeFilesTracked\|remapTarget" packages/cli/src/` para listar TODOS los archivos/funciones que dependen de lo que se va a mover (fact-check antes de mover, no asumir qué es CLI-only vs compartible).
2. Crear `packages/registry-client/` con `package.json`/`tsconfig.json`/`vitest.config.ts` calcados de `packages/registry/` (mismo patrón de `exports`, `scripts: {build, typecheck, test}`).
3. Mover `registry-client.ts` ajustando solo rutas de import relativas (sin cambiar lógica HTTP/parsing).
4. Crear `errors.ts` en el nuevo paquete: `RegistryClientError extends Error` (NO `CliError`) — este es el único cambio de comportamiento intencional de la fase.
5. Mover `resolveTargetPath` y `writeFilesTracked` de `packages/cli/src/files.ts` al nuevo paquete, preservando el contrato de fallo parcial (`filesWritten` en el error) tal cual.
6. Crear `src/index.ts` que re-exporta `RegistryClient`, `createRegistryClient`, `RegistryClientError`, `resolveTargetPath`, `writeFilesTracked` y los tipos re-exportados de `@modularcore/registry` que ya usaba el archivo original.
7. Añadir `@modularcore/registry-client` como dependencia de `packages/cli/package.json` (`workspace:*`).
8. Actualizar `packages/cli/src/index.ts:121`: el catch top-level pasa a comprobar `error instanceof CliError || error instanceof RegistryClientError` (import del nuevo paquete), aplicando el mismo formato de salida limpia en ambos casos.
9. Actualizar todos los demás imports listados en el paso 1 para apuntar a `@modularcore/registry-client`.
10. Mover/adaptar los tests existentes que cubrían esta lógica en el CLI hacia el nuevo paquete, incluyendo un test de regresión explícito: simular un 404 del registry y verificar que el CLI imprime el mensaje limpio (no un stack trace) — cubre el Requirement Critical #1.
11. `pnpm install && pnpm -w build && pnpm -w test` — confirmar CLI y nuevo paquete verdes.
12. Ejecutar los comandos reales del CLI (`init`, `add` contra un componente existente, y forzar un 404 apuntando a un `registryUrl` inválido) en modo local para confirmar comportamiento idéntico (no solo tests unitarios).

## Success Criteria

- [x] `pnpm --filter @modularcore/registry-client build` y `test` verdes.
- [x] `pnpm --filter @modularcore/cli build` y `test` verdes tras la migración.
- [x] Test de regresión: un 404 del registry produce el mismo mensaje de error limpio de una sola línea que antes de la extracción (no un stack trace) — cubre Red-team #1 (Critical).
- [x] Test de regresión: un fallo de escritura a mitad de `install`/`add` reporta `filesWritten` igual que antes — cubre Red-team #3 (High).
- [x] `grep -rn "registry-client" packages/cli/src/` ya no encuentra el archivo local (solo el import del paquete npm).
- [x] Smoke manual: `modularcore add media-picker` (u otro componente existente) funciona igual que antes de este cambio, incluyendo el caso de error (404).

## Risk Assessment

- **Riesgo:** imports rotos si algún archivo del CLI importa tipos internos no re-exportados por el nuevo `index.ts`. **Mitigación:** paso 1 (grep exhaustivo) antes de mover, y build del CLI como gate antes de continuar a Fase 3.
- **Riesgo:** duplicar sin querer la resolución de `@modularcore/registry` (versión distinta entre CLI y registry-client). **Mitigación:** ambos declaran `@modularcore/registry` como `workspace:*`, pnpm resuelve a la misma instancia en el monorepo.
- **Riesgo (Red-team #1, Critical):** `RegistryClientError` deja de ser capturado por el handler del CLI si se olvida el paso 8. **Mitigación:** el test de regresión del paso 10 es un gate obligatorio antes de dar la fase por cerrada, no opcional.
- **Riesgo (Red-team #7, rollback):** el smoke manual del paso 12 es el último paso, después de haber borrado `packages/cli/src/registry-client.ts` (paso Delete). Si falla, **no continuar a Fase 3**: usar `git diff`/`git checkout -- packages/cli/src/registry-client.ts` para restaurar el archivo original desde el commit previo a esta fase mientras se diagnostica, en vez de parchear sobre el estado a medio migrar. Fase 3 permanece bloqueada hasta que los pasos 11-12 pasen limpio.
