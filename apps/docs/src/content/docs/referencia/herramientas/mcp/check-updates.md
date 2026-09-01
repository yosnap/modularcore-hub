---
title: "check_updates"
description: "Tool MCP de solo lectura que compara componentes instalados contra el índice del registry."
---

## Qué hace

`check_updates` compara, de solo lectura, una lista de componentes instalados (que el propio llamador debe suministrar) contra la versión actual de cada uno en el índice del registry. No escribe nada en disco y no dispara ninguna elicitation.

Un detalle importante: **el servidor MCP no guarda ningún estado de instalación local** — a diferencia del CLI, que sí mantiene `modularcore.json` como registro de lo instalado. Por eso `installedComponents` lo aporta el llamador (el cliente MCP o el agente que lo usa), no se lee de ningún fichero local.

La comparación de versiones es una simple igualdad de strings, no semver: el índice del registry expone una única versión publicada por componente, no un rango, así que no hay comparación de "mayor/menor" posible — solo "coincide" o "no coincide".

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `installedComponents` | `array` de `{ name: string, version: string }` | sí | Componentes actualmente instalados en el proyecto del llamador, tal como el propio llamador los tiene registrados. |

## Qué devuelve

Un objeto JSON con `notice` (la advertencia de contenido no confiable) y `results`, un array con una entrada por cada componente de `installedComponents`:

- `name`
- `installedVersion` — la versión que se pasó como entrada
- `latestVersion` — la versión actual en el índice del registry, o `null` si el componente ya no existe en el índice
- `status` — uno de tres valores:
  - `"up-to-date"`: `installedVersion` coincide con `latestVersion`
  - `"outdated"`: no coincide
  - `"not-in-registry"`: el componente ya no aparece en el índice

## Nota de seguridad: contenido no confiable

Como el resto de tools de solo lectura, la respuesta incluye el mismo `notice` de `packages/mcp-server/src/tools/untrusted-content.ts`. En esta tool el índice se consulta internamente, pero el `notice` se antepone de forma consistente a toda la salida de las tools de lectura del servidor.

## Ejemplo

Petición:

```json
{
  "installedComponents": [
    { "name": "media-picker", "version": "0.1.0" },
    { "name": "ai-chat", "version": "0.0.9" }
  ]
}
```

Respuesta (resumida):

```json
{
  "notice": "ADVERTENCIA: ...",
  "results": [
    { "name": "media-picker", "installedVersion": "0.1.0", "latestVersion": "0.1.0", "status": "up-to-date" },
    { "name": "ai-chat", "installedVersion": "0.0.9", "latestVersion": "0.1.0", "status": "outdated" }
  ]
}
```

## Ver también

- [search_components](/referencia/herramientas/mcp/search-components/) — consultar el índice completo del registry.
- [install_component](/referencia/herramientas/mcp/install-component/) — reinstalar/actualizar un componente marcado como `outdated`.
