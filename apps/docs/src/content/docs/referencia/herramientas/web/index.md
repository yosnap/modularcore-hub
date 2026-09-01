---
title: "Catálogo web de ModularCore"
description: "Visión general de apps/web y el Registry HTTP como fuente de verdad única."
---

`apps/web` es la aplicación SvelteKit que sirve **modularcorehub.com**: el catálogo visual de componentes y, a la vez, el servidor HTTP del registry que consumen tanto el [CLI](/referencia/herramientas/cli/) como el [servidor MCP](/referencia/herramientas/mcp/).

## Una API, clientes delgados

La arquitectura de ModularCore sigue un único principio: **el registry es la única fuente de verdad**, y todo lo demás es un cliente delgado sobre esa misma API HTTP.

- El **catálogo web** (`apps/web`) lee `registry-data/index.json` y `registry-data/{name}.json` para renderizar las páginas de exploración y detalle de componentes, y además sirve esos mismos ficheros por HTTP en `/registry/*`.
- El **CLI** (`@modularcore/cli`) consume esa misma API HTTP para buscar, describir e instalar componentes desde la línea de comandos.
- El **servidor MCP** (`@modularcore/mcp-server`) consume la misma API HTTP a través de `@modularcore/registry-client`, exponiéndola como tools MCP por stdio.

Ninguno de los tres reimplementa lógica de resolución de dependencias, remapeo de rutas o formato de descriptor por su cuenta — todos comparten `@modularcore/registry-client`, o (en el caso del catálogo web) generan directamente los ficheros que esa librería consume. El resultado es que un componente descrito en el registry se ve exactamente igual —mismos ficheros, mismas `envVariables`, misma versión— lo mires desde el navegador, desde `modularcore add`, o desde una tool MCP en tu agente.

## Qué hay en `apps/web`

- Un **catálogo** navegable en la portada, con filtro por categoría (`apps/web/src/routes/+page.svelte`), que lista los componentes leídos de `registry-data/index.json`.
- Páginas de **detalle por componente** en `/c/[name]`, con la documentación renderizada y el descriptor completo.
- Los **endpoints del registry** en `/registry/*`, que sirven los mismos ficheros JSON/tarball que consumen el CLI y el servidor MCP.
- Un playground interactivo (`/playground/*`) para probar componentes concretos (media picker, AI chat, etc.) en el propio sitio.

## Ver también

- [Cómo navegar el catálogo](/referencia/herramientas/web/catalogo/)
- [Endpoints del registry](/referencia/herramientas/web/endpoints-registry/)
- [CLI de ModularCore](/referencia/herramientas/cli/)
- [Servidor MCP](/referencia/herramientas/mcp/)
