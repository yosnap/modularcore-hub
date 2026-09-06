# @modularcore/registry

## 0.4.0

### Minor Changes

- b3cd23f: Publicar una captura por componente, para el catálogo y para quien revise una aportación.

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

- eb21099: Declarar la cobertura de la UI de referencia por framework, y comprobar que lo declarado es lo que
  hay.

  `frameworks` decía dónde se puede instalar un componente —núcleo y adaptador— y se leía como si
  dijera dónde hay interfaz. No es lo mismo: `media-picker` declaraba `vue` y `angular` sin un solo
  componente de UI, y `modals` entregaba en React sólo la presentación headless mientras en Svelte
  tenía las cuatro. Nada lo señalaba hasta que alguien instalaba.

  - `ui` en el descriptor declara, por framework, qué presentaciones cubre y qué componentes le
    faltan respecto a los demás, con nombre y apellido.
  - `findCoverageMismatches` compara lo declarado con los ficheros del descriptor y falla en los dos
    sentidos: una brecha nueva que nadie declaró, y una brecha declarada que ya se cubrió.
  - `RegistryIndexEntry` incluye `ui`, para que el catálogo distinga un framework con UI de uno que
    sólo trae núcleo y adaptador.

  No exige paridad completa a quien aporta un componente: se aportan los frameworks que se dominan y
  el resto queda declarado como trabajo pendiente.

  De paso, dos correcciones en el recorte de ficheros por framework:

  - La herencia entre frameworks se limita a los adaptadores. `blade` se apoya en el binding
    `vanilla` porque su plantilla lo monta, pero arrastraba también los snippets: un proyecto
    Laravel recibía la isla de Astro, cuyo único punto de entrada escucha `astro:page-load` y no se
    dispara jamás fuera de Astro.
  - `ui/vanilla/` deja de tratarse como framework. `vanilla` nombra dos ejes —una página sin
    framework y la presentación de CSS plano— y bajo `ui/` manda el segundo: clasificarlo como
    framework habría borrado esos ficheros de toda instalación de React o Svelte.

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

- 9b431b8: Aceptar en el esquema la URL de la captura que el propio build produce.

  `preview.image` tiene dos formas según dónde se lea: en el descriptor es una ruta dentro del
  paquete (`preview/rating.png`), y en lo que sirve el registry es ya la URL servible, porque
  `buildRegistry` copia el fichero y reescribe el campo. Ambas se validaban con las reglas de la
  primera, que rechazan cualquier ruta absoluta.

  Nadie lo notaba porque ningún componente declara todavía una captura. En cuanto lo hiciera,
  `RegistryClient.getIndex()` y `getDescriptor()` habrían empezado a fallar contra **todo** el
  registry, no sólo contra ese componente: `modularcore add` y `list` rotos de golpe.

  Ahora el esquema de lo servido acepta esa URL, y una prueba pasa la salida del build por los dos
  esquemas que la van a leer.

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

### Patch Changes

- 3dbcca3: Alinear los `MediaLibraryGrid` de React con el rediseño que sólo había alcanzado a Svelte.

  Las cuatro presentaciones de React pintaban la miniatura y nada más. Ahora llevan el mismo pie que
  las de Svelte —nombre de fichero truncado con la clave completa en el `title`, tamaño legible y un
  distintivo por cada tamaño derivado—, usando `formatBytes`, `sortVariants` y `formatVariantBadge`
  de `core/format.ts` para que las ocho rendericen exactamente lo mismo.

  `basename` sube también a `core/format.ts`: estaba copiado en las cuatro presentaciones de Svelte y
  ahora hay una sola definición.

  Aparte, se repara la página de documentación de `media-picker`, publicada con un conflicto de merge
  entero dentro. Nada lo detectaba: el markdown con marcadores sigue siendo válido, `*.md` está en
  `.prettierignore` y ningún test leía ese fichero. La prueba nueva de `registry` recorre el árbol de
  fuentes y falla ante cualquier marcador sin resolver.

## 0.2.0

### Minor Changes

- Publish the registry client, CLI, and MCP server as public npm packages.

## 0.1.1

### Patch Changes

- b53818b: Registry descriptor schema (zod-validated) and static build pipeline (`index.json` +
  `{name}.json` + `{name}.tar.gz`), with path-traversal clamp, atomic emission, and
  binary/utf8 encoding-mismatch detection. Retroactive changeset for Fase 2 (v0.2.0), which
  shipped without one — see `docs/branching-release-strategy.md`.
