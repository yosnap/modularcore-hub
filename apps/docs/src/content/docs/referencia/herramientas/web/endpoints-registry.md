---
title: "Endpoints del registry"
description: "Los endpoints HTTP reales que sirven el índice y los descriptores del registry."
---

## Qué hace

El registry de ModularCore se sirve por HTTP desde una única ruta dinámica de SvelteKit: `apps/web/src/routes/registry/[file]/+server.ts`. Este endpoint sirve, tal cual, los ficheros que genera el script `build:registry` en el directorio `registry-data/` del propio despliegue de `apps/web` — no hay base de datos ni proceso en tiempo real detrás; es un servidor de ficheros estáticos generados en build, pero servido a petición (no prerrenderizado).

Esta ruta es lo que consumen tanto `@modularcore/cli` como `@modularcore/mcp-server` (a través de `@modularcore/registry-client`) para resolver `MODULARCORE_REGISTRY_URL`.

## Patrón del endpoint

```
GET /registry/{file}
```

`{file}` es un único segmento de ruta (no puede contener `/`, así que no hay riesgo de traversal más allá de eso) que además se valida contra este patrón antes de tocar el disco:

```
^[a-z0-9-]+\.(?:json|tar\.gz)$
```

Es decir: minúsculas, dígitos y guiones, seguido de `.json` o `.tar.gz`. Cualquier otro nombre responde `404` con el mensaje `Invalid registry file name "{file}".` antes de intentar leer nada.

## Ficheros disponibles y tipo de respuesta

| Fichero | Content-Type | Contenido |
|---|---|---|
| `/registry/index.json` | `application/json` | Índice completo del registry: array de `RegistryIndexEntry` (name, title, category, version, frameworks, description) — el mismo que lee la portada del catálogo. |
| `/registry/{name}.json` | `application/json` | Descriptor completo de un componente (`RegistryEntry`): ficheros, `envVariables`, `dependencies`, `registryDependencies`, etc. — el mismo que lee la página de detalle `/c/[name]`. |
| `/registry/{name}.tar.gz` | `application/gzip` | Tarball con el contenido real de los ficheros del componente — lo que efectivamente descarga/escribe una instalación (CLI `add` o `install_component` por MCP). |

Si el fichero pedido no existe en `registry-data/` (por ejemplo, un componente que no está publicado), la respuesta es `404` con `Registry file "{file}" not found.`. Si la extensión no es `.json` ni `.tar.gz` pero pasa el patrón de nombre, responde `404` con `Unsupported registry file type for "{file}".` (caso hoy inalcanzable dado el patrón, pero cubierto explícitamente).

Toda respuesta válida incluye `Cache-Control: public, max-age=300`.

## Por qué esta ruta no está prerrenderizada

El fichero fija explícitamente `export const prerender = false`. La razón, documentada en el propio código: el servidor estático que usa `adapter-node` (sirv) trata cualquier fichero `*.gz` como el sibling precomprimido de `*` sin la extensión — mecanismo pensado para `foo.js.gz` junto a `foo.js`. Aplicado a `{name}.tar.gz`, eso lo interpretaría como la versión gzip de `{name}.tar` (sin tipo MIME conocido), sirviendo el tarball con `Content-Type` vacío y un `Content-Encoding: gzip` espurio. Servir esta ruta en tiempo de petición (leyendo el mismo `registry-data/` generado en build) evita el problema por completo — el bug está en cómo sirv serviría un `.tar.gz` prerrenderizado, no en cómo se genera.

## Ver también

- [Cómo navegar el catálogo](/referencia/herramientas/web/catalogo/) — quién consume `index.json` y `{name}.json` dentro del propio sitio.
- [Visión general del servidor MCP](/referencia/herramientas/mcp/) — cómo `MODULARCORE_REGISTRY_URL` apunta a esta misma ruta desde un cliente MCP.
- [CLI de ModularCore](/referencia/herramientas/cli/) — el otro cliente delgado sobre estos mismos endpoints.
