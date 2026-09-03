---
title: "Actualizar componentes"
description: "Guía para revisar y aplicar cambios de un componente instalado con `modularcore update` y `modularcore diff`."
---

Un componente instalado por copy-code es tuyo: puedes haberlo modificado. Por eso `modularcore update` nunca sobreescribe en silencio — te muestra qué cambió y pide confirmación archivo por archivo. `modularcore diff` te deja inspeccionar esos cambios sin tocar nada.

## Ver qué cambió antes de actualizar: `diff`

```bash
modularcore diff auto-seo
```

Compara, archivo por archivo, tu copia local con la versión actual del componente en el registry. Cada archivo queda clasificado como:

- **`missing-locally`**: el archivo existe en el registry pero no en tu proyecto (por ejemplo, lo borraste, o es nuevo en esta versión del componente).
- **`unchanged`**: tu copia local es idéntica a la del registry.
- **`changed`**: hay diferencias en un archivo de texto; se muestra el diff línea a línea.
- **`binary-changed`**: hay diferencias en un archivo binario (no se puede mostrar un diff de líneas).

Usa `diff` cuando quieras entender el alcance de una actualización antes de decidir si aplicarla.

## Aplicar la actualización: `update`

```bash
modularcore update auto-seo
```

Si omites el nombre del componente, `modularcore update` actualiza **todos** los componentes registrados en la sección `installed` de tu `modularcore.json`:

```bash
modularcore update
```

Para cada archivo del componente, el proceso es:

1. Si el archivo local es idéntico al del registry, se marca como `unchanged` y no se toca.
2. Si hay diferencias, se muestra el diff (o un aviso de "archivo nuevo" / "contenido binario cambiado" cuando no aplica un diff de líneas) y se pregunta `¿Sobrescribir "<ruta>"?`.
3. Si confirmas, el archivo local existente se respalda primero con una copia `.orig`, y después se escribe la versión nueva.
4. Si no confirmas, el archivo se marca como `skipped` y tu versión local queda intacta.

Al terminar, `modularcore.json` se actualiza con la versión nueva del componente. Los archivos que hayas rechazado (`skipped`) seguirán marcados como parte del componente instalado, pero con tu contenido local sin tocar — puedes volver a correr `update` más adelante cuando quieras revisarlos de nuevo.

## Recomendación de flujo

1. Corre `modularcore diff <componente>` para ver el alcance del cambio.
2. Si el cambio te interesa, corre `modularcore update <componente>` y revisa cada confirmación con calma — especialmente en archivos que sabes que modificaste.
3. Si rechazas una sobrescritura sobre un archivo que sí modificaste, considera aplicar el cambio del registry manualmente sobre tu copia, en lugar de perder tus ediciones locales.

## Ver también

- [Instalar un componente](/guias/instalar-un-componente/) para el flujo de `add`.
