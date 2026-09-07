# @modularcore/cli

## 0.5.0

### Minor Changes

- f60321e: La CLI detecta e instala un framework aportado por un componente.

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

### Patch Changes

- Updated dependencies [f60321e]
- Updated dependencies [ab18f73]
  - @modularcore/registry@0.5.0
  - @modularcore/registry-client@0.4.0

## 0.4.0

### Minor Changes

- 9a2db1a: Instalar sólo las dependencias npm que necesitan los ficheros que de verdad se escriben.

  Los ficheros ya se recortaban al framework del proyecto, pero las dependencias no. `media-picker`
  declara `bits-ui` —una librería de componentes que sólo existe para Svelte— y `@radix-ui/*` —sólo
  para React—, así que instalarlo en un proyecto React metía `bits-ui` en su `package.json` aunque
  ni un solo fichero de Svelte llegara a escribirse. Y como esos paquetes declaran su framework como
  peer, la instalación podía fallar con `ERESOLVE` justo después de que el usuario confirmara.

  La pertenencia no se declara en el descriptor: `dependenciesForFiles` la deduce de quién importa
  qué, que es la verdad y no una etiqueta que alguien tenga que acordarse de mantener. Una
  dependencia que **ningún** fichero del componente importa se conserva —puede cargarse
  dinámicamente— porque ante la duda sobra una antes que falte una, igual que con los ficheros.

  `AddResult` incluye ahora `npmDependenciesInstalled`, para que quien use la CLI vea qué se instaló
  de verdad.

### Patch Changes

- Updated dependencies [b3cd23f]
- Updated dependencies [eb21099]
- Updated dependencies [9a2db1a]
- Updated dependencies [9b431b8]
  - @modularcore/registry@0.4.0
  - @modularcore/registry-client@0.3.2

## 0.3.0

### Minor Changes

- Escribir en el proyecto sólo los ficheros del framework que usa, no el descriptor entero.

  Un descriptor enumera los ficheros de todos sus adaptadores porque el registry sirve un único
  catálogo para cualquier proyecto, pero `add` los escribía todos: un proyecto React se llevaba
  `adapters/vue` y `adapters/angular` con esos peers sin instalar, y el `tsc` del consumidor fallaba
  justo después de un `add` que había terminado bien. Con `vanilla` entre los frameworks asignables
  apareció el primer destino donde no existe ninguno de los cuatro peers, así que el daño pasaba a
  ser total.

  - `registry`: `selectFilesForFramework` deduce de la ruta a qué framework sirve cada fichero
    (`adapters/<framework>/`, `ui/<framework>/`, `snippets/astro` → vanilla, `snippets/laravel` →
    blade). El resto —`core/`, las hojas de estilo sueltas de `ui/`— es compartido, igual que
    cualquier ruta que no siga la convención: ante la duda, sobra un fichero antes que falte uno.
    Un proyecto Blade recibe además los ficheros `vanilla`, porque sus plantillas montan ese mismo
    código sin framework.
  - `cli`: `add` y `update` aplican el recorte. `update` lo necesita para no reintroducir lo que
    `add` dejó fuera.
  - `ai-chat`: `adapters/web` pasa a llamarse `adapters/vanilla` y el export del paquete pasa de
    `@modularcore/ai-chat/web` a `@modularcore/ai-chat/vanilla`. Con el recorte por ruta, un
    directorio llamado `web` habría dejado el binding fuera justo en el proyecto que lo necesita.

- 8f14656: Unificar `vanilla` como el valor con el que el registry nombra a un proyecto sin framework, y
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

### Patch Changes

- Updated dependencies
- Updated dependencies [3dbcca3]
  - @modularcore/registry@0.3.0
  - @modularcore/registry-client@0.3.1

## 0.2.1

### Patch Changes

- Republish the CLI and MCP server packages after their previous npm versions were reserved.

## 0.2.0

### Minor Changes

- Publish the registry client, CLI, and MCP server as public npm packages.

### Patch Changes

- Updated dependencies
  - @modularcore/registry@0.2.0
  - @modularcore/registry-client@0.3.0

## 0.1.2

### Patch Changes

- f239b9e: feat: wire registry-client, mcp-server and auto-seo; bump cli
- Updated dependencies [f239b9e]
  - @modularcore/registry-client@0.2.0

## 0.1.1

### Patch Changes

- b53818b: CLI thin client (`modularcore`): `init`, `add`, `list`, `search`, `diff`, `update`. Framework
  and peer-dependency compatibility gate before writing, guarded npm install
  (`--ignore-scripts` + confirmation), recursive `registryDependencies` resolution with cycle
  detection, idempotent `.env.example`. Retroactive changeset for Fase 3 (v0.3.0), which
  shipped without one — see `docs/branching-release-strategy.md`.
- Updated dependencies [b53818b]
  - @modularcore/registry@0.1.1
