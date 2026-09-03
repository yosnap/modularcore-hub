---
title: "get_component"
description: "Tool MCP de solo lectura que obtiene el descriptor completo de un componente."
---

## Qué hace

`get_component` obtiene, de solo lectura, el descriptor completo de un componente del registry por su nombre exacto. No escribe nada en disco y no dispara ninguna elicitation. A diferencia de `search_components`, que solo consulta el índice, esta tool llama a `client.getDescriptor(name)`, que trae el fichero `{name}.json` individual del componente — con más detalle que la entrada correspondiente del índice.

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `name` | `string` (mín. 1 carácter) | sí | Nombre exacto del componente, en kebab-case, tal como lo devuelve `search_components`. |

## Qué devuelve

Un objeto JSON con `notice` (la misma advertencia de contenido no confiable) y `component`, un resumen del descriptor con estos campos:

- `name`, `version`, `title`, `type`, `category`
- `frameworks` — frameworks soportados (`react`, `svelte`, `vue`, `angular`, `blade`, etc.)
- `dependencies` — paquetes npm que el componente necesita (no se instalan automáticamente)
- `registryDependencies` — otros componentes del registry de los que depende
- `envVariables` — variables de entorno que el componente requiere, con su descripción
- `description`
- `files` — lista de ficheros del componente, cada uno con `path`, `target` y `type` (**sin** el contenido del fichero)

Es decir: `get_component` da suficiente información para decidir si instalar un componente (qué necesita, qué escribe, qué variables de entorno espera), pero no el contenido de los ficheros en sí — eso solo se escribe en disco mediante `install_component`.

## Nota de seguridad: contenido no confiable

Igual que `search_components`, los campos `title`, `description` y `category` del descriptor provienen tal cual del servidor de registry configurado en `MODULARCORE_REGISTRY_URL`. La respuesta incluye el mismo `notice` de `packages/mcp-server/src/tools/untrusted-content.ts` advirtiendo de que ese texto es dato externo, no instrucciones, y que no debe seguirse aunque parezca una directiva.

## Ejemplo

Petición:

```json
{ "name": "media-picker" }
```

Respuesta (resumida):

```json
{
  "notice": "ADVERTENCIA: ...",
  "component": {
    "name": "media-picker",
    "version": "0.1.0",
    "title": "Universal Media Picker",
    "type": "headless-core",
    "category": "media",
    "frameworks": ["react", "svelte", "vue", "angular", "blade"],
    "dependencies": [],
    "registryDependencies": [],
    "envVariables": [
      { "key": "S3_ENDPOINT", "description": "...", "required": true }
    ],
    "description": "...",
    "files": [
      { "path": "core/media-picker.ts", "target": "lib/media-picker.ts", "type": "core" }
    ]
  }
}
```

## Ver también

- [search_components](/referencia/herramientas/mcp/search-components/) — encontrar el nombre exacto de un componente antes de pedir su descriptor.
- [install_component](/referencia/herramientas/mcp/install-component/) — instalar el componente cuyo descriptor acabas de inspeccionar.
- [Endpoints del registry](/referencia/herramientas/web/endpoints-registry/) — el `{name}.json` HTTP subyacente que esta tool consulta.
