---
'@modularcore/media-picker': patch
---

Arreglar dos fallos del snippet de montaje de Astro.

- **El oyente del `<input type=file>` no se retiraba.** `astro:before-swap` daba de baja el
  suscriptor y destruía el store, pero un nodo con `transition:persist` sobrevive al cambio de
  documento con su oyente puesto: al limpiarse la marca de montaje, el siguiente `astro:page-load`
  lo remontaba y añadía un **segundo** oyente. Elegir un fichero lo subía dos veces, y el primero
  seguía manejando un store ya destruido, así que su estado no se reflejaba en ninguna parte. Es
  justo la subida duplicada que la marca de montaje existe para evitar. Ahora el oyente se retira
  con un `AbortController` junto al resto de la limpieza.
- **Fuera de Astro no montaba nunca.** La cabecera promete que el mismo fichero sirve en Blade,
  HTMX, Rails o una página suelta, pero `registerMediaPickers` sólo escuchaba `astro:page-load`,
  que no existe ahí. Quien seguía la documentación obtenía un picker mudo, sin ningún error. Ahora
  monta además cuando el documento está listo; no hay doble montaje porque cada raíz lleva su
  marca.
