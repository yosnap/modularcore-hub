---
title: "Navegar el catálogo"
description: "Cómo explorar el catálogo visual de componentes en modularcorehub.com."
---

## Qué es

La portada de `modularcorehub.com` (`apps/web/src/routes/+page.svelte`) es una vista de exploración de todos los componentes publicados en el registry, leídos directamente de `registry-data/index.json` en tiempo de build (la página se prerrenderiza).

## Filtro por categoría

Cada componente del índice trae una `category` (por ejemplo `ai`, `media`). La portada calcula el conjunto de categorías presentes en el índice y muestra una barra de filtros con un botón por categoría más un botón "todas" — al pulsar una, la lista de componentes visible se filtra en el cliente sin recargar la página, comparando `component.category` contra la categoría seleccionada.

## Qué muestra cada tarjeta de componente

Para cada componente del índice filtrado, la tarjeta muestra:

- `title` — el nombre legible del componente.
- Una insignia con su `category`.
- La lista de `frameworks` soportados (por ejemplo `react · svelte · vue · angular · blade`), unidos por " · ".

## Página de detalle

Al entrar en un componente concreto (ruta `/c/[name]`, `apps/web/src/routes/c/[name]/+page.server.ts`) se carga su descriptor completo desde `registry-data/{name}.json` — el mismo fichero que sirve `/registry/{name}.json` — junto con la documentación Markdown propia del componente si existe, renderizada a HTML. Esta página también se prerrenderiza en build: la lista de rutas a generar sale de recorrer `index.json` (`entries()` en el mismo fichero de servidor).

Si pides el detalle de un componente que no existe en `registry-data/{name}.json`, la ruta responde con un 404 explícito ("Component "{name}" not found in the registry.").

## Ver también

- [Endpoints del registry](/referencia/herramientas/web/endpoints-registry/) — los mismos ficheros JSON que alimentan el catálogo, servidos por HTTP.
- [get_component](/referencia/herramientas/mcp/get-component/) — el equivalente vía servidor MCP para obtener el descriptor de un componente.
