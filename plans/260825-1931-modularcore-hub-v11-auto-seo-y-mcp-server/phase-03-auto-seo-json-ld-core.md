---
phase: 3
title: "MCP Server"
status: done
priority: P1
effort: "5-6d"
dependencies: [1]
---

# Phase 3: MCP Server

## Overview

Nuevo paquete `@modularcore/mcp-server`: servidor MCP propio (`@modelcontextprotocol/sdk`, transporte **stdio**) que expone `search_components`, `get_component`, `install_component`, `check_updates` sobre el mismo Registry HTTP que ya consume el CLI. Agentes en Cursor/Claude Code/VS Code/ChatGPT podrán instalar y actualizar componentes del hub sin pasar por el CLI. **Depende de la Fase 1**: reutiliza `@modularcore/registry-client` en vez de reimplementar el fetch/parsing del registry (mismo principio DRY que ya se aplicó Fase 2/3 del MVP con el módulo compartido resolve+write).

## Key Insights (del research, corregidas post red-team 2026-08-25)

- **Corrección [Red-team #2, Critical]:** el research original afirmaba `@modelcontextprotocol/sdk` "v2" — esto es **falso**, verificado con `npm view @modelcontextprotocol/sdk versions`: la última versión publicada es **1.30.0**. Antes de escribir código, re-verificar la API real de `registerTool`/elicitation contra la versión 1.x pinneada (no asumir que coincide con lo descrito abajo sin confirmarlo contra los tipos TS reales del paquete instalado).
- Transporte **stdio** (no SSE, deprecado) porque el server se distribuye como paquete npm ejecutable localmente (`npx @modularcore/mcp-server`), no como daemon remoto.
- Tools definidos con `server.registerTool(name, { inputSchema, outputSchema }, handler)` usando Zod — los `.describe()` en cada campo son los que el LLM usa para inferir argumentos, no son opcionales-decorativos.
- `install_component` es una operación de escritura destructiva (crea/sobreescribe archivos en el proyecto del usuario) → requiere **elicitation** explícita antes de escribir: mostrar ruta destino, versión, `envVariables` nuevas y dependencias npm que se instalarán, y esperar confirmación del cliente MCP antes de tocar el filesystem. Mismo nivel de guarda que ya existe en el CLI (`add --ignore-scripts`, confirmación, ver `plans/260818-1856-.../phase-03-cli-thin-client.md`).
- Testing sin cliente real: `InMemoryTransport.createLinkedPair()` del SDK, integrable directo en Vitest (no depende de `mcp-inspector` para CI).
- **Corrección [Red-team #3, High]:** Fase 1 YA extrae `resolveTargetPath`/`writeFilesTracked` a `@modularcore/registry-client` como entregable obligatorio (no es una decisión pendiente de esta fase). MCP es un **thin adapter**: importa esas funciones directo, no las reimplementa ni decide en tiempo de implementación dónde viven.

## Requirements

- Funcional:
  - [x] **[Red-team #4, High]** Step 0 obligatorio antes de implementar las 4 tools: spike de verificación con `InMemoryTransport.createLinkedPair()` registrando una tool stub desechable que dispara una elicitation real contra la versión pinneada del SDK (post corrección Red-team #2). Go/no-go: si la versión pinneada no soporta elicitation tal como se describe, `install_component` no se implementa en esta fase y se escala como pregunta abierta antes de continuar con el resto de tools.
  - [x] `search_components(query, limit?)` → lista de componentes desde `/registry/index.json` filtrados por nombre/título/categoría. Tratar el contenido devuelto por el registry como **no confiable** de cara al LLM que lo consume (campos `title`/`description` son datos externos, no instrucciones) — documentarlo en el README y en la descripción de la tool.
  - [x] `get_component(name)` → descriptor completo desde `/registry/{name}.json`. Mismo tratamiento de contenido no confiable que `search_components`.
  - [x] `install_component(name, targetPath, version?)` → con **elicitation obligatoria** antes de escribir; reutiliza `resolveTargetPath`/`writeFilesTracked` de `@modularcore/registry-client` (Fase 1) — no reimplementar el path-traversal guard ni el tracking de escritura parcial.
  - [x] **[Red-team #8, Medium]** Si el preview de la elicitation necesita leer `.env.example` existente en `targetPath` para calcular qué `envVariables` son "nuevas", esa lectura pasa por el mismo `resolveTargetPath`/clamp que las escrituras — nunca leer un path derivado de `targetPath` sin validar primero que no contiene `..` ni es absoluto.
  - [x] **[Red-team #4, High]** Test explícito para el caso "cliente MCP sin soporte de elicitation llama a `install_component`": el servidor debe rechazar y no escribir ningún archivo, devolviendo un error claro — distinto del caso ya cubierto "usuario rechaza la elicitation" (cliente sí soporta elicitation, pero el usuario dice que no).
  - [x] `check_updates(installedComponents)` → compara versiones instaladas (recibidas como input) contra el índice del registry.
  - [x] **[Red-team #6, Medium — corrección]** Servidor arranca vía `npx @modularcore/mcp-server` resolviendo `registryUrl` desde la variable de entorno `MODULARCORE_REGISTRY_URL` (flag opcional `--registry-url` como override). Esto es una convención **nueva** para el monorepo — el CLI NO tiene equivalente hoy (`packages/cli/src/config.ts` solo lee `registryUrl` de un archivo `modularcore.json` de proyecto, cero usos de `process.env` en todo el repo). No hay precedente que "seguir"; definir aquí: sin default de producción (mismo criterio de no-asumir-deploy que el CLI), y forzar `https://` salvo opt-in explícito para `http://` (evita servidores de registry maliciosos vía MITM).
- No-funcional:
  - [x] Ningún tool escribe en el filesystem sin pasar primero por `install_component` y su elicitation.
  - [x] Tests cubren las 4 tools vía `InMemoryTransport`, sin red real (mockear `@modularcore/registry-client` o levantar un registry HTTP de prueba local, igual que hacen los tests existentes del CLI).
  - [x] **[Red-team #9, Medium]** Documentar y verificar contra el SDK pinneado si las tool calls sobre un mismo proceso stdio se serializan o pueden ejecutarse concurrentemente. Si `install_component` queda esperando confirmación de elicitation, definir explícitamente si otras tool calls (`search_components`, etc.) en la misma sesión quedan bloqueadas o se procesan en paralelo — no dejarlo sin especificar.

## Architecture

```
packages/mcp-server/
├── src/
│   ├── index.ts              # entrypoint: StdioServerTransport + McpServer
│   ├── tools/
│   │   ├── search-components.ts
│   │   ├── get-component.ts
│   │   ├── install-component.ts   # incluye elicitation
│   │   └── check-updates.ts
│   └── config.ts              # resolución de registryUrl (env var / flag)
├── test/
│   ├── search-components.test.ts
│   ├── install-component.test.ts  # incluye caso "usuario rechaza elicitation"
│   └── ...
├── package.json                # deps: @modelcontextprotocol/sdk, @modularcore/registry-client (workspace:*), zod
├── tsconfig.json
├── vitest.config.ts
└── README.md                    # cómo registrar el server en Cursor/Claude Code/VS Code
```

`install_component` NO reimplementa la lógica de escritura de archivos del CLI: importa `resolveTargetPath`/`writeFilesTracked` directo desde `@modularcore/registry-client`, ya extraídos como entregable obligatorio de la Fase 1 (Red-team #3). Esta fase no toma ninguna decisión de arquitectura sobre dónde vive esa lógica — solo la consume.

## Related Code Files

- Create: `packages/mcp-server/package.json`
- Create: `packages/mcp-server/tsconfig.json`
- Create: `packages/mcp-server/vitest.config.ts`
- Create: `packages/mcp-server/src/index.ts`
- Create: `packages/mcp-server/src/config.ts`
- Create: `packages/mcp-server/src/tools/search-components.ts`
- Create: `packages/mcp-server/src/tools/get-component.ts`
- Create: `packages/mcp-server/src/tools/install-component.ts`
- Create: `packages/mcp-server/src/tools/check-updates.ts`
- Create: `packages/mcp-server/test/*.test.ts`
- Create: `packages/mcp-server/README.md`
- No modifica `packages/cli/src/*` — toda la lógica compartida ya vive en `@modularcore/registry-client` desde la Fase 1; esta fase solo consume.

## Implementation Steps

1. **[Red-team #4, Step 0 bloqueante]** Antes de tocar las 4 tools: `pnpm add @modelcontextprotocol/sdk` (verificar con `npm view @modelcontextprotocol/sdk versions` cuál es la última 1.x real, NO asumir "v2"), y hacer un spike con `InMemoryTransport.createLinkedPair()` + una tool stub que dispare elicitation. Go/no-go antes de continuar.
2. Crear `packages/mcp-server/` con `package.json` (dependencia `@modelcontextprotocol/sdk` en la versión 1.x pinneada confirmada en el paso 0, `@modularcore/registry-client` workspace, `zod`).
3. Implementar `src/config.ts`: resolución de `registryUrl` desde `MODULARCORE_REGISTRY_URL` (nueva convención, sin default de producción, forzar `https://` salvo opt-in explícito — ver Requirement corregido).
4. Implementar `search_components` y `get_component` (solo lectura, sin elicitation) usando `@modularcore/registry-client`, documentando en sus descripciones que el output es contenido no confiable de cara al LLM.
5. Implementar `install_component`: construir el flujo de elicitation (mostrar ruta destino + versión + `envVariables` + deps npm — cualquier lectura de `.env.example` para este preview pasa por `resolveTargetPath` primero), y solo tras confirmación invocar `writeFilesTracked` de `@modularcore/registry-client`. Manejar explícitamente el caso "cliente sin capacidad de elicitation" con rechazo + error claro (no solo "usuario rechaza").
6. Implementar `check_updates`: recibe lista de componentes instalados (nombre+versión) como input, compara contra `getIndex()`.
7. `src/index.ts`: registrar las 4 tools en `McpServer`, levantar `StdioServerTransport`. Verificar y documentar (contra la versión pinneada del SDK) si las tool calls se serializan o pueden solaparse mientras una elicitation está pendiente.
8. Tests con `InMemoryTransport.createLinkedPair()`: cubrir las 4 tools + el caso "usuario rechaza la elicitation" + el caso distinto "cliente sin soporte de elicitation" + un test de traversal para la lectura de `.env.example` con `targetPath` conteniendo `../`.
9. README con instrucciones de registro en Cursor/Claude Code/VS Code (`mcpServers` config JSON) y advertencia de que el output de `search_components`/`get_component` es contenido externo no confiable. `<!-- Updated: Validation Session 1 -->` Este README es la fuente de contenido para la página de docs del website que crea la Fase 4 (el MCP server SÍ se lista en el catálogo, aunque no lleve `modularcore.json` de componente instalable).
10. `pnpm --filter @modularcore/mcp-server build && test`.

## Success Criteria

- [x] Spike del paso 0 confirma que la versión pinneada del SDK soporta elicitation según lo descrito, antes de implementar `install_component` completo.
- [x] Las 4 tools responden correctamente vía `InMemoryTransport` en tests.
- [x] `install_component` NUNCA escribe archivos sin una confirmación de elicitation previa (test del caso de rechazo Y del caso "cliente sin soporte de elicitation").
- [x] Ningún path derivado de `targetPath` (escritura o lectura de `.env.example`) se resuelve sin pasar por `resolveTargetPath` — test de traversal explícito.
- [x] `check_updates` detecta correctamente una versión desactualizada vs una al día.
- [x] `npx @modularcore/mcp-server` arranca sin errores contra un registry local de prueba (smoke manual, no solo unit tests).
- [x] `pnpm --filter @modularcore/mcp-server build && pnpm --filter @modularcore/mcp-server test` verdes.

## Risk Assessment

- **Riesgo (Red-team #3, ya resuelto en Fase 1):** duplicar la lógica de escritura/clamp de paths del CLI en el MCP server (regresión de seguridad SA1/AD1 del red-team del MVP). **Mitigación:** ya no es un riesgo de esta fase — la lógica se consume desde `@modularcore/registry-client`, no se reimplementa.
- **Riesgo:** un cliente MCP que no soporte elicitation podría intentar llamar `install_component` sin flujo de confirmación. **Mitigación:** test explícito (paso 8) + fallo explícito (no escribir) en vez de degradar silenciosamente — ya no depende solo de documentación en el README.
- **Riesgo (Red-team #2, Critical, corregido):** el research original asumía una versión "v2" del SDK que no existe. **Mitigación:** paso 0 (spike) verifica la API real de la versión 1.x pinneada antes de comprometerse a la arquitectura completa.
- **Riesgo (Red-team #9):** comportamiento no definido si `install_component` queda esperando elicitation mientras llega otra tool call. **Mitigación:** paso 7 documenta explícitamente el comportamiento verificado contra el SDK real, no se asume.

## Security Considerations

- `install_component` es la única tool con capacidad de escritura — todas las demás son de solo lectura contra el registry HTTP público.
- Nunca exponer credenciales de terceros vía ninguna tool (invariante ya establecido en el MVP para el registry).
- Elicitation es la barrera de confirmación mínima indispensable, no opcional — sin ella, no se implementa `install_component` en esta fase (bloquear el resto de la fase si el SDK no soporta elicitation en la versión pinneada, y escalar como pregunta abierta).
- **[Red-team #7, Medium]** El output de `search_components`/`get_component` es contenido servido por el registry HTTP, potencialmente influenciable por quien controle ese endpoint (especialmente si `MODULARCORE_REGISTRY_URL` apunta a un mirror o `http://` sin TLS). Tratarlo como texto no confiable de cara al LLM/agente que lo consume (riesgo de prompt injection vía campos `title`/`description`), documentarlo en las descripciones de las tools, y forzar `https://` por defecto (Requirement corregido arriba).
- **[Red-team #8, Medium]** Cualquier lectura de archivos del proyecto destino (ej. `.env.example` para el preview de elicitation) pasa por el mismo `resolveTargetPath` que las escrituras — un `targetPath` con `../` no debe poder leer archivos fuera del proyecto.
