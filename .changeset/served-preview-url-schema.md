---
'@modularcore/registry': patch
---

Aceptar en el esquema la URL de la captura que el propio build produce.

`preview.image` tiene dos formas según dónde se lea: en el descriptor es una ruta dentro del
paquete (`preview/rating.png`), y en lo que sirve el registry es ya la URL servible, porque
`buildRegistry` copia el fichero y reescribe el campo. Ambas se validaban con las reglas de la
primera, que rechazan cualquier ruta absoluta.

Nadie lo notaba porque ningún componente declara todavía una captura. En cuanto lo hiciera,
`RegistryClient.getIndex()` y `getDescriptor()` habrían empezado a fallar contra **todo** el
registry, no sólo contra ese componente: `modularcore add` y `list` rotos de golpe.

Ahora el esquema de lo servido acepta esa URL, y una prueba pasa la salida del build por los dos
esquemas que la van a leer.
