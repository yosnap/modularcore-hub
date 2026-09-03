---
title: "modularcore search"
description: "Busca componentes públicos del registry por nombre, título, categoría o descripción."
---

## Qué hace

`search <query>` descarga el mismo índice de componentes públicos que usa `list` (`client.getIndex()`) y lo filtra localmente: para cada componente concatena `name`, `title`, `category` y `description` (esta última opcional), lo pasa todo a minúsculas y comprueba si contiene la cadena de búsqueda (también en minúsculas). Es una coincidencia de subcadena simple (no fuzzy, no por tokens), insensible a mayúsculas/minúsculas.

El filtrado ocurre en el cliente, no en el servidor: `search` siempre descarga el índice entero y luego filtra, igual que `list`.

## Sintaxis

```bash
modularcore search <query>
```

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `<query>` | argumento posicional | Sí | Texto a buscar dentro de nombre, título, categoría y descripción de cada componente. |

## Ejemplo

```bash
modularcore search picker
```

```
media-picker@1.2.0  [forms]  Selector de medios con drag & drop
date-picker@0.9.4   [forms]  Selector de fechas accesible
```

Si ningún componente coincide, imprime `(sin componentes públicos)` (el mismo formateador que usa `list` para una lista vacía).

## Errores comunes

- **Sin `modularcore.json`**: falla si no existe configuración de proyecto, igual que el resto de comandos salvo `init`.
- **Registry inaccesible**: mismo comportamiento que `list` — errores de red, 404, o esquema inválido se propagan como error del CLI.
- **Query vacía**: si pasas una cadena vacía, el filtro `includes('')` es siempre verdadero, así que devuelve el índice completo (equivalente a `list`).

## Ver también

- [Visión general del CLI](/referencia/herramientas/cli/)
- [`list`](/referencia/herramientas/cli/list/) — lista el índice completo sin filtrar
- [`add`](/referencia/herramientas/cli/add/) — instala un componente encontrado con `search`
