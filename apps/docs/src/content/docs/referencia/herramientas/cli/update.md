---
title: "modularcore update"
description: "Reinyecta los archivos de uno o todos los componentes instalados, con confirmación por archivo y backups .orig."
---

## Qué hace

`update [name]` vuelve a descargar la versión actual de un componente (o de todos los componentes instalados, si no pasas `name`) y reinyecta sus archivos en el proyecto, pidiendo confirmación individual antes de sobrescribir cada archivo que ya exista localmente y difiera del registry.

Si no pasas `name`, actualiza todos los componentes listados en `installed` dentro de `modularcore.json`. Si `installed` está vacío, no hace nada.

Para cada archivo de cada componente:

1. Resuelve la ruta local remapeada y lee su contenido actual (si existe).
2. Si el contenido local ya coincide con el del registry, lo marca `unchanged` y no toca nada.
3. Si difiere, muestra un preview: un diff de líneas si es texto, o un aviso de "(archivo nuevo)" / "(contenido binario cambiado)" si aplica.
4. Pregunta `¿Sobrescribir "<ruta>"?` (por defecto "no" — la sobrescritura nunca es el default).
5. Si el usuario rechaza, lo marca `skipped` y no modifica el archivo.
6. Si el usuario confirma, hace backup del archivo existente a `<archivo>.orig` (si existía) antes de sobrescribirlo, crea los directorios necesarios y escribe el nuevo contenido, marcándolo `written`.

Al terminar, actualiza `modularcore.json` con la versión más reciente de cada componente procesado.

`update` nunca sobrescribe silenciosamente: cada archivo que cambia requiere confirmación explícita, y el archivo previo siempre queda respaldado como `.orig` antes de perderse.

## Sintaxis

```bash
modularcore update [name]
```

## Parámetros

| Parámetro | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `[name]` | argumento posicional | No | Nombre del componente a actualizar. Si se omite, actualiza todos los componentes registrados en `installed` dentro de `modularcore.json`. |

## Ejemplo

```bash
# Actualizar un componente concreto
modularcore update media-picker

# Actualizar todos los componentes instalados
modularcore update
```

```
src/components/media-picker/index.tsx
  import { useState } from 'react';
- import { Dropzone } from './dropzone';
+ import { Dropzone } from './dropzone-v2';

¿Sobrescribir "src/components/media-picker/index.tsx"? (y/N) y

written (backup .orig creado): src/components/media-picker/index.tsx
unchanged: src/components/media-picker/styles.css
```

## Errores comunes

- **Sin `modularcore.json`**: falla si no existe configuración de proyecto.
- **Componente no encontrado**: si pasas un `name` que no existe en el registry, el CLI propaga el error del cliente (p. ej. 404).
- **Nada que actualizar**: si no pasas `name` y `installed` está vacío en `modularcore.json`, el comando termina sin hacer nada ni mostrar salida (devuelve una lista vacía de resultados).
- **Archivo rechazado**: si respondes que no a la confirmación de sobrescritura, el archivo queda marcado `skipped` — el componente puede quedar con una mezcla de archivos actualizados y no actualizados; revisa la salida por archivo.
- **Pérdida del backup previo**: si ejecutas `update` dos veces seguidas sobre el mismo archivo, el segundo backup `.orig` sobrescribe el primero — solo se conserva el backup más reciente.

## Ver también

- [Visión general del CLI](/referencia/herramientas/cli/)
- [`diff`](/referencia/herramientas/cli/diff/) — revisa los cambios antes de aplicarlos con `update`
- [`add`](/referencia/herramientas/cli/add/) — instalación inicial de un componente
