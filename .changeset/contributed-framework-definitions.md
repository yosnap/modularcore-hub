---
'@modularcore/registry': minor
---

Abrir el catálogo de frameworks: un componente puede traer el suyo.

La lista era cerrada en el código, así que un componente en Solid o Qwik no podía entrar sin que el
mantenimiento tocara cuatro sitios. Peor aún: hasta que alguien los tocara, sus ficheros no tenían
dueño y **se colaban en las instalaciones de React y Svelte**, porque el recorte por framework los
daba por compartidos.

`frameworkDefs` en el descriptor aporta lo que el registry no puede deducir —la extensión de sus
componentes de UI, cómo se reconoce un proyecto suyo, su peer y sus rutas por defecto—, y con eso
el recorte de ficheros y la cobertura de UI lo entienden igual que a los de casa.

- `BUILTIN_FRAMEWORKS` define los seis de siempre; `buildFrameworkCatalog` los reúne con los
  aportados. Un componente **no puede redefinir** uno de casa: la definición de React es la misma
  para todo el catálogo.
- `frameworkOfFile` y `selectFilesForFramework` reciben el catálogo, y `blade → vanilla` deja de
  ser una constante para salir de la propia definición (`basedOn`), igual que la carpeta de
  snippets que le pertenece a cada uno (`snippetDirectory`).
- La comprobación de vocabulario deja de exigir una lista blanca y pasa a exigir que **todo
  framework declarado tenga definición**: una errata como `sold` por `solid` deja el componente
  ininstalable y sus ficheros sin dueño, así que sigue saltando en CI.
