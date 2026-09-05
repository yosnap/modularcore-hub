---
'@modularcore/cli': minor
'@modularcore/ai-chat': patch
---

Unificar `vanilla` como el valor con el que el registry nombra a un proyecto sin framework, y
enseñárselo a la CLI.

El eje de framework vive en tres sitios y hasta ahora sólo el descriptor lo conocía: `frameworks`
acepta texto libre, así que `media-picker` pudo declarar `vanilla` y `ai-chat` `web` para la misma
idea, mientras la CLI mantenía una lista cerrada de cinco valores que no incluía ninguno de los
dos. El resultado era que la etiqueta no la consumía nadie: en un proyecto Astro, `init` obligaba a
elegir de una lista sin la opción correcta y el binding sin framework no había forma de instalarlo.

- `framework-detect`: `vanilla` se suma a `DetectedFramework` y se deduce de `astro` en las
  dependencias. No se deduce de la ausencia de marcadores —un proyecto que aún no ha instalado su
  framework es desconocido, no carece de él—, así que ese caso sigue preguntando, como manda AD2.
  Un Astro con islas de React declara ambos y también pregunta: elegir entre la isla y el script
  plano es del proyecto.
- `init`: `vanilla` entra en las opciones del prompt y en `DEFAULT_PATHS`.
- `ai-chat`: el descriptor pasa de declarar `web` a `vanilla`. El directorio `adapters/web` no se
  toca; sólo cambia el nombre del eje.

`assertCompatible` ya se comportaba bien para este caso —descarta los peers de los frameworks que
no son el del proyecto—, y ahora hay pruebas que lo fijan.
