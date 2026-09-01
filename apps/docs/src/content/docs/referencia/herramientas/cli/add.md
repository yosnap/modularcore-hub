---
title: "modularcore add"
description: "Descarga un componente del registry, resuelve sus dependencias y escribe sus archivos en el proyecto."
---

## Qué hace

`add <name>` instala un componente del registry en el proyecto actual. El proceso es:

1. Lee `modularcore.json` (falla si no existe — corre `init` primero) y detecta el gestor de paquetes y el `package.json` del proyecto.
2. Resuelve recursivamente las `registryDependencies` del componente pedido (dependencias de otros componentes del registry), en orden de dependencias primero, detectando y rechazando explícitamente los ciclos.
3. Para cada componente resuelto, comprueba compatibilidad: que el componente soporte el `framework` declarado en `modularcore.json` (o sea `agnostic`), y que las `peerDependencies` relevantes (React, Svelte, Vue, `@angular/core`, según el framework del proyecto) estén declaradas en el `package.json` del proyecto con un rango semver compatible.
4. Recolecta las dependencias npm (`dependencies`) declaradas por los descriptores resueltos, detectando conflictos de versión entre componentes para el mismo paquete.
5. Si hay dependencias npm que instalar, muestra la lista y pide confirmación antes de instalar (`--ignore-scripts`) y escribir archivos; si no hay dependencias npm, solo pide confirmación para escribir los archivos.
6. Escribe los archivos de cada componente resueltos, remapeando sus rutas destino según `paths` de `modularcore.json`.
7. Añade a `.env.example` las variables de entorno que declare el componente (si las hay).
8. Actualiza `modularcore.json` registrando cada componente instalado con su versión en `installed`.

## Sintaxis

```bash
modularcore add <name>
```

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `<name>` | argumento posicional | Sí | Nombre del componente a instalar, tal como aparece en el registry. |

No expone flags adicionales — la confirmación de instalación y escritura de archivos se pide de forma interactiva.

## Ejemplo

```bash
modularcore add media-picker
```

```
Se instalarán las siguientes dependencias npm (--ignore-scripts)
react-dropzone@^14.2.3

¿Instalar 1 dependencia(s) con pnpm y escribir los archivos de "media-picker"? (y/N) y

Instalado: media-picker
Archivos escritos: 4
.env.example: agregadas MEDIA_PICKER_API_KEY
```

## Errores comunes

- **Sin `modularcore.json`**: falla con `No se encontró "modularcore.json" en <cwd>. Corre \`modularcore init\` primero.`
- **Framework incompatible**: `"<name>" no soporta el framework de este proyecto ("<framework>"). Frameworks soportados: ...` — el componente no declara soporte para tu framework.
- **Peer dependency faltante**: `"<name>" requiere el peer dependency "<peer>" (<rango>), pero no está declarado en el package.json de este proyecto.`
- **Peer dependency con versión incompatible**: `"<name>" requiere "<peer>" <rango>, pero este proyecto declara "<peer>" <rango-instalado>.`
- **Ciclo de dependencias**: `Ciclo detectado en registryDependencies: a -> b -> a` — el registry tiene una referencia circular entre componentes.
- **Conflicto de versiones npm**: `Conflicto de versiones para "<paquete>": "<v1>" vs "<v2>" entre componentes resueltos. Resuélvelo manualmente en los descriptores.`
- **Dependencia sin versión pineada**: `Dependencia "<raw>" no declara versión pineada/semver (formato esperado "nombre@rango").` — problema en el propio descriptor del registry, no algo que el usuario controle.
- **Cancelación**: si respondes que no a la confirmación, la operación se aborta con `Operación cancelada por el usuario. No se escribió ningún archivo.` y no se toca el sistema de archivos.
- **Fallo a mitad de escritura**: si falla la escritura tras haber escrito ya algunos archivos, el mensaje de error lista explícitamente qué archivos quedaron escritos antes del fallo, para que puedas revisarlos o revertirlos manualmente.

## Ver también

- [Visión general del CLI](/referencia/herramientas/cli/)
- [`init`](/referencia/herramientas/cli/init/) — requisito previo, genera `modularcore.json`
- [`diff`](/referencia/herramientas/cli/diff/) — compara un componente ya instalado con la versión del registry
- [`update`](/referencia/herramientas/cli/update/) — reinyecta un componente ya instalado
