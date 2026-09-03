---
title: "modularcore list"
description: "Lista los componentes públicos disponibles en el registry configurado."
---

## Qué hace

`list` obtiene el índice completo de componentes públicos del registry configurado en `modularcore.json` (`client.getIndex()`) y lo imprime formateado en consola, una línea por componente con nombre, versión y categoría.

Es el comando más simple del CLI: no acepta parámetros, no escribe nada en disco ni pide confirmación — solo lee y muestra.

## Sintaxis

```bash
modularcore list
```

## Parámetros

Ninguno.

## Ejemplo

```bash
modularcore list
```

```
media-picker@1.2.0  [forms]  Selector de medios con drag & drop
data-table@2.0.1    [data]   Tabla de datos con paginación y ordenación
```

Si el registry no tiene componentes públicos, imprime `(sin componentes públicos)`.

## Errores comunes

- **Sin `modularcore.json`**: al igual que el resto de comandos (salvo `init`), falla si no existe configuración de proyecto: `No se encontró "modularcore.json" en <cwd>. Corre \`modularcore init\` primero.`
- **Registry inaccesible**: si el `registryUrl` configurado no responde, no expone el endpoint del índice, o la respuesta no cumple el esquema esperado, el CLI propaga el error de `@modularcore/registry-client` (por ejemplo un error de red, un 404, o un mensaje de "esquema no válido") con el prefijo `[modularcore]`.

## Ver también

- [Visión general del CLI](/referencia/herramientas/cli/)
- [`search`](/referencia/herramientas/cli/search/) — filtra el mismo índice por texto
- [`add`](/referencia/herramientas/cli/add/) — instala un componente listado aquí
