---
title: "modularcore diff"
description: "Muestra las diferencias entre los archivos locales de un componente y la versión actual del registry."
---

## Qué hace

`diff <name>` compara, archivo por archivo, la copia local de un componente ya instalado contra la versión que existe ahora mismo en el registry. Para cada archivo declarado en el descriptor del componente:

1. Calcula la ruta local remapeada según `paths` de `modularcore.json` y resuelve la ruta absoluta.
2. Lee el contenido local (si el archivo no existe localmente, lo marca como `missing-locally`).
3. Decodifica el contenido del registry (texto o base64, según la codificación del archivo).
4. Si el contenido local y el del registry son idénticos (comparación de buffers), lo marca `unchanged`.
5. Si difieren y el archivo es binario (`encoding: base64`), lo marca `binary-changed` sin generar diff de líneas.
6. Si difieren y es texto, genera un diff línea a línea (`changed`) con líneas marcadas como añadidas, eliminadas o sin cambios.

`diff` es de solo lectura: nunca escribe ni modifica archivos, solo informa.

## Sintaxis

```bash
modularcore diff <name>
```

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `<name>` | argumento posicional | Sí | Nombre del componente cuyo descriptor se usará para comparar los archivos locales. |

## Ejemplo

```bash
modularcore diff media-picker
```

```
--- src/components/media-picker/index.tsx (changed)
  import { useState } from 'react';
- import { Dropzone } from './dropzone';
+ import { Dropzone } from './dropzone-v2';
  export function MediaPicker() {
--- src/components/media-picker/styles.css (unchanged)
--- src/lib/modularcore/media-picker-icon.png (binary-changed)
```

Las líneas con `+` fueron añadidas en el registry, las líneas con `-` existen localmente pero no en el registry, y las líneas sin prefijo son iguales en ambos.

## Errores comunes

- **Sin `modularcore.json`**: falla si no existe configuración de proyecto.
- **Componente no encontrado en el registry**: si `<name>` no existe, el CLI propaga el error del cliente del registry (p. ej. un 404).
- **Archivo binario cambiado**: `diff` no muestra un diff de líneas para binarios — solo informa `binary-changed`; para ver el contenido real tendrás que comparar los archivos manualmente.
- **Archivo ausente localmente**: se marca `missing-locally` en vez de generar un error — es información, no un fallo del comando.

## Ver también

- [Visión general del CLI](/referencia/herramientas/cli/)
- [`update`](/referencia/herramientas/cli/update/) — aplica los cambios que `diff` muestra, con confirmación por archivo
- [`add`](/referencia/herramientas/cli/add/) — instalación inicial de un componente
