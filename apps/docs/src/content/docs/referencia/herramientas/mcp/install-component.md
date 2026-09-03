---
title: "install_component"
description: "Tool MCP destructiva que instala un componente con confirmación obligatoria del cliente."
---

## Qué hace

`install_component` es la única tool del servidor MCP que escribe en disco. Descarga el descriptor completo del componente, calcula qué se va a escribir y **siempre** pide confirmación al cliente MCP mediante una elicitation (`elicitation/create`) antes de escribir un solo byte. No ejecuta `npm install` ni equivalente: la lista de `dependencies` del componente es solo informativa, hay que instalarla aparte.

El flujo interno, en orden:

1. Resuelve y clampa `targetPath` contra la raíz de proyecto del servidor (`resolveTargetPath`) — un `targetPath` con `..` no puede escapar de esa raíz.
2. Obtiene el descriptor del componente (`client.getDescriptor(name)`).
3. Si se pasó `version` y no coincide con la versión publicada, falla **antes** de la elicitation (el registry solo sirve la versión actual de cada componente, no versiones históricas).
4. Lee `.env.example` en el destino (si existe) para calcular qué `envVariables` del componente son nuevas.
5. Lee `modularcore.json` en el destino (si existe) para remapear los `target` de los ficheros según `paths.*` configurado — el mismo remapeo que aplica `add` en el CLI, así una instalación por MCP y otra por CLI en el mismo proyecto no acaban en rutas distintas.
6. Envía la elicitation al cliente MCP con un resumen: componente, versión, destino, ficheros a escribir, env vars nuevas y dependencias npm no instaladas automáticamente.
7. Solo si el cliente responde `action: "accept"` con `confirm: true` se escriben los ficheros (`writeFilesTracked`).

Si el cliente MCP conectado no declara soporte de elicitation, la tool falla de inmediato con un error explícito y no escribe nada — es un modo de fallo distinto (y explícito) de que el usuario decline la confirmación, que también falla limpiamente sin escribir nada.

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `name` | `string` (mín. 1) | sí | Nombre exacto (kebab-case) del componente a instalar. |
| `targetPath` | `string` (mín. 1) | sí | Ruta, relativa a la raíz de proyecto del servidor (su `cwd`), donde instalar el componente. No puede ser absoluta ni contener `..`. |
| `version` | `string` | no | Versión esperada a instalar. Se valida contra el descriptor obtenido (no se usa para seleccionar una versión histórica — el registry solo sirve la actual); si no coincide, la tool falla antes de pedir confirmación. |

## Qué devuelve

Si la instalación se confirma y completa: un objeto JSON con `installed` (nombre), `version`, `filesWritten` (lista de ficheros realmente escritos), `newEnvVariables` y `npmDependenciesNotInstalledAutomatically`.

Si la instalación falla a mitad de escritura, el error incluye qué ficheros ya se habían escrito antes del fallo, para que el llamador sepa el estado parcial en disco.

Si el cliente rechaza la elicitation, o no soporta elicitation, o la versión pedida no coincide: se devuelve un error y no se escribe ningún fichero.

## Comportamiento relevante: elicitation/confirmación

Esta es la tool más sensible del servidor porque es la única que toca el sistema de ficheros del llamador. La confirmación por elicitation no es opcional ni configurable — está siempre activa, y lo que se muestra en el prompt de confirmación (ruta de destino resuelta y absoluta, ficheros, env vars nuevas, dependencias npm) es exactamente lo mismo que luego se escribe, calculado una sola vez y reutilizado para ambos pasos.

Las llamadas a `install_component` no bloquean el resto de tools de la misma conexión stdio: mientras espera la respuesta de la elicitation, `search_components`, `get_component`, `check_updates` (u otra llamada a `install_component`) pueden ejecutarse en paralelo — no hay bloqueo global del servidor.

## Ejemplo

Petición:

```json
{
  "name": "media-picker",
  "targetPath": "src/lib"
}
```

El cliente MCP recibe una elicitation con un mensaje del tipo:

> Install "media-picker@0.1.0" into "/ruta/absoluta/al/proyecto/src/lib"? This will write N file(s), add M new env variable(s) to consider, and lists K npm dependency(ies) you will need to install yourself.

Si el usuario confirma (`confirm: true`), la respuesta final es:

```json
{
  "installed": "media-picker",
  "version": "0.1.0",
  "filesWritten": [{ "target": "src/lib/media-picker.ts" }],
  "newEnvVariables": [{ "key": "S3_ENDPOINT", "description": "...", "required": true }],
  "npmDependenciesNotInstalledAutomatically": []
}
```

## Ver también

- [get_component](/referencia/herramientas/mcp/get-component/) — inspeccionar el descriptor de un componente antes de instalarlo.
- [check_updates](/referencia/herramientas/mcp/check-updates/) — saber si una instalación existente está desactualizada.
- [CLI de ModularCore](/referencia/herramientas/cli/) — el comando `add` equivalente, con el mismo remapeo de rutas vía `modularcore.json`.
