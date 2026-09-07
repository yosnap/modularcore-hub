---
'@modularcore/registry': minor
'@modularcore/registry-client': minor
'@modularcore/cli': minor
---

La CLI detecta e instala un framework aportado por un componente.

Segunda mitad de la apertura del catálogo: el registry ya entendía un `frameworkDefs`, pero la CLI
seguía con su lista cerrada, así que un proyecto Solid no podía declararse como tal y el componente
quedaba visible pero ininstalable.

- El build publica `frameworks.json` con el catálogo reunido de todos los componentes, y
  `RegistryClient.getFrameworkCatalog()` lo lee.
- `detectFrameworks` reconoce un proyecto por lo que diga `detect` en cada definición, en lugar de
  por una tabla de marcadores fija. La deducción de `vanilla` a partir de `astro` deja de ser un
  caso especial y pasa a ser lo que su propia definición declara.
- `init` pregunta primero la URL del registry, porque de ahí sale el catálogo que decide qué se
  puede detectar y ofrecer. Si el registry no responde, avisa y sigue con los frameworks de casa:
  `init` no puede depender de que haya red.
- `add` y `update` recortan los ficheros con el catálogo del propio componente, así que los de un
  framework aportado tienen dueño y no se cuelan en la instalación de los demás.

`DetectedFramework` pasa de unión cerrada a `string`, que es lo que permite todo lo anterior.
