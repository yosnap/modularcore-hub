---
'@modularcore/registry': minor
---

Publicar una captura por componente, para el catálogo y para quien revise una aportación.

Nadie puede ejecutar un componente de un framework que no tiene instalado, así que revisar una
aportación se reducía a leer el diff. Y la ficha del catálogo mostraba título, categoría, versión y
variables de entorno: nadie elige un selector de medios leyendo su descripción.

- `preview: { image, alt }` en el descriptor. La ruta apunta dentro del paquete y **no va en
  `files[]`**: una captura no pinta nada en el `src/` de quien instala el componente.
- `buildRegistry` la copia junto al resto de artefactos como `{name}-preview{ext}` y reescribe el
  campo con la URL ya servible, que es lo que consume el catálogo.
- Admite `.png`, `.jpg`, `.jpeg` y `.webp`. **SVG no**: servido con su propio `Content-Type`
  ejecutaría el script que llevara dentro, y estas imágenes las aporta quien contribuye.

Es opcional: un componente sin captura se construye igual.
