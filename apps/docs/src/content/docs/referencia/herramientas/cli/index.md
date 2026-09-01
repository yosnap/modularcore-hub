---
title: "CLI de ModularCore"
description: "Instalación y visión general del cliente de línea de comandos modularcore."
---

`@modularcore/cli` es un paquete npm publicado que expone el comando `modularcore`. Es un cliente "thin" (delgado) para el registro de componentes de ModularCore: descarga componentes desde un registry HTTP, resuelve sus dependencias (tanto de otros componentes del registry como de paquetes npm), y escribe los archivos resultantes directamente en tu proyecto.

El CLI no aloja ni construye el registry — solo consume la API que expone un servidor de registry (por defecto `http://localhost:5173/registry` en desarrollo local, configurable por proyecto).

## Requisitos

El CLI requiere **Node.js >= 18**, porque depende del `fetch` global. Si lo ejecutas con una versión anterior, falla explícitamente con un mensaje indicando que actualices Node antes de continuar.

## Instalación

```bash
npm install --global @modularcore/cli
```

Esto expone el binario `modularcore` en tu PATH. También puedes ejecutarlo sin instalación global usando `npx @modularcore/cli <comando>`.

## Estructura del comando

El binario está construido con [Commander](https://github.com/tj/commander.js) y expone un único punto de entrada (`modularcore`) con seis subcomandos:

| Comando | Qué hace |
|---|---|
| [`init`](/referencia/herramientas/cli/init/) | Detecta el framework y el gestor de paquetes del proyecto, y escribe `modularcore.json` |
| [`add <name>`](/referencia/herramientas/cli/add/) | Descarga un componente, resuelve sus dependencias y escribe sus archivos |
| [`list`](/referencia/herramientas/cli/list/) | Lista los componentes públicos disponibles en el registry |
| [`search <query>`](/referencia/herramientas/cli/search/) | Busca componentes públicos por nombre/título/categoría/descripción |
| [`diff <name>`](/referencia/herramientas/cli/diff/) | Muestra diferencias entre los archivos locales y la versión del registry |
| [`update [name]`](/referencia/herramientas/cli/update/) | Reinyecta archivos con confirmación por archivo y backups `.orig` |

Puedes ver la versión instalada con `modularcore --version` y la ayuda de cualquier subcomando con `modularcore <comando> --help`.

## Configuración de proyecto: `modularcore.json`

Todos los comandos salvo `init` requieren que exista un fichero `modularcore.json` en el directorio actual (créalo primero con `modularcore init`). Tiene esta forma:

```json
{
  "registryUrl": "http://localhost:5173/registry",
  "framework": "react",
  "paths": {
    "components": "src/components",
    "lib": "src/lib/modularcore"
  },
  "installed": {}
}
```

- `registryUrl`: la URL base del servidor de registry contra el que trabaja el CLI.
- `framework`: el framework detectado o elegido en `init` (`react`, `svelte`, `vue`, `angular` o `blade`).
- `paths`: rutas locales donde se remapean los ficheros de los componentes al escribirlos.
- `installed`: mapa `nombre -> versión` de los componentes ya instalados en el proyecto, que `update` usa para saber qué reinyectar.

Si el fichero no existe, no es JSON válido, o no tiene esta forma, cualquier comando falla con un `CliError` explicando el problema.

## Manejo de errores

El CLI distingue entre errores "esperados" (config inválida, incompatibilidades, ciclos de dependencias, red, 404 del registry) y errores inesperados. Los primeros se imprimen como una única línea con el prefijo `[modularcore]` y el proceso termina con código de salida 1; los segundos se relanzan con su traza completa. Cada página de comando detalla los errores concretos que puede producir.

## Ver también

- [`init`](/referencia/herramientas/cli/init/)
- [`add`](/referencia/herramientas/cli/add/)
- [`list`](/referencia/herramientas/cli/list/)
- [`search`](/referencia/herramientas/cli/search/)
- [`diff`](/referencia/herramientas/cli/diff/)
- [`update`](/referencia/herramientas/cli/update/)
